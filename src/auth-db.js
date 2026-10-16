import { randomBytes, pbkdf2Sync, timingSafeEqual, createHash } from "node:crypto";
import { MongoClient } from "mongodb";
import { loadLocalEnv } from "./env.js";

let clientPromise = null;
let fallbackStoreInstance = null;
let lastMongoErrorTime = 0;
const MONGO_RETRY_INTERVAL_MS = 30_000;

export async function getAuthDb() {
  loadLocalEnv();

  const uri = process.env.MONGODB_URI || process.env.MONGO_URL;
  const now = Date.now();
  const isProduction = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";

  if (uri && (now - lastMongoErrorTime > MONGO_RETRY_INTERVAL_MS || clientPromise)) {
    try {
      if (!clientPromise) {
        const client = new MongoClient(uri, {
          serverSelectionTimeoutMS: 3000,
          connectTimeoutMS: 3000
        });
        clientPromise = client.connect();
      }

      const client = await clientPromise;
      const dbName = databaseNameFromUri(uri) || "ai-software-compiler";
      const db = client.db(dbName);
      await ensureIndexes(db).catch(() => {});
      return db;
    } catch (err) {
      lastMongoErrorTime = Date.now();
      clientPromise = null; // Allow retry on next cooldown interval if network recovers
      if (!isProduction) {
        console.warn(`[auth-db] MongoDB connection failed: ${err.message}. Using local development fallback mode.`);
      }
    }
  }

  if (isProduction) {
    if (!uri) throw new Error("MONGODB_URI or MONGO_URL is not configured.");
    throw new Error("MONGODB_URI is configured but the database is currently unavailable. Please try again.");
  }

  if (!uri) {
    if (!fallbackStoreInstance) {
      console.warn("[auth-db] MONGODB_URI not configured. Operating in resilient fallback mode.");
    }
  }

  if (!fallbackStoreInstance) {
    fallbackStoreInstance = createFallbackAuthDb();
  }
  return fallbackStoreInstance;
}

export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, 120000, 32, "sha256").toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  const [salt, hash] = String(stored || "").split(":");
  if (!salt || !hash) return false;

  const candidate = pbkdf2Sync(password, salt, 120000, 32, "sha256");
  const expected = Buffer.from(hash, "hex");
  return expected.length === candidate.length && timingSafeEqual(expected, candidate);
}

export function createSessionToken() {
  const token = randomBytes(32).toString("hex");
  return {
    token,
    tokenHash: hashToken(token),
    expiresAt: tokenExpiry()
  };
}

export function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

export function publicUser(user) {
  if (!user) return null;
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role || "member",
    avatarUrl: user.avatarUrl || null,
    experienceProfile: user.experienceProfile || null,
    providers: (user.providers || []).map((entry) => entry.provider),
    createdAt: user.createdAt
  };
}

export async function issueSessionForUser(user) {
  const session = createSessionToken();
  const db = await getAuthDb();
  const now = new Date();

  await db.collection("users").updateOne(
    { _id: user._id },
    {
      $push: {
        sessions: { tokenHash: session.tokenHash, createdAt: now, expiresAt: session.expiresAt }
      },
      $set: { updatedAt: now }
    }
  );

  const fresh = await db.collection("users").findOne({ _id: user._id });
  return { token: session.token, user: publicUser(fresh) };
}

export async function findOrCreateOAuthUser({ provider, providerId, email, name, avatarUrl }) {
  const db = await getAuthDb();
  const normalizedEmail = String(email || "").trim().toLowerCase();

  let user = await db.collection("users").findOne({
    $or: [{ email: normalizedEmail }, { providers: { $elemMatch: { provider, providerId } } }]
  });

  if (user) {
    const hasProvider = (user.providers || []).some(
      (entry) => entry.provider === provider && entry.providerId === providerId
    );
    const updateDoc = { $set: { updatedAt: new Date() } };

    if (!hasProvider) {
      updateDoc.$addToSet = { providers: { provider, providerId } };
    }
    if (avatarUrl && !user.avatarUrl) {
      updateDoc.$set.avatarUrl = avatarUrl;
    }

    if (!hasProvider || (avatarUrl && !user.avatarUrl)) {
      await db.collection("users").updateOne({ _id: user._id }, updateDoc);
      user = await db.collection("users").findOne({ _id: user._id });
    }

    return issueSessionForUser(user);
  }

  const session = createSessionToken();
  const now = new Date();
  const result = await db.collection("users").insertOne({
    name: String(name || normalizedEmail.split("@")[0]).slice(0, 80),
    email: normalizedEmail,
    role: "member",
    providers: [{ provider, providerId }],
    avatarUrl: avatarUrl || null,
    sessions: [{ tokenHash: session.tokenHash, createdAt: now, expiresAt: session.expiresAt }],
    createdAt: now,
    updatedAt: now
  });

  const created = await db.collection("users").findOne({ _id: result.insertedId });
  return { token: session.token, user: publicUser(created) };
}

export async function findUserByToken(token) {
  if (!token) return null;

  const db = await getAuthDb();
  return db.collection("users").findOne({
    sessions: {
      $elemMatch: {
        tokenHash: hashToken(token),
        expiresAt: { $gt: new Date() }
      }
    }
  });
}

function tokenExpiry() {
  const ttlDays = Number(process.env.AUTH_TOKEN_TTL_DAYS || 7);
  return new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
}

async function ensureIndexes(db) {
  await db.collection("users").createIndex({ email: 1 }, { unique: true });
  await db.collection("users").createIndex({ "sessions.tokenHash": 1 });
  await db.collection("users").createIndex({ "providers.provider": 1, "providers.providerId": 1 });
}

function databaseNameFromUri(uri) {
  try {
    const parsed = new URL(uri);
    return parsed.pathname.replace(/^\//, "") || null;
  } catch {
    return null;
  }
}

/** Resilient fallback auth database implementation when MongoDB is unreachable */
function createFallbackAuthDb() {
  const users = [];

  function matches(user, filter) {
    if (!filter || Object.keys(filter).length === 0) return true;
    if (filter.$or && Array.isArray(filter.$or)) {
      return filter.$or.some((sub) => matches(user, sub));
    }
    for (const [key, val] of Object.entries(filter)) {
      if (key === "_id") {
        if (String(user._id) !== String(val)) return false;
      } else if (key === "email") {
        if (String(user.email).toLowerCase() !== String(val).toLowerCase()) return false;
      } else if (key === "sessions.tokenHash") {
        if (!user.sessions?.some((s) => s.tokenHash === val)) return false;
      } else if (key === "sessions" && val?.$elemMatch) {
        const matched = user.sessions?.some((s) => {
          if (val.$elemMatch.tokenHash && s.tokenHash !== val.$elemMatch.tokenHash) return false;
          if (val.$elemMatch.expiresAt?.$gt && !(new Date(s.expiresAt) > val.$elemMatch.expiresAt.$gt)) return false;
          return true;
        });
        if (!matched) return false;
      } else if (key === "providers" && val?.$elemMatch) {
        const matched = user.providers?.some(
          (p) => p.provider === val.$elemMatch.provider && String(p.providerId) === String(val.$elemMatch.providerId)
        );
        if (!matched) return false;
      } else if (user[key] !== val) {
        return false;
      }
    }
    return true;
  }

  function applyUpdate(user, update) {
    if (update.$set) {
      Object.assign(user, update.$set);
    }
    if (update.$push) {
      for (const [field, item] of Object.entries(update.$push)) {
        user[field] = user[field] || [];
        user[field].push(item);
      }
    }
    if (update.$pull) {
      for (const [field, filter] of Object.entries(update.$pull)) {
        if (Array.isArray(user[field])) {
          user[field] = user[field].filter((entry) => {
            if (filter.tokenHash && entry.tokenHash === filter.tokenHash) return false;
            return true;
          });
        }
      }
    }
    if (update.$addToSet) {
      for (const [field, item] of Object.entries(update.$addToSet)) {
        user[field] = user[field] || [];
        const exists = user[field].some(
          (entry) => JSON.stringify(entry) === JSON.stringify(item)
        );
        if (!exists) user[field].push(item);
      }
    }
    user.updatedAt = new Date();
  }

  const usersCollection = {
    async insertOne(doc) {
      const email = String(doc.email || "").toLowerCase();
      if (email && users.some((u) => u.email === email)) {
        const error = new Error("Duplicate email error");
        error.code = 11000;
        throw error;
      }
      const cloned = JSON.parse(JSON.stringify(doc));
      cloned._id = doc._id || `user_${randomBytes(12).toString("hex")}`;
      users.push(cloned);
      return { insertedId: cloned._id };
    },
    async findOne(filter) {
      const found = users.find((u) => matches(u, filter));
      return found ? JSON.parse(JSON.stringify(found)) : null;
    },
    async updateOne(filter, update) {
      const found = users.find((u) => matches(u, filter));
      if (!found) return { matchedCount: 0, modifiedCount: 0 };
      applyUpdate(found, update);
      return { matchedCount: 1, modifiedCount: 1 };
    },
    async createIndex() {
      return Promise.resolve();
    },
    async countDocuments(filter = {}) {
      return users.filter((u) => matches(u, filter)).length;
    }
  };

  return {
    databaseName: "fallback-memory-auth",
    collection(name) {
      if (name === "users") return usersCollection;
      return usersCollection;
    }
  };
}

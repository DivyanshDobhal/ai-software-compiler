import { randomBytes, pbkdf2Sync, timingSafeEqual, createHash } from "node:crypto";
import { MongoClient } from "mongodb";
import { loadLocalEnv } from "./env.js";

let clientPromise;

export async function getAuthDb() {
  loadLocalEnv();

  const uri = process.env.MONGODB_URI || process.env.MONGO_URL;
  if (!uri) {
    throw new Error("MONGODB_URI or MONGO_URL is not configured.");
  }

  if (!clientPromise) {
    const client = new MongoClient(uri);
    clientPromise = client.connect();
  }

  const client = await clientPromise;
  const dbName = databaseNameFromUri(uri) || "ai-software-compiler";
  const db = client.db(dbName);
  await ensureIndexes(db);
  return db;
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
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role || "member",
    avatarUrl: user.avatarUrl || null,
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

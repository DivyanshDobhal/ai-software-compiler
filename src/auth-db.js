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
    createdAt: user.createdAt
  };
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
}

function databaseNameFromUri(uri) {
  try {
    const parsed = new URL(uri);
    return parsed.pathname.replace(/^\//, "") || null;
  } catch {
    return null;
  }
}

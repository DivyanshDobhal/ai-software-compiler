import {
  createSessionToken,
  findOrCreateOAuthUser,
  findUserByToken,
  getAuthDb,
  hashPassword,
  hashToken,
  publicUser,
  verifyPassword
} from "../src/auth-db.js";
import {
  buildFrontendErrorRedirect,
  buildFrontendSuccessRedirect,
  buildGitHubAuthUrl,
  buildGoogleAuthUrl,
  exchangeGitHubCode,
  exchangeGoogleCode,
  verifyOAuthState
} from "../src/oauth.js";

export default async function handler(req, res) {
  // CORS support
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-nvidia-api-key");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  const [action, subaction] = resolveAction(req);

  try {
    // Health / root endpoint
    if (!action && req.method === "GET") {
      const user = await findUserByToken(bearerToken(req));
      return res.status(200).json({
        status: "ok",
        service: "auth",
        authenticated: Boolean(user),
        user: publicUser(user)
      });
    }

    // Social OAuth flows
    if (req.method === "GET" && action === "google" && !subaction) return startOAuth(req, res, "google");
    if (req.method === "GET" && action === "google" && subaction === "callback") {
      return finishOAuth(req, res, "google");
    }
    if (req.method === "GET" && action === "github" && !subaction) return startOAuth(req, res, "github");
    if (req.method === "GET" && action === "github" && subaction === "callback") {
      return finishOAuth(req, res, "github");
    }

    // Password & session APIs
    if (req.method === "POST" && action === "register") return register(req, res);
    if (req.method === "POST" && action === "login") return login(req, res);
    if (req.method === "GET" && action === "me") return me(req, res);
    if (req.method === "PUT" && action === "preferences") return updatePreferences(req, res);
    if (req.method === "POST" && action === "logout") return logout(req, res);

    res.setHeader("Allow", "GET, POST, PUT, OPTIONS");
    return res.status(404).json({ error: `Auth route '${action || ""}' not found` });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("MONGODB_URI") || message.includes("MONGO_URL") ? 503 : 500;
    return res.status(status).json({ error: "Auth request failed", detail: message });
  }
}

function resolveAction(req) {
  // 1. Check query parameters populated by Vercel rewrites (e.g. /api/auth?action=login)
  const queryAction = req.query?.action || req.query?.path;
  if (queryAction) {
    const segments = String(queryAction).split("/").filter(Boolean);
    if (segments.length) return segments;
  }

  // 2. Parse from req.url searchParams or pathname
  try {
    const url = new URL(req.url || "/", "http://localhost");
    const paramAction = url.searchParams.get("action") || url.searchParams.get("path");
    if (paramAction) {
      const segments = paramAction.split("/").filter(Boolean);
      if (segments.length) return segments;
    }

    const segments = url.pathname.replace(/^\/api\/auth\/?/, "").split("/").filter(Boolean);
    if (segments.length) return segments;
  } catch {}

  // 3. Check Vercel original path headers
  const matchedPath = req.headers?.["x-matched-path"] || req.headers?.["x-forwarded-uri"] || "";
  if (matchedPath) {
    try {
      const cleanPath = matchedPath.split("?")[0];
      const segments = cleanPath.replace(/^\/api\/auth\/?/, "").split("/").filter(Boolean);
      if (segments.length) return segments;
    } catch {}
  }

  return [];
}

function startOAuth(req, res, provider) {
  try {
    const authUrl = provider === "google" ? buildGoogleAuthUrl(req) : buildGitHubAuthUrl(req);
    res.writeHead(302, { Location: authUrl });
    res.end();
  } catch (error) {
    const message = error instanceof Error ? error.message : "OAuth is not configured.";
    res.writeHead(302, { Location: buildFrontendErrorRedirect(message, req) });
    res.end();
  }
}

async function finishOAuth(req, res, provider) {
  const url = new URL(req.url || `/api/auth/${provider}/callback`, "http://localhost");
  const error = url.searchParams.get("error") || req.query?.error;
  const code = url.searchParams.get("code") || req.query?.code;
  const state = url.searchParams.get("state") || req.query?.state;
  const statePayload = verifyOAuthState(state, provider);

  if (error) {
    res.writeHead(302, { Location: buildFrontendErrorRedirect(`Sign-in cancelled: ${error}`, req) });
    return res.end();
  }

  if (!code || !statePayload?.redirectUri) {
    res.writeHead(302, { Location: buildFrontendErrorRedirect("Invalid OAuth state. Please try again.", req) });
    return res.end();
  }

  try {
    const profile =
      provider === "google"
        ? await exchangeGoogleCode(code, statePayload.redirectUri)
        : await exchangeGitHubCode(code, statePayload.redirectUri);
    const session = await findOrCreateOAuthUser(profile);
    const returnTarget = statePayload.returnTo || req;
    res.writeHead(302, { Location: buildFrontendSuccessRedirect(session.token, returnTarget) });
    res.end();
  } catch (oauthError) {
    const message = oauthError instanceof Error ? oauthError.message : "OAuth sign-in failed.";
    res.writeHead(302, { Location: buildFrontendErrorRedirect(message, req) });
    res.end();
  }
}

async function register(req, res) {
  const body = await readBody(req);
  const name = cleanName(body.name);
  const email = cleanEmail(body.email);
  const password = String(body.password || "");

  if (!name || !email || password.length < 8) {
    return res.status(400).json({ error: "Name, valid email, and 8+ character password are required." });
  }

  const db = await getAuthDb();
  const session = createSessionToken();
  const now = new Date();

  try {
    const result = await db.collection("users").insertOne({
      name,
      email,
      passwordHash: hashPassword(password),
      role: "member",
      providers: [{ provider: "email", providerId: email }],
      sessions: [{ tokenHash: session.tokenHash, createdAt: now, expiresAt: session.expiresAt }],
      createdAt: now,
      updatedAt: now
    });

    return res.status(201).json({
      token: session.token,
      user: publicUser({ _id: result.insertedId, name, email, role: "member", createdAt: now })
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ error: "An account already exists for this email." });
    }
    throw error;
  }
}

async function login(req, res) {
  const body = await readBody(req);
  const email = cleanEmail(body.email);
  const password = String(body.password || "");

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const db = await getAuthDb();
  const user = await db.collection("users").findOne({ email });

  if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
    if (user && !user.passwordHash) {
      const providers = (user.providers || []).map((entry) => entry.provider).filter((p) => p !== "email");
      const hint = providers.length
        ? `Use ${providers.join(" or ")} sign-in for this account.`
        : "Use social sign-in for this account.";
      return res.status(401).json({ error: `Invalid email or password. ${hint}` });
    }
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const session = createSessionToken();
  await db.collection("users").updateOne(
    { _id: user._id },
    {
      $push: { sessions: { tokenHash: session.tokenHash, createdAt: new Date(), expiresAt: session.expiresAt } },
      $set: { updatedAt: new Date() }
    }
  );

  return res.status(200).json({ token: session.token, user: publicUser(user) });
}

async function me(req, res) {
  const token = bearerToken(req);
  if (!token) return res.status(401).json({ error: "Not authenticated." });
  const user = await findUserByToken(token);
  if (!user) return res.status(401).json({ error: "Not authenticated." });
  return res.status(200).json({ user: publicUser(user) });
}

async function updatePreferences(req, res) {
  const user = await findUserByToken(bearerToken(req));
  if (!user) return res.status(401).json({ error: "Not authenticated." });

  const body = await readBody(req);
  const profile = sanitizeExperienceProfile(body.experienceProfile);
  if (!profile) return res.status(400).json({ error: "Choose a valid audience before saving preferences." });

  const db = await getAuthDb();
  await db.collection("users").updateOne(
    { _id: user._id },
    { $set: { experienceProfile: profile, updatedAt: new Date() } }
  );
  return res.status(200).json({ experienceProfile: profile });
}

function sanitizeExperienceProfile(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const audiences = new Set(["student", "developer", "founder", "business", "agency", "educator", "exploring"]);
  const studentStatuses = new Set(["school", "college", "postgraduate", "educator", "not-student"]);
  const experienceLevels = new Set(["beginner", "learning", "comfortable", "experienced"]);
  const goals = new Set(["academic", "hackathon", "portfolio", "research", "startup", "learning"]);
  const audience = String(value.audience || "");
  if (!audiences.has(audience)) return null;

  return {
    audience,
    studentStatus: studentStatuses.has(value.studentStatus) ? value.studentStatus : "",
    studyField: String(value.studyField || "").trim().slice(0, 80),
    experience: experienceLevels.has(value.experience) ? value.experience : "",
    goal: goals.has(value.goal) ? value.goal : ""
  };
}

async function logout(req, res) {
  const token = bearerToken(req);
  if (token) {
    const db = await getAuthDb();
    await db.collection("users").updateOne(
      { "sessions.tokenHash": hashToken(token) },
      { $pull: { sessions: { tokenHash: hashToken(token) } }, $set: { updatedAt: new Date() } }
    );
  }

  return res.status(200).json({ ok: true });
}

export function bearerToken(req) {
  const header = req.headers?.authorization || req.headers?.Authorization || "";
  const match = String(header).match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
}

async function readBody(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    return req.body;
  }
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  if (Buffer.isBuffer(req.body)) {
    try {
      return JSON.parse(req.body.toString("utf8"));
    } catch {
      return {};
    }
  }
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(data || "{}"));
      } catch {
        resolve({});
      }
    });
    req.on("error", () => resolve({}));
  });
}

function cleanEmail(email) {
  const value = String(email || "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : "";
}

function cleanName(name) {
  return String(name || "").trim().replace(/\s+/g, " ").slice(0, 80);
}

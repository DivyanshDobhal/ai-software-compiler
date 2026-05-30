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
  const url = new URL(req.url || "/api/auth", "http://localhost");
  const segments = url.pathname.replace(/^\/api\/auth\/?/, "").split("/").filter(Boolean);
  const [action, subaction] = segments;

  try {
    if (req.method === "GET" && action === "google" && !subaction) return startOAuth(res, "google");
    if (req.method === "GET" && action === "google" && subaction === "callback") {
      return finishOAuth(req, res, "google");
    }
    if (req.method === "GET" && action === "github" && !subaction) return startOAuth(res, "github");
    if (req.method === "GET" && action === "github" && subaction === "callback") {
      return finishOAuth(req, res, "github");
    }

    if (req.method === "POST" && action === "register") return register(req, res);
    if (req.method === "POST" && action === "login") return login(req, res);
    if (req.method === "GET" && action === "me") return me(req, res);
    if (req.method === "POST" && action === "logout") return logout(req, res);

    res.setHeader("Allow", "GET, POST");
    return res.status(404).json({ error: "Auth route not found" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("MONGODB_URI") || message.includes("MONGO_URL") ? 503 : 500;
    return res.status(status).json({ error: "Auth request failed", detail: message });
  }
}

function startOAuth(res, provider) {
  try {
    const authUrl = provider === "google" ? buildGoogleAuthUrl() : buildGitHubAuthUrl();
    res.writeHead(302, { Location: authUrl });
    res.end();
  } catch (error) {
    const message = error instanceof Error ? error.message : "OAuth is not configured.";
    res.writeHead(302, { Location: buildFrontendErrorRedirect(message) });
    res.end();
  }
}

async function finishOAuth(req, res, provider) {
  const url = new URL(req.url || `/api/auth/${provider}/callback`, "http://localhost");
  const error = url.searchParams.get("error");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (error) {
    res.writeHead(302, { Location: buildFrontendErrorRedirect(`Sign-in cancelled: ${error}`) });
    return res.end();
  }

  if (!code || !verifyOAuthState(state, provider)) {
    res.writeHead(302, { Location: buildFrontendErrorRedirect("Invalid OAuth state. Please try again.") });
    return res.end();
  }

  try {
    const profile =
      provider === "google" ? await exchangeGoogleCode(code) : await exchangeGitHubCode(code);
    const session = await findOrCreateOAuthUser(profile);
    res.writeHead(302, { Location: buildFrontendSuccessRedirect(session.token) });
    res.end();
  } catch (oauthError) {
    const message = oauthError instanceof Error ? oauthError.message : "OAuth sign-in failed.";
    res.writeHead(302, { Location: buildFrontendErrorRedirect(message) });
    res.end();
  }
}

async function register(req, res) {
  const body = parseBody(req.body);
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
  const body = parseBody(req.body);
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
  const user = await findUserByToken(bearerToken(req));
  if (!user) return res.status(401).json({ error: "Not authenticated." });
  return res.status(200).json({ user: publicUser(user) });
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

function parseBody(body) {
  return typeof body === "string" ? JSON.parse(body || "{}") : body || {};
}

function cleanEmail(email) {
  const value = String(email || "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : "";
}

function cleanName(name) {
  return String(name || "").trim().replace(/\s+/g, " ").slice(0, 80);
}

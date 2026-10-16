import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { loadLocalEnv } from "./env.js";

loadLocalEnv();

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

const GITHUB_AUTH_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_USER_URL = "https://api.github.com/user";
const GITHUB_EMAILS_URL = "https://api.github.com/user/emails";

export function getAppBaseUrl() {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  return "http://localhost:5173";
}

/** Use the hostname the user actually visited (fixes Vercel deployment URL mismatch). */
export function getRequestBaseUrl(req) {
  const forwardedHost = req?.headers?.["x-forwarded-host"];
  const hostHeader = forwardedHost || req?.headers?.host;
  const proto = String(req?.headers?.["x-forwarded-proto"] || "https")
    .split(",")[0]
    .trim();

  if (hostHeader) {
    const host = String(hostHeader).split(",")[0].trim();
    if (host && !host.startsWith("localhost")) {
      return `${proto}://${host}`.replace(/\/$/, "");
    }
  }

  return getAppBaseUrl();
}

export function oauthRedirectUri(provider, req) {
  return `${getRequestBaseUrl(req)}/api/auth/${provider}/callback`;
}

function stateSecret() {
  return (
    process.env.OAUTH_STATE_SECRET ||
    process.env.GEMINI_API_KEY ||
    process.env.MONGODB_URI ||
    "dev-oauth-state-secret"
  );
}

export function createOAuthState(provider, redirectUri) {
  const payload = JSON.stringify({
    provider,
    redirectUri,
    nonce: randomBytes(16).toString("hex"),
    ts: Date.now()
  });
  const signature = createHmac("sha256", stateSecret()).update(payload).digest("hex");
  const encoded = Buffer.from(payload).toString("base64url");
  return `${encoded}.${signature}`;
}

export function verifyOAuthState(state, expectedProvider) {
  if (!state || typeof state !== "string") return null;

  const [encoded, signature] = state.split(".");
  if (!encoded || !signature) return null;

  let payload;
  try {
    payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  const expectedSig = createHmac("sha256", stateSecret()).update(JSON.stringify(payload)).digest("hex");
  const sigBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expectedSig, "hex");
  if (sigBuffer.length !== expectedBuffer.length || !timingSafeEqual(sigBuffer, expectedBuffer)) {
    return null;
  }

  if (payload.provider !== expectedProvider) return null;
  if (Date.now() - payload.ts > 10 * 60 * 1000) return null;

  return { redirectUri: payload.redirectUri };
}

export function buildGoogleAuthUrl(req) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("GOOGLE_CLIENT_ID is not configured.");

  const redirectUri = oauthRedirectUri("google", req);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "online",
    prompt: "select_account",
    state: createOAuthState("google", redirectUri)
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export function buildGitHubAuthUrl(req) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) throw new Error("GITHUB_CLIENT_ID is not configured.");

  const redirectUri = oauthRedirectUri("github", req);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "user:email",
    state: createOAuthState("github", redirectUri)
  });

  return `${GITHUB_AUTH_URL}?${params.toString()}`;
}

export async function exchangeGoogleCode(code, redirectUri) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth is not fully configured.");
  }

  const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code"
    })
  });

  const tokenData = await tokenResponse.json();
  if (!tokenResponse.ok) {
    throw new Error(tokenData.error_description || tokenData.error || "Google token exchange failed.");
  }

  const profileResponse = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` }
  });
  const profile = await profileResponse.json();
  if (!profileResponse.ok || !profile.email) {
    throw new Error("Could not load Google profile.");
  }

  return {
    provider: "google",
    providerId: String(profile.sub),
    email: String(profile.email).toLowerCase(),
    name: String(profile.name || profile.email.split("@")[0]),
    avatarUrl: profile.picture || null
  };
}

export async function exchangeGitHubCode(code, redirectUri) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GitHub OAuth is not fully configured.");
  }

  const tokenResponse = await fetch(GITHUB_TOKEN_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri
    })
  });

  const tokenData = await tokenResponse.json();
  if (!tokenResponse.ok || !tokenData.access_token) {
    throw new Error(tokenData.error_description || tokenData.error || "GitHub token exchange failed.");
  }

  const headers = {
    Authorization: `Bearer ${tokenData.access_token}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "ai-software-compiler"
  };

  const profileResponse = await fetch(GITHUB_USER_URL, { headers });
  const profile = await profileResponse.json();
  if (!profileResponse.ok) {
    throw new Error("Could not load GitHub profile.");
  }

  let email = profile.email ? String(profile.email).toLowerCase() : "";
  if (!email) {
    const emailsResponse = await fetch(GITHUB_EMAILS_URL, { headers });
    const emails = await emailsResponse.json();
    if (emailsResponse.ok && Array.isArray(emails)) {
      const primary = emails.find((item) => item.primary && item.verified);
      const verified = emails.find((item) => item.verified);
      email = String((primary || verified || emails[0])?.email || "").toLowerCase();
    }
  }

  if (!email) {
    throw new Error("GitHub did not return a verified email. Make email visible to this app.");
  }

  return {
    provider: "github",
    providerId: String(profile.id),
    email,
    name: String(profile.name || profile.login || email.split("@")[0]),
    avatarUrl: profile.avatar_url || null
  };
}

export function buildFrontendSuccessRedirect(token, req) {
  const base = getRequestBaseUrl(req);
  const params = new URLSearchParams({ auth_token: token });
  return `${base}/?${params.toString()}`;
}

export function buildFrontendErrorRedirect(message, req) {
  const base = req ? getRequestBaseUrl(req) : getAppBaseUrl();
  const params = new URLSearchParams({ auth_error: message });
  return `${base}/?${params.toString()}`;
}

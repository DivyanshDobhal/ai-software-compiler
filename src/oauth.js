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
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:5173";
}

export function oauthCallbackUrl(provider) {
  return `${getAppBaseUrl()}/api/auth/${provider}/callback`;
}

export function oauthRedirectUri(provider) {
  return oauthCallbackUrl(provider);
}

function stateSecret() {
  return (
    process.env.OAUTH_STATE_SECRET ||
    process.env.GEMINI_API_KEY ||
    process.env.MONGODB_URI ||
    "dev-oauth-state-secret"
  );
}

export function createOAuthState(provider) {
  const payload = JSON.stringify({
    provider,
    nonce: randomBytes(16).toString("hex"),
    ts: Date.now()
  });
  const signature = createHmac("sha256", stateSecret()).update(payload).digest("hex");
  const encoded = Buffer.from(payload).toString("base64url");
  return `${encoded}.${signature}`;
}

export function verifyOAuthState(state, expectedProvider) {
  if (!state || typeof state !== "string") return false;

  const [encoded, signature] = state.split(".");
  if (!encoded || !signature) return false;

  let payload;
  try {
    payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  } catch {
    return false;
  }

  const expectedSig = createHmac("sha256", stateSecret()).update(JSON.stringify(payload)).digest("hex");
  const sigBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expectedSig, "hex");
  if (sigBuffer.length !== expectedBuffer.length || !timingSafeEqual(sigBuffer, expectedBuffer)) {
    return false;
  }

  if (payload.provider !== expectedProvider) return false;
  if (Date.now() - payload.ts > 10 * 60 * 1000) return false;

  return true;
}

export function buildGoogleAuthUrl() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("GOOGLE_CLIENT_ID is not configured.");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: oauthRedirectUri("google"),
    response_type: "code",
    scope: "openid email profile",
    access_type: "online",
    prompt: "select_account",
    state: createOAuthState("google")
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export function buildGitHubAuthUrl() {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) throw new Error("GITHUB_CLIENT_ID is not configured.");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: oauthRedirectUri("github"),
    scope: "user:email",
    state: createOAuthState("github")
  });

  return `${GITHUB_AUTH_URL}?${params.toString()}`;
}

export async function exchangeGoogleCode(code) {
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
      redirect_uri: oauthRedirectUri("google"),
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

export async function exchangeGitHubCode(code) {
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
      redirect_uri: oauthRedirectUri("github")
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

export function buildFrontendSuccessRedirect(token) {
  const base = getAppBaseUrl();
  const params = new URLSearchParams({ auth_token: token });
  return `${base}/?${params.toString()}`;
}

export function buildFrontendErrorRedirect(message) {
  const base = getAppBaseUrl();
  const params = new URLSearchParams({ auth_error: message });
  return `${base}/?${params.toString()}`;
}

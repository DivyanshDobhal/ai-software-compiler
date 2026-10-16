import {
  compileApplication,
  repairSchemas,
  simulateRuntime,
  validateSchemas
} from "../src/compiler.js";
import { findUserByToken } from "../src/auth-db.js";
import { bearerToken } from "./auth.js";
import { requestGeminiWithFallback } from "../src/gemini-client.js";
import { requestGroqChat } from "../src/groq-client.js";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const GEMINI_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS || 45_000);
const GEMINI_FALLBACK_MODELS = ["gemini-3.7-flash", "gemini-3.6-flash", "gemini-3.5-flash-lite"];
const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const prompt = String(body.prompt || "").trim();
    const compileMode = String(body.compileMode || "gemini").toLowerCase();
    const requestedProvider = String(body.providerChoice || "auto").toLowerCase();
    const providerChoice = ["auto", "gemini", "groq", "local"].includes(requestedProvider) ? requestedProvider : "auto";

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const user = await findUserByToken(bearerToken(req));
    if (!user) {
      return res.status(401).json({ error: "Login is required to compile applications." });
    }

    const customApiKey =
      body.geminiApiKey || req.headers["x-gemini-api-key"] || req.headers["X-Gemini-API-Key"] || "";

    const output = await compilePrompt(prompt, customApiKey, compileMode, providerChoice);
    return res.status(200).json(formatResponse(output));
  } catch (error) {
    const status = error?.status === 429 || [408, 500, 502, 503, 504].includes(error?.status) ? 503 : 500;
    return res.status(status).json({
      error: "Compilation failed",
      detail: status === 503
        ? "AI providers are temporarily busy. The compiler retried its available models; please retry shortly or choose Local Compiler."
        : error instanceof Error ? error.message : "Unknown error"
    });
  }
}

export async function compilePrompt(prompt, customApiKey, compileMode, providerChoice = "auto") {
  const startedAt = Date.now();
  const deterministic = compileApplication(prompt, { injectFault: false });

  if (compileMode === "local") {
    return {
      ...deterministic,
      provider: {
        mode: "deterministic",
        model: "local-compiler"
      }
    };
  }

  const apiKey = process.env.GEMINI_API_KEY || customApiKey;
  const groqApiKey = process.env.GROQ_API_KEY;
  const selectedProvider = compileMode === "local" ? "local" : providerChoice;
  if (selectedProvider === "local") {
    return {
      ...deterministic,
      provider: {
        mode: "deterministic",
        model: "local-compiler"
      }
    };
  }

  if (selectedProvider === "groq" || (selectedProvider === "auto" && !apiKey && groqApiKey)) {
    if (!groqApiKey) throw new Error("Groq is not configured on the server. Select Automatic, Gemini, or Local.");
  } else if (!apiKey) {
    if (selectedProvider === "gemini") throw new Error("Gemini is not configured on the server. Select Automatic, Groq, or Local.");
    return {
      ...deterministic,
      provider: { mode: "local-fallback", model: "deterministic", reason: "No AI provider key is configured on the server." }
    };
  }

  try {
    let generatedBundle;
    let usedModel;
    let usedProvider = selectedProvider === "groq" || (selectedProvider === "auto" && !apiKey) ? "groq" : "gemini-live";
    let localFallbackReason = "";
    if (usedProvider === "groq") {
      ({ generatedBundle, usedModel } = await requestGroqBundle(prompt, deterministic, groqApiKey));
    } else {
      try {
        ({ generatedBundle, usedModel } = await requestGeminiBundle(prompt, deterministic, apiKey));
      } catch (error) {
        if (selectedProvider === "auto" && groqApiKey && (error?.invalidJson || isTransientProviderError(error))) {
        const groqResult = await requestGroqBundle(prompt, deterministic, groqApiKey);
        generatedBundle = groqResult.generatedBundle;
        usedModel = groqResult.usedModel;
        usedProvider = "groq-fallback";
        } else if (error?.invalidJson) {
          generatedBundle = { intent: deterministic.intent, design: deterministic.design, schemas: deterministic.schemas };
          usedModel = "deterministic-fallback";
          usedProvider = "local-fallback";
          localFallbackReason = "AI providers returned invalid JSON; the local compiler produced this blueprint.";
        } else {
          throw error;
        }
      }
    }

    if (!generatedBundle) throw new Error("Gemini returned no blueprint.");
    const validation = validateSchemas(generatedBundle);
    const repair = repairSchemas(generatedBundle, validation);
    const finalValidation = validateSchemas({
      intent: generatedBundle.intent,
      design: generatedBundle.design,
      schemas: repair.schemas
    });
    const runtime = simulateRuntime(repair.schemas, finalValidation);

    return {
      ok: finalValidation.errors.length === 0 && runtime.ok,
      input: prompt,
      intent: generatedBundle.intent,
      design: generatedBundle.design,
      schemas: repair.schemas,
      validation: {
        ...finalValidation,
        originalIssues: validation.errors,
        repaired: repair.applied.length > 0,
        repairs: repair.applied
      },
      runtime,
      metrics: {
        latencyMs: Date.now() - startedAt,
        stageTimings: deterministic.metrics.stageTimings,
        retries: repair.applied.length,
        deterministic: usedProvider === "local-fallback",
        costTier: usedProvider === "local-fallback" ? "local-fallback" : usedProvider
      },
      provider: {
        mode: usedProvider,
        model: usedModel,
        fallbackUsed: usedProvider !== "gemini-live" || usedModel !== GEMINI_MODEL,
        ...(localFallbackReason ? { reason: localFallbackReason } : {})
      }
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gemini request failed";
    const safeMessage = [apiKey, process.env.GROQ_API_KEY].filter(Boolean)
      .reduce((current, secret) => current.replaceAll(secret, "[REDACTED]"), message);
    const safeError = new Error(safeMessage);
    if (error?.status) safeError.status = error.status;
    throw safeError;
  }
}

async function requestGeminiBundle(prompt, seed, apiKey) {
  const models = [...new Set([GEMINI_MODEL, ...GEMINI_FALLBACK_MODELS])];
  const deadline = Date.now() + 35_000;
  let invalidJsonError;
  let transientError;

  for (const model of models) {
    const remainingMs = deadline - Date.now();
    if (remainingMs < 1_000) break;
    let payload;
    try {
      ({ payload } = await requestGeminiWithFallback({
        apiKey,
        models: [model],
        timeoutMs: Math.min(GEMINI_TIMEOUT_MS, remainingMs),
        maxDurationMs: remainingMs,
        body: {
          system_instruction: { parts: [{ text: "You are one stage inside a software compiler. Return one complete, valid JSON object only. Never truncate or add markdown. Match the requested object shape exactly." }] },
          contents: [{ role: "user", parts: [{ text: buildCompilerPrompt(prompt, seed) }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 8192, responseMimeType: "application/json" }
        }
      }));
    } catch (error) {
      if (!isTransientProviderError(error)) throw error;
      transientError = error;
      continue;
    }
    const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("") || "";
    try {
      if (!text.trim()) throw new Error("Gemini returned an empty completion.");
      return { generatedBundle: normalizeBundle(parseJson(text), seed), usedModel: model };
    } catch (error) {
      invalidJsonError = error;
    }
  }

  if (transientError) throw transientError;
  const error = new Error(`Gemini returned invalid JSON across available models: ${invalidJsonError?.message || "empty completion"}`);
  error.invalidJson = true;
  throw error;
}

async function requestGroqBundle(prompt, seed, apiKey) {
  const response = await requestGroqChat({
    apiKey,
    model: GROQ_MODEL,
    messages: [
      { role: "system", content: "You are one stage inside a software compiler. Return one complete, valid JSON object only. Never truncate or add markdown. Match the requested object shape exactly." },
      { role: "user", content: buildCompilerPrompt(prompt, seed) }
    ],
    responseFormat: { type: "json_object" },
    maxTokens: 16_384,
    timeoutMs: Math.min(GEMINI_TIMEOUT_MS, 20_000)
  });
  const text = response.choices?.[0]?.message?.content || "";
  if (!text.trim()) throw new Error("Groq returned an empty completion.");
  return { generatedBundle: normalizeBundle(parseJson(text), seed), usedModel: GROQ_MODEL };
}

function isTransientProviderError(error) {
  return [408, 429, 500, 502, 503, 504].includes(error?.status) || error?.name === "TimeoutError" || error?.name === "AbortError";
}

function formatResponse(output) {
  return {
    ...output,
    architecture: output.design,
    status: "success",
    validation: {
      warnings: [],
      ...output.validation,
      errors: output.validation?.errors ?? []
    }
  };
}

function buildCompilerPrompt(prompt, seed) {
  return `You are one stage inside a software compiler. Return ONLY valid JSON.

Convert the product prompt into a complete executable app configuration.

Hard requirements:
- Keep all top-level keys: intent, design, schemas.
- schemas must contain: ui_schema, api_schema, db_schema, auth_schema, business_logic.
- Every API endpoint resource must exist as a DB table.
- Every API body field must exist as a DB column.
- Every UI page role must exist in auth_schema.roles, except guest is allowed.
- Every UI api_dependency path must exist in api_schema.endpoints.
- Every business_logic affected entity must exist as a DB table.
- Use REST endpoints and relational table semantics.
- If requirements are vague or conflicting, document assumptions and ambiguities instead of failing.

JSON shape example and deterministic seed:
${JSON.stringify(
  {
    intent: seed.intent,
    design: seed.design,
    schemas: seed.schemas
  },
  null,
  2
)}

User prompt:
${prompt}`;
}

export function parseJson(text) {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try { return JSON.parse(trimmed); } catch (directError) {
    const start = trimmed.indexOf("{");
    if (start < 0) throw new Error("Gemini did not return a JSON object.");
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let index = start; index < trimmed.length; index += 1) {
      const character = trimmed[index];
      if (inString) {
        if (escaped) escaped = false;
        else if (character === "\\") escaped = true;
        else if (character === '"') inString = false;
        continue;
      }
      if (character === '"') inString = true;
      else if (character === "{") depth += 1;
      else if (character === "}" && --depth === 0) return JSON.parse(trimmed.slice(start, index + 1));
    }
    throw directError;
  }
}

function normalizeBundle(parsed, seed) {
  return {
    intent: parsed.intent || seed.intent,
    design: parsed.design || seed.design,
    schemas: {
      ui_schema: parsed.schemas?.ui_schema || seed.schemas.ui_schema,
      api_schema: parsed.schemas?.api_schema || seed.schemas.api_schema,
      db_schema: parsed.schemas?.db_schema || seed.schemas.db_schema,
      auth_schema: parsed.schemas?.auth_schema || seed.schemas.auth_schema,
      business_logic: parsed.schemas?.business_logic || seed.schemas.business_logic
    }
  };
}

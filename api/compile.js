import {
  compileApplication,
  repairSchemas,
  simulateRuntime,
  validateSchemas
} from "../src/compiler.js";
import { findUserByToken } from "../src/auth-db.js";
import { bearerToken } from "./auth.js";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const prompt = String(body.prompt || "").trim();

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const user = await findUserByToken(bearerToken(req));
    if (!user) {
      return res.status(401).json({ error: "Login is required to compile applications." });
    }

    const customApiKey = body.geminiApiKey || req.headers["x-gemini-api-key"] || req.headers["X-Gemini-API-Key"] || "";

    const output = await compileWithGemini(prompt, customApiKey);
    return res.status(200).json(output);
  } catch (error) {
    return res.status(500).json({
      error: "Compilation failed",
      detail: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

async function compileWithGemini(prompt, customApiKey) {
  const startedAt = Date.now();
  const deterministic = compileApplication(prompt, { injectFault: false });
  const apiKey = customApiKey || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return {
      ...deterministic,
      provider: {
        mode: "local-fallback",
        model: "deterministic",
        reason: "GEMINI_API_KEY is not configured on the server."
      }
    };
  }

  try {
    const geminiBundle = await requestGeminiBundle(prompt, deterministic, apiKey);
    const validation = validateSchemas(geminiBundle);
    const repair = repairSchemas(geminiBundle, validation);
    const finalValidation = validateSchemas({
      intent: geminiBundle.intent,
      design: geminiBundle.design,
      schemas: repair.schemas
    });
    const runtime = simulateRuntime(repair.schemas, finalValidation);

    return {
      ok: finalValidation.errors.length === 0 && runtime.ok,
      input: prompt,
      intent: geminiBundle.intent,
      design: geminiBundle.design,
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
        stageTimings: [
          { name: "Intent Extraction", ms: deterministic.metrics.stageTimings[0]?.ms || 0 },
          { name: "System Design", ms: deterministic.metrics.stageTimings[1]?.ms || 0 },
          { name: "Schema Generation", ms: Math.max(0, Date.now() - startedAt) },
          { name: "Validation + Repair", ms: 0 },
          { name: "Runtime Execution", ms: 0 }
        ],
        retries: repair.applied.length,
        deterministic: false,
        costTier: "gemini-live"
      },
      provider: {
        mode: "gemini-live",
        model: GEMINI_MODEL,
        fallbackUsed: false
      }
    };
  } catch (error) {
    return {
      ...deterministic,
      provider: {
        mode: "local-fallback",
        model: "deterministic",
        fallbackUsed: true,
        reason: error instanceof Error ? error.message : "Gemini request failed"
      }
    };
  }
}

async function requestGeminiBundle(prompt, seed, apiKey) {
  const response = await fetch(GEMINI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: buildCompilerPrompt(prompt, seed)
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json"
      }
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Gemini ${response.status}: ${detail.slice(0, 240)}`);
  }

  const payload = await response.json();
  const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("") || "";
  const parsed = parseJson(text);
  return normalizeBundle(parsed, seed);
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
${JSON.stringify({
  intent: seed.intent,
  design: seed.design,
  schemas: seed.schemas
}, null, 2)}

User prompt:
${prompt}`;
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Gemini did not return JSON.");
    return JSON.parse(match[0]);
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

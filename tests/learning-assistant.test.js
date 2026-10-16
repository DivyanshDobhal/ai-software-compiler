import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import handler, { consumeRateLimit, readDataset } from "../api/learning-assistant.js";
import { buildFallbackAnswer, retrieveKnowledge, sanitizePageContext, validateChatRequest, validateDataset } from "../src/learning-assistant.js";

const records = readDataset();

function mockResponse() {
  return {
    statusCode: 200,
    headers: {},
    setHeader(key, value) { this.headers[key] = value; return this; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
}

test("dataset is valid, exceeds 100 entries, and includes all required categories", () => {
  const report = validateDataset(records);
  assert.equal(report.valid, true, report.errors.join("\n"));
  assert.ok(records.length >= 100);
  assert.equal(new Set(records.map(({ category }) => category)).size, 14);
});

test("retrieval ranks direct and paraphrased studio questions", () => {
  assert.equal(retrieveKnowledge("What does validation check?", records)[0].id, "valid_001");
  assert.equal(retrieveKnowledge("Can it publish a complete production app?", records)[0].id, "flow_004");
  assert.equal(retrieveKnowledge("Explain server side versus browser code", records)[0].id, "concept_001");
});

test("unsupported questions get an honest fallback instead of an invented feature", () => {
  const matches = retrieveKnowledge("Can this connect to my bank and move cash", records);
  assert.match(buildFallbackAnswer(matches), /couldn’t find enough verified information/i);
});

test("chat request validation rejects empty, excessive, and malformed context", () => {
  assert.equal(validateChatRequest({ message: "  " }).status, 400);
  assert.equal(validateChatRequest({ message: "x".repeat(4001) }).status, 413);
  assert.equal(validateChatRequest({ message: "hello", context: "secret" }).status, 400);
  assert.equal(validateChatRequest({ message: " hello " }).message, "hello");
  assert.equal(validateChatRequest({ message: "hello", mode: "run-shell" }).mode, "explain");
});

test("page context accepts only safe allowlisted values", () => {
  assert.deepEqual(sanitizePageContext({ section: "validation-engine", audience: "student", experience: "learning", goal: "academic", prompt: "private project" }), { section: "validation-engine", audience: "student", experience: "learning", goal: "academic" });
  assert.deepEqual(sanitizePageContext({ section: "../secret", audience: "token" }), {});
});

test("retrieval excludes unverified product claims", () => {
  const unverified = [{ id: "unknown_001", question: "Does the app support drones?", answer: "Yes.", keywords: ["drone"], category: "unknown", related_feature: "unknown", verified: false }];
  assert.deepEqual(retrieveKnowledge("Does this support drones?", unverified), []);
});

test("in-memory rate limiter allows 15 requests and rejects the next", () => {
  const ip = `test-${Math.random()}`;
  for (let index = 0; index < 15; index += 1) assert.equal(consumeRateLimit(ip, 100_000), true);
  assert.equal(consumeRateLimit(ip, 100_000), false);
  assert.equal(consumeRateLimit(ip, 161_000), true);
});

test("API rejects unsupported methods and invalid messages", async () => {
  const methodResponse = mockResponse();
  await handler({ method: "GET", headers: {} }, methodResponse);
  assert.equal(methodResponse.statusCode, 405);
  assert.equal(methodResponse.headers.Allow, "POST");

  const invalidResponse = mockResponse();
  await handler({ method: "POST", headers: { "x-forwarded-for": "test-invalid" }, body: { message: " " } }, invalidResponse);
  assert.equal(invalidResponse.statusCode, 400);
});

test("API rejects oversized requests and labels Gemini responses", async () => {
  const sizeResponse = mockResponse();
  await handler({ method: "POST", headers: { "content-length": "10001", "x-forwarded-for": "test-size" }, body: { message: "hello" } }, sizeResponse);
  assert.equal(sizeResponse.statusCode, 413);

  const previousKey = process.env.GEMINI_API_KEY;
  const previousFetch = globalThis.fetch;
  process.env.GEMINI_API_KEY = "unit-test-placeholder";
  let capturedPayload;
  globalThis.fetch = async (_url, options) => {
    capturedPayload = JSON.parse(options.body);
    return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: "Grounded mock answer." }] } }] }) };
  };
  const response = mockResponse();
  try {
    await handler({ method: "POST", headers: { "x-forwarded-for": "test-provider-success" }, body: { message: "What is the runtime preview?", mode: "walkthrough", context: { section: "runtime-generator", prompt: "private project text" } } }, response);
  } finally {
    if (previousKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previousKey;
    globalThis.fetch = previousFetch;
  }
  assert.equal(response.body.source, "gemini");
  assert.match(capturedPayload.system_instruction.parts[0].text, /untrusted data/);
  const userPayload = JSON.parse(capturedPayload.contents[0].parts[0].text);
  assert.equal(userPayload.learningMode, "walkthrough");
  assert.deepEqual(userPayload.safePageContext, { section: "runtime-generator" });
  assert.equal(JSON.stringify(userPayload).includes("private project text"), false);
});

test("API uses deterministic dataset fallback when the model key is absent", async () => {
  const previousKey = process.env.GEMINI_API_KEY;
  const previousFetch = globalThis.fetch;
  delete process.env.GEMINI_API_KEY;
  const response = mockResponse();
  try {
    await handler({ method: "POST", headers: { "x-forwarded-for": "test-fallback" }, body: { message: "What is the runtime preview?", context: { section: "runtime-generator", prompt: "must not be sent" } } }, response);
  } finally {
    if (previousKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previousKey;
    globalThis.fetch = previousFetch;
  }
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.source, "dataset");
  assert.match(response.body.answer, /mockup/i);
});

test("model failure returns a labeled deterministic fallback", async () => {
  const previousKey = process.env.GEMINI_API_KEY;
  const previousFetch = globalThis.fetch;
  process.env.GEMINI_API_KEY = "unit-test-placeholder";
  globalThis.fetch = async () => ({ ok: false, status: 503 });
  const response = mockResponse();
  try {
    await handler({ method: "POST", headers: { "x-forwarded-for": "test-provider-failure" }, body: { message: "What happens when NVIDIA is unavailable?" } }, response);
  } finally {
    if (previousKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previousKey;
    globalThis.fetch = previousFetch;
  }
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.source, "dataset-fallback");
  assert.match(response.body.answer, /local knowledge search/i);
});

test("the product mounts one compiler workspace before and after authentication", () => {
  const source = readFileSync(join(process.cwd(), "src/main.jsx"), "utf8");
  assert.match(source, /<Dashboard/);
  assert.match(source, /<AuthDialog/);
  assert.match(source, /onAuthRequired=\{openSignIn\}/);
  assert.match(source, /function AITopNavbar/);
  assert.match(source, /function StudioHero/);
  assert.match(source, /LearningAssistantWidget/);
  assert.match(source, /learning-assistant-widget\.jsx/);
});

test("evaluation set includes at least 30 valid cases across required risk classes", () => {
  const evaluations = readFileSync(join(process.cwd(), "data/ai_learning_assistant_eval.jsonl"), "utf8").trim().split(/\r?\n/).map(JSON.parse);
  assert.ok(evaluations.length >= 30);
  for (const kind of ["known", "paraphrase", "ambiguous", "unsupported", "prompt_injection", "invalid_empty", "invalid_too_long", "provider_failure", "student"]) {
    assert.ok(evaluations.some((item) => item.kind === kind), `missing ${kind} evaluation`);
  }
  for (const item of evaluations.filter(({ expectedRecord }) => expectedRecord)) {
    assert.ok(records.some(({ id }) => id === item.expectedRecord), `missing ${item.expectedRecord}`);
    assert.equal(retrieveKnowledge(item.question, records)[0]?.id, item.expectedRecord, `unexpected top match for ${item.id}`);
  }
  assert.equal(evaluations.find(({ kind }) => kind === "invalid_empty").question, "");
  assert.ok(evaluations.find(({ kind }) => kind === "invalid_too_long").question.length > 4000);
});

import test from "node:test";
import assert from "node:assert/strict";
import { requestGeminiWithFallback } from "../src/gemini-client.js";

test("Gemini client retries a transient overload and then selects a stable fallback", async () => {
  const calls = [];
  const result = await requestGeminiWithFallback({
    apiKey: "test-key",
    models: ["gemini-3.8-flash", "gemini-3.7-flash"],
    body: { contents: [] },
    timeoutMs: 1000,
    maxDurationMs: 2000,
    fetchImpl: async (url) => {
      calls.push(url);
      if (calls.length < 3) {
        return { ok: false, status: 503, headers: { get: () => "0.001" }, text: async () => "busy" };
      }
      return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: "ok" }] } }] }) };
    }
  });

  assert.equal(result.model, "gemini-3.7-flash");
  assert.equal(calls.length, 3);
  assert.match(calls[0], /gemini-3.8-flash/);
  assert.match(calls[2], /gemini-3.7-flash/);
});

test("Gemini client does not retry permanent client errors", async () => {
  let calls = 0;
  await assert.rejects(
    requestGeminiWithFallback({
      apiKey: "test-key",
      models: ["gemini-3.8-flash", "gemini-3.7-flash"],
      body: { contents: [] },
      timeoutMs: 1000,
      fetchImpl: async () => {
        calls += 1;
        return { ok: false, status: 400, text: async () => "invalid request" };
      }
    }),
    /Gemini 400: invalid request/
  );
  assert.equal(calls, 1);
});

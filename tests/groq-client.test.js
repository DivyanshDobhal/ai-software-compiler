import test from "node:test";
import assert from "node:assert/strict";
import { requestGroqChat } from "../src/groq-client.js";

test("Groq client sends the configured model and JSON response mode", async () => {
  let request;
  const payload = await requestGroqChat({
    apiKey: "unit-test-key",
    model: "openai/gpt-oss-120b",
    messages: [{ role: "user", content: "Build an app" }],
    responseFormat: { type: "json_object" },
    maxTokens: 1024,
    fetchImpl: async (_url, options) => {
      request = options;
      return { ok: true, json: async () => ({ choices: [{ message: { content: "{}" } }] }) };
    }
  });

  assert.equal(payload.choices[0].message.content, "{}");
  assert.equal(request.headers.Authorization, "Bearer unit-test-key");
  assert.deepEqual(JSON.parse(request.body).response_format, { type: "json_object" });
  assert.equal(JSON.parse(request.body).model, "openai/gpt-oss-120b");
});

test("Groq client retries transient service errors but does not retry invalid requests", async () => {
  let calls = 0;
  await assert.rejects(requestGroqChat({
    apiKey: "unit-test-key",
    model: "openai/gpt-oss-120b",
    messages: [],
    fetchImpl: async () => {
      calls += 1;
      return calls === 1
        ? { ok: false, status: 503, headers: { get: () => "0.001" }, text: async () => "busy" }
        : { ok: false, status: 400, text: async () => "invalid request" };
    }
  }), /Groq 400: invalid request/);
  assert.equal(calls, 2);
});

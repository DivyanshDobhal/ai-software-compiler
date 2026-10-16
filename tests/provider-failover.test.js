import test from "node:test";
import assert from "node:assert/strict";
import { compilePrompt } from "../api/compile.js";
import { compileApplication } from "../src/compiler.js";

test("Automatic compiler switches from overloaded Gemini to Groq", async () => {
  const oldGeminiKey = process.env.GEMINI_API_KEY;
  const oldGroqKey = process.env.GROQ_API_KEY;
  const oldFetch = globalThis.fetch;
  process.env.GEMINI_API_KEY = "gemini-test-key";
  process.env.GROQ_API_KEY = "groq-test-key";
  const prompt = "Build a small reading list app with tags and notes";
  const seed = compileApplication(prompt, { injectFault: false });
  let geminiCalls = 0;
  let groqCalls = 0;
  globalThis.fetch = async (url) => {
    if (String(url).includes("generativelanguage.googleapis.com")) {
      geminiCalls += 1;
      return { ok: false, status: 503, headers: { get: () => "0.001" }, text: async () => "busy" };
    }
    groqCalls += 1;
    return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify({ intent: seed.intent, design: seed.design, schemas: seed.schemas }) } }] }) };
  };

  try {
    const output = await compilePrompt(prompt, "", "gemini", "auto");
    assert.equal(output.provider.mode, "groq-fallback");
    assert.equal(output.provider.model, "openai/gpt-oss-120b");
    assert.ok(geminiCalls > 0);
    assert.equal(groqCalls, 1);
  } finally {
    if (oldGeminiKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = oldGeminiKey;
    if (oldGroqKey === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = oldGroqKey;
    globalThis.fetch = oldFetch;
  }
});

test("explicit Groq selection skips Gemini", async () => {
  const oldGeminiKey = process.env.GEMINI_API_KEY;
  const oldGroqKey = process.env.GROQ_API_KEY;
  const oldFetch = globalThis.fetch;
  process.env.GEMINI_API_KEY = "gemini-test-key";
  process.env.GROQ_API_KEY = "groq-test-key";
  const prompt = "Build a small reading list app with tags and notes";
  const seed = compileApplication(prompt, { injectFault: false });
  let calls = 0;
  globalThis.fetch = async (url) => {
    calls += 1;
    assert.match(String(url), /api\.groq\.com/);
    return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify({ intent: seed.intent, design: seed.design, schemas: seed.schemas }) } }] }) };
  };

  try {
    const output = await compilePrompt(prompt, "", "gemini", "groq");
    assert.equal(output.provider.mode, "groq");
    assert.equal(calls, 1);
  } finally {
    if (oldGeminiKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = oldGeminiKey;
    if (oldGroqKey === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = oldGroqKey;
    globalThis.fetch = oldFetch;
  }
});

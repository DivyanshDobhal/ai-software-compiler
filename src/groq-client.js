const TRANSIENT_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

export async function requestGroqChat({ apiKey, model = "openai/gpt-oss-120b", messages, responseFormat, maxTokens, timeoutMs = 25_000, fetchImpl = fetch }) {
  let lastError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetchImpl("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages,
          ...(responseFormat ? { response_format: responseFormat } : {}),
          ...(maxTokens ? { max_completion_tokens: maxTokens } : {}),
          temperature: 0.1
        }),
        signal: AbortSignal.timeout(timeoutMs)
      });

      if (!response.ok) {
        const detail = await response.text();
        const error = new Error(`Groq ${response.status}: ${detail.slice(0, 240)}`);
        error.status = response.status;
        if (!TRANSIENT_STATUSES.has(error.status)) throw error;
        lastError = error;
        if (attempt === 0) await waitBeforeRetry(response.headers?.get?.("retry-after"));
        continue;
      }

      return await response.json();
    } catch (error) {
      if (error?.status && !TRANSIENT_STATUSES.has(error.status)) throw error;
      lastError = error;
      if (attempt === 0) await waitBeforeRetry();
    }
  }
  throw lastError || new Error("Groq request failed.");
}

async function waitBeforeRetry(retryAfter) {
  const seconds = Number(retryAfter);
  const delay = Number.isFinite(seconds) && seconds > 0 ? Math.min(1200, seconds * 1000) : 300 + Math.floor(Math.random() * 300);
  await new Promise((resolve) => setTimeout(resolve, delay));
}

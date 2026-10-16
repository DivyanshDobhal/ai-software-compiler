const TRANSIENT_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

/** Send one Gemini request, retry brief service spikes, then try stable fallbacks. */
export async function requestGeminiWithFallback({ apiKey, models, body, timeoutMs, maxDurationMs = 55_000, fetchImpl = fetch }) {
  const candidates = [...new Set(models.filter(Boolean))];
  let lastError;
  const deadline = Date.now() + maxDurationMs;

  for (const model of candidates) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const remainingMs = deadline - Date.now();
      if (remainingMs < 1_000) break;
      try {
        const response = await fetchImpl(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(Math.min(timeoutMs, remainingMs))
          }
        );

        if (!response.ok) {
          const detail = await response.text();
          const error = new Error(`Gemini ${response.status}: ${detail.slice(0, 240)}`);
          error.status = response.status;
          if (!TRANSIENT_STATUSES.has(response.status)) throw error;
          lastError = error;
          if (attempt === 0) await waitBeforeRetry(response.headers?.get?.("retry-after"), deadline);
          continue;
        }

        return { payload: await response.json(), model };
      } catch (error) {
        if (error?.status && !TRANSIENT_STATUSES.has(error.status)) throw error;
        lastError = error;
        if (attempt === 0) await waitBeforeRetry(undefined, deadline);
      }
    }
  }

  if (lastError) throw lastError;
  throw new Error("No Gemini models are configured.");
}

async function waitBeforeRetry(retryAfter, deadline) {
  const seconds = Number(retryAfter);
  const delay = Number.isFinite(seconds) && seconds > 0
    ? Math.min(1500, seconds * 1000)
    : 500 + Math.floor(Math.random() * 500);
  const boundedDelay = Math.min(delay, Math.max(0, deadline - Date.now() - 1000));
  if (boundedDelay > 0) await new Promise((resolve) => setTimeout(resolve, boundedDelay));
}

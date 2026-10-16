# AI Learning Assistant

The learning-assistant endpoint and dataset remain available, but the current product UI intentionally shows only the landing page and compiler workspace. There is no mounted chat panel or floating assistant button. The API can be connected to a future interface without changing its retrieval and security layers.

## Request flow

1. A client can send a message and small context object to `POST /api/learning-assistant`.
2. The endpoint validates the body, caps messages at 4,000 characters, sanitizes context against allowlists, and applies a best-effort per-IP limit of 15 requests per minute per server process.
3. `src/learning-assistant.js` ranks relevant records from `data/ai_learning_assistant.jsonl` with deterministic keyword matching.
4. When `NVIDIA_API_KEY` is configured and a relevant record is found, the endpoint sends the question, allowlisted context, and retrieved records to NVIDIA NIM. A server-side system instruction treats both the question and records as untrusted data and directs the model to stay grounded.
5. If no useful evidence exists, the key is missing, or the model request fails, the endpoint returns a deterministic dataset response.

There are no tools for shell execution, account changes, or production configuration. Chat history is not persisted. Page context excludes prompts, generated schemas, credentials, tokens, email addresses, and arbitrary browser state.

## Environment variables

The assistant reuses the server-side NVIDIA settings already used by compilation:

| Variable | Required | Purpose |
| --- | --- | --- |
| `NVIDIA_API_KEY` | No | Enables model-generated grounded answers. Dataset fallback works without it. |
| `NVIDIA_MODEL` | No | Model name; defaults to `meta/llama-3.3-70b-instruct`. |
| `NVIDIA_API_URL` | No | Chat completions endpoint; defaults to NVIDIA NIM. |
| `LEARNING_ASSISTANT_TIMEOUT_MS` | No | Provider timeout, bounded to 1–25 seconds; defaults to 20 seconds. |

Configure secrets only in the Vercel project environment settings or a local ignored `.env` file. Never add secret values to this repository or browser code.

## Dataset maintenance

The JSONL file contains one JSON object per line. Every row must include `id`, `category`, `question`, `answer`, `keywords`, `audience`, `difficulty`, `related_feature`, `follow_up_questions`, `source_file`, and boolean `verified`. Keep IDs and normalized questions unique. Cite the source file used to verify product behavior; use `verified: false` for claims that have not been checked against the implementation. General programming guidance can cite `curated_learning_content`.

After editing records, run:

```sh
node scripts/validate-learning-dataset.js
```

The validator checks JSON parsing, required fields, IDs, duplicate questions, non-empty answers, all 14 categories, and the 100-record minimum. Add new representative, paraphrased, unsupported, and student-oriented questions to `data/ai_learning_assistant_eval.jsonl`. Run `npm test` to exercise retrieval, endpoint validation/fallback, interface integration, dataset evaluation, and the existing compiler evaluation suite.

## Limits to keep documented

- In-memory IP rate limiting is best effort in serverless deployments. Use a shared store if a global abuse-control guarantee is needed.
- Keyword retrieval is deterministic and lightweight, not semantic embeddings. Rephrase questions with the studio's feature terms if no record is found.
- Answers can be incomplete. A `verified` record reflects a source review at the time it was written, not a guarantee that the product cannot change.
- The application creates schemas and a simulated preview; it does not generate and deploy a complete production app or persist project history.

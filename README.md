# AI Software Compiler

Natural language -> structured intermediate representation -> validated schemas -> executable runtime preview.

This project is a compact compiler-style system for software generation. It is intentionally built as a reliability/control problem instead of a single prompt demo.

## What It Builds

- Multi-stage generation pipeline
- Strict app configuration with UI, API, DB, auth, and business logic schemas
- Cross-layer validator
- Targeted repair engine
- Runtime simulator that boots routes, API resources, auth metadata, and in-memory DB tables
- Evaluation framework with 20 test prompts and metrics
- Browser UI for entering new prompts and inspecting JSON output

## Deploy on Vercel (production)

This app is built for [Vercel](https://vercel.com) only. The frontend is a static Vite build; APIs run as serverless functions (`api/auth.js`, `api/compile.js`, `api/generate.py`).

### 1. Connect GitHub

1. Push the repo to [github.com/DivyanshDobhal/ai-software-compiler](https://github.com/DivyanshDobhal/ai-software-compiler).
2. In the [Vercel dashboard](https://vercel.com/new), choose **Import Git Repository** and select that repo.
3. Vercel will detect `vercel.json` — leave **Build Command** as `npm run build` and **Output Directory** as `dist`.

### 2. Environment variables

In the Vercel project → **Settings → Environment Variables**, add:

| Variable | Required | Purpose |
|----------|----------|---------|
| `APP_URL` | Yes (for OAuth) | Production URL, e.g. `https://ai-software-compiler-seven.vercel.app` |
| `MONGODB_URI` | Yes (for auth) | MongoDB Atlas connection string |
| `GEMINI_API_KEY` | Yes (for AI generation) | Google Gemini API key; keep it server-side in Vercel |
| `GEMINI_MODEL` | No | Gemini model override |
| `GROQ_API_KEY` | No | Optional server-side failover provider key; keep it in Vercel secrets |
| `GROQ_MODEL` | No | Groq model override (defaults to `openai/gpt-oss-120b`) |

The dashboard AI model selector offers Automatic (Gemini, then Groq), Gemini, Groq, and Local modes. Automatic is the default and uses the server-side provider keys.
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | For Google sign-in | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | For GitHub sign-in | [GitHub Developer Settings](https://github.com/settings/developers) |
| `OAUTH_STATE_SECRET` | Yes (for OAuth) | Random server-side secret used to sign OAuth state |
| `AUTH_TOKEN_TTL_DAYS` | No | Session lifetime (default: 7 days) |

## AI Learning Assistant knowledge API

The verified knowledge base and server endpoint are available in `data/ai_learning_assistant.jsonl` and `api/learning-assistant.js`. The current interface intentionally uses only the landing page and compiler workspace. See [the assistant setup and dataset guide](docs/ai-learning-assistant.md) for privacy behavior, supported environment variables, validation, and extension steps.
| `OAUTH_STATE_SECRET` | Recommended | Random string used to sign OAuth state |
| `AUTH_TOKEN_TTL_DAYS` | No | Session lifetime (default: 7) |

### OAuth redirect URLs

Register these exact callback URLs in the provider consoles (the production host must match `APP_URL`):

- Google Cloud Console → OAuth client → **Authorized redirect URIs**: `https://ai-software-compiler-seven.vercel.app/api/auth/google/callback`
- GitHub Developer Settings → OAuth App → **Authorization callback URL**: `https://ai-software-compiler-seven.vercel.app/api/auth/github/callback`

The Google JavaScript origin is `https://ai-software-compiler-seven.vercel.app`; adding an origin does not register the OAuth callback. Redeploy after changing Vercel environment variables.

### 3. Deploy

Every push to `main` triggers a production deployment. The live URL will look like `https://ai-software-compiler.vercel.app`.

Run the offline evaluation suite (no server required):

```bash
npm test
```

## Architecture

The core system lives in `src/compiler.js`.

1. **Intent Extraction**
   Parses the user prompt into a structured IR:
   - app name
   - app type
   - features
   - roles
   - business rules
   - assumptions
   - ambiguities

2. **System Design Layer**
   Converts intent into architecture:
   - entities
   - fields
   - relationships
   - user flows
   - access-control matrix

3. **Schema Generation**
   Emits strict executable configuration:
   - `ui_schema`
   - `api_schema`
   - `db_schema`
   - `auth_schema`
   - `business_logic`

4. **Validation + Repair**
   Detects:
   - missing required layers
   - empty schema sections
   - API resources without DB tables
   - UI/API role mismatches
   - UI pages depending on missing endpoints
   - hallucinated API fields
   - business rules pointing at missing entities

   Repairs are targeted. For example, a hallucinated API body field is removed from the exact endpoint body schema; the full app is not blindly regenerated.

5. **Runtime Execution**
   Simulates a generated app by:
   - mounting routes
   - initializing in-memory tables
   - executing POST endpoints with generated records
   - checking auth roles
   - confirming UI pages have components and access metadata

## Determinism

The demo implementation is deterministic and local by design:

- same prompt -> same configuration
- no network dependency
- no stochastic model output
- no invalid JSON

In production, an LLM can be inserted inside each stage, but the validator, repair engine, and runtime simulator should remain the control plane.

## Evaluation

The evaluation suite is in `src/evaluation.js`.

Dataset:

- 10 realistic product prompts
- 10 edge-case prompts covering vague, conflicting, incomplete, and risky requirements

Tracked metrics:

- success rate
- latency
- repairs per request
- failure types
- runtime pass/fail
- cost/quality tradeoff

Current local result:

```txt
20/20 passing
100% success rate
5 auto-repaired cases
0 final validation failures
```

## Cost vs Quality Tradeoff

This version favors reliability and latency over open-ended creativity:

- Cost: zero per compile in local deterministic mode
- Latency: very low
- Quality: strong for common SaaS/product patterns
- Limitation: less flexible than a high-quality LLM for novel domains

A production version should use LLM calls for semantic richness, but only behind:

- structured output contracts
- per-stage validation
- partial regeneration
- cross-layer consistency checks
- runtime execution checks

## Submission Notes

For a Loom walkthrough, cover:

1. The browser prompt-to-runtime flow
2. Why the pipeline is split into stages
3. How validation catches cross-layer failures
4. How targeted repair works
5. How the runtime proves execution awareness
6. Evaluation metrics and cost/quality tradeoffs


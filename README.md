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

## Run Locally

```bash
npm start
```

Open `http://localhost:5173`.

Run the evaluation suite:

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


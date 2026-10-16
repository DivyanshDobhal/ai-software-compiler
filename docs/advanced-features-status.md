# Advanced Features Status

This is an incremental implementation. The dashboard remains one shared interface before and after sign-in. Production deployment was not performed.

## Implemented in this increment

- **Code workspace — partial:** A compile creates a starter React project plus the actual generated blueprint and schema artifacts. The dashboard has file search, editable files with lightweight syntax coloring, line diffs, AI edit proposals with explicit review/apply, and local restore points. AI proposals require an authenticated session and a server-side Gemini or Groq key. Likely credentials are blocked from proposal requests. No generated source is executed by the app server.
- **Static workspace checks — partial:** Checks JSON parsing, the starter component export, the package build script, and likely credential patterns. These are not a test runner and do not execute generated project code.
- **Project memory/version history — partial:** Snapshots are kept in browser storage under a key scoped to the signed-in account ID (or a separate guest key). They are device-local, not database-backed or synced across devices.
- **Live preview — partial/existing:** Existing preview renders generated UI-schema pages in the app's sandbox-style modal, with desktop/mobile width toggles and a reset control. It does not run the exported React files; this is a sample-data blueprint preview rather than an isolated browser runtime.
- **Architecture — partial/existing:** The compiler displays a conceptual architecture from generated blueprint data. Editing and synchronization to source code are not implemented.
- **Student learning — existing/partial:** The floating assistant uses the verified JSONL knowledge set. Guided exercises and interactive tutorials are not implemented.

## Not implemented or blocked

- Automated test generation and isolated execution/debugging: no isolated execution provider is configured. The workspace intentionally does not execute untrusted generated code.
- Durable project memory/version history: requires a project data model and user-scoped database persistence.
- GitHub repository import/branch/pull request operations: GitHub OAuth is for login only; repository authorization and API integration are not implemented.
- Provider deployment center: no hosting provider deployment integration is configured.
- Security/quality checks beyond basic local static checks: dependency auditing and isolated code scanning are not implemented.
- API request playground and live database relationship editing: only blueprint schema views currently exist; there is no generated API/database execution service.
- Project ZIP export: the current workspace lets users inspect and edit files in-browser but does not yet package a downloadable archive.
- Multi-agent workflow: current UI includes compiler stages, but no independent multi-agent orchestration or agent logs are implemented.

## Security and data boundaries

- Existing Google/GitHub OAuth, compiler APIs, auth sessions, MongoDB-backed users, and the learning assistant were left in place.
- The AI edit endpoint verifies the existing bearer session, validates request sizes and allowed workspace paths, and applies a per-token in-memory rate limit. AI changes are proposals; the user applies them in the browser after reviewing a diff.
- The AI endpoint uses only server-side provider keys. Browser custom keys are not forwarded by this feature.
- Rate-limit state is process-local, so a production deployment with multiple serverless instances would need a shared limiter for a strict global limit.
- Local workspace snapshots remain in browser storage and are not encrypted or server-synced. Avoid storing credentials or sensitive source files there.

## Verification

- `npm test`: 25 tests passed, including workspace generation, diff alignment, secret detection, rate limiting, learning-dataset validation, provider failover, and evaluations.
- `npm run build`: passed. Vite reports the existing large architecture-scene chunk warning.
- Browser viewport and authenticated visual QA were not completed in this environment; the browser automation surface was unavailable and no production credentials were used.

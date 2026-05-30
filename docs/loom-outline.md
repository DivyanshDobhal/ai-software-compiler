# Loom Outline

1. Show the live UI and compile the CRM prompt.
2. Walk through each pipeline stage and explain the compiler analogy.
3. Open the JSON cards:
   - Intent IR
   - System design
   - UI/API/DB/Auth/business logic schemas
4. Explain validation:
   - API resource must map to DB table
   - API body fields must exist in DB columns
   - UI page roles must exist in auth schema
   - business logic must reference real entities
5. Explain repair:
   - targeted patching of the broken layer
   - no blind full retry
6. Show runtime checks:
   - router
   - DB init
   - API execution
   - auth guard
   - UI render
7. Run evaluation:
   - 20 prompts
   - success rate
   - latency
   - repairs
   - warnings for ambiguity
8. Close with tradeoffs:
   - deterministic local compiler is reliable and cheap
   - production version can add LLM calls inside stages
   - validator/repair/runtime remain the safety system

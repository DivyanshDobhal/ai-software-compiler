import test from "node:test";
import assert from "node:assert/strict";
import { containsLikelySecret, createWorkspaceFiles, diffText } from "../src/workspace.js";
import workspaceHandler, { consumeEditRateLimit } from "../api/workspace.js";

test("workspace exports a starter project and source files from a real compilation", () => {
  const output = {
    input: "reading list",
    intent: { app_name: "Reading List" },
    schemas: {
      ui_schema: { pages: [{ title: "Dashboard", route: "/dashboard", components: ["RecentBooks"] }] },
      api_schema: { endpoints: [] }, db_schema: { tables: [] }, auth_schema: {}, business_logic: {}
    }
  };
  const files = createWorkspaceFiles(output);
  assert.ok(files.some((file) => file.path === "src/App.jsx" && file.content.includes("RecentBooks")));
  assert.ok(files.some((file) => file.path === "index.html" && file.content.includes("/src/main.jsx")));
  assert.ok(files.some((file) => file.path === "src/main.jsx" && file.content.includes("createRoot")));
  assert.ok(files.some((file) => file.path === "blueprint.json"));
  const manifest = JSON.parse(files.find((file) => file.path === "package.json").content);
  assert.equal(manifest.scripts.build, "vite build");
});

test("workspace line diff aligns context around inserted and changed lines", () => {
  const rows = diffText("first\nkeep\nold", "first\nkeep\nnew\nlast");
  assert.deepEqual(rows.map((row) => row.type), ["same", "same", "removed", "added", "added"]);
  assert.equal(rows[1].line, "keep");
});

test("likely credentials are detected before an AI proposal is sent", () => {
  assert.equal(containsLikelySecret("const key = 'nvapi-abcdefghijklmnopqrstuvwxyz123456';"), true);
  assert.equal(containsLikelySecret("GOOGLE_CLIENT_SECRET=GOCSPX-abcdefghijklmnopqrstuvwxyz"), true);
  assert.equal(containsLikelySecret("const greeting = 'hello';"), false);
});

test("AI edit limiter caps authenticated users to eight requests per minute", () => {
  const key = `workspace-test-${Date.now()}`;
  for (let index = 0; index < 8; index += 1) assert.equal(consumeEditRateLimit(key, 10_000), true);
  assert.equal(consumeEditRateLimit(key, 10_000), false);
  assert.equal(consumeEditRateLimit(key, 71_000), true);
});

test("AI edit API rejects unsupported methods, malformed JSON, and unauthenticated requests", async () => {
  const responseFor = () => ({ statusCode: 200, headers: {}, setHeader(name, value) { this.headers[name] = value; }, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; return this; } });
  const method = responseFor();
  await workspaceHandler({ method: "GET", headers: {} }, method);
  assert.equal(method.statusCode, 405);

  const malformed = responseFor();
  await workspaceHandler({ method: "POST", headers: {}, body: "{" }, malformed);
  assert.equal(malformed.statusCode, 400);

  const unauthorized = responseFor();
  await workspaceHandler({ method: "POST", headers: {}, body: { path: "src/App.jsx", content: "", instruction: "Change the heading" } }, unauthorized);
  assert.equal(unauthorized.statusCode, 401);
});

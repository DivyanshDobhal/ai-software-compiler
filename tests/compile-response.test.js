import test from "node:test";
import assert from "node:assert/strict";
import { parseJson } from "../api/compile.js";

test("compiler response parser accepts plain and fenced JSON without mistaking braces in strings", () => {
  assert.deepEqual(parseJson('{"value":"brace } inside a string"}'), { value: "brace } inside a string" });
  assert.deepEqual(parseJson('```json\n{"value":[1,2]}\n```'), { value: [1, 2] });
});

test("compiler response parser rejects malformed or truncated JSON", () => {
  assert.throws(() => parseJson('{"items":[{"name":"broken"}'), SyntaxError);
});

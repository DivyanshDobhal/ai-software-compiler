import { readFileSync } from "node:fs";
import { validateDataset } from "../src/learning-assistant.js";

const path = new URL("../data/ai_learning_assistant.jsonl", import.meta.url);
const lines = readFileSync(path, "utf8").split(/\r?\n/).filter(Boolean);
let records;
try {
  records = lines.map((line, index) => {
    try { return JSON.parse(line); }
    catch (error) { throw new Error(`Line ${index + 1}: invalid JSON (${error.message})`); }
  });
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
const report = validateDataset(records);
if (records.length < 100) report.errors.push(`Dataset must contain at least 100 records; found ${records.length}.`);
const categories = new Set(records.map(({ category }) => category));
const expected = ["website_navigation", "getting_started", "prompt_engineering", "ai_compilation_workflow", "agents_and_pipeline", "schemas_and_architecture", "validation_and_debugging", "runtime_preview", "authentication_and_accounts", "student_project_ideas", "programming_concepts", "common_errors_and_troubleshooting", "privacy_security_and_limitations", "frequently_asked_questions"];
for (const category of expected) if (!categories.has(category)) report.errors.push(`Missing category: ${category}.`);
if (!report.valid || report.errors.length) {
  console.error(JSON.stringify({ ...report, errors: report.errors }, null, 2));
  process.exit(1);
}
console.log(`Dataset valid: ${records.length} unique records across ${categories.size} categories.`);

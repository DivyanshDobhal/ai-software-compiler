import { runEvaluation } from "../src/evaluation.js";

const report = runEvaluation();

console.log(JSON.stringify(report, null, 2));

if (report.failed > 0) {
  process.exitCode = 1;
}

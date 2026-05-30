import { compileApplication } from "./compiler.js";

export const PRODUCT_PROMPTS = [
  "Build a CRM with login, contacts, dashboard, role-based access, and premium plan with payments. Admins can see analytics.",
  "Create an e-commerce storefront with product catalog, cart, checkout, payments, admin inventory, and customer order history.",
  "Build a project management app with teams, kanban boards, tasks, comments, manager analytics, and guest read-only access.",
  "Make a clinic booking system with patients, doctors, appointment scheduling, prescriptions, receptionist access, and admin reports.",
  "Create a learning platform with courses, lessons, enrollments, assignments, student dashboard, and instructor analytics.",
  "Build a booking app for salons with customers, services, bookings, payment tracking, staff calendar, and admin dashboard.",
  "Create a lightweight HR app with employee records, leave requests, manager approval, documents, and admin reports.",
  "Build a real estate CRM with properties, leads, appointments, agent roles, deal pipeline, and premium analytics.",
  "Make an event management app with events, tickets, attendees, payments, organizer dashboard, and staff check-in.",
  "Create a support desk with tickets, comments, file attachments, customer portal, agent dashboard, and SLA rules."
];

export const EDGE_CASE_PROMPTS = [
  "Build an app.",
  "Make a tool with everything and no login but role-based admin access.",
  "Create a free premium subscription product with payments but no paid plans.",
  "I need dashboards and reports, not sure about the data model.",
  "Build CRM contacts but also delete all users automatically every day.",
  "Make a clinic app where guests can edit prescriptions.",
  "Create an e-commerce app with checkout and payments, but do not store orders.",
  "Build project management for admins, managers, guests, contractors, and customers with unclear permissions.",
  "Create a booking app with appointments before users exist.",
  "Need a dashboard for analytics only."
];

export function runEvaluation() {
  const cases = [
    ...PRODUCT_PROMPTS.map((prompt, index) => ({ id: `product_${index + 1}`, category: "product", prompt })),
    ...EDGE_CASE_PROMPTS.map((prompt, index) => ({ id: `edge_${index + 1}`, category: "edge", prompt }))
  ];

  const results = cases.map((testCase, index) => {
    const output = compileApplication(testCase.prompt, { injectFault: index % 4 === 0 });
    return {
      ...testCase,
      ok: output.ok,
      latencyMs: output.metrics.latencyMs,
      retries: output.metrics.retries,
      errorCount: output.validation.errors.length,
      warningCount: output.validation.warnings.length,
      failureTypes: output.validation.errors.map((error) => error.type),
      repaired: output.validation.repaired,
      runtimeOk: output.runtime.ok
    };
  });

  const passed = results.filter((result) => result.ok).length;
  const failures = results.flatMap((result) => result.failureTypes);
  const failureCounts = failures.reduce((acc, type) => {
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  return {
    generatedAt: new Date().toISOString(),
    total: results.length,
    passed,
    failed: results.length - passed,
    successRate: Number((passed / results.length).toFixed(2)),
    averageLatencyMs: Math.round(results.reduce((sum, result) => sum + result.latencyMs, 0) / results.length),
    averageRetries: Number((results.reduce((sum, result) => sum + result.retries, 0) / results.length).toFixed(2)),
    repairedCases: results.filter((result) => result.repaired).length,
    failureCounts,
    costQualityTradeoff: {
      selectedMode: "local deterministic compiler",
      latency: "very low",
      marginalCost: "$0 per compile in this demo",
      qualityControl: "high for supported product patterns; lower semantic creativity than an LLM",
      productionUpgrade: "Use LLM only inside stages, keep this validator/repair/runtime contract as the control plane."
    },
    results
  };
}

const PRODUCT_PATTERNS = [
  ["crm", "CRM", ["contacts", "companies", "deals", "activities"]],
  ["project", "Project Management", ["projects", "boards", "tasks", "comments"]],
  ["kanban", "Project Management", ["projects", "boards", "tasks", "comments"]],
  ["e-commerce", "E-Commerce", ["products", "carts", "orders", "payments"]],
  ["commerce", "E-Commerce", ["products", "carts", "orders", "payments"]],
  ["store", "E-Commerce", ["products", "carts", "orders", "payments"]],
  ["clinic", "Clinic Booking", ["patients", "doctors", "appointments", "prescriptions"]],
  ["hospital", "Clinic Booking", ["patients", "doctors", "appointments", "prescriptions"]],
  ["booking", "Booking", ["customers", "services", "bookings", "payments"]],
  ["learning", "Learning Platform", ["courses", "lessons", "enrollments", "assignments"]],
  ["lms", "Learning Platform", ["courses", "lessons", "enrollments", "assignments"]]
];

const FEATURE_ALIASES = {
  login: ["login", "auth", "authentication", "sign in", "signup"],
  dashboard: ["dashboard", "analytics", "reports", "metrics"],
  payments: ["payment", "payments", "checkout", "subscription", "premium", "plan"],
  roles: ["role", "roles", "permission", "permissions", "admin", "manager"],
  comments: ["comment", "comments", "discussion"],
  files: ["file", "upload", "attachment"],
  notifications: ["notification", "email", "alert"]
};

const TYPE_MAP = {
  string: "string",
  text: "string",
  number: "number",
  decimal: "number",
  currency: "number",
  boolean: "boolean",
  date: "date",
  datetime: "datetime",
  id: "id"
};

const BASE_ROLES = [
  { name: "admin", description: "Owns the workspace and can manage configuration." },
  { name: "member", description: "Authenticated internal user with standard access." }
];

export const STAGES = [
  "Intent Extraction",
  "System Design",
  "Schema Generation",
  "Validation + Repair",
  "Runtime Execution"
];

export function compileApplication(userPrompt, options = {}) {
  const startedAt = performanceSafeNow();
  const stageTimings = [];
  const runStage = (name, fn) => {
    const start = performanceSafeNow();
    const value = fn();
    stageTimings.push({ name, ms: Math.round(performanceSafeNow() - start) });
    return value;
  };

  const intent = runStage(STAGES[0], () => extractIntent(userPrompt));
  const design = runStage(STAGES[1], () => designSystem(intent));
  let schemas = runStage(STAGES[2], () => generateSchemas(intent, design));

  if (options.injectFault) {
    schemas = injectFault(schemas);
  }

  const firstValidation = runStage("Initial Validation", () => validateSchemas({ intent, design, schemas }));
  const repair = runStage(STAGES[3], () => repairSchemas({ intent, design, schemas }, firstValidation));
  const finalValidation = validateSchemas({ intent, design, schemas: repair.schemas });

  const runtime = runStage(STAGES[4], () => simulateRuntime(repair.schemas, finalValidation));

  return {
    ok: finalValidation.errors.length === 0 && runtime.ok,
    input: userPrompt,
    intent,
    design,
    schemas: repair.schemas,
    validation: {
      ...finalValidation,
      originalIssues: firstValidation.errors,
      repaired: repair.applied.length > 0,
      repairs: repair.applied
    },
    runtime,
    metrics: {
      latencyMs: Math.round(performanceSafeNow() - startedAt),
      stageTimings,
      retries: repair.applied.length,
      deterministic: true,
      costTier: "local-deterministic"
    }
  };
}

export function extractIntent(prompt) {
  const normalized = normalize(prompt);
  const product = detectProduct(normalized);
  const requestedFeatures = detectFeatures(normalized, product.entities);
  const roles = detectRoles(normalized);
  const ambiguities = detectAmbiguities(normalized, requestedFeatures);
  const assumptions = buildAssumptions(normalized, product, requestedFeatures);

  return {
    app_name: toTitleCase(extractName(prompt, product.name)),
    app_type: product.name,
    confidence: prompt.trim().length < 16 ? "low" : ambiguities.length ? "medium" : "high",
    features: requestedFeatures.map((name) => ({
      name,
      priority: isCoreFeature(name, product.entities) ? "must-have" : "nice-to-have",
      source: normalized.includes(name.replaceAll("_", " ")) ? "explicit" : "inferred"
    })),
    roles,
    business_rules: extractBusinessRules(normalized),
    assumptions,
    ambiguities
  };
}

export function designSystem(intent) {
  const coreEntities = entitySetFromFeatures(intent.features.map((feature) => feature.name), intent.app_type);
  const entities = [
    entity("users", [
      field("id", "id", true),
      field("email", "string", true),
      field("name", "string", true),
      field("role", "string", true),
      field("plan", "string", false)
    ]),
    ...coreEntities.map((name) => buildEntity(name, intent))
  ];

  if (hasFeature(intent, "payments") && !entities.some((item) => item.name === "payments")) {
    entities.push(buildEntity("payments", intent));
  }

  const relationships = [];
  for (const item of entities) {
    if (item.name !== "users") {
      item.fields.push(field("owner_id", "id", true, "users.id"));
      relationships.push({ from: `${item.name}.owner_id`, to: "users.id", type: "many-to-one" });
    }
  }

  const flows = intent.features.map((feature) => ({
    feature: feature.name,
    steps: buildFlowSteps(feature.name),
    success_criteria: `${toTitleCase(feature.name)} can be completed through UI, API, and data layer.`
  }));

  const access_control = {};
  for (const role of intent.roles) {
    access_control[role.name] = entities.map((item) => ({
      resource: item.name,
      actions: role.name === "admin" ? ["create", "read", "update", "delete"] : ["create", "read", "update"]
    }));
  }

  return { entities, relationships, flows, access_control };
}

export function generateSchemas(intent, design) {
  const roles = intent.roles.map((role) => role.name);
  const auth_schema = {
    roles: intent.roles.map((role, index) => ({
      name: role.name,
      inherits: index === 0 ? [] : ["member"],
      description: role.description
    })),
    permissions: design.access_control,
    flows: [
      { name: "register", steps: ["collect email and password", "create user", "start session"] },
      { name: "login", steps: ["validate credentials", "issue session token", "load role permissions"] },
      { name: "logout", steps: ["revoke session token"] }
    ]
  };

  const db_schema = {
    tables: design.entities.map((item) => ({
      name: item.name,
      columns: item.fields.map((itemField) => ({
        name: itemField.name,
        type: TYPE_MAP[itemField.type] || "string",
        required: itemField.required,
        references: itemField.references || null
      })),
      primary_key: "id",
      indexes: item.fields.filter((itemField) => itemField.name.endsWith("_id")).map((itemField) => itemField.name)
    }))
  };

  const api_schema = {
    endpoints: db_schema.tables.flatMap((table) => resourceEndpoints(table, roles))
  };

  const ui_schema = {
    navigation: [
      { label: "Dashboard", route: "/dashboard", roles },
      ...db_schema.tables.filter((table) => table.name !== "users").map((table) => ({
        label: toTitleCase(table.name),
        route: `/${table.name}`,
        roles
      }))
    ],
    pages: [
      page("Login", "/login", ["guest"], ["LoginForm"]),
      page("Dashboard", "/dashboard", roles, ["MetricGrid", "RecentActivity", "PrimaryActions"]),
      ...db_schema.tables.filter((table) => table.name !== "users").map((table) =>
        page(toTitleCase(table.name), `/${table.name}`, roles, [
          "DataTable",
          "RecordForm",
          "FilterToolbar"
        ], table.name)
      )
    ]
  };

  const business_logic = {
    rules: [
      ...intent.business_rules.map((rule, index) => ({
        id: `rule_${index + 1}`,
        description: rule,
        trigger: inferTrigger(rule),
        condition: inferCondition(rule),
        actions: inferActions(rule),
        affected_entities: inferAffectedEntities(rule, db_schema.tables)
      })),
      {
        id: "rule_owner_scope",
        description: "Non-admin users can access only records they own unless a role grants broader access.",
        trigger: "api_request",
        condition: "role != admin",
        actions: ["filter_by_owner_id"],
        affected_entities: db_schema.tables.filter((table) => table.columns.some((column) => column.name === "owner_id")).map((table) => table.name)
      }
    ]
  };

  return { ui_schema, api_schema, db_schema, auth_schema, business_logic };
}

export function validateSchemas({ intent, design, schemas }) {
  const errors = [];
  const warnings = [];
  const required = ["ui_schema", "api_schema", "db_schema", "auth_schema", "business_logic"];

  for (const key of required) {
    if (!schemas[key]) errors.push(issue("missing_layer", key, `${key} is required.`));
  }
  if (errors.length) return { errors, warnings };

  const tables = new Map((schemas.db_schema.tables || []).map((table) => [table.name, table]));
  const roles = new Set((schemas.auth_schema.roles || []).map((role) => role.name).concat("guest"));
  const endpoints = schemas.api_schema.endpoints || [];

  if (!schemas.ui_schema.pages?.length) errors.push(issue("empty_ui", "ui_schema.pages", "At least one UI page is required."));
  if (!endpoints.length) errors.push(issue("empty_api", "api_schema.endpoints", "At least one API endpoint is required."));
  if (!tables.size) errors.push(issue("empty_db", "db_schema.tables", "At least one database table is required."));
  if (!roles.has("admin")) errors.push(issue("missing_admin", "auth_schema.roles", "Admin role is required."));

  for (const endpoint of endpoints) {
    if (!tables.has(endpoint.resource)) {
      errors.push(issue("unknown_api_resource", endpoint.path, `Endpoint references missing table ${endpoint.resource}.`));
    }
    for (const role of endpoint.allowed_roles || []) {
      if (!roles.has(role)) errors.push(issue("unknown_api_role", endpoint.path, `Endpoint references missing role ${role}.`));
    }
    const table = tables.get(endpoint.resource);
    if (table && endpoint.body_schema) {
      const columns = new Set(table.columns.map((column) => column.name));
      for (const fieldName of Object.keys(endpoint.body_schema)) {
        if (!columns.has(fieldName)) {
          errors.push(issue("hallucinated_api_field", endpoint.path, `${fieldName} is not a column on ${table.name}.`));
        }
      }
    }
  }

  for (const pageItem of schemas.ui_schema.pages || []) {
    for (const role of pageItem.roles || []) {
      if (!roles.has(role)) errors.push(issue("unknown_ui_role", pageItem.route, `Page references missing role ${role}.`));
    }
    if (pageItem.resource && !tables.has(pageItem.resource)) {
      errors.push(issue("unknown_ui_resource", pageItem.route, `Page references missing table ${pageItem.resource}.`));
    }
    for (const apiPath of pageItem.api_dependencies || []) {
      if (!endpoints.some((endpoint) => endpoint.path === apiPath)) {
        errors.push(issue("missing_ui_api", pageItem.route, `Page depends on missing endpoint ${apiPath}.`));
      }
    }
  }

  for (const rule of schemas.business_logic.rules || []) {
    for (const entityName of rule.affected_entities || []) {
      if (!tables.has(entityName)) {
        errors.push(issue("unknown_logic_entity", rule.id, `Business rule references missing entity ${entityName}.`));
      }
    }
  }

  if (intent.ambiguities?.length) {
    warnings.push(...intent.ambiguities.map((message) => issue("assumption_required", "intent.ambiguities", message)));
  }
  if (design.entities.length > 8) {
    warnings.push(issue("complexity", "design.entities", "Generated app is broad; production codegen should split modules."));
  }

  return { errors, warnings };
}

export function repairSchemas(bundle, validation) {
  const schemas = deepClone(bundle.schemas);
  const applied = [];
  const knownRoles = new Set((schemas.auth_schema.roles || []).map((role) => role.name).concat("guest"));
  const knownTables = new Set((schemas.db_schema.tables || []).map((table) => table.name));

  for (const problem of validation.errors) {
    if (problem.type === "unknown_api_resource") {
      const endpoint = schemas.api_schema.endpoints.find((item) => item.path === problem.path);
      if (endpoint) {
        schemas.db_schema.tables.push(minimalTable(endpoint.resource));
        knownTables.add(endpoint.resource);
        applied.push(`Created missing table for API resource: ${endpoint.resource}`);
      }
    }
    if (problem.type === "unknown_api_role" || problem.type === "unknown_ui_role") {
      const roleName = extractLastWord(problem.message);
      if (roleName && !knownRoles.has(roleName)) {
        schemas.auth_schema.roles.push({ name: roleName, inherits: ["member"], description: "Auto-created role from schema reference." });
        schemas.auth_schema.permissions[roleName] = [];
        knownRoles.add(roleName);
        applied.push(`Created missing role: ${roleName}`);
      }
    }
    if (problem.type === "hallucinated_api_field") {
      const badField = problem.message.split(" ")[0];
      const endpoint = schemas.api_schema.endpoints.find((item) =>
        item.path === problem.path && item.body_schema && badField in item.body_schema
      );
      if (endpoint?.body_schema?.[badField]) {
        delete endpoint.body_schema[badField];
        applied.push(`Removed hallucinated API field ${badField} from ${endpoint.path}`);
      }
    }
    if (problem.type === "missing_ui_api") {
      const missingPath = problem.message.match(/endpoint (.+)\.$/)?.[1];
      const pageItem = schemas.ui_schema.pages.find((item) => item.route === problem.path);
      if (missingPath && pageItem) {
        pageItem.api_dependencies = pageItem.api_dependencies.filter((path) =>
          schemas.api_schema.endpoints.some((endpoint) => endpoint.path === path)
        );
        applied.push(`Removed missing UI API dependency ${missingPath}`);
      }
    }
    if (problem.type === "unknown_logic_entity") {
      const rule = schemas.business_logic.rules.find((item) => item.id === problem.path);
      if (rule) {
        rule.affected_entities = rule.affected_entities.filter((entityName) => knownTables.has(entityName));
        applied.push(`Pruned invalid business logic entity from ${rule.id}`);
      }
    }
  }

  ensureCompleteness(schemas, applied);
  return { schemas, applied };
}

export function simulateRuntime(schemas, validation) {
  const checks = [];
  const add = (name, pass, detail) => checks.push({ name, pass, detail });

  add("JSON contract", validation.errors.length === 0, `${validation.errors.length} blocking validation errors.`);

  const routeTable = new Set(schemas.ui_schema.pages.map((pageItem) => pageItem.route));
  add("Router boot", routeTable.has("/login") && routeTable.has("/dashboard"), "Login and dashboard routes are mounted.");

  const db = Object.fromEntries(schemas.db_schema.tables.map((table) => [table.name, []]));
  add("Database init", Object.keys(db).length > 0, `${Object.keys(db).length} tables initialized in memory.`);

  let apiPass = true;
  for (const endpoint of schemas.api_schema.endpoints) {
    if (!db[endpoint.resource]) apiPass = false;
    if (endpoint.method === "POST") {
      const record = {};
      const table = schemas.db_schema.tables.find((item) => item.name === endpoint.resource);
      for (const column of table.columns) {
        record[column.name] = sampleValue(column);
      }
      db[endpoint.resource].push(record);
    }
  }
  add("API execution", apiPass, "Endpoints can resolve their resources and POST seed data.");

  const adminRole = schemas.auth_schema.roles.find((role) => role.name === "admin");
  add("Auth guard", Boolean(adminRole), "Admin role exists and can be checked at runtime.");

  const pagesExecutable = schemas.ui_schema.pages.every((pageItem) =>
    pageItem.components?.length && pageItem.roles?.length
  );
  add("UI render", pagesExecutable, `${schemas.ui_schema.pages.length} pages have components and access metadata.`);

  return {
    ok: checks.every((check) => check.pass),
    checks,
    preview: {
      appName: "Generated Application",
      routes: schemas.ui_schema.pages.map((pageItem) => pageItem.route),
      tables: Object.keys(db),
      seededRecords: Object.fromEntries(Object.entries(db).map(([name, records]) => [name, records.length]))
    }
  };
}

function detectProduct(normalized) {
  for (const [keyword, name, entities] of PRODUCT_PATTERNS) {
    if (normalized.includes(keyword)) return { name, entities };
  }
  return { name: "Custom Business App", entities: ["records", "activities"] };
}

function detectFeatures(normalized, productEntities) {
  const features = new Set(productEntities);
  for (const [feature, aliases] of Object.entries(FEATURE_ALIASES)) {
    if (aliases.some((alias) => normalized.includes(alias))) features.add(feature);
  }
  features.add("dashboard");
  features.add("login");
  return [...features].sort();
}

function detectRoles(normalized) {
  const roles = [...BASE_ROLES];
  const candidates = [
    ["manager", "Can oversee team records and reports."],
    ["customer", "External customer account."],
    ["guest", "Limited unauthenticated or read-only access."],
    ["doctor", "Clinical provider role."],
    ["patient", "Patient self-service role."],
    ["receptionist", "Front-desk operations role."]
  ];
  for (const [name, description] of candidates) {
    if (normalized.includes(name) && !roles.some((role) => role.name === name)) {
      roles.push({ name, description });
    }
  }
  return roles;
}

function detectAmbiguities(normalized, features) {
  const ambiguities = [];
  if (normalized.length < 24 || ["app", "website", "tool"].includes(normalized.trim())) {
    ambiguities.push("Prompt is vague; compiler assumed a generic business workflow.");
  }
  if (normalized.includes("no login") && features.includes("login")) {
    ambiguities.push("Conflicting auth requirement detected; login disabled in wording but access control needs identity.");
  }
  if (normalized.includes("free") && normalized.includes("premium")) {
    ambiguities.push("Both free and premium access are requested; compiler assumes tiered access.");
  }
  if (normalized.includes("delete all users")) {
    ambiguities.push("Dangerous destructive automation requested; compiler documents it but does not execute destructive runtime behavior.");
  }
  if (normalized.includes("guests can edit")) {
    ambiguities.push("Guest write access requested; compiler treats guest permissions as read-only unless explicitly reviewed.");
  }
  if (normalized.includes("do not store") && (normalized.includes("order") || normalized.includes("booking"))) {
    ambiguities.push("Persistence conflict detected; compiler keeps records needed for executable workflows.");
  }
  return ambiguities;
}

function buildAssumptions(normalized, product, features) {
  const assumptions = [`Generated as a ${product.name} with responsive web UI and REST API.`];
  if (!normalized.includes("database")) assumptions.push("Relational database semantics are assumed.");
  if (features.includes("payments")) assumptions.push("Payments are modeled as configuration and runtime checks, not real processor calls.");
  if (!normalized.includes("tenant")) assumptions.push("Single workspace tenancy is assumed for demo runtime.");
  return assumptions;
}

function extractBusinessRules(normalized) {
  const rules = [];
  if (normalized.includes("premium") || normalized.includes("plan")) {
    rules.push("Premium-only features require an active paid plan.");
  }
  if (normalized.includes("admin")) {
    rules.push("Admins can view analytics and manage all records.");
  }
  if (normalized.includes("guest")) {
    rules.push("Guests have read-only access to explicitly shared resources.");
  }
  if (!rules.length) rules.push("Authenticated users can manage their own records.");
  return rules;
}

function entitySetFromFeatures(features, appType) {
  const denied = new Set(["login", "dashboard", "roles", "notifications", "files", "comments"]);
  const entities = features.filter((feature) => !denied.has(feature));
  if (features.includes("comments")) entities.push("comments");
  if (features.includes("files")) entities.push("files");
  if (appType === "Custom Business App" && entities.length < 2) entities.push("records", "activities");
  return [...new Set(entities)].sort();
}

function buildEntity(name) {
  const fields = [field("id", "id", true), field("title", "string", true), field("status", "string", true), field("created_at", "datetime", true)];
  const specialized = {
    contacts: [field("email", "string", true), field("phone", "string", false), field("company", "string", false)],
    products: [field("price", "number", true), field("sku", "string", true), field("stock", "number", true)],
    payments: [field("amount", "number", true), field("provider", "string", true), field("paid_at", "datetime", false)],
    appointments: [field("starts_at", "datetime", true), field("ends_at", "datetime", true)],
    tasks: [field("due_date", "date", false), field("priority", "string", false)]
  };
  return entity(name, [...fields, ...(specialized[name] || [])]);
}

function resourceEndpoints(table, roles) {
  const bodySchema = Object.fromEntries(
    table.columns
      .filter((column) => !["id", "created_at"].includes(column.name))
      .map((column) => [column.name, { type: column.type, required: column.required }])
  );
  return [
    {
      method: "GET",
      path: `/api/${table.name}`,
      resource: table.name,
      response_schema: { type: "array", item: table.name },
      allowed_roles: roles
    },
    {
      method: "POST",
      path: `/api/${table.name}`,
      resource: table.name,
      body_schema: bodySchema,
      response_schema: { type: "object", item: table.name },
      allowed_roles: roles.filter((role) => role !== "guest")
    },
    {
      method: "PATCH",
      path: `/api/${table.name}/:id`,
      resource: table.name,
      body_schema: bodySchema,
      response_schema: { type: "object", item: table.name },
      allowed_roles: roles.filter((role) => role !== "guest")
    }
  ];
}

function page(name, route, roles, components, resource = null) {
  return {
    name,
    route,
    layout: route === "/login" ? "auth" : "app",
    roles,
    resource,
    components,
    api_dependencies: resource ? [`/api/${resource}`] : []
  };
}

function ensureCompleteness(schemas, applied) {
  if (!schemas.auth_schema.roles.some((role) => role.name === "admin")) {
    schemas.auth_schema.roles.unshift(BASE_ROLES[0]);
    applied.push("Added required admin role.");
  }
  if (!schemas.ui_schema.pages.some((pageItem) => pageItem.route === "/login")) {
    schemas.ui_schema.pages.unshift(page("Login", "/login", ["guest"], ["LoginForm"]));
    applied.push("Added missing login page.");
  }
}

function injectFault(schemas) {
  const broken = deepClone(schemas);
  const endpoint = broken.api_schema.endpoints.find((item) => item.method === "POST");
  if (endpoint) endpoint.body_schema.hallucinated_budget = { type: "number", required: false };
  const pageItem = broken.ui_schema.pages.find((item) => item.resource);
  if (pageItem) pageItem.api_dependencies.push("/api/not_real");
  broken.business_logic.rules.push({
    id: "rule_bad_reference",
    description: "Injected fault for repair demonstration.",
    trigger: "compile_test",
    condition: "always",
    actions: ["noop"],
    affected_entities: ["missing_table"]
  });
  return broken;
}

function inferTrigger(rule) {
  if (rule.toLowerCase().includes("premium")) return "feature_access";
  if (rule.toLowerCase().includes("admin")) return "dashboard_load";
  return "api_request";
}

function inferCondition(rule) {
  if (rule.toLowerCase().includes("premium")) return "user.plan == premium";
  if (rule.toLowerCase().includes("admin")) return "role == admin";
  return "authenticated == true";
}

function inferActions(rule) {
  if (rule.toLowerCase().includes("premium")) return ["allow_when_paid", "deny_with_upgrade_prompt"];
  if (rule.toLowerCase().includes("admin")) return ["include_all_workspace_records", "show_analytics"];
  return ["allow"];
}

function inferAffectedEntities(rule, tables) {
  const lower = rule.toLowerCase();
  const matches = tables.filter((table) => lower.includes(table.name)).map((table) => table.name);
  if (lower.includes("premium") || lower.includes("paid")) matches.push(...tables.filter((table) => table.name === "payments").map((table) => table.name));
  return [...new Set(matches.length ? matches : tables.slice(0, 2).map((table) => table.name))];
}

function buildFlowSteps(featureName) {
  return [
    `Open ${featureName} page`,
    "Authorize current role",
    "Load required API data",
    "Validate user input",
    "Persist changes and update UI state"
  ];
}

function sampleValue(column) {
  if (column.type === "number") return 1;
  if (column.type === "boolean") return true;
  if (column.type === "date") return "2026-05-28";
  if (column.type === "datetime") return "2026-05-28T00:00:00.000Z";
  if (column.type === "id") return `${column.name}_sample`;
  return `${column.name}_sample`;
}

function issue(type, path, message) {
  return { type, path, message };
}

function field(name, type, required, references = null) {
  return { name, type, required, references };
}

function entity(name, fields) {
  return { name, fields };
}

function hasFeature(intent, name) {
  return intent.features.some((feature) => feature.name === name);
}

function isCoreFeature(name, productEntities) {
  return productEntities.includes(name) || ["login", "dashboard", "roles"].includes(name);
}

function extractName(prompt, fallback) {
  const match = prompt.match(/(?:called|named)\s+([A-Z][\w -]{2,30})/);
  return match ? match[1] : fallback;
}

function extractLastWord(message) {
  return message.replace(/[.]/g, "").trim().split(" ").at(-1);
}

function minimalTable(name) {
  return {
    name,
    columns: [
      { name: "id", type: "id", required: true, references: null },
      { name: "title", type: "string", required: true, references: null },
      { name: "created_at", type: "datetime", required: true, references: null }
    ],
    primary_key: "id",
    indexes: []
  };
}

function normalize(value) {
  return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function toTitleCase(value) {
  return String(value)
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function performanceSafeNow() {
  if (typeof performance !== "undefined" && performance.now) return performance.now();
  return Date.now();
}

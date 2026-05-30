import { compileApplication, STAGES } from "./compiler.js";
import { runEvaluation } from "./evaluation.js";

const promptInput = document.querySelector("#promptInput");
const compileBtn = document.querySelector("#compileBtn");
const runEvalBtn = document.querySelector("#runEvalBtn");
const pipeline = document.querySelector("#pipeline");
const results = document.querySelector("#results");
const latencyText = document.querySelector("#latencyText");
const errorBanner = document.querySelector("#errorBanner");
const resultsSection = document.querySelector("#resultsSection");
const pipelineSection = document.querySelector("#pipelineSection");
const validationReport = document.querySelector("#validationReport");
const evaluationSummary = document.querySelector("#evaluationSummary");
const authSection = document.querySelector("#authSection");
const workspaceSection = document.querySelector("#workspaceSection");
const authTitle = document.querySelector("#authTitle");
const authDescription = document.querySelector("#authDescription");
const loginForm = document.querySelector("#loginForm");
const registerForm = document.querySelector("#registerForm");
const loginMessage = document.querySelector("#loginMessage");
const registerMessage = document.querySelector("#registerMessage");
const loginSubmitBtn = document.querySelector("#loginSubmitBtn");
const registerSubmitBtn = document.querySelector("#registerSubmitBtn");
const loginEmailInput = document.querySelector("#loginEmailInput");
const loginPasswordInput = document.querySelector("#loginPasswordInput");
const registerNameInput = document.querySelector("#registerNameInput");
const registerEmailInput = document.querySelector("#registerEmailInput");
const registerPasswordInput = document.querySelector("#registerPasswordInput");
const userChip = document.querySelector("#userChip");
const userName = document.querySelector("#userName");
const logoutBtn = document.querySelector("#logoutBtn");

const visibleStages = STAGES.slice(0, 4);
let authMode = "login";
let authToken = window.localStorage.getItem("compiler_auth_token") || "";

const stageDescriptions = {
  "Intent Extraction": "Parse product requirements",
  "System Design": "Entities, flows, roles",
  "Schema Generation": "UI, API, DB, auth, logic",
  "Validation + Repair": "Consistency and runtime checks"
};

const stageLabels = {
  "Intent Extraction": "Stage 1",
  "System Design": "Stage 2",
  "Schema Generation": "Stage 3",
  "Validation + Repair": "Stage 4"
};

function renderPipeline(activeIndex = -1, timings = []) {
  pipeline.innerHTML = visibleStages.map((stage, index) => {
    const stageTimingNames = stage === "Validation + Repair" ? ["Validation + Repair", "Runtime Execution"] : [stage];
    const done = stageTimingNames.some((name) => timings.some((item) => item.name === name)) || index < activeIndex;
    const active = index === activeIndex;
    const timingTotal = timings
      .filter((item) => stageTimingNames.includes(item.name))
      .reduce((sum, item) => sum + item.ms, 0);
    const state = active ? "running" : done ? "done" : "pending";
    return `
      <article class="stage ${state}">
        <div class="stage-icon">${done ? "✓" : index + 1}</div>
        <div class="stage-body">
          <div class="stage-meta">
            <span>${stageLabels[stage]}</span>
            <span>${timingTotal ? `${timingTotal} ms` : state}</span>
          </div>
          <h3>${stage}</h3>
          <p>${stageDescriptions[stage]}</p>
        </div>
      </article>
    `;
  }).join("");
}

async function compile() {
  const prompt = promptInput.value.trim();
  if (!prompt) return;

  setBusy(true);
  results.innerHTML = "";
  validationReport.innerHTML = "";
  errorBanner.hidden = true;
  resultsSection.hidden = true;
  renderPipeline(0);

  window.setTimeout(async () => {
    try {
      const output = await compileLive(prompt);
      renderPipeline(-1, output.metrics.stageTimings);
      renderResults(output);
      renderValidationReport(output);
      resultsSection.hidden = false;
      if (!output.ok) {
        errorBanner.hidden = false;
        errorBanner.textContent = "Compilation completed with blocking validation errors.";
      }
      latencyText.textContent = `${output.metrics.latencyMs} ms`;
      resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      errorBanner.hidden = false;
      errorBanner.textContent = error instanceof Error ? error.message : "Compilation failed.";
    }
    setBusy(false);
  }, 120);
}

async function compileLive(prompt) {
  try {
    const response = await fetch("/api/compile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
      },
      body: JSON.stringify({ prompt })
    });

    if (!response.ok) {
      if (response.status === 401) {
        clearSession();
        renderSignedOut();
        throw new Error("Please login again to compile applications.");
      }
      throw new Error(`Compile API returned ${response.status}`);
    }

    return response.json();
  } catch (error) {
    if (error instanceof Error && error.message.includes("login")) {
      throw error;
    }

    const fallback = compileApplication(prompt, { injectFault: true });
    return {
      ...fallback,
      provider: {
        mode: "browser-fallback",
        model: "deterministic",
        fallbackUsed: true,
        reason: error instanceof Error ? error.message : "Compile API unavailable"
      }
    };
  }
}

function renderResults(output) {
  const cards = [
    ["Intent Analysis", "intent", output.intent, "purple"],
    ["System Design", "database", output.design, "amber"],
    ["UI Schema", "layout", output.schemas.ui_schema, "green"],
    ["API Schema", "server", output.schemas.api_schema, "blue"],
    ["Database Schema", "table", output.schemas.db_schema, "teal"],
    ["Auth Schema", "shield", output.schemas.auth_schema, "pink"],
    ["Business Logic", "bolt", output.schemas.business_logic, "amber"]
  ];

  results.innerHTML = cards.map(([title, icon, data, color], index) =>
    schemaCard(title, icon, data, color, index === 2)
  ).join("");

  for (const toggle of results.querySelectorAll("[data-toggle]")) {
    toggle.addEventListener("click", () => {
      const card = toggle.closest(".schema-card");
      card.classList.toggle("open");
      toggle.querySelector(".chevron").textContent = card.classList.contains("open") ? "▼" : "▶";
    });
  }

  for (const button of results.querySelectorAll("[data-copy]")) {
    button.addEventListener("click", async () => {
      const pre = button.closest(".schema-card").querySelector("pre");
      await navigator.clipboard.writeText(pre.textContent);
      button.textContent = "Copied";
      window.setTimeout(() => {
        button.textContent = "Copy";
      }, 900);
    });
  }
}

function schemaCard(title, icon, data, color, open = false) {
  const json = JSON.stringify(data, null, 2);
  return `
    <article class="schema-card ${open ? "open" : ""}">
      <button class="schema-header" type="button" data-toggle>
        <span class="schema-title">
          <span class="schema-icon ${color}">${iconSymbol(icon)}</span>
          <span>${title}</span>
        </span>
        <span class="schema-meta">
          <span>${json.split("\n").length} lines</span>
          <span class="chevron">${open ? "▼" : "▶"}</span>
        </span>
      </button>
      <div class="schema-body">
        <button class="copy-btn" type="button" data-copy>Copy</button>
        <pre>${escapeHtml(json)}</pre>
      </div>
    </article>
  `;
}

function renderValidationReport(output) {
  const validation = output.validation;
  const runtimeChecks = output.runtime.checks.map((check) => ({
    type: check.pass ? "runtime-pass" : "runtime-fail",
    message: `${check.name}: ${check.detail}`
  }));
  const fixed = validation.originalIssues.map((item) => ({
    type: "fixed",
    message: item.message
  }));
  const errors = validation.errors.map((item) => ({
    type: "error",
    message: item.message
  }));
  const warnings = validation.warnings.map((item) => ({
    type: "warning",
    message: item.message
  }));
  const items = [...fixed, ...errors, ...warnings, ...runtimeChecks];
  const provider = output.provider || { mode: "browser-local", model: "deterministic" };

  validationReport.innerHTML = `
    <article class="validation-card ${output.ok ? "valid" : "invalid"}">
      <div class="validation-header">
        <span class="validation-title">
          <span class="validation-icon">${output.ok ? "✓" : "!"}</span>
          <span>${output.ok ? "Validation passed" : "Validation failed"}</span>
        </span>
        ${validation.repaired ? "<span class=\"repair-badge\">Repaired</span>" : ""}
      </div>
      <div class="provider-row">
        <span>${provider.mode}</span>
        <span>${provider.model}</span>
        ${provider.reason ? `<span>${escapeHtml(provider.reason)}</span>` : ""}
      </div>
      <div class="validation-list">
        ${items.length ? items.map(validationItem).join("") : "<p>No validation issues found.</p>"}
      </div>
    </article>
  `;
}

function renderEvaluation() {
  runEvalBtn.disabled = true;
  evaluationSummary.textContent = "Running 20 compile tests...";

  window.setTimeout(() => {
    const report = runEvaluation();
    evaluationSummary.innerHTML = `
      <div class="metric-grid">
        <div><strong>${Math.round(report.successRate * 100)}%</strong><span>success rate</span></div>
        <div><strong>${report.averageLatencyMs} ms</strong><span>avg latency</span></div>
        <div><strong>${report.averageRetries}</strong><span>avg repairs</span></div>
        <div><strong>${report.repairedCases}</strong><span>auto-repaired cases</span></div>
      </div>
      <div class="eval-table">
        ${report.results.map((result) => `
          <div class="${result.ok ? "ok" : "bad"}">
            <span>${result.id}</span>
            <span>${result.category}</span>
            <span>${result.ok ? "passed" : "failed"}</span>
            <span>${result.latencyMs} ms</span>
            <span>${result.retries} repairs</span>
          </div>
        `).join("")}
      </div>
      <pre>${escapeHtml(JSON.stringify(report.costQualityTradeoff, null, 2))}</pre>
    `;
    runEvalBtn.disabled = false;
  }, 80);
}

function setBusy(isBusy) {
  compileBtn.disabled = isBusy;
  promptInput.disabled = isBusy;
  compileBtn.innerHTML = isBusy ? "<span>↻</span> Compiling..." : "<span>⚡</span> Compile Application";
}

function setAuthBusy(mode, isBusy) {
  const isLogin = mode === "login";
  const submitBtn = isLogin ? loginSubmitBtn : registerSubmitBtn;
  const inputs = isLogin
    ? [loginEmailInput, loginPasswordInput]
    : [registerNameInput, registerEmailInput, registerPasswordInput];

  submitBtn.disabled = isBusy;
  inputs.forEach((input) => {
    input.disabled = isBusy;
  });
  submitBtn.innerHTML = isBusy
    ? "<span>↻</span> Please wait..."
    : `<span>→</span> ${isLogin ? "Login" : "Create account"}`;
}

function setAuthMode(mode) {
  authMode = mode;
  document.querySelectorAll("[data-auth-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.authMode === mode);
  });

  loginForm.hidden = mode !== "login";
  registerForm.hidden = mode !== "register";
  authTitle.textContent = mode === "login" ? "Login dashboard" : "Register dashboard";
  authDescription.textContent = mode === "login"
    ? "Continue with your Atlas-backed account and open the compiler workspace."
    : "Create a MongoDB-backed account, then start compiling validated app schemas.";
  setAuthMessage(mode, "");
}

function setAuthMessage(mode, message, type = "") {
  const messageNode = mode === "login" ? loginMessage : registerMessage;
  messageNode.textContent = message;
  messageNode.className = `auth-message ${type}`.trim();
}

async function submitLogin(event) {
  event.preventDefault();
  setAuthBusy("login", true);
  setAuthMessage("login", "");

  try {
    const payload = {
      email: loginEmailInput.value,
      password: loginPasswordInput.value
    };
    const data = await authRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    saveSession(data.token, data.user);
    renderAuthenticated(data.user);
    setAuthMessage("login", "Signed in.", "success");
  } catch (error) {
    setAuthMessage("login", error instanceof Error ? error.message : "Authentication failed.", "error");
  } finally {
    setAuthBusy("login", false);
  }
}

async function submitRegister(event) {
  event.preventDefault();
  setAuthBusy("register", true);
  setAuthMessage("register", "");

  try {
    const payload = {
      name: registerNameInput.value,
      email: registerEmailInput.value,
      password: registerPasswordInput.value
    };
    const data = await authRequest("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    saveSession(data.token, data.user);
    renderAuthenticated(data.user);
    setAuthMessage("register", "Account created.", "success");
  } catch (error) {
    setAuthMessage("register", error instanceof Error ? error.message : "Registration failed.", "error");
  } finally {
    setAuthBusy("register", false);
  }
}

async function restoreSession() {
  if (!authToken) {
    renderSignedOut();
    return;
  }

  try {
    const data = await authRequest("/api/auth/me", { method: "GET" });
    renderAuthenticated(data.user);
  } catch {
    clearSession();
    renderSignedOut();
  }
}

async function logout() {
  try {
    if (authToken) {
      await authRequest("/api/auth/logout", { method: "POST" });
    }
  } catch {
    // A local logout should still clear the browser session.
  }

  clearSession();
  renderSignedOut();
}

async function authRequest(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || data.detail || `Request failed with ${response.status}`);
  }

  return data;
}

function saveSession(token, user) {
  authToken = token;
  window.localStorage.setItem("compiler_auth_token", token);
  window.localStorage.setItem("compiler_user", JSON.stringify(user));
}

function clearSession() {
  authToken = "";
  window.localStorage.removeItem("compiler_auth_token");
  window.localStorage.removeItem("compiler_user");
}

function renderAuthenticated(user) {
  authSection.hidden = true;
  workspaceSection.hidden = false;
  pipelineSection.hidden = false;
  userChip.hidden = false;
  userName.textContent = user?.name || user?.email || "Signed in";
}

function renderSignedOut() {
  authSection.hidden = false;
  workspaceSection.hidden = true;
  pipelineSection.hidden = true;
  resultsSection.hidden = true;
  userChip.hidden = true;
  userName.textContent = "";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function iconSymbol(icon) {
  const icons = {
    intent: "◐",
    database: "▦",
    layout: "▣",
    server: "⇄",
    table: "▤",
    shield: "◇",
    bolt: "ϟ"
  };
  return icons[icon] || "□";
}

function validationItem(item) {
  const label = {
    fixed: "fixed",
    error: "error",
    warning: "warning",
    "runtime-pass": "runtime",
    "runtime-fail": "runtime"
  }[item.type];
  const mark = {
    fixed: "🔧",
    error: "×",
    warning: "!",
    "runtime-pass": "✓",
    "runtime-fail": "×"
  }[item.type];
  return `
    <div class="validation-item ${item.type}">
      <span>${mark}</span>
      <p><strong>${label}</strong> ${escapeHtml(item.message)}</p>
    </div>
  `;
}

document.querySelectorAll("[data-example]").forEach((button) => {
  button.addEventListener("click", () => {
    promptInput.value = button.dataset.example;
  });
});

document.querySelectorAll("[data-auth-mode]").forEach((button) => {
  button.addEventListener("click", () => setAuthMode(button.dataset.authMode));
});

loginForm.addEventListener("submit", submitLogin);
registerForm.addEventListener("submit", submitRegister);
logoutBtn.addEventListener("click", logout);
compileBtn.addEventListener("click", compile);
runEvalBtn.addEventListener("click", renderEvaluation);
setAuthMode("login");
renderPipeline();
restoreSession();

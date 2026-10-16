import React, { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { AnimatePresence, motion } from "motion/react";
import LandingExperience from "./landing.jsx";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  BarChart3,
  Blocks,
  Check,
  ChevronRight,
  Clock3,
  Code2,
  Cpu,
  Database,
  BookOpen,
  Network,
  GitPullRequest,
  Gauge,
  KeyRound,
  Layers3,
  Loader2,
  LogOut,
  Mail,
  Menu,
  PlayCircle,
  Rocket,
  Settings,
  ShieldCheck,
  Sparkles,
  Wand2,
  X,
  Search,
  Bell,
  Plus,
  User,
  Mic,
  Eye,
  FileCode,
  Download,
  AlertTriangle,
  RefreshCw,
  Terminal,
  Music2
} from "lucide-react";
import "./index.css";

const ArchitectureScene = lazy(() => import("./architecture-scene.jsx"));

// Custom SVG Brand Icons to bypass lucide-react brand icon deprecations
function Facebook({ size = 16, className = "" }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function Twitter({ size = 16, className = "" }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
    </svg>
  );
}

function Youtube({ size = 16, className = "" }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
      <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
    </svg>
  );
}

function Instagram({ size = 16, className = "" }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

const examples = [
  "Build a CRM with login, contacts, dashboard, role-based access, and premium plan with payments. Admins can see analytics.",
  "Create an e-commerce storefront with product catalog, cart, checkout, payments, admin inventory, and customer order history.",
  "Build a project management app with teams, kanban boards, tasks, comments, manager analytics, and guest read-only access."
];

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("compiler_auth_token") || "");
  const [restoring, setRestoring] = useState(true);
  const [showConsole, setShowConsole] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [draftPrompt, setDraftPrompt] = useState("");
  const [experienceSetupRequest, setExperienceSetupRequest] = useState(0);
  const [experienceProfile, setExperienceProfile] = useState(() => {
    try { return JSON.parse(localStorage.getItem("compiler_experience_profile") || "null"); } catch { return null; }
  });
  const [authNotice, setAuthNotice] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthToken = params.get("auth_token");
    const oauthError = params.get("auth_error");

    if (oauthToken || oauthError) {
      window.history.replaceState({}, "", window.location.pathname);
    }

    if (oauthError) {
      setAuthNotice(oauthError);
      setRestoring(false);
      return;
    }

    const initialToken = oauthToken || localStorage.getItem("compiler_auth_token") || "";
    if (!initialToken) {
      setRestoring(false);
      return;
    }

    if (oauthToken) {
      localStorage.setItem("compiler_auth_token", oauthToken);
      setToken(oauthToken);
    }

    apiRequest("/api/auth/me", { token: initialToken })
      .then((data) => {
        if (!data?.user) throw new Error("Invalid session data");
        localStorage.setItem("compiler_user", JSON.stringify(data.user));
        setUser(data.user);
        if (data.user.experienceProfile) {
          setExperienceProfile(data.user.experienceProfile);
          localStorage.setItem("compiler_experience_profile", JSON.stringify(data.user.experienceProfile));
        }
      })
      .catch((err) => {
        console.warn("Session restore failed:", err);
        localStorage.removeItem("compiler_auth_token");
        localStorage.removeItem("compiler_user");
        setToken("");
        setUser(null);
        if (oauthToken) {
          setAuthNotice("Social sign-in succeeded but the session could not be restored.");
        }
      })
      .finally(() => setRestoring(false));
  }, []);

  function handleAuthenticated(nextToken, nextUser) {
    localStorage.setItem("compiler_auth_token", nextToken);
    localStorage.setItem("compiler_user", JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
    if (nextUser.experienceProfile) {
      setExperienceProfile(nextUser.experienceProfile);
      localStorage.setItem("compiler_experience_profile", JSON.stringify(nextUser.experienceProfile));
    } else if (experienceProfile?.audience) {
      apiRequest("/api/auth/preferences", {
        method: "PUT",
        token: nextToken,
        body: JSON.stringify({ experienceProfile })
      }).then(({ experienceProfile: savedProfile }) => {
        setExperienceProfile(savedProfile);
        setUser((current) => current ? { ...current, experienceProfile: savedProfile } : current);
        localStorage.setItem("compiler_experience_profile", JSON.stringify(savedProfile));
      }).catch(() => {});
    }
    setShowAuth(false);
    setShowConsole(true);
  }

  function openSignIn(mode = "login") {
    setAuthMode(mode);
    setShowAuth(true);
  }

  function beginBuilding(prompt) {
    setDraftPrompt(prompt || "");
    if (user && token) {
      setShowConsole(true);
      return;
    }
    openSignIn("register");
  }

  function requestExperienceSetup() {
    setShowConsole(false);
    setShowAuth(false);
    setExperienceSetupRequest((current) => current + 1);
  }

  async function handleLogout() {
    try {
      if (token) await apiRequest("/api/auth/logout", { method: "POST", token });
    } finally {
      localStorage.removeItem("compiler_auth_token");
      localStorage.removeItem("compiler_user");
      setToken("");
      setUser(null);
      setShowConsole(false);
    }
  }

  if (restoring) return <LoadingScreen />;

  const isPublicLanding = !showConsole && !showAuth;

  return (
    <div className="relative w-full min-h-svh overflow-x-hidden flex flex-col items-center font-sans selection:bg-white/20 selection:text-white">
      <div className="studio-backdrop" aria-hidden="true" />

      {/* Main Content Container */}
      <div className={`relative z-10 w-full ${showConsole ? "max-w-none px-0 py-0" : isPublicLanding ? "max-w-none px-0 py-0" : "max-w-7xl px-4 md:px-8 pt-6 md:pt-8 pb-8"} ${!showConsole && !isPublicLanding ? "flex-1 flex flex-col items-center" : ""}`}>
        
        {/* Brand Top Header */}
        {!showConsole && !isPublicLanding && <header className="w-full flex items-center justify-between mb-8 md:mb-10 select-none">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-glow-cyan">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-black tracking-widest font-mono uppercase bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-transparent">
              AI COMPILER STUDIO
            </span>
          </div>

          {user && token && (
            <div className="flex items-center gap-4">
              <button type="button" onClick={requestExperienceSetup} className="button-quiet">Personalize experience</button>
            </div>
          )}
        </header>}

        {/* Dynamic Inner Workspace / Upper CTA */}
        <div className={`${showConsole || isPublicLanding ? "w-full" : "w-full flex-1 flex items-center justify-center mb-8 md:mb-12"}`}>
          <AnimatePresence mode="wait">
            {showConsole && user && token ? (
              <motion.div
                key="console-view"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.4 }}
                className="w-full"
              >
                <Dashboard user={user} token={token} onLogout={handleLogout} initialPrompt={draftPrompt} onChangeAudience={requestExperienceSetup} experienceProfile={experienceProfile} />
              </motion.div>
            ) : isPublicLanding ? (
              <motion.div
                key="public-landing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full"
              >
                <LandingExperience
                  user={user}
                  token={token}
                  experienceProfile={experienceProfile}
                  onProfileChange={setExperienceProfile}
                  setupRequest={experienceSetupRequest}
                  onSignIn={openSignIn}
                  onStartBuilding={beginBuilding}
                />
              </motion.div>
            ) : (
              /* Auth console */
              <motion.div
                key="auth-view"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="w-full"
              >
                <AuthExperience onAuthenticated={handleAuthenticated} initialNotice={authNotice} initialMode={authMode} onBack={() => setShowAuth(false)} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Keep the full marketing footer on the public landing, and the compact app shell in the workspace. */}
      </div>
    </div>
  );
}

function AuthExperience({ onAuthenticated, initialNotice = "", initialMode = "login", onBack }) {
  const [mode, setMode] = useState(initialMode);

  const features = [
    { icon: Cpu, label: "AI Architecture Generation", desc: "Transforms custom descriptions into robust system designs" },
    { icon: Code2, label: "Automated API Design", desc: "Constructs clean, type-safe REST interface blueprints" },
    { icon: Database, label: "Database Schema Creation", desc: "Generates optimized, normalized database collections" },
    { icon: ShieldCheck, label: "Validation & Repair Engine", desc: "Verifies architecture consistency and self-heals errors" },
    { icon: PlayCircle, label: "Runtime Generation", desc: "Instantly provisions sandboxed in-memory database mockups" }
  ];

  return (
    <motion.main
      className="relative w-full text-white flex flex-col justify-center items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <AnimatedBackground />

      <div className="w-full max-w-7xl px-4 sm:px-6 md:px-8 py-6 md:py-10 z-10">
        <button type="button" className="auth-back-link" onClick={onBack}><ArrowRight size={15} className="rotate-180" />Back to home</button>
        {/* Two-Column Split Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
          
          {/* Left Column: Product Message & Features */}
          <motion.div
            className="lg:col-span-6 space-y-7 text-center lg:text-left"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
          >
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05] text-white font-sans max-w-xl mx-auto lg:mx-0">
                Turn Ideas Into <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Production-Ready</span> Applications
              </h1>
              <p className="text-slate-300/80 text-sm sm:text-base leading-relaxed max-w-lg mx-auto lg:mx-0">
                Generate architecture, APIs, schemas, validation passes and runtime previews from a single product description.
              </p>
            </div>

            {/* Feature Cards List */}
            <div className="space-y-3 max-w-xl mx-auto lg:mx-0">
              {features.map((feature, i) => (
                <FeatureCard key={i} feature={feature} index={i} />
              ))}
            </div>
          </motion.div>

          {/* Right Column: Premium Auth Card */}
          <motion.div
            className="lg:col-span-6 flex justify-center lg:justify-end"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
          >
            <AuthCard mode={mode} setMode={setMode} onAuthenticated={onAuthenticated} initialNotice={initialNotice} />
          </motion.div>
        </div>
      </div>
    </motion.main>
  );
}

function FeatureCard({ feature, index }) {
  const Icon = feature.icon;
  return (
    <motion.div
      className="w-full text-left"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 + index * 0.08, duration: 0.5 }}
      whileHover={{ y: -2, x: 2 }}
    >
      <div className="glass-card-saas rounded-2xl p-4.5 transition-all duration-300 bg-white/[0.015] hover:bg-white/[0.035]">
        <div className="flex gap-4">
          <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-blue-400" />
          </div>
          <div className="space-y-0.5">
            <h3 className="text-sm font-semibold text-slate-100">{feature.label}</h3>
            <p className="text-xs text-slate-400 leading-normal">{feature.desc}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function AnimatedBackground() {
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
      <motion.div
        className="absolute left-[-10%] top-[-10%] w-[60%] h-[60%] rounded-full bg-blue-600/5 blur-[150px]"
        animate={{
          x: [0, 50, 0],
          y: [0, 30, 0],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute right-[-10%] bottom-[-10%] w-[60%] h-[60%] rounded-full bg-purple-600/5 blur-[150px]"
        animate={{
          x: [0, -50, 0],
          y: [0, -30, 0],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

function AuthCard({ mode, setMode, onAuthenticated, initialNotice = "" }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(() =>
    initialNotice ? { type: "error", text: initialNotice } : { type: "", text: "" }
  );
  const strength = getPasswordStrength(form.password);
  const validation = validateAuthForm(mode, form);
  const isRegister = mode === "register";

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setMessage({ type: "", text: "" });
  }

  async function submit(event) {
    event.preventDefault();
    if (!validation.valid) {
      setMessage({ type: "error", text: validation.errors[0] });
      return;
    }

    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const payload = isRegister
        ? { name: form.name, email: form.email, password: form.password }
        : { email: form.email, password: form.password };
      const data = await apiRequest(`/api/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify(payload)
      });
      setMessage({ type: "success", text: isRegister ? "Account created successfully." : "Successfully authenticated." });
      window.setTimeout(() => onAuthenticated(data.token, data.user), 400);
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Authentication failed." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      className="glass-card-saas w-full max-w-[460px] rounded-3xl p-6 sm:p-8 shadow-premium relative flex flex-col"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.5 }}
    >
      {/* Title */}
      <div className="mb-6 text-center lg:text-left">
        <h2 className="text-2xl font-bold text-white mb-1.5 font-sans">
          {isRegister ? "Get Started" : "Welcome Back"}
        </h2>
        <p className="text-xs text-slate-400 leading-normal">
          {isRegister ? "Create your developer profile to start compiling apps." : "Sign in to access your compiler workspaces."}
        </p>
      </div>

      {/* Tabs */}
      <div className="relative mb-6 grid grid-cols-2 rounded-xl border border-white/5 bg-white/[0.02] p-1" role="tablist">
        <motion.div
          className="absolute inset-y-1 w-[calc(50%-0.35rem)] rounded-lg bg-white/[0.04] border border-white/10 shadow"
          animate={{ x: mode === "login" ? 4 : "100%" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
        {["login", "register"].map((item) => (
          <button
            key={item}
            className={`relative z-10 rounded-lg py-2.5 text-xs font-semibold transition uppercase tracking-wider font-sans ${mode === item ? "text-white" : "text-slate-400 hover:text-white"}`}
            type="button"
            role="tab"
            aria-selected={mode === item}
            onClick={() => {
              setMode(item);
              setMessage({ type: "", text: "" });
            }}
          >
            {item === "login" ? "Login" : "Register"}
          </button>
        ))}
      </div>

      {/* Social Logins */}
      <div className="grid grid-cols-2 gap-3.5 mb-6">
        <button
          type="button"
          disabled={loading}
          onClick={() => startSocialSignIn("google", setLoading, setMessage)}
          className="flex min-h-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.025] hover:border-white/20 hover:bg-white/[0.07] transition py-3 px-4 text-sm font-semibold text-slate-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70 disabled:opacity-50"
        >
          <svg className="mr-2 size-4" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          Google
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => startSocialSignIn("github", setLoading, setMessage)}
          className="flex min-h-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.025] hover:border-white/20 hover:bg-white/[0.07] transition py-3 px-4 text-sm font-semibold text-slate-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70 disabled:opacity-50"
        >
          <svg className="mr-2 size-4 fill-white" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
          GitHub
        </button>
      </div>

      <div className="flex items-center gap-3.5 mb-6">
        <div className="h-px bg-white/10 flex-1" />
        <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold font-sans">Or continue with</span>
        <div className="h-px bg-white/10 flex-1" />
      </div>

      {/* Form */}
      <AnimatePresence mode="wait">
        <motion.form
          key={mode}
          className="space-y-4 text-left"
          onSubmit={submit}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {isRegister && (
            <AuthInput
              label="Full Name"
              value={form.name}
              onChange={(value) => updateField("name", value)}
              autoComplete="name"
              placeholder="Divyansh Dobhal"
              icon={User}
            />
          )}
          <AuthInput
            label="Email Address"
            type="email"
            value={form.email}
            onChange={(value) => updateField("email", value)}
            autoComplete="email"
            placeholder="divyansh@studio.ai"
            icon={Mail}
          />
          <AuthInput
            label="Password"
            type="password"
            value={form.password}
            onChange={(value) => updateField("password", value)}
            autoComplete={isRegister ? "new-password" : "current-password"}
            placeholder="••••••••"
            icon={KeyRound}
          />
          {isRegister && (
            <>
              <AuthInput
                label="Confirm Password"
                type="password"
                value={form.confirmPassword}
                onChange={(value) => updateField("confirmPassword", value)}
                autoComplete="new-password"
                placeholder="••••••••"
                icon={KeyRound}
              />
              <PasswordStrength strength={strength} />
            </>
          )}

          <StatusMessage message={message} />

          <motion.button
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 py-3.5 px-4 font-bold text-white shadow-md hover:shadow-lg transition text-sm cursor-pointer"
            type="submit"
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.99 }}
            disabled={loading}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            <span>{loading ? "Authenticating..." : isRegister ? "Create Account" : "Sign In"}</span>
          </motion.button>
        </motion.form>
      </AnimatePresence>
    </motion.div>
  );
}

function AuthInput({ label, value, onChange, type = "text", autoComplete, placeholder = "", icon: Icon }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-slate-300 font-sans">{label}</span>
      <span className="relative block">
        {Icon && <Icon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />}
        <input
          className={`w-full rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-3 text-white placeholder:text-slate-600 transition focus:border-indigo-500 focus:bg-white/[0.04] focus:outline-none focus:ring-2 focus:ring-indigo-500/10 ${Icon ? "pl-10" : ""} font-sans text-sm`}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          required
        />
      </span>
    </label>
  );
}

function PasswordStrength({ strength }) {
  return (
    <div aria-live="polite">
      <div className="mb-1.5 flex items-center justify-between text-[11px] font-sans">
        <span className="font-semibold text-slate-400">Password Strength</span>
        <span className={`${strength.color} font-bold`}>{strength.label}</span>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {[0, 1, 2, 3].map((index) => (
          <motion.div
            key={index}
            className={`h-1 rounded-full ${index < strength.score ? strength.bg : "bg-white/5"}`}
            animate={{ scaleX: index < strength.score ? 1 : 0.95 }}
          />
        ))}
      </div>
    </div>
  );
}

function StatusMessage({ message }) {
  if (!message.text) return null;
  const isError = message.type === "error";
  return (
    <motion.div
      className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-xs font-sans ${isError ? "border-rose-500/20 bg-rose-500/5 text-rose-300" : "border-emerald-500/20 bg-emerald-500/5 text-emerald-300"}`}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      role={isError ? "alert" : "status"}
    >
      {isError ? <AlertCircle className="mt-0.5 size-4 flex-shrink-0" aria-hidden="true" /> : <Check className="mt-0.5 size-4 flex-shrink-0" aria-hidden="true" />}
      <span>{message.text}</span>
    </motion.div>
  );
}

function Dashboard({ user, token, onLogout, initialPrompt = "", onChangeAudience, experienceProfile }) {
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [prompt, setPrompt] = useState(() => initialPrompt || examples[0]);
  const [output, setOutput] = useState(null);
  const [compiling, setCompiling] = useState(false);
  const [compilationProgress, setCompilationProgress] = useState(0);
  const [currentCompileTask, setCurrentCompileTask] = useState("Waiting For Operator");
  const [error, setError] = useState("");
  const [mockPreviewPage, setMockPreviewPage] = useState(null);
  const [simulatedSpeech, setSimulatedSpeech] = useState(false);
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [compileMode, setCompileMode] = useState(() => localStorage.getItem("compiler_compile_mode") === "local" ? "local" : "nvidia");
  const [nvidiaApiKey, setNvidiaApiKey] = useState(() => localStorage.getItem("compiler_nvidia_api_key") || "");
  const [profileOpen, setProfileOpen] = useState(false);
  const [compilationsThisSession, setCompilationsThisSession] = useState(0);

  // Compile Trigger with Progress and Task Simulation
  async function compile() {
    setCompiling(true);
    setError("");
    setOutput(null);
    setCompilationProgress(0);
    setCurrentCompileTask("Waiting for the compiler response…");

    try {
      const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(compileMode === "nvidia" && nvidiaApiKey ? { "X-Nvidia-API-Key": nvidiaApiKey } : {})
      };

      const data = await apiRequest("/api/compile", {
        method: "POST",
        token,
        headers,
        body: JSON.stringify({
          prompt,
          compileMode,
          nvidiaApiKey: compileMode === "nvidia" ? nvidiaApiKey : ""
        })
      });
      setOutput(data);
      setCompilationsThisSession((count) => count + 1);
      setCompilationProgress(100);
      setCurrentCompileTask(data.ok ? "Compilation complete" : "Compilation complete · review the results");
      setCompiling(false);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Compilation failed.");
      setCompilationProgress(0);
      setCurrentCompileTask("Compilation failed");
      setCompiling(false);
    }
  }

  // Live Speech Simulator
  function startMockSpeech() {
    if (compiling) return;
    setSimulatedSpeech(true);
    setPrompt("");
    
    const mockSpeechPrompt = "Build an e-commerce storefront with product catalog, cart, checkout, payments, admin inventory, and customer order history.";
    let index = 0;
    
    const timer = setInterval(() => {
      if (index < mockSpeechPrompt.length) {
        setPrompt((prev) => prev + mockSpeechPrompt.charAt(index));
        index++;
      } else {
        clearInterval(timer);
        setSimulatedSpeech(false);
      }
    }, 40);
  }

  // Scroll to section based on sidebar clicks
  function navigateToSection(label) {
    setActiveTab(label);
    setMobileNavOpen(false);
    const element = document.getElementById(label.toLowerCase().replace(" ", "-"));
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  return (
    <motion.div
      className="relative min-h-screen text-white overflow-x-hidden flex font-sans"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <AnimatedBackground />

      {mobileNavOpen && <button type="button" className="workspace-mobile-scrim lg:hidden" onClick={() => setMobileNavOpen(false)} aria-label="Close workspace navigation" />}

      {/* Glassmorphism Left Sidebar */}
      <AIOSSidebar
        expanded={sidebarExpanded}
        setExpanded={setSidebarExpanded}
        activeTab={activeTab}
        onNavigate={navigateToSection}
        mobileOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />

      {/* Main OS Console */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${sidebarExpanded ? "lg:ml-72" : "lg:ml-20"} z-10 relative`}>
        {/* Top Navigation Console */}
        <AITopNavbar
          user={user}
          onLogout={onLogout}
          compiling={compiling}
          currentTask={currentCompileTask}
          progress={compilationProgress}
          onNavigate={navigateToSection}
          onProfileClick={() => setProfileOpen(true)}
          onMenuClick={() => setMobileNavOpen((open) => !open)}
        />

        {/* Console Workspace Grid */}
        <main className="p-6 lg:p-8 space-y-8 max-w-7xl w-full mx-auto pb-24">
          
          {/* Welcome Header & KPI Metrics Grid */}
          <WelcomeHeader user={user} onNewProjectClick={() => navigateToSection("dashboard")} />
          {experienceProfile?.audience === "student" && experienceProfile?.experience === "beginner" && (
            <div className="beginner-workspace-note"><BookOpen size={16} /><span><strong>New to software terms?</strong> The compiler output is organized into an architecture (how parts connect), schemas (what data is stored), APIs (how parts communicate), and validation (checks for consistency).</span></div>
          )}
          <MetricsGrid output={output} compileMode={compileMode} compilationsThisSession={compilationsThisSession} />

          {/* Section 1: AI Prompt Generator Section */}
          <div id="dashboard">
            <AICommandCenter
              prompt={prompt}
              setPrompt={setPrompt}
              onCompile={compile}
              compiling={compiling}
              error={error}
              speechActive={simulatedSpeech}
              onStartSpeech={startMockSpeech}
            />
          </div>

          {/* Compilation progress and stage timings */}
          <div id="intent-extraction">
            <LivePipeline compiling={compiling} progress={compilationProgress} output={output} currentTask={currentCompileTask} />
          </div>

          {/* Section 4: Blueprint Schemas Console */}
          <div id="schema-generator">
            <BlueprintSchemasConsole output={output} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Section 4: Symmetrical Systems HUD */}
            <div id="system-design" className="lg:col-span-8">
              <ArchitectureMap output={output} />
            </div>

            {/* Section 6: Validation Radar HUD */}
            <div id="validation-engine" className="lg:col-span-4">
              <ValidationRadar output={output} />
            </div>
          </div>

          {/* Section 5: Real-Time Preview Consolidation */}
          <div id="runtime-generator">
            <RuntimePreview
              output={output}
              setPreviewPage={setMockPreviewPage}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Section 7: Symmetrical File Modules */}
            <div id="projects" className="lg:col-span-7">
              <RecentProjects output={output} onCompilePrompt={setPrompt} />
            </div>

            {/* Section 8: Live Chronological Timelines */}
            <div id="repair-engine" className="lg:col-span-5">
              <AIActivityTimeline output={output} compiling={compiling} />
            </div>
          </div>

          {/* Section 9: OS Performance Analytics */}
          <div id="analytics">
            <SystemAnalytics output={output} />
          </div>
        </main>
      </div>

      {/* Symmetrical Settings Trigger Modal */}
      <AnimatePresence>
        {activeTab === "Settings" && (
          <SettingsModal
            compileMode={compileMode}
            setCompileMode={(mode) => {
              setCompileMode(mode);
              localStorage.setItem("compiler_compile_mode", mode);
            }}
            nvidiaApiKey={nvidiaApiKey}
            setNvidiaApiKey={(key) => {
              setNvidiaApiKey(key);
              localStorage.setItem("compiler_nvidia_api_key", key);
            }}
            onClose={() => setActiveTab("Dashboard")}
          />
        )}
      </AnimatePresence>
 
      {/* Symmetrical Profile Config Modal */}
      <AnimatePresence>
        {profileOpen && (
          <ProfileModal
            user={user}
            onClose={() => setProfileOpen(false)}
            onChangeAudience={() => {
              setProfileOpen(false);
              onChangeAudience?.();
            }}
          />
        )}
      </AnimatePresence>

      {/* Symmetrical Live Application Mockup Modal */}
      <AnimatePresence>
        {mockPreviewPage && (
          <MockPreviewModal
            page={mockPreviewPage}
            output={output}
            onClose={() => setMockPreviewPage(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ================== AI OPERATING SYSTEM COMPONENT LAYOUTS ================== */

function WelcomeHeader({ user, onNewProjectClick }) {
  return (
    <motion.div
      className="glass-card-saas rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 text-left relative overflow-hidden"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="space-y-1 z-10">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-sans tracking-tight">
          Welcome back, {user?.name?.split(" ")[0] || "builder"}.
        </h1>
        <p className="text-sm text-slate-400 font-sans">
          Describe an idea, then review its architecture, schemas, APIs, and validation.
        </p>
      </div>
      <div className="flex gap-3 flex-shrink-0 z-10">
        <button
          onClick={onNewProjectClick}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer hover:shadow-lg active:scale-99"
        >
          <Plus className="w-4 h-4" />
          New Project
        </button>
        <a
          href="#schema-generator"
          className="flex items-center gap-2 px-5 py-3 rounded-xl border border-white/10 bg-white/[0.01] hover:bg-white/[0.04] text-slate-300 hover:text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
        >
          <FileCode className="w-4 h-4" />
          Documentation
        </a>
      </div>
    </motion.div>
  );
}

function MetricsGrid({ output, compileMode, compilationsThisSession }) {
  const metrics = [
    { label: "Builds this session", value: compilationsThisSession },
    { label: "Latest validation", value: output ? (output.validation?.errors?.length ? `${output.validation.errors.length} issues` : "Passed") : "Not run" },
    { label: "Runtime preview", value: output ? (output.runtime?.ok ? "Ready" : "Needs review") : "Not run" },
    { label: "Compiler mode", value: compileMode === "nvidia" ? "NVIDIA NIM" : "Local" }
  ];

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
      {metrics.map((card, i) => (
        <motion.div
          key={card.label}
          className="glass-card-saas glass-card-saas-hover rounded-xl p-4 md:p-5 text-left flex flex-col justify-between min-h-24 relative overflow-hidden"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08, duration: 0.5 }}
        >
          <div className="flex items-start justify-between">
            <span className="text-[10px] font-bold text-slate-400 font-sans uppercase tracking-wider">
              {card.label}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-violet-300/80" aria-hidden="true" />
          </div>

          <div className="flex items-end justify-between mt-4">
            <span className="text-xl md:text-2xl font-semibold text-white font-sans tracking-tight">
              {card.value}
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function AIOSSidebar({ expanded, setExpanded, activeTab, onNavigate, mobileOpen = false, onClose }) {
  const avatarTheme = localStorage.getItem("profile_avatar_theme") || "indigo";
  const gradients = {
    indigo: "from-blue-500 via-indigo-500 to-purple-600",
    emerald: "from-teal-500 via-emerald-500 to-green-600",
    ruby: "from-rose-500 via-red-500 to-orange-600",
    amber: "from-amber-400 via-orange-500 to-yellow-600",
    cyber: "from-fuchsia-500 via-purple-600 to-pink-500"
  };
  const activeGradient = gradients[avatarTheme] || gradients.indigo;

  const sidebarItems = [
    { icon: BarChart3, label: "Dashboard", id: "dashboard" },
    { icon: Blocks, label: "Projects", id: "projects" },
    { icon: Cpu, label: "Intent Extraction", id: "intent-extraction" },
    { icon: Layers3, label: "System Design", id: "system-design" },
    { icon: Database, label: "Schema Generator", id: "schema-generator" },
    { icon: ShieldCheck, label: "Validation Engine", id: "validation-engine" },
    { icon: Wand2, label: "Repair Engine", id: "repair-engine" },
    { icon: PlayCircle, label: "Runtime Execution", id: "runtime-generator" },
    { icon: Gauge, label: "Evaluation Metrics", id: "analytics" },
    { icon: Settings, label: "Settings", id: "Settings" }
  ];

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 transition-all duration-300 glass-sidebar-saas flex-col ${mobileOpen ? "flex" : "hidden lg:flex"} ${
        expanded ? "w-72" : "w-20"
      }`}
    >
      {/* Brand Header */}
      <div className="h-20 flex items-center px-6 border-b border-white/5 justify-between">
        <AnimatePresence mode="wait">
          {expanded ? (
            <motion.div
              key="brand-full"
              className="flex items-center gap-3.5"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
            >
              <div className={`w-8.5 h-8.5 rounded-lg bg-gradient-to-br ${activeGradient} flex items-center justify-center shadow-md`}>
                <Sparkles className="w-4.5 h-4.5 text-white" />
              </div>
              <span className="font-bold text-sm tracking-tight text-white font-sans">
                AI Compiler Studio
              </span>
            </motion.div>
          ) : (
            <motion.div
              key="brand-collapsed"
              className={`w-8.5 h-8.5 rounded-lg bg-gradient-to-br ${activeGradient} flex items-center justify-center shadow-md mx-auto`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
            >
              <Sparkles className="w-4.5 h-4.5 text-white" />
            </motion.div>
          )}
        </AnimatePresence>

        {mobileOpen && (
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition lg:hidden" aria-label="Close navigation">
            <X className="w-4 h-4" />
          </button>
        )}
        {expanded && !mobileOpen && (
          <button
            onClick={() => setExpanded(false)}
            className="p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1.5 custom-scrollbar">
        {!expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="w-full py-2.5 mb-4 rounded-xl border border-dashed border-white/15 flex justify-center text-slate-400 hover:text-white hover:bg-white/5 transition"
          >
            <ChevronRight className="w-4.5 h-4.5" />
          </button>
        )}

        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id || activeTab === item.label;
          return (
            <motion.button
              key={item.label}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold font-sans tracking-normal transition-all capitalize ${
                isActive
                  ? "nav-item-active text-white bg-white/[0.04] border border-white/10"
                  : "text-slate-400 hover:text-white hover:bg-white/[0.02] border border-transparent"
              }`}
              whileHover={{ x: isActive ? 0 : 2 }}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-blue-400" : "text-slate-500 group-hover:text-slate-200"}`} />
              {expanded && <span>{item.label}</span>}
              {expanded && isActive && (
                <motion.div
                  className="ml-auto w-1 h-1 rounded-full bg-blue-400"
                  animate={{ scale: [1, 1.4, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* Footer OS Details */}
      <div className="p-4 border-t border-white/5">
        {expanded ? (
          <div className="text-[10px] font-sans text-slate-500 space-y-1 text-left px-2">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-slate-400 font-semibold">System Online</span>
            </div>
            <div>Version 1.0.0 • Connected</div>
          </div>
        ) : (
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mx-auto" />
        )}
      </div>
    </aside>
  );
}

function AITopNavbar({ user, onLogout, compiling, currentTask, onNavigate, onProfileClick, onMenuClick }) {
  const avatarTheme = localStorage.getItem("profile_avatar_theme") || "indigo";
  const gradients = {
    indigo: "from-blue-500 via-indigo-500 to-purple-600",
    emerald: "from-teal-500 via-emerald-500 to-green-600",
    ruby: "from-rose-500 via-red-500 to-orange-600",
    amber: "from-amber-400 via-orange-500 to-yellow-600",
    cyber: "from-fuchsia-500 via-purple-600 to-pink-500"
  };
  const activeGradient = gradients[avatarTheme] || gradients.indigo;

  return (
    <header className="sticky top-0 z-30 min-h-16 border-b border-white/5 backdrop-blur-xl bg-slate-950/80 flex items-center justify-between gap-4 px-4 md:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button type="button" onClick={onMenuClick} aria-label="Open workspace navigation" className="workspace-mobile-menu lg:hidden"><Menu size={18} /></button>
        <span className="hidden sm:block text-xs font-semibold text-slate-200">Workspace</span>
        {compiling && <span className="inline-flex min-w-0 items-center gap-2 text-[10px] text-blue-200"><Loader2 size={13} className="animate-spin" /><span className="truncate">{currentTask}</span></span>}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 md:gap-4 ml-auto">
        <button
          onClick={() => onNavigate("dashboard")}
          className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-xs font-bold font-sans tracking-wide text-white transition uppercase cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          New Project
        </button>

        {/* Profile Menu */}
        <button
          type="button"
          onClick={onProfileClick}
          aria-label="Open profile and experience preferences"
          className="flex items-center gap-3 rounded-lg px-1.5 py-1 cursor-pointer hover:bg-white/5 transition select-none text-left"
        >
          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${activeGradient} flex items-center justify-center text-xs font-bold text-white shadow`}>
            {user?.name?.charAt(0).toUpperCase() || "O"}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-bold text-white font-sans leading-none">{user?.name || "Operator"}</p>
            <p className="text-[10px] text-slate-400 font-sans tracking-wide mt-0.5 capitalize">Team Member</p>
          </div>
        </button>

        <button
          onClick={onLogout}
          className="p-2 hover:bg-rose-500/10 rounded-xl border border-rose-500/10 transition text-rose-400 hover:text-rose-300"
          title="Sign Out"
        >
          <LogOut className="w-4.5 h-4.5" />
        </button>
      </div>
    </header>
  );
}

function AICommandCenter({ prompt, setPrompt, onCompile, compiling, error, speechActive, onStartSpeech }) {
  const maxChars = 500;
  const charCount = prompt.length;

  return (
    <motion.section
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-4 text-left"
    >
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white font-sans">
          Studio Generator
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          Describe the feature set, workflows, and pages of your ideal application. The engine compiles structural schema, endpoints, data tables, and dynamic user interfaces in real time.
        </p>
      </div>

      <div className="glass-card-saas rounded-2xl p-6 relative overflow-hidden">
        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-semibold text-slate-300 tracking-wide uppercase">
                App Specification Prompt
              </span>
            </div>
            {speechActive && (
              <span className="flex items-center gap-2 bg-rose-500/10 px-3 py-1 rounded-full text-rose-400 font-sans font-medium text-[10px] animate-pulse border border-rose-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                Voice Capturing Active
              </span>
            )}
          </div>

          <div className="relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value.slice(0, maxChars))}
              placeholder="E.g., Build a clinic booking app with doctors, patient database, billing, receptionist portal, and scheduler..."
              disabled={compiling || speechActive}
              className="w-full bg-slate-950/40 border border-white/10 rounded-xl p-4 text-white placeholder:text-slate-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 resize-none h-32 transition font-sans text-sm leading-relaxed"
            />
            {speechActive && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 rounded-xl">
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <motion.div
                      key={i}
                      className="w-1 bg-blue-500 rounded-full"
                      animate={{ height: [8, 32, 8] }}
                      transition={{ duration: 0.6 + i * 0.1, repeat: Infinity }}
                    />
                  ))}
                  <span className="text-xs font-sans font-semibold text-blue-400 ml-4">
                    Listening to voice input...
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Quick preset chips */}
          <div className="space-y-1.5">
            <span className="text-[10px] text-slate-500 font-sans uppercase font-semibold tracking-wider">
              Quick Presets
            </span>
            <div className="flex flex-wrap gap-2">
              {examples.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPrompt(item)}
                  disabled={compiling || speechActive}
                  className="px-3 py-1.5 rounded-lg bg-white/[0.02] border border-white/5 text-slate-400 hover:text-white hover:bg-white/[0.06] hover:border-white/10 text-xs font-sans transition text-left max-w-full truncate"
                >
                  {idx === 0 ? "CRM Platform" : idx === 1 ? "E-Commerce Store" : "Project Manager"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-white/5">
            <span className={`text-xs font-sans ${charCount >= maxChars * 0.9 ? "text-orange-400" : "text-slate-500"}`}>
              {charCount} / {maxChars} characters
            </span>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onStartSpeech}
                disabled={compiling || speechActive}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 font-medium text-xs hover:bg-white/5 transition"
              >
                <Mic className="w-3.5 h-3.5" />
                Simulate Voice
              </button>

              <motion.button
                onClick={onCompile}
                disabled={compiling || !prompt.trim() || speechActive}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium text-xs shadow-lg shadow-blue-500/10 disabled:opacity-50 transition"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {compiling ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Compiling Application...
                  </>
                ) : (
                  <>
                    <Rocket className="w-3.5 h-3.5" />
                    Compile Blueprint
                  </>
                )}
              </motion.button>
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-sans flex items-center gap-2.5"
            >
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>Compilation error: {error}</span>
            </motion.div>
          )}
        </div>
      </div>
    </motion.section>
  );
}

function AIAgentTeam({ compiling, progress }) {
  const agents = [
    { name: "Architect Agent", icon: "🏗", role: "system_design", baseConfidence: 98 },
    { name: "Backend Agent", icon: "⚙", role: "api_generation", baseConfidence: 96 },
    { name: "UI Agent", icon: "🎨", role: "ui_assembly", baseConfidence: 94 },
    { name: "Security Agent", icon: "🔐", role: "auth_routing", baseConfidence: 99 },
    { name: "Validation Agent", icon: "🧪", role: "schema_validation", baseConfidence: 97 },
    { name: "Runtime Agent", icon: "🚀", role: "sandbox_boot", baseConfidence: 95 }
  ];

  function getAgentStatus(idx) {
    if (!compiling) return { label: "ACTIVE", color: "text-green-300 bg-green-500/20 border-green-500/30", dot: "bg-green-500" };
    
    // Map idx to active compile milestones
    const indexThreshold = idx * 18;
    if (progress < indexThreshold) {
      return { label: "STANDBY", color: "text-slate-400 bg-slate-500/20 border-slate-500/30", dot: "bg-slate-500" };
    } else if (progress >= indexThreshold && progress < indexThreshold + 18) {
      return { label: "COMPILING", color: "text-cyan-300 bg-cyan-500/20 border-cyan-500/30 animate-pulse", dot: "bg-cyan-400 animate-ping" };
    } else {
      return { label: "SUCCESS", color: "text-green-300 bg-green-500/20 border-green-500/30", dot: "bg-green-500" };
    }
  }

  function getAgentProgress(idx) {
    if (!compiling) return 100;
    const indexThreshold = idx * 18;
    if (progress < indexThreshold) return 0;
    if (progress >= indexThreshold && progress < indexThreshold + 18) {
      return Math.round(((progress - indexThreshold) / 18) * 100);
    }
    return 100;
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.5 }}
      className="space-y-4 text-left"
    >
      <div>
        <h3 className="text-xl font-black text-cyan-300 flex items-center gap-2 font-mono uppercase tracking-wider">
          <Sparkles className="w-5 h-5" />
          AI AGENT ORCHESTRATION TEAM
        </h3>
        <p className="text-slate-400 text-xs font-mono mt-1 uppercase tracking-widest text-[9px]">
          Monitored autonomous neural workers collaborating on code architecture.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {agents.map((agent, idx) => {
          const status = getAgentStatus(idx);
          const agProgress = getAgentProgress(idx);
          return (
            <motion.div
              key={agent.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + idx * 0.05 }}
              className="glass-panel-ai p-5 rounded-2xl border border-cyan-500/10 hover:border-cyan-500/30 transition-all duration-300 relative overflow-hidden group cursor-pointer"
              whileHover={{ y: -4, boxShadow: "0 0 20px rgba(34, 211, 238, 0.15)" }}
            >
              {/* background card design */}
              <div className="absolute right-0 bottom-0 text-white/[0.02] text-9xl font-black font-mono translate-y-12 translate-x-4 select-none pointer-events-none">
                {agent.icon}
              </div>

              <div className="flex items-center justify-between mb-4">
                <span className="text-3xl filter drop-shadow-md">{agent.icon}</span>
                <div className={`px-2.5 py-1 rounded-full text-[9px] font-bold font-mono flex items-center gap-1.5 border ${status.color}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                  {status.label}
                </div>
              </div>

              <h4 className="font-extrabold text-white text-sm font-mono tracking-wider uppercase mb-1">{agent.name}</h4>
              <p className="text-[10px] text-cyan-400 font-mono tracking-widest uppercase mb-4">{agent.role}</p>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-slate-500">OPERATIONAL TRUST</span>
                  <span className="text-cyan-300 font-bold">{agent.baseConfidence}%</span>
                </div>
                
                {/* Visual bar progress */}
                <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-white/5">
                  <motion.div
                    className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 shadow-glow-cyan"
                    animate={{ width: `${compiling ? agProgress : 100}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                
                <p className="text-[10px] text-slate-400 font-mono truncate uppercase">
                  {compiling && agProgress > 0 && agProgress < 100
                    ? `Synthesizing ${agent.role}...`
                    : compiling && agProgress === 0
                    ? "In queue buffer..."
                    : "Telemetry check complete."}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
}

function LivePipeline({ compiling, progress, output, currentTask }) {
  const fallbackSteps = ["Intent Extraction", "System Design", "Schema Generation", "Validation + Repair", "Runtime Execution"];
  const timings = output?.metrics?.stageTimings || [];
  const steps = (timings.length ? timings : fallbackSteps.map((title) => ({ name: title }))).map((step) => ({
    title: step.name || step.title,
    time: Number.isFinite(step.ms) ? `${step.ms} ms` : ""
  }));

  function getNodeStatus(idx) {
    if (compiling || !output) return "pending";
    if (output) return output.ok === false && idx >= steps.length - 2 ? "review" : "success";
    return "pending";
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.4 }}
      className="space-y-4 text-left"
    >
      <div>
        <h3 className="text-lg font-bold text-white flex items-center gap-2 font-sans">
          <Layers3 className="w-5 h-5 text-slate-400" />
          Compilation Pipeline
        </h3>
        <p className="text-xs text-slate-400">{compiling ? <span className="inline-flex items-center gap-2 text-blue-200"><Loader2 size={13} className="animate-spin" />{currentTask}</span> : output ? `Measured stage durations from this run · ${output.metrics?.latencyMs ?? "—"} ms total` : "Stage timings will appear after you compile an idea."}</p>
      </div>

      <div className="glass-card-saas rounded-2xl p-6 overflow-x-auto relative">
        {/* Connection pipeline path */}
        <div className="absolute top-[46px] left-16 right-16 h-0.5 bg-white/5 rounded-full z-0 hidden lg:block" />

        {compiling && (
          <div className="absolute top-[46px] left-16 right-16 h-0.5 pipeline-stepper-line rounded-full z-0 hidden lg:block opacity-60" />
        )}

        <div className="flex flex-col lg:flex-row items-center justify-between min-w-full gap-8 z-10 relative">
          {steps.map((step, idx) => {
            const status = getNodeStatus(idx);
            return (
              <div key={idx} className="flex flex-col items-center min-w-[140px]">
                {/* Clean SaaS active node circle */}
                <motion.div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs border transition-all duration-300 z-10 shadow-sm ${
                    status === "success"
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      : status === "review"
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                      : status === "active"
                      ? "bg-blue-500/10 border-blue-500/40 text-blue-400 bg-slate-950"
                      : "bg-slate-950 border-white/5 text-slate-500"
                  }`}
                  animate={status === "active" ? { scale: [1, 1.05, 1] } : {}}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  {status === "success" ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : status === "review" ? (
                    <AlertTriangle className="w-4 h-4 text-amber-300" />
                  ) : status === "active" ? (
                    <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                  ) : (
                    <span className="font-mono text-[10px] text-slate-500">{idx + 1}</span>
                  )}
                </motion.div>

                <span className="text-xs font-semibold text-slate-200 text-center font-sans mt-3">
                  {step.title}
                </span>

                {/* Sub-node telemetry metrics */}
                <div className="mt-1.5 text-center font-sans">
                  <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400">
                    <Clock3 className="w-3 h-3 text-slate-500" />
                    {step.time ? <span>{step.time}</span> : <span>{compiling ? "In progress" : "Awaiting run"}</span>}
                  </div>
                  <div className="mt-1">
                    <span className={`text-[9px] font-medium tracking-wide uppercase ${
                      status === "success" ? "text-emerald-400" : status === "review" ? "text-amber-300" : status === "active" ? "text-blue-400 animate-pulse" : "text-slate-500"
                    }`}>
                      {status === "success" ? "Completed" : status === "review" ? "Review" : status === "active" ? "Running" : "Pending"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
}

class ArchitectureSceneBoundary extends React.Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { /* Keep the rest of the workspace usable if WebGL is unavailable. */ }
  render() { return this.state.failed ? <div className="scene-error-fallback">Interactive 3D is unavailable in this browser. The blueprint details remain available below.</div> : this.props.children; }
}

function ArchitectureMap({ output }) {
  const [selectedNode, setSelectedNode] = useState(null);
  const [show3D, setShow3D] = useState(false);
  const schemas = output?.schemas || {};
  const tables = schemas.db_schema?.tables || schemas.database_schema?.tables || [];
  const endpoints = schemas.api_schema?.endpoints || [];
  const pages = schemas.ui_schema?.pages || [];
  const roles = schemas.auth_schema?.roles || [];
  const nodes = output ? [
    { id: "app", label: output.intent?.app_name || "Application", detail: `${output.intent?.app_type || "Application"} blueprint` },
    { id: "pages", label: "Interface", detail: `${pages.length} page${pages.length === 1 ? "" : "s"} in the generated UI schema` },
    { id: "api", label: "API", detail: `${endpoints.length} endpoint${endpoints.length === 1 ? "" : "s"} in the generated API schema` },
    { id: "data", label: "Data", detail: tables.length ? tables.map((table) => table.name).join(", ") : "No database tables were returned" },
    { id: "access", label: "Access", detail: roles.length ? roles.map((role) => role.name).join(", ") : "No access roles were returned" },
    { id: "checks", label: "Validation", detail: output.validation?.errors?.length ? `${output.validation.errors.length} validation issue(s)` : "No validation errors reported" }
  ] : [];
  const activeNode = nodes.find((node) => node.id === selectedNode);

  return (
    <motion.section className="architecture-result-card" aria-labelledby="architecture-title">
      <div className="architecture-result-header">
        <div><h3 id="architecture-title"><Network size={17} /> Blueprint architecture</h3><p>Derived from this compilation’s interface, API, data, access, and validation outputs.</p></div>
        <button className="architecture-view-toggle" type="button" onClick={() => setShow3D((visible) => !visible)} disabled={!output} aria-pressed={show3D}>{show3D ? "Show diagram" : "3D concept view"}</button>
      </div>
      {output ? (
        <>
          {show3D && <div className="dashboard-scene-wrap"><ArchitectureSceneBoundary><Suspense fallback={<div className="scene-error-fallback">Loading interactive architecture…</div>}><ArchitectureScene /></Suspense></ArchitectureSceneBoundary><span className="dashboard-scene-caption">Interactive conceptual view · details below are from this compilation</span></div>}
          <div className="architecture-result-flow">
            {nodes.map((node, index) => <React.Fragment key={node.id}><button type="button" className={`architecture-result-node ${selectedNode === node.id ? "selected" : ""}`} onClick={() => setSelectedNode(node.id)} aria-pressed={selectedNode === node.id}><span>{node.label}</span><small>{node.id === "data" ? `${tables.length} tables` : node.id === "api" ? `${endpoints.length} endpoints` : node.id === "pages" ? `${pages.length} pages` : node.id === "access" ? `${roles.length} roles` : node.id === "checks" ? (output.validation?.errors?.length ? "Review" : "Clear") : "Blueprint"}</small></button>{index < nodes.length - 1 && <span className="architecture-result-connector" aria-hidden="true" />}</React.Fragment>)}
          </div>
          <div className="architecture-result-detail" aria-live="polite"><strong>{activeNode?.label || "Compilation overview"}</strong><span>{activeNode?.detail || `${tables.length} data tables · ${endpoints.length} API endpoints · ${pages.length} UI pages · ${roles.length} access roles`}</span></div>
        </>
      ) : (
        <div className="architecture-empty-state"><Network size={21} /><strong>Your architecture will appear here</strong><span>Describe an application above and compile it to inspect the actual generated structures.</span></div>
      )}
    </motion.section>
  );
}

function ValidationRadar({ output }) {
  const errors = output?.validation?.errors || [];
  const warnings = output?.validation?.warnings || [];
  const checks = output?.runtime?.checks || [];
  const passedChecks = checks.filter((check) => check.pass).length;
  const summaries = [
    { label: "Validation result", value: output ? (errors.length ? `${errors.length} issue${errors.length === 1 ? "" : "s"}` : "No errors") : "Not run", tone: output && errors.length ? "warning" : output ? "success" : "neutral" },
    { label: "Warnings", value: output ? String(warnings.length) : "—", tone: "neutral" },
    { label: "Runtime checks", value: output ? `${passedChecks} / ${checks.length} passed` : "Not run", tone: output && passedChecks < checks.length ? "warning" : output ? "success" : "neutral" },
    { label: "Repairs applied", value: output ? String(output.validation?.repairs?.length || 0) : "—", tone: "neutral" }
  ];

  return (
    <section className="validation-summary-card" aria-labelledby="validation-title">
      <div className="validation-summary-heading"><div><h3 id="validation-title"><ShieldCheck size={17} /> Validation</h3><p>Results reported by this compilation</p></div><span className={`validation-state ${output ? (output.ok ? "passed" : "attention") : "idle"}`}>{output ? (output.ok ? "Reviewed" : "Needs review") : "Not run"}</span></div>
      {output ? (
        <div className="validation-summary-list">
          {summaries.map((item) => <div className="validation-summary-row" key={item.label}><span>{item.label}</span><strong className={item.tone}>{item.value}</strong></div>)}
          {errors.length > 0 && <div className="validation-issues"><strong>Issues to review</strong>{errors.slice(0, 3).map((error, index) => <p key={`${index}-${String(error).slice(0, 24)}`}>{typeof error === "string" ? error : error.message || JSON.stringify(error)}</p>)}</div>}
        </div>
      ) : <div className="validation-empty-state">Compile an idea to see schema and runtime validation details.</div>}
    </section>
  );
}

function RuntimePreview({ output, setPreviewPage }) {
  const cards = output?.schemas?.ui_schema?.pages || [];

  function handleDownloadConfig() {
    if (!output) return;
    const blob = new Blob([JSON.stringify(output.schemas, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${output.intent.app_name.toLowerCase().replace(/\s+/g, "_")}_configuration.json`;
    link.click();
  }

  function handleExportJson() {
    if (!output) return;
    const jsonStr = JSON.stringify(output.schemas, null, 2);
    navigator.clipboard.writeText(jsonStr);
    alert("JSON Schema successfully copied to clipboard.");
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      className="space-y-4 text-left"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2 font-sans">
            <PlayCircle className="w-5 h-5" />
            Runtime preview
          </h3>
          <p className="text-slate-400 text-xs mt-1">
            Sandboxed previews built from pages in the generated UI schema.
          </p>
        </div>

        {output && (
          <div className="flex gap-3">
            <button
              onClick={handleExportJson}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-cyan-500/20 text-cyan-300 font-bold font-mono text-[9px] uppercase tracking-widest hover:bg-cyan-500/10 transition"
            >
              <FileCode className="w-3.5 h-3.5" />
              COPY BLUEPRINT JSON
            </button>
            <button
              onClick={handleDownloadConfig}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 border border-cyan-400/30 text-white font-bold font-mono text-[9px] uppercase tracking-widest hover:shadow-glow-cyan transition"
            >
              <Download className="w-3.5 h-3.5" />
              DOWNLOAD SCHEMAS
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((page, idx) => (
          <motion.div
            key={page.title}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 + idx * 0.05 }}
            className="glass-panel-ai p-5 rounded-2xl border border-cyan-500/10 hover:border-cyan-400/30 transition-all duration-300 group relative overflow-hidden"
            whileHover={{ y: -4 }}
          >
            {/* Symmetrical wireframe representation */}
            <div className="aspect-video bg-slate-950 rounded-xl flex flex-col justify-between p-3.5 border border-cyan-500/10 group-hover:border-cyan-400/30 transition duration-300 relative overflow-hidden">
              <div className="absolute inset-0 grid-bg-cyber opacity-10 pointer-events-none" />
              
              <div className="flex items-center justify-between z-10">
                <div className="w-3 h-3 rounded-full bg-cyan-400/30" />
                <div className="w-16 h-2 bg-slate-800 rounded-full" />
              </div>

              <div className="w-full space-y-1.5 z-10">
                <div className="w-2/3 h-1.5 bg-slate-800 rounded-full" />
                <div className="w-1/2 h-1.5 bg-slate-800 rounded-full" />
              </div>

              <div className="flex items-center justify-between border-t border-white/5 pt-2 z-10">
                <div className="w-8 h-3 bg-cyan-500/20 rounded border border-cyan-500/30" />
                <div className="w-6 h-1.5 bg-slate-800 rounded-full" />
              </div>
            </div>

            <p className="font-extrabold text-white text-xs font-mono uppercase tracking-widest mt-4">
              {page.title}
            </p>
            <p className="text-[9px] text-slate-500 font-mono uppercase tracking-wider mt-1">
              ROUTE: {page.route}
            </p>

            <div className="flex gap-2.5 mt-4">
              <button
                type="button"
                onClick={() => setPreviewPage(page.title)}
                disabled={!output}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-[9px] font-bold font-mono uppercase tracking-widest rounded-xl border border-cyan-500/20 text-cyan-300 hover:bg-cyan-500/10 disabled:opacity-50 disabled:pointer-events-none transition"
              >
                <Eye className="w-3.5 h-3.5" />
                Preview sandbox
              </button>
            </div>
          </motion.div>
        ))}
        {cards.length === 0 && <div className="architecture-empty-state col-span-full"><Eye size={20} /><strong>No generated pages yet</strong><span>Compile an application idea to preview pages from its UI schema.</span></div>}
      </div>
    </motion.section>
  );
}

function RecentProjects({ output, onCompilePrompt }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.4 }}
      className="space-y-4 text-left h-full"
    >
      <div>
        <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
          <Blocks className="w-5 h-5 text-slate-400" />
          Latest compilation
        </h3>
        <p className="text-xs text-slate-400">
          The most recent result in this browser session. It is not saved as a project.
        </p>
      </div>

      <div className="space-y-3.5">
        {output ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card-saas p-5 rounded-xl relative overflow-hidden group text-left"
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div><h4 className="text-sm font-bold text-white font-sans">{output.intent?.app_name || "Untitled application"}</h4><p className="text-xs text-slate-400 mt-1">{output.intent?.app_type || "Application blueprint"}</p></div>
              <span className={`rounded-full px-2.5 py-1 text-[9px] font-semibold ${output.ok ? "bg-emerald-500/10 text-emerald-300" : "bg-amber-500/10 text-amber-200"}`}>{output.ok ? "Validation passed" : "Needs review"}</span>
            </div>
            <div className="grid grid-cols-3 gap-4 border-t border-white/5 pt-3.5 text-xs font-sans">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-400" />
                <div>
                  <p className="text-[10px] text-slate-500 uppercase">Data tables</p>
                  <p className="font-bold text-white text-[11px]">{output.schemas?.db_schema?.tables?.length || 0}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-indigo-400" />
                <div>
                  <p className="text-[10px] text-slate-500 uppercase">Endpoints</p>
                  <p className="font-bold text-white text-[11px]">{output.schemas?.api_schema?.endpoints?.length || 0}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock3 className="w-4 h-4 text-violet-400" />
                <div>
                  <p className="text-[10px] text-slate-500 uppercase">Speed</p>
                  <p className="font-bold text-white text-[11px]">{output.metrics?.latencyMs ?? "—"} ms</p>
                </div>
              </div>
            </div>
            <div className="mt-4 flex justify-end"><button type="button" onClick={() => onCompilePrompt(output.input || "")} className="button-quiet min-h-9 text-[10px]">Reuse this prompt<ArrowRight size={14} /></button></div>
          </motion.div>
        ) : <div className="architecture-empty-state"><Blocks size={20} /><strong>No compilation in this session</strong><span>Your result will stay here while this tab is open. Saved project history is not enabled.</span></div>}
      </div>
    </motion.section>
  );
}

function AIActivityTimeline({ output, compiling, currentTask }) {
  const activities = (output?.metrics?.stageTimings || []).map((stage) => ({
    event: stage.name,
    detail: "Stage completed for this compilation.",
    time: Number.isFinite(stage.ms) ? `${stage.ms} ms` : ""
  })).reverse();

  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.5 }}
      className="space-y-4 text-left h-full"
    >
      <div>
        <h3 className="text-lg font-bold font-mono text-cyan-300 uppercase tracking-widest flex items-center gap-2 mb-1">
          <Activity className="w-4.5 h-4.5 text-cyan-400" />
          Compilation stages
        </h3>
        <p className="text-[9px] text-slate-500 font-mono uppercase tracking-widest">
          Stage details reported for the latest result.
        </p>
      </div>

      <div className="glass-panel-ai rounded-2xl p-5 border border-cyan-500/10 h-[calc(100%-40px)] flex flex-col justify-between bg-slate-950/40">
        <div className="space-y-4.5 overflow-y-auto max-h-[300px] custom-scrollbar pr-2">
          {compiling && <div className="flex items-center gap-3 rounded-lg border border-blue-400/15 bg-blue-400/5 p-4 text-xs text-blue-100"><Loader2 size={16} className="animate-spin" /><span>{currentTask || "Compilation in progress"}</span></div>}
          {!compiling && activities.map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + idx * 0.05 }}
              className="flex gap-3 text-left group"
            >
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-cyan-400/10 to-blue-500/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0 group-hover:border-cyan-400 transition">
                  <Terminal className="w-3 h-3 text-cyan-300" />
                </div>
                {idx !== (output ? activities : activities.slice(3)).length - 1 && (
                  <div className="w-px h-10 bg-gradient-to-b from-cyan-500/15 to-transparent mt-1" />
                )}
              </div>
              <div className="flex-1 font-mono text-[10px]">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">{item.event}</span>
                  <span className="text-[9px] text-slate-400">{item.time}</span>
                </div>
                <p className="text-slate-400 mt-0.5 leading-relaxed">{item.detail}</p>
              </div>
            </motion.div>
          ))}
          {!compiling && activities.length === 0 && <div className="architecture-empty-state"><Activity size={19} /><strong>No stage timings yet</strong><span>Compile an idea to see the stages returned by the compiler.</span></div>}
        </div>
      </div>
    </motion.section>
  );
}

function SystemAnalytics({ output }) {
  const stageTimings = output?.metrics?.stageTimings || [];
  const checks = output?.runtime?.checks || [];
  const passedChecks = checks.filter((check) => check.pass).length;
  const facts = [
    { label: "Measured compile time", value: output?.metrics?.latencyMs != null ? `${output.metrics.latencyMs} ms` : "—" },
    { label: "Compiler retries", value: output?.metrics?.retries != null ? String(output.metrics.retries) : "—" },
    { label: "Runtime checks", value: output ? `${passedChecks} of ${checks.length} passed` : "—" },
    { label: "Compilation result", value: output ? (output.ok ? "Validation passed" : "Review required") : "Not run" }
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.5 }}
      className="space-y-4 text-left"
    >
      <div>
        <h3 className="text-lg font-bold text-white flex items-center gap-2 font-sans">
          <Gauge className="w-5 h-5 text-slate-400" />
          Compilation details
        </h3>
        <p className="text-slate-400 text-xs mt-1">
          Values reported by the latest compiler response; no historical telemetry is stored.
        </p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">{facts.map((fact) => <div className="compilation-fact-card" key={fact.label}><span>{fact.label}</span><strong>{fact.value}</strong></div>)}</div>
      {output && stageTimings.length > 0 && <div className="stage-timing-list">{stageTimings.map((stage) => <div className="stage-timing-row" key={stage.name}><span>{stage.name}</span><span>{Number.isFinite(stage.ms) ? `${stage.ms} ms` : "Not reported"}</span></div>)}</div>}
      {!output && <div className="architecture-empty-state"><Gauge size={19} /><strong>No compilation metrics yet</strong><span>Measured stage details appear here after a compile.</span></div>}
    </motion.section>
  );
}

/* ================== INTERACTIVE SIMULATION MODALS ================== */

function SettingsModal({ compileMode, setCompileMode, nvidiaApiKey, setNvidiaApiKey, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <motion.div
        className="glass-panel-auth max-w-lg w-full rounded-[2rem] p-8 border border-cyan-400/30 text-left relative overflow-hidden"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
      >
        <div className="absolute inset-0 scanlines opacity-5 pointer-events-none" />

        <div className="flex items-center justify-between mb-6 pb-4 border-b border-cyan-500/10">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-cyan-400 animate-spin" style={{ animationDuration: '6s' }} />
            <h2 className="text-xl font-black font-mono text-cyan-300 uppercase tracking-widest">
              SYSTEM SETTINGS
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-slate-700 hover:bg-white/5 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-6 font-mono text-xs text-slate-300">
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">COMPILE TIER MODE</span>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setCompileMode("local")}
                className={`p-3 border rounded-xl font-bold uppercase tracking-widest transition-all ${
                  compileMode === "local"
                    ? "border-cyan-400 text-cyan-300 bg-cyan-500/5 shadow-glow-cyan"
                    : "border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white"
                }`}
              >
                LOCAL HYBRID (SEED)
              </button>
              <button
                type="button"
                onClick={() => setCompileMode("nvidia")}
                className={`p-3 border rounded-xl font-bold uppercase tracking-widest transition-all ${
                  compileMode === "nvidia"
                    ? "border-cyan-400 text-cyan-300 bg-cyan-500/5 shadow-glow-cyan"
                    : "border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white"
                }`}
              >
                LIVE MODEL (NVIDIA)
              </button>
            </div>
          </div>

          {compileMode === "nvidia" && (
            <motion.div
              className="space-y-2"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              transition={{ duration: 0.3 }}
            >
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">NVIDIA API KEY</span>
              <div className="relative">
                <input
                  type="password"
                  value={nvidiaApiKey}
                  onChange={(e) => setNvidiaApiKey(e.target.value)}
                  placeholder="ENTER NVIDIA API CREDENTIAL KEY"
                  className="w-full bg-slate-950 border border-cyan-400/20 rounded-xl px-4 py-3.5 text-white placeholder:text-slate-700 outline-none focus:border-cyan-400 focus:bg-slate-900/60 font-mono text-[10px] uppercase tracking-wider"
                />
              </div>
              <p className="text-[9px] text-slate-500 leading-relaxed uppercase">
                Your API key is securely persisted locally inside your browser's sandbox. It is transmitted directly to the serverless Vercel endpoints to generate structurally sound schemas.
              </p>
            </motion.div>
          )}

          <div className="space-y-2">
            <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">SPEECH ALGORITHM PRESET</span>
            <p className="text-[10px] text-slate-500 leading-relaxed uppercase">
              Configure speech capturing presets. Simulated capturing utilizes automated algorithm typing.
            </p>
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">SANDBOX CONFIGURATION</span>
            <div className="flex items-center justify-between p-3 border border-slate-900 bg-slate-950/60 rounded-xl">
              <span className="uppercase text-[10px] text-slate-400 font-bold">Auto-seed mockup databases</span>
              <div className="w-8 h-4 rounded-full bg-cyan-500 flex items-center justify-end px-0.5 cursor-pointer">
                <div className="w-3.5 h-3.5 rounded-full bg-slate-950" />
              </div>
            </div>
          </div>

          {/* Section: General Settings & Terms */}
          <div className="space-y-3 pt-4 border-t border-slate-900">
            <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest block">GENERAL COMPILER TERMS</span>
            <div className="p-3 border border-slate-900 bg-slate-950/80 rounded-xl max-h-24 overflow-y-auto space-y-2 leading-relaxed text-[9px] text-slate-500 uppercase font-sans">
              <p>
                1. Compiler Usage Agreement: By utilizing the AI Compiler Studio platform, you agree that all compiled blueprints, generated databases, and API routes are processed in browser-based sandbox instances.
              </p>
              <p>
                2. Resource Allocations: High-tier model generations utilize rate-limited APIs. Users agree to prevent high-frequency automated script calls or abusive workloads against the multi-agent pipelines.
              </p>
              <p>
                3. Intellect Rights: Compiled structures, schemas, and mockup records remain the sole intellectual asset of the workspace creator. Platform operators do not claim ownership of synthesized assets.
              </p>
            </div>
            <p className="text-[9px] text-slate-400 leading-normal uppercase">
              By checking options and saving, you confirm agreement to the global compiler workspace terms of service.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function ProfileModal({ user, onClose, onChangeAudience }) {
  const [profileName, setProfileName] = useState(user?.name || "Operator");
  const [profileEmail, setProfileEmail] = useState(user?.email || "operator@studio.ai");
  const [avatarTheme, setAvatarTheme] = useState(() => localStorage.getItem("profile_avatar_theme") || "indigo");
  const [devMode, setDevMode] = useState(() => localStorage.getItem("profile_dev_mode") === "true");
  const [autoValidate, setAutoValidate] = useState(() => localStorage.getItem("profile_auto_validate") !== "false");

  function handleSave() {
    localStorage.setItem("profile_avatar_theme", avatarTheme);
    localStorage.setItem("profile_dev_mode", devMode);
    localStorage.setItem("profile_auto_validate", autoValidate);
    alert("Configuration saved successfully! The interface will reload to apply adjustments.");
    window.location.reload();
  }

  const themes = [
    { id: "indigo", name: "Classic Indigo", gradient: "from-blue-500 via-indigo-500 to-purple-600" },
    { id: "emerald", name: "Matrix Emerald", gradient: "from-teal-500 via-emerald-500 to-green-600" },
    { id: "ruby", name: "Crimson Ruby", gradient: "from-rose-500 via-red-500 to-orange-600" },
    { id: "amber", name: "Amber Gold", gradient: "from-amber-400 via-orange-500 to-yellow-600" },
    { id: "cyber", name: "Retro Cyber", gradient: "from-fuchsia-500 via-purple-600 to-pink-500" }
  ];

  const activeTheme = themes.find((t) => t.id === avatarTheme) || themes[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <motion.div
        className="glass-panel-auth max-w-lg w-full rounded-[2rem] p-8 border border-blue-500/30 text-left relative overflow-hidden"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
      >
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-blue-500/10">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-blue-400" />
            <h2 className="text-xl font-black font-sans text-blue-300 uppercase tracking-widest">
              DEVELOPER PROFILE
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-slate-700 hover:bg-white/5 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-6 font-sans text-xs text-slate-300">
          {/* Identity Header */}
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${activeTheme.gradient} flex items-center justify-center text-lg font-black text-white shadow-lg`}>
              {profileName.charAt(0).toUpperCase()}
            </div>
            <div className="text-left">
              <h3 className="text-xs font-bold text-white leading-none uppercase">{profileName}</h3>
              <p className="text-[9px] text-slate-500 mt-1 uppercase leading-none tracking-normal">{profileEmail}</p>
              <span className="inline-block mt-2 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-semibold text-[8px] uppercase tracking-wider">
                Full-Stack Architect
              </span>
            </div>
          </div>

          <button type="button" className="profile-preferences-button" onClick={onChangeAudience}>
            <span><Sparkles size={15} />Personalize examples and onboarding</span><ArrowRight size={15} />
          </button>

          {/* Form Fields */}
          <div className="space-y-4">
            <div className="space-y-1.5 text-left">
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block">Architect Name</span>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white outline-none focus:border-blue-500 text-[10px] font-bold uppercase tracking-wider"
              />
            </div>
          </div>

          {/* Avatar Theme Selection */}
          <div className="space-y-2 text-left">
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block">Console Identity Theme</span>
            <div className="flex flex-wrap gap-2">
              {themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setAvatarTheme(t.id)}
                  className={`px-3 py-1.5 rounded-lg border text-[9px] font-bold transition flex items-center gap-1.5 uppercase ${
                    avatarTheme === t.id
                      ? "border-blue-500 bg-blue-500/10 text-blue-300"
                      : "border-slate-850 bg-slate-950 text-slate-400 hover:border-slate-750"
                  }`}
                >
                  <div className={`w-2 h-2 rounded bg-gradient-to-br ${t.gradient}`} />
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          {/* Dev Functionality Toggles */}
          <div className="space-y-3">
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block text-left">Architect Preferences</span>
            
            <div className="flex items-center justify-between p-3 border border-slate-900 bg-slate-950/60 rounded-xl">
              <div className="text-left pr-4">
                <span className="uppercase text-[9px] text-slate-300 font-bold block">Developer Mode (Verbose Logs)</span>
                <span className="text-[8px] text-slate-500 uppercase block mt-0.5 leading-normal">Exposes token usage, network roundtrips, and detailed retry diagnostics.</span>
              </div>
              <input
                type="checkbox"
                checked={devMode}
                onChange={(e) => setDevMode(e.target.checked)}
                className="w-4 h-4 accent-blue-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3 border border-slate-900 bg-slate-950/60 rounded-xl">
              <div className="text-left pr-4">
                <span className="uppercase text-[9px] text-slate-300 font-bold block">Auto-validate Contract Schemas</span>
                <span className="text-[8px] text-slate-500 uppercase block mt-0.5 leading-normal">Runs validation rules instantly on every compiled pipeline stage.</span>
              </div>
              <input
                type="checkbox"
                checked={autoValidate}
                onChange={(e) => setAutoValidate(e.target.checked)}
                className="w-4 h-4 accent-blue-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-2">
            <button
              onClick={handleSave}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-[10px] uppercase tracking-widest shadow-lg hover:from-blue-500 hover:to-indigo-500 transition"
            >
              Save Configuration
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function MockPreviewModal({ page, output, onClose }) {
  const [injectedRecordText, setInjectedRecordText] = useState("");
  const [simulatedTable, setSimulatedTable] = useState([]);

  // Generate simulated mock database tables in browser
  const activeTable = useMemo(() => {
    if (!output) return [];
    // Get the first table names
    const table = output.schemas.db_schema.tables.find((t) => t.name !== "users");
    return table ? table.name : "records";
  }, [output]);

  function handleCreateRecord(e) {
    e.preventDefault();
    if (!injectedRecordText.trim()) return;
    setSimulatedTable((prev) => [
      ...prev,
      { id: `rec_${Math.floor(Math.random() * 9000) + 1000}`, title: injectedRecordText.toUpperCase(), created_at: new Date().toISOString() }
    ]);
    setInjectedRecordText("");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <motion.div
        className="glass-panel-auth max-w-4xl w-full rounded-[2.5rem] border border-cyan-400/30 text-left relative overflow-hidden flex flex-col h-[80vh] shadow-2xl"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
      >
        <div className="absolute inset-0 scanlines opacity-5 pointer-events-none" />

        {/* Wireframe simulated top bar */}
        <div className="h-16 border-b border-cyan-500/10 flex items-center justify-between px-6 bg-slate-950/40">
          <div className="flex items-center gap-2">
            <PlayCircle className="w-5 h-5 text-cyan-400" />
            <h2 className="text-sm font-extrabold font-mono text-cyan-300 uppercase tracking-widest">
              Sandbox preview · {page}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-slate-700 hover:bg-white/5 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* wireframe mockup view port */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-950 relative">
          <div className="absolute inset-0 grid-bg-cyber opacity-[0.03] pointer-events-none" />
          <p className="relative z-10 max-w-3xl mx-auto mb-5 rounded-lg border border-amber-300/15 bg-amber-300/5 px-4 py-3 text-xs leading-relaxed text-amber-100/80">Sandbox preview with sample data generated from this blueprint. Changes here are temporary and do not create or modify a production application.</p>

          {page === "Login Page" ? (
            <div className="max-w-sm w-full mx-auto p-6 rounded-3xl border border-cyan-500/10 bg-slate-900/60 font-mono text-xs text-left space-y-4">
              <div className="text-center space-y-1">
                <span className="text-[10px] text-cyan-300 font-bold tracking-widest uppercase">
                  {output?.intent.app_name.toUpperCase()} LOGIN
                </span>
                <p className="text-[8px] text-slate-500 uppercase tracking-widest">Authentication required</p>
              </div>
              <div className="space-y-1.5">
                <span className="text-[8px] text-slate-400 tracking-wider">EMAIL ADDRESS</span>
                <input type="text" disabled placeholder="operator@console.com" className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-slate-400" />
              </div>
              <div className="space-y-1.5">
                <span className="text-[8px] text-slate-400 tracking-wider">PASSWORD CODE</span>
                <input type="password" disabled placeholder="••••••••" className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-slate-400" />
              </div>
              <button disabled className="w-full py-2.5 rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 text-white font-bold uppercase tracking-widest text-[9px]">
                AUTHENTICATE
              </button>
            </div>
          ) : page === "Dashboard" ? (
            <div className="space-y-6 font-mono text-left">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/5 pb-4">
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-wider">
                    {output?.intent.app_name.toUpperCase()} SYSTEM CONTROL
                  </h3>
                  <p className="text-[8px] text-slate-500 uppercase tracking-widest mt-1">OPERATIONAL CONSOLE TELEMETRY</p>
                </div>
                <div className="flex gap-2">
                  <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest">
                    🟢 ONLINE
                  </span>
                </div>
              </div>

              {/* simulated metric grids */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-cyan-500/10 bg-slate-900/40 text-left">
                  <span className="text-[8px] text-slate-500 uppercase tracking-widest">Sample sandbox rows</span>
                  <p className="text-xl font-bold text-cyan-300 mt-1">{simulatedTable.length}</p>
                </div>
                <div className="p-4 rounded-xl border border-cyan-500/10 bg-slate-900/40 text-left">
                  <span className="text-[8px] text-slate-500 uppercase tracking-widest">TARGET COLLECTION</span>
                  <p className="text-xl font-bold text-cyan-300 mt-1 uppercase truncate">{activeTable}</p>
                </div>
                <div className="p-4 rounded-xl border border-cyan-500/10 bg-slate-900/40 text-left">
                  <span className="text-[8px] text-slate-500 uppercase tracking-widest">Validation issues</span>
                  <p className="text-xl font-bold text-cyan-300 mt-1">{output?.validation?.errors?.length || 0}</p>
                </div>
              </div>

              {/* interactive list creation sandbox */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-4 p-5 rounded-2xl border border-cyan-500/10 bg-slate-900/40 space-y-4">
                  <span className="text-[9px] font-bold text-cyan-300 uppercase tracking-widest">
                    INJECT RECORD
                  </span>
                  <form onSubmit={handleCreateRecord} className="space-y-3">
                    <input
                      type="text"
                      value={injectedRecordText}
                      onChange={(e) => setInjectedRecordText(e.target.value)}
                      placeholder="E.g., CLIENT deal contact..."
                      className="w-full bg-slate-950 border border-white/10 rounded-lg p-2.5 text-white uppercase tracking-wider text-[10px] outline-none focus:border-cyan-400"
                    />
                    <button className="w-full py-2 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold uppercase tracking-widest text-[9px] rounded-lg transition">
                      INJECT ROW
                    </button>
                  </form>
                </div>

                <div className="lg:col-span-8 p-5 rounded-2xl border border-cyan-500/10 bg-slate-900/40 text-left">
                  <span className="text-[9px] font-bold text-cyan-300 uppercase tracking-widest mb-3 block">
                    SEED RECORDS LIST (IN-MEMORY MOCK DB)
                  </span>
                  <div className="space-y-2 max-h-[160px] overflow-y-auto custom-scrollbar">
                    <div className="flex items-center justify-between p-2 rounded bg-slate-950 text-[9px] text-slate-500 uppercase font-bold">
                      <span>RECORD ID</span>
                      <span>TITLE SPEC</span>
                      <span>CREATED TIMESTAMP</span>
                    </div>
                    {simulatedTable.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded bg-slate-950/40 text-[9px] text-slate-300 font-mono">
                        <span className="text-cyan-400 font-bold">{item.id}</span>
                        <span className="uppercase">{item.title}</span>
                        <span>{item.created_at.substring(11, 19)}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between p-2 rounded bg-slate-950/40 text-[9px] text-slate-300 font-mono">
                      <span className="text-cyan-400 font-bold">rec_4021</span>
                      <span>MOCK RECORD INITIALIZED</span>
                      <span>12:33:02</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 font-mono text-left">
              <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-widest">
                WIRE_LAYOUT MODULATOR INDICES
              </span>
              <p className="text-xs text-slate-400 uppercase tracking-wider leading-relaxed">
                SIMULATED PREVIEW BLOCKS ACTIVE. NO FURTHER WIRE ACTIONS DETECTED.
              </p>
              <div className="border border-cyan-500/10 p-6 rounded-2xl bg-slate-900/40">
                <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">SCHEMATIC COMPONENT SCHAPE</span>
                <div className="mt-4 h-24 flex items-center justify-center border border-dashed border-slate-700 rounded-xl text-[10px] text-slate-600 uppercase tracking-widest">
                  wire frame asset blueprint container
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-950 text-white font-mono uppercase tracking-widest text-xs gap-3">
      <div>
        <Loader2 className="size-10 animate-spin text-cyan-300 mx-auto shadow-glow-cyan" aria-label="Loading" />
        <p className="mt-4 text-cyan-300 font-bold text-glow-cyber">BOOTING COMPILER OS HUD...</p>
      </div>
    </div>
  );
}

function BlueprintSchemasConsole({ output }) {
  const [activeTab, setActiveTab] = useState("ui_schema");
  const [searchTerm, setSearchTerm] = useState("");
  const [copied, setCopied] = useState(false);

  const tabs = [
    { id: "intent", label: "Intent Analysis", icon: Cpu, color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
    { id: "design", label: "System Design", icon: Layers3, color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
    { id: "ui_schema", label: "UI Schema", icon: Eye, color: "text-green-400 bg-green-500/10 border-green-500/20" },
    { id: "api_schema", label: "API Schema", icon: Code2, color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
    { id: "db_schema", label: "Database Schema", icon: Database, color: "text-teal-400 bg-teal-500/10 border-teal-500/20" },
    { id: "auth_schema", label: "Auth Schema", icon: ShieldCheck, color: "text-pink-400 bg-pink-500/10 border-pink-500/20" },
    { id: "business_logic", label: "Business Logic", icon: Activity, color: "text-orange-400 bg-orange-500/10 border-orange-500/20" }
  ];

  const activeData = useMemo(() => {
    if (!output) return null;
    if (activeTab === "intent") return output.intent;
    if (activeTab === "design") return output.design;
    return output.schemas[activeTab];
  }, [output, activeTab]);

  const jsonLines = useMemo(() => {
    if (!activeData) return [];
    return JSON.stringify(activeData, null, 2).split("\n");
  }, [activeData]);

  // Filter lines based on search
  const filteredLines = useMemo(() => {
    if (!searchTerm.trim()) return jsonLines;
    return jsonLines.map((line) => {
      const match = line.toLowerCase().includes(searchTerm.toLowerCase());
      return { text: line, match };
    });
  }, [jsonLines, searchTerm]);

  async function handleCopy() {
    if (!activeData) return;
    await navigator.clipboard.writeText(JSON.stringify(activeData, null, 2));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-4 text-left"
    >
      <div>
        <h3 className="text-lg font-bold text-white flex items-center gap-2 font-sans">
          <Terminal className="w-5 h-5 text-slate-400" />
          Blueprint Console
        </h3>
        <p className="text-slate-400 text-xs mt-1">
          Inspect the compiled JSON blueprints generated by the AI Studio engine.
        </p>
      </div>

      <div className="glass-card-saas rounded-2xl p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 relative overflow-hidden">
        {/* Left Column: Schema Tabs */}
        <div className="lg:col-span-4 space-y-3 z-10">
          <span className="text-[11px] font-bold text-slate-400 font-sans tracking-wider uppercase block mb-1.5">
            Blueprint Modules
          </span>
          <div className="flex flex-col gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const linesCount = output
                ? (tab.id === "intent"
                  ? JSON.stringify(output.intent, null, 2).split("\n").length
                  : tab.id === "design"
                  ? JSON.stringify(output.design, null, 2).split("\n").length
                  : JSON.stringify(output.schemas[tab.id], null, 2).split("\n").length)
                : 0;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-bold font-sans transition-all border ${
                    isActive
                      ? "border-white/10 text-white bg-white/[0.04]"
                      : "border-transparent text-slate-400 hover:text-white hover:bg-white/[0.02]"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${tab.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <p className="font-semibold truncate">{tab.label}</p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                      {output ? `${linesCount} lines` : "Standby"}
                    </p>
                  </div>
                  <ChevronRight className={`w-4 h-4 transition ${isActive ? "text-slate-300 translate-x-0.5" : "text-slate-600"}`} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Code Terminal Viewer */}
        <div className="lg:col-span-8 z-10 flex flex-col h-[520px] rounded-2xl border border-white/10 bg-slate-950/40 overflow-hidden relative">
          {/* Terminal Top HUD Header */}
          <div className="h-14 border-b border-white/10 flex items-center justify-between px-6 bg-slate-950/60">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
              <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
              <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
              <span className="text-xs font-medium font-sans text-slate-400 ml-4">
                blueprint_schema.json
              </span>
            </div>

            {output && (
              <div className="flex items-center gap-3">
                {/* Search Schema */}
                <div className="flex items-center gap-2 bg-white/[0.03] border border-white/10 rounded-lg px-3 py-1.5 max-w-[180px]">
                  <Search className="w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search specifications..."
                    className="bg-transparent text-xs font-sans text-slate-200 placeholder:text-slate-600 outline-none w-full"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-3 py-1.5 rounded-lg border border-white/10 text-slate-300 font-medium text-xs hover:bg-white/5 transition"
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            )}
          </div>

          {/* Terminal Console Output viewport */}
          <div className="flex-1 overflow-y-auto p-5 font-mono text-[11px] leading-relaxed custom-scrollbar text-left select-text relative">
            {output ? (
              <div className="flex">
                {/* Line Numbers Gutter */}
                <div className="w-8 select-none text-slate-600 text-right pr-3 border-r border-white/5 mr-3 flex-shrink-0">
                  {filteredLines.map((_, idx) => (
                    <div key={idx} className="h-5">{idx + 1}</div>
                  ))}
                </div>
                {/* Prettified code contents */}
                <div className="flex-1 overflow-x-auto whitespace-pre">
                  {filteredLines.map((line, idx) => {
                    const text = typeof line === "string" ? line : line.text;
                    const match = typeof line === "string" ? false : line.match;
                    return (
                      <div
                        key={idx}
                        className={`h-5 transition ${
                          match
                            ? "bg-blue-500/15 text-blue-300 font-semibold border-l-2 border-blue-500 pl-1"
                            : "text-slate-300"
                        }`}
                      >
                        {text}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-white/5 flex items-center justify-center relative overflow-hidden shadow-inner">
                  <Terminal className="w-7 h-7 text-slate-600" />
                </div>
                <div className="space-y-1.5 px-6">
                  <p className="text-sm font-bold text-slate-400">
                    Console Idle
                  </p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                    Provide a prompt instruction above to compile your application structures. The generated schemas will be displayed here in real time.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.section>
  );
}

async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 504) {
      throw new Error(
        "Compilation timed out. Open Settings → Local Compiler for instant results, or use a shorter prompt."
      );
    }
    throw new Error(data.error || data.detail || `Request failed with ${response.status}`);
  }
  return data;
}

function getPasswordStrength(password) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  const labels = ["Weak", "Weak", "Good", "Strong", "Excellent"];
  const colors = ["text-rose-300", "text-rose-300", "text-amber-200", "text-cyan-200", "text-emerald-200"];
  const bgs = ["bg-rose-400", "bg-rose-400", "bg-amber-300", "bg-cyan-300", "bg-emerald-300"];
  return { score, label: labels[score], color: colors[score], bg: bgs[score] };
}

function startSocialSignIn(provider, setLoading, setMessage) {
  setLoading(true);
  setMessage({ type: "", text: "" });
  window.location.href = `/api/auth/${provider}`;
}

function validateAuthForm(mode, form) {
  const errors = [];
  if (mode === "register" && form.name.trim().length < 2) errors.push("Enter your full name.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.push("Enter a valid email address.");
  if (form.password.length < 8) errors.push("Password must be at least 8 characters.");
  if (mode === "register" && form.password !== form.confirmPassword) errors.push("Passwords do not match.");
  return { valid: errors.length === 0, errors };
}

// Symmetrical Particle Star systems
function AIOperatingSystemBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Symmetrical ambient glowing backdrops */}
      <div className="absolute top-[10%] left-[20%] w-[380px] h-[380px] rounded-full bg-cyan-500/5 blur-[120px] pulse-slow" />
      <div className="absolute bottom-[20%] right-[20%] w-[480px] h-[480px] rounded-full bg-purple-500/5 blur-[140px] pulse-slow" />
      
      {/* Floating stars particle mapping */}
      {Array.from({ length: 30 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-cyan-300"
          style={{
            left: `${(i * 17) % 100}%`,
            top: `${(i * 29) % 100}%`,
            opacity: Math.random() * 0.4 + 0.1
          }}
          animate={{
            opacity: [0.1, 0.7, 0.1],
            scale: [1, 1.4, 1]
          }}
          transition={{
            duration: 3 + (i % 4),
            repeat: Infinity,
            delay: i * 0.15
          }}
        />
      ))}
    </div>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowDown, ArrowRight, ArrowUpRight, Blocks, BookOpen, BriefcaseBusiness,
  Building2, Check, ChevronDown, Code2, Compass, Database, GraduationCap,
  Layers3, Menu, Network, Rocket, ShieldCheck, Sparkles, X, Zap
} from "lucide-react";

const ArchitectureScene = lazy(() => import("./architecture-scene.jsx"));

const audienceChoices = [
  { id: "student", title: "Student", description: "Build projects, learn software development, and bring academic ideas to life.", icon: GraduationCap },
  { id: "developer", title: "Developer", description: "Accelerate architecture design, API planning, and application development.", icon: Code2 },
  { id: "founder", title: "Startup founder", description: "Turn product ideas into structured MVP blueprints faster.", icon: Rocket },
  { id: "business", title: "Business or enterprise", description: "Design internal tools, operational dashboards, and business applications.", icon: Building2 },
  { id: "agency", title: "Agency or freelancer", description: "Prototype client projects and structure repeatable development workflows.", icon: BriefcaseBusiness },
  { id: "educator", title: "Educator or researcher", description: "Explore software concepts, research prototypes, and educational applications.", icon: BookOpen },
  { id: "exploring", title: "Just exploring", description: "Discover what’s possible with AI-powered software creation.", icon: Compass }
];

const studentStatuses = [
  { id: "school", label: "Yes, I’m a school student" },
  { id: "college", label: "Yes, I’m at college or university" },
  { id: "postgraduate", label: "I’m a postgraduate or research student" },
  { id: "educator", label: "I’m a teacher or educator" },
  { id: "not-student", label: "No, I’m not a student" }
];

const experienceOptions = [
  ["beginner", "Complete beginner"], ["learning", "Learning to code"],
  ["comfortable", "Comfortable with programming"], ["experienced", "Experienced developer"]
];
const goalOptions = [
  ["academic", "College or academic project"], ["hackathon", "Hackathon prototype"],
  ["portfolio", "Portfolio project"], ["research", "Research prototype"],
  ["startup", "Startup idea"], ["learning", "Learning and experimentation"]
];

const promptsByAudience = {
  student: [
    "Build an attendance management system for a college with classes and reports.",
    "Build a placement preparation dashboard with applications and interview practice.",
    "Build a study planner with deadlines, subjects, and progress tracking.",
    "Build a campus event management application with registrations and announcements.",
    "Build a research paper organizer with tags, notes, and reading status."
  ],
  developer: [
    "Design a multi-tenant SaaS API with teams, scoped roles, and audit events.",
    "Build a developer portfolio with a project dashboard and contact API.",
    "Create a task service with PostgreSQL schemas, REST endpoints, and validation.",
    "Build an OAuth-enabled issue tracker with organizations and activity history."
  ],
  founder: [
    "Build a SaaS MVP with workspaces, subscriptions, onboarding, and an admin dashboard.",
    "Create a marketplace with seller profiles, listings, orders, and reviews.",
    "Build a CRM for an early-stage team with a sales pipeline and customer notes."
  ],
  business: [
    "Build an operations dashboard with team permissions, requests, and approval workflows.",
    "Create an inventory application with supplier records and reorder alerts.",
    "Build an internal service desk with tickets, ownership, and reporting."
  ],
  agency: [
    "Build a client portal with project milestones, files, comments, and approvals.",
    "Create a reusable booking platform for a local service business.",
    "Build a campaign dashboard with clients, deliverables, and review status."
  ],
  educator: [
    "Build a classroom assignment tracker with lessons, submissions, and feedback.",
    "Create a research lab project registry with datasets, collaborators, and notes.",
    "Build a course planner with modules, learning goals, and progress tracking."
  ],
  exploring: [
    "Build a personal reading list with notes, tags, and a progress dashboard.",
    "Create a simple recipe app with collections, ingredients, and meal planning.",
    "Build a team task board with projects, due dates, and comments."
  ]
};

const audienceCopy = {
  student: { eyebrow: "A clearer path from class project to working blueprint", title: <>Learn by <span>building real ideas.</span></>, body: "Start with a project brief. See it become a system plan, data model, and API outline you can explore and learn from." },
  developer: { eyebrow: "Plan the system before you write the next line", title: <>Architecture, <span>without the busywork.</span></>, body: "Turn product requirements into connected architecture, schemas, API contracts, and validation you can inspect." },
  founder: { eyebrow: "Give your next product idea a structure", title: <>From MVP idea to <span>buildable blueprint.</span></>, body: "Organize the workflows, data, and interfaces behind a product concept before implementation begins." },
  business: { eyebrow: "Make complex workflows easier to plan", title: <>Your operations, <span>designed as software.</span></>, body: "Map business processes into clear roles, data models, and application blueprints that teams can discuss." },
  agency: { eyebrow: "Turn client briefs into a shared starting point", title: <>Make the first draft <span>count.</span></>, body: "Shape project requirements into repeatable architecture and application plans for client work." },
  educator: { eyebrow: "Make software concepts easier to see", title: <>Explore ideas through <span>working blueprints.</span></>, body: "Create structured prototypes for classrooms, research, and experimentation with outputs you can inspect." },
  exploring: { eyebrow: "A simple place to start building", title: <>Your ideas. <span>Compiled into software.</span></>, body: "Describe the application you want to build. AI Compiler Studio translates your requirements into architecture, database schemas, APIs, and validated application blueprints." }
};

const workflow = [
  ["01", "Describe", "Tell the compiler about your users, goals, and key workflows."],
  ["02", "Design", "Review the architecture and how the main pieces connect."],
  ["03", "Generate", "Explore schemas, API definitions, and application structure."],
  ["04", "Validate", "Check consistency and inspect validation feedback."],
  ["05", "Preview", "Explore a sandboxed preview of the generated blueprint."]
];

const features = [
  { icon: Sparkles, title: "Requirement analysis", text: "Break a product brief into roles, workflows, entities, and application capabilities." },
  { icon: Network, title: "System architecture", text: "Explore the services and connections that shape the application design." },
  { icon: Database, title: "Database schemas", text: "Inspect collections, fields, relationships, and the data behind each workflow." },
  { icon: Blocks, title: "API blueprints", text: "Review structured endpoints and their input, output, and access expectations." },
  { icon: ShieldCheck, title: "Validation and repair", text: "Find inconsistencies in a generated blueprint and review repair feedback." },
  { icon: Layers3, title: "Runtime preview", text: "Interact with a sandbox preview to better understand the proposed experience." }
];

const useCases = [
  [GraduationCap, "Students", "Shape academic projects, portfolio pieces, and prototypes for learning."],
  [Code2, "Developers", "Map APIs, data models, and system architecture before implementation."],
  [Rocket, "Startup founders", "Structure early product ideas into a blueprint to discuss and refine."],
  [Building2, "Businesses", "Plan internal tools, workflows, and operational dashboards."],
  [BookOpen, "Educators", "Build classroom applications and reproducible learning prototypes."],
  [BriefcaseBusiness, "Agencies", "Turn client briefs into a consistent first project plan."]
];

function SceneFallback() {
  return (
    <div className="architecture-fallback" role="img" aria-label="Software layers connected to a central compiler">
      <div className="fallback-orbit" />
      {["Interface", "API", "AI agents", "Compiler", "Database", "Runtime"].map((label, index) => (
        <span className={`fallback-node fallback-node-${index}`} key={label}>{label}</span>
      ))}
    </div>
  );
}

class SceneBoundary extends React.Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { /* WebGL failures fall back to the accessible diagram. */ }
  render() { return this.state.failed ? <SceneFallback /> : this.props.children; }
}

function ArchitectureVisual() {
  return (
    <div className="architecture-visual">
      <div className="architecture-canvas" aria-hidden="true">
        <SceneBoundary>
          <Suspense fallback={<SceneFallback />}><ArchitectureScene /></Suspense>
        </SceneBoundary>
      </div>
      <div className="architecture-layer-label architecture-label-top"><span />Interface · API · AI</div>
      <div className="architecture-layer-label architecture-label-bottom"><span />Data · Validation · Runtime</div>
      <div className="architecture-caption"><span className="architecture-live-dot" />One idea, connected system layers</div>
    </div>
  );
}

export function ExperienceOnboarding({ initialProfile, onSave, onClose, onDismiss }) {
  const dialogRef = useRef(null);
  const [step, setStep] = useState("audience");
  const [draft, setDraft] = useState(() => ({ ...(initialProfile || {}), audience: initialProfile?.audience || "" }));
  const [saving, setSaving] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const previousFocus = document.activeElement;
    const focusableSelector = "button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex='-1'])";
    const firstFocusable = dialogRef.current?.querySelector(focusableSelector);
    firstFocusable?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape" && (onDismiss || onClose)) (onDismiss || onClose)();
      if (event.key === "Tab" && dialogRef.current) {
        const focusable = [...dialogRef.current.querySelectorAll(focusableSelector)];
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => { window.removeEventListener("keydown", onKeyDown); previousFocus?.focus?.(); };
  }, [onClose, onDismiss]);

  async function finish(profile) {
    setSaving(true);
    await onSave({
      audience: profile.audience || "exploring",
      studentStatus: profile.studentStatus || "",
      studyField: profile.studyField || "",
      experience: profile.experience || "",
      goal: profile.goal || ""
    });
    setSaving(false);
    onClose?.();
  }

  function selectAudience(audience) {
    const next = { ...draft, audience };
    setDraft(next);
    if (audience === "student") setStep("student-status");
    else void finish(next);
  }

  function selectStudentStatus(status) {
    const next = { ...draft, studentStatus: status };
    if (status === "educator") { void finish({ ...next, audience: "educator" }); return; }
    if (status === "not-student") { void finish({ ...next, audience: "exploring" }); return; }
    setDraft(next);
    setStep("student-details");
  }

  const modalTitle = step === "audience" ? "Let’s personalize your building experience." : step === "student-status" ? "Are you currently a student?" : "Make this experience yours.";

  return (
    <div className="onboarding-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && (onDismiss || onClose)) (onDismiss || onClose)(); }}>
      <motion.section
        className="onboarding-dialog"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        initial={reduceMotion ? false : { opacity: 0, y: 18, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduceMotion ? undefined : { opacity: 0, y: 12, scale: 0.99 }}
      >
        <div className="onboarding-dialog-head">
          <div className="onboarding-mark"><Sparkles size={18} /></div>
          <div className="onboarding-heading-wrap">
            <p className="eyebrow">A few quick preferences</p>
            <h2 id="onboarding-title">{modalTitle}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onDismiss || onClose || (() => finish({ audience: "exploring" }))} aria-label="Close onboarding"><X size={18} /></button>
        </div>

        <AnimatePresence mode="wait">
          {step === "audience" && (
            <motion.div className="audience-grid" key="audience" initial={reduceMotion ? false : { opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}>
              {audienceChoices.map(({ id, title, description, icon: Icon }) => (
                <button type="button" className={`audience-choice ${draft.audience === id ? "selected" : ""}`} key={id} onClick={() => selectAudience(id)} disabled={saving}>
                  <span className="audience-choice-icon"><Icon size={18} /></span>
                  <span className="audience-choice-copy"><strong>{title}</strong><span>{description}</span></span>
                  <ArrowRight className="audience-choice-arrow" size={16} />
                </button>
              ))}
            </motion.div>
          )}
          {step === "student-status" && (
            <motion.div className="student-question" key="student-status" initial={reduceMotion ? false : { opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}>
              <p className="onboarding-lead">This helps us suggest useful examples. You can skip this and change it later.</p>
              <div className="student-status-list">
                {studentStatuses.map(({ id, label }) => (
                  <button className="student-status-option" type="button" key={id} onClick={() => selectStudentStatus(id)} disabled={saving}>
                    <span>{label}</span><ArrowRight size={16} />
                  </button>
                ))}
              </div>
              <button type="button" className="text-button" onClick={() => finish({ ...draft, audience: "student" })} disabled={saving}>Skip for now</button>
            </motion.div>
          )}
          {step === "student-details" && (
            <motion.div className="student-details" key="student-details" initial={reduceMotion ? false : { opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}>
              <p className="onboarding-lead">Optional details help us choose better examples. Every field can be skipped.</p>
              <label className="field-label">What are you studying?
                <input maxLength={80} value={draft.studyField || ""} onChange={(event) => setDraft({ ...draft, studyField: event.target.value })} placeholder="e.g. Computer science" />
              </label>
              <label className="field-label">Your programming experience
                <select value={draft.experience || ""} onChange={(event) => setDraft({ ...draft, experience: event.target.value })}>
                  <option value="">Choose if you like</option>
                  {experienceOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                </select>
              </label>
              <label className="field-label">What would you like to build?
                <select value={draft.goal || ""} onChange={(event) => setDraft({ ...draft, goal: event.target.value })}>
                  <option value="">Choose if you like</option>
                  {goalOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                </select>
              </label>
              <div className="onboarding-actions">
                <button type="button" className="button-quiet" onClick={() => finish({ ...draft, audience: "student" })} disabled={saving}>Skip for now</button>
                <button type="button" className="button-primary" onClick={() => finish({ ...draft, audience: "student" })} disabled={saving}>{saving ? "Saving…" : "Save preferences"}<ArrowRight size={16} /></button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>
    </div>
  );
}

export default function LandingExperience({ user, token, experienceProfile, onProfileChange, onSignIn, onStartBuilding, setupRequest = 0 }) {
  const [prompt, setPrompt] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [profileSaveNotice, setProfileSaveNotice] = useState("");
  const [footerDocument, setFooterDocument] = useState("");
  const footerDialogRef = useRef(null);
  const reduceMotion = useReducedMotion();
  const audience = experienceProfile?.audience || "exploring";
  const content = audienceCopy[audience] || audienceCopy.exploring;
  const suggestedPrompts = useMemo(() => promptsByAudience[audience] || promptsByAudience.exploring, [audience]);
  const beginner = audience === "student" && experienceProfile?.experience === "beginner";

  useEffect(() => {
    if (!experienceProfile?.audience) setOnboardingOpen(true);
  }, [experienceProfile?.audience]);

  useEffect(() => {
    if (setupRequest > 0) setOnboardingOpen(true);
  }, [setupRequest]);

  useEffect(() => {
    if (!footerDocument) return undefined;
    const previousFocus = document.activeElement;
    const dialog = footerDialogRef.current;
    const focusable = () => [...(dialog?.querySelectorAll("button, a[href]") || [])].filter((item) => !item.disabled);
    focusable()[0]?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape") setFooterDocument("");
      if (event.key === "Tab") {
        const items = focusable();
        if (!items.length) return;
        if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items.at(-1).focus(); }
        else if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0].focus(); }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => { window.removeEventListener("keydown", onKeyDown); previousFocus?.focus?.(); };
  }, [footerDocument]);

  async function saveProfile(profile) {
    localStorage.setItem("compiler_experience_profile", JSON.stringify(profile));
    onProfileChange(profile);
    setProfileSaveNotice("");
    if (!token) return;
    try {
      const response = await fetch("/api/auth/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ experienceProfile: profile })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Could not sync preferences.");
      localStorage.setItem("compiler_experience_profile", JSON.stringify(result.experienceProfile));
      onProfileChange(result.experienceProfile);
    } catch {
      setProfileSaveNotice("Saved on this device. Sign in again later to sync your preferences.");
    }
  }

  function dismissOnboarding() {
    setOnboardingOpen(false);
    if (!experienceProfile?.audience) void saveProfile({ audience: "exploring", studentStatus: "", studyField: "", experience: "", goal: "" });
  }

  const startBuild = () => onStartBuilding(prompt);
  const fillPrompt = (example) => {
    setPrompt(example);
    document.getElementById("home")?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  };

  return (
    <div className="landing-shell">
      <header className="landing-nav-wrap">
        <nav className="landing-nav" aria-label="Main navigation">
          <a className="landing-brand" href="#home" aria-label="AI Compiler Studio home"><span className="brand-glyph"><Sparkles size={19} /></span><span>AI Compiler <i>Studio</i></span></a>
          <button type="button" className="mobile-menu-button" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-expanded={mobileMenuOpen} aria-label={mobileMenuOpen ? "Close navigation" : "Open navigation"}>{mobileMenuOpen ? <X /> : <Menu />}</button>
          <div className={`landing-nav-links ${mobileMenuOpen ? "open" : ""}`}>
            <a href="#product" onClick={() => setMobileMenuOpen(false)}>Product</a>
            <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)}>How it works</a>
            <a href="#features" onClick={() => setMobileMenuOpen(false)}>Features</a>
            <a href="#use-cases" onClick={() => setMobileMenuOpen(false)}>Use cases</a>
            <button type="button" className="audience-nav-button" onClick={() => { setOnboardingOpen(true); setMobileMenuOpen(false); }}><span>{audienceChoices.find((choice) => choice.id === audience)?.title || "Explore"}</span><ChevronDown size={14} /></button>
            {!user ? <button type="button" className="nav-signin" onClick={() => onSignIn("login")}>Sign in</button> : <span className="nav-user">Hi, {user.name?.split(" ")[0] || "builder"}</span>}
            <button type="button" className="button-primary nav-cta" onClick={startBuild}>{user ? "Open workspace" : "Start building free"}<ArrowRight size={16} /></button>
          </div>
        </nav>
      </header>

      <main>
        <section className="landing-hero page-section" id="home">
          <div className="hero-copy">
            <motion.div className="hero-eyebrow" initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}><span className="eyebrow-dot" />{content.eyebrow}</motion.div>
            <motion.h1 initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>{content.title}</motion.h1>
            <motion.p className="hero-body" initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>{content.body}</motion.p>
            {beginner && <div className="beginner-note"><BookOpen size={15} /><span>New to coding? We’ll explain each part of the blueprint in plain language.</span></div>}
            <div className="hero-actions">
              <button type="button" className="button-primary button-large" onClick={startBuild}>{user ? "Open your workspace" : "Start building free"}<ArrowRight size={17} /></button>
              <a className="button-quiet button-large" href="#product">Explore the platform<ArrowDown size={16} /></a>
            </div>
            <div className="hero-audience"><span className="audience-avatar-stack"><i>01</i><i>02</i><i>03</i></span><span>For learners, builders, and teams</span></div>
          </div>

          <div className="hero-visual-wrap"><ArchitectureVisual /></div>

          <div className="prompt-composer-wrap">
            <div className="prompt-composer">
              <div className="prompt-composer-label"><span><Zap size={15} /> Describe what you want to build</span><span className="composer-hint">Start with an idea. Refine it as you go.</span></div>
              <textarea aria-label="Describe the application you want to build" value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder={audience === "student" ? "For example: Build a study planner with assignments, deadlines, and progress…" : "For example: Build a project workspace with teams, tasks, permissions, and a dashboard…"} maxLength={500} rows={3} />
              <div className="prompt-composer-footer"><span>{prompt.length}/500</span><button className="button-primary" type="button" onClick={startBuild}>{user ? "Open workspace" : "Start building"}<ArrowRight size={16} /></button></div>
            </div>
            <div className="prompt-suggestions"><span className="suggestion-label">Try an example</span>{suggestedPrompts.slice(0, 3).map((example) => <button type="button" className="prompt-chip" key={example} onClick={() => fillPrompt(example)}>{example}</button>)}</div>
          </div>
        </section>

        <section className="workflow-section page-section" id="how-it-works">
          <div className="section-heading"><p className="eyebrow">A structured path from idea to blueprint</p><h2>See the shape of your software <span>before you build it.</span></h2><p>Move from a plain-language brief to an inspectable, validated application plan.</p></div>
          <div className="workflow-track">{workflow.map(([number, title, description], index) => <div className="workflow-step" key={title}><div className="workflow-step-top"><span>{number}</span>{index < workflow.length - 1 && <i />}</div><h3>{title}</h3><p>{description}</p></div>)}</div>
        </section>

        <section className="product-section page-section" id="product">
          <div className="product-copy"><p className="eyebrow">A compiler for product thinking</p><h2>Make the plan <span>visible.</span></h2><p>AI Compiler Studio turns your description into structured outputs you can inspect, adjust, and discuss. Your compiler workspace uses the same generation and validation flow as the product.</p>
            <ul className="product-points"><li><Check size={16} />Start from the way your users work</li><li><Check size={16} />Keep architecture, schemas, and APIs connected</li><li><Check size={16} />Review validation feedback before moving ahead</li></ul>
            <button type="button" className="button-quiet" onClick={startBuild}>Try your own idea<ArrowRight size={16} /></button>
          </div>
          <div className="product-preview" aria-label="Illustrative compiler workspace preview">
            <div className="preview-window-bar"><div className="preview-window-dots"><i /><i /><i /></div><span>COMPILER WORKSPACE · EXAMPLE</span><span className="preview-status"><i />Illustrative preview</span></div>
            <div className="preview-workspace">
              <aside className="preview-side"><div className="preview-side-brand"><span><Sparkles size={12} /></span> Studio</div>{[[Network, "Architecture"], [Database, "Data schema"], [Blocks, "API blueprint"], [ShieldCheck, "Validation"]].map(([Icon, label], index) => <div className={`preview-side-item ${index === 0 ? "active" : ""}`} key={label}><Icon size={13} />{label}</div>)}</aside>
              <div className="preview-main"><div className="preview-main-head"><div><small>PRODUCT BLUEPRINT</small><strong>Community learning hub</strong></div><span className="preview-review-pill"><Check size={12} /> Ready to review</span></div>
                <div className="preview-graph"><span className="preview-edge edge-one" /><span className="preview-edge edge-two" /><span className="preview-edge edge-three" /><div className="preview-node preview-node-core"><Sparkles size={15} /><b>Application</b></div><div className="preview-node preview-node-ui"><Layers3 size={14} /><b>Interface</b></div><div className="preview-node preview-node-api"><Blocks size={14} /><b>API</b></div><div className="preview-node preview-node-db"><Database size={14} /><b>Data</b></div></div>
                <div className="preview-schema"><div><span>COLLECTION</span><span>FIELDS</span></div><p><code>projects</code><span>name · owner · status · createdAt</span></p><p><code>members</code><span>projectId · userId · role</span></p></div>
                <p className="preview-disclaimer">Example interface only · not a real compilation result</p>
              </div>
            </div>
          </div>
        </section>

        <section className="features-section page-section" id="features">
          <div className="section-heading"><p className="eyebrow">From requirements to review</p><h2>Every layer has a <span>place.</span></h2><p>Keep the important technical decisions together in one understandable blueprint.</p></div>
          <div className="feature-grid">{features.map(({ icon: Icon, title, text }, index) => <article className="feature-card" key={title}><span className="feature-icon"><Icon size={19} /></span><span className="feature-index">0{index + 1}</span><h3>{title}</h3><p>{text}</p><span className="feature-bottom-line" /></article>)}</div>
        </section>

        <section className="use-cases-section page-section" id="use-cases">
          <div className="section-heading"><p className="eyebrow">Made for different kinds of builders</p><h2>One workspace. <span>Many starting points.</span></h2><p>Choose an audience to see examples closer to what you have in mind.</p></div>
          <div className="use-case-grid">{useCases.map(([Icon, title, text]) => <button className={`use-case-card ${audienceChoices.find((choice) => choice.title.toLowerCase().startsWith(title.toLowerCase().slice(0, 5)))?.id === audience ? "current" : ""}`} key={title} onClick={() => setOnboardingOpen(true)} type="button"><span className="use-case-icon"><Icon size={20} /></span><strong>{title}</strong><span>{text}</span><ArrowUpRight className="use-case-arrow" size={16} /></button>)}</div>
          <button type="button" className="change-audience-link" onClick={() => setOnboardingOpen(true)}>Personalize your examples<ArrowRight size={15} /></button>
        </section>

        <section className="final-cta page-section"><div className="final-cta-orb" /><span className="eyebrow"><Sparkles size={14} /> YOUR NEXT IDEA STARTS HERE</span><h2>Turn your next idea <span>into software.</span></h2><p>Start with a clear description. Explore the structure behind what you want to build.</p><button className="button-primary button-large" type="button" onClick={startBuild}>{user ? "Open your workspace" : "Start building free"}<ArrowRight size={17} /></button></section>
      </main>

      <footer className="landing-footer"><a className="landing-brand" href="#home"><span className="brand-glyph"><Sparkles size={17} /></span><span>AI Compiler <i>Studio</i></span></a><p>Explore the structure behind your next software idea.</p><div className="footer-links"><a href="#product">Product</a><a href="#features">Features</a><a href="#use-cases">Use cases</a><a href="https://github.com/DivyanshDobhal/ai-software-compiler#readme" target="_blank" rel="noreferrer">Documentation</a><button type="button" onClick={() => setFooterDocument("privacy")}>Privacy</button><button type="button" onClick={() => setFooterDocument("terms")}>Terms</button><a href="https://github.com/DivyanshDobhal/ai-software-compiler/issues" target="_blank" rel="noreferrer">Contact maintainers</a></div><span className="footer-copyright">© {new Date().getFullYear()} AI Compiler Studio</span></footer>

      <AnimatePresence>
        {footerDocument && <motion.div className="footer-document-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setFooterDocument(""); }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.section className="footer-document-dialog" ref={footerDialogRef} role="dialog" aria-modal="true" aria-labelledby="footer-document-title" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
            <div className="footer-document-head"><h2 id="footer-document-title">{footerDocument === "privacy" ? "Privacy overview" : "Terms of use"}</h2><button type="button" className="icon-button" onClick={() => setFooterDocument("")} aria-label="Close information"><X size={18} /></button></div>
            {footerDocument === "privacy" ? <div className="footer-document-copy"><p>This overview describes how the current AI Compiler Studio app handles information.</p><ul><li>Account name, email, and sign-in provider details are used for account access. Passwords are stored as salted hashes. To stay signed in, this browser stores a session token; the server stores its SHA-256 hash with an expiry date.</li><li>Audience and optional study preferences are saved in this browser for anonymous visitors. When signed in, the same preferences can also be saved to the account record in the existing database.</li><li>Compiler prompts are sent to the app server. With Gemini mode and a configured key, the server sends the prompt and compiler context to Google Gemini. A custom Gemini key entered in the workspace is saved in this browser's localStorage and sent to the app server for compilation. Local mode uses the app's deterministic compiler.</li></ul><p>For questions or data-handling requests, contact the project maintainers through <a href="https://github.com/DivyanshDobhal/ai-software-compiler/issues" target="_blank" rel="noreferrer">GitHub Issues</a>.</p></div> : <div className="footer-document-copy"><p>AI Compiler Studio creates structured software blueprints from the descriptions you provide. Generated architecture, schemas, API definitions, validation feedback, and previews can be incomplete or inaccurate.</p><ul><li>Review and test generated output before relying on it in a real application.</li><li>Only submit prompts and credentials that you are authorized to use. Do not include secrets in project descriptions.</li><li>The app and its features may change as the project develops. No service availability or output quality guarantee is made here.</li></ul><p>Questions about these terms can be sent to the project maintainers through <a href="https://github.com/DivyanshDobhal/ai-software-compiler/issues" target="_blank" rel="noreferrer">GitHub Issues</a>.</p></div>}
          </motion.section>
        </motion.div>}
      </AnimatePresence>

      {profileSaveNotice && <div className="profile-save-notice" role="status">{profileSaveNotice}<button type="button" onClick={() => setProfileSaveNotice("")} aria-label="Dismiss message"><X size={14} /></button></div>}

      <AnimatePresence>{onboardingOpen && <ExperienceOnboarding key="experience-onboarding" initialProfile={experienceProfile} onSave={saveProfile} onClose={() => setOnboardingOpen(false)} onDismiss={dismissOnboarding} />}</AnimatePresence>
    </div>
  );
}

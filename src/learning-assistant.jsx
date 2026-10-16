import { useEffect, useRef, useState } from "react";
import { BookOpen, Bot, ChevronDown, CircleHelp, Minimize2, RotateCcw, Send, Sparkles, Trash2, X } from "lucide-react";

const suggestions = [
  "How does this website work?",
  "How do I create my first project?",
  "Explain the AI compilation pipeline.",
  "What does the architecture map show?",
  "How do I fix a failed validation?",
  "Explain this like I am a beginner."
];
const modes = [
  ["explain", "Explain a feature"],
  ["walkthrough", "Walk me through a project"],
  ["concept", "Teach me the concept"],
  ["troubleshoot", "Help me troubleshoot"],
  ["code", "Explain code step by step"]
];

function safeProfile(profile = {}) {
  return {
    audience: profile.audience || "exploring",
    experience: profile.experience || "",
    goal: profile.goal || ""
  };
}

function formatTime(date) {
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date);
}

export default function LearningAssistant({ section = "landing", profile }) {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState(() => [{ id: "welcome", role: "assistant", text: "Hi! I can explain the studio, help you plan a project, or troubleshoot a validation result. What are you working on?", time: new Date() }]);
  const [draft, setDraft] = useState("");
  const [mode, setMode] = useState("explain");
  const [showModes, setShowModes] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [lastQuestion, setLastQuestion] = useState("");
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const safe = safeProfile(profile);

  useEffect(() => {
    if (open && !minimized) inputRef.current?.focus();
  }, [open, minimized]);
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, pending]);
  useEffect(() => {
    if (!open || minimized) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") { setOpen(false); setMinimized(false); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, minimized]);

  async function sendQuestion(question = draft) {
    const text = String(question || "").trim();
    if (!text || pending) return;
    setDraft("");
    setError("");
    setLastQuestion(text);
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: "user", text, time: new Date() }]);
    setPending(true);
    try {
      const response = await fetch("/api/learning-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          mode,
          context: { section, ...safe }
        })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "The assistant could not answer. Try again.");
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", text: payload.answer, time: new Date(), source: payload.source || "", followUps: payload.followUpQuestions || [] }]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "The assistant could not answer. Try again.");
    } finally {
      setPending(false);
      inputRef.current?.focus();
    }
  }

  function clearChat() {
    setMessages([{ id: crypto.randomUUID(), role: "assistant", text: "Chat cleared. What would you like to learn?", time: new Date() }]);
    setError("");
  }

  return (
    <div className="learning-assistant-root">
      {open && !minimized && <section className="learning-chat-panel" role="dialog" aria-modal="false" aria-labelledby="learning-chat-title">
        <header className="learning-chat-header">
          <div className="learning-chat-brand"><span className="learning-chat-avatar"><Sparkles size={17} /></span><span><strong id="learning-chat-title">AI Learning Assistant</strong><small><i /> Ready to help · private session</small></span></div>
          <div className="learning-chat-actions">
            <button type="button" title="Clear chat" aria-label="Clear chat" onClick={clearChat}><Trash2 size={16} /></button>
            <button type="button" title="Minimize chat" aria-label="Minimize chat" onClick={() => setMinimized(true)}><Minimize2 size={16} /></button>
            <button type="button" title="Close assistant" aria-label="Close assistant" onClick={() => setOpen(false)}><X size={18} /></button>
          </div>
        </header>

        <div className="learning-chat-context"><BookOpen size={13} /> Context: {section.replaceAll("-", " ")} {safe.audience ? `· ${safe.audience}` : ""}</div>
        <div className="learning-chat-modes">
          <button type="button" className="learning-mode-toggle" aria-expanded={showModes} onClick={() => setShowModes((current) => !current)}>{modes.find(([id]) => id === mode)?.[1]} <ChevronDown size={14} /></button>
          {showModes && <div className="learning-mode-menu" role="group" aria-label="Guided learning mode">{modes.map(([id, label]) => <button type="button" key={id} className={mode === id ? "active" : ""} onClick={() => { setMode(id); setShowModes(false); }}>{label}</button>)}</div>}
        </div>

        <div className="learning-chat-messages" ref={listRef} aria-live="polite" aria-relevant="additions text">
          {messages.map((message) => <article className={`learning-message ${message.role}`} key={message.id}>
            <div className="learning-message-avatar">{message.role === "assistant" ? <Bot size={14} /> : <span>You</span>}</div>
            <div className="learning-message-body"><div className="learning-message-bubble">{message.text}</div><time>{formatTime(message.time)}</time>{message.source && <small className="learning-source">{message.source === "nvidia" ? "AI answer grounded in studio knowledge" : message.source === "dataset-fallback" ? "Knowledge search · AI unavailable" : "Knowledge search · local fallback"}</small>}{message.followUps?.slice(0, 2).map((followUp) => <button className="learning-follow-up" key={followUp} type="button" onClick={() => sendQuestion(followUp)}>{followUp} <span>↗</span></button>)}</div>
          </article>)}
          {pending && <div className="learning-typing" role="status"><span /><span /><span /> <small>Thinking through it…</small></div>}
          {error && <div className="learning-chat-error" role="alert"><CircleHelp size={15} /><span>{error}</span><button type="button" onClick={() => sendQuestion(lastQuestion)} disabled={pending}><RotateCcw size={14} /> Retry</button></div>}
        </div>

        {messages.length <= 1 && <div className="learning-suggestions"><span>Try asking</span>{suggestions.map((question) => <button type="button" key={question} onClick={() => sendQuestion(question)} disabled={pending}>{question}</button>)}</div>}

        <form className="learning-chat-composer" onSubmit={(event) => { event.preventDefault(); sendQuestion(); }}>
          <label className="sr-only" htmlFor="learning-chat-input">Ask the AI Learning Assistant</label>
          <textarea id="learning-chat-input" ref={inputRef} rows={1} maxLength={4000} placeholder="Ask a question…" value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendQuestion(); } }} disabled={pending} />
          <button type="submit" aria-label="Send message" disabled={!draft.trim() || pending}><Send size={17} /></button>
          <small>Never include passwords or API keys.</small>
        </form>
      </section>}
      {open && minimized && <button className="learning-chat-minimized" type="button" onClick={() => setMinimized(false)}><Bot size={16} /> Assistant <ChevronDown size={14} /></button>}
      {!open && <button className="learning-assistant-launcher" type="button" onClick={() => { setOpen(true); setMinimized(false); }} aria-label="Need help? Ask AI" title="Need help? Ask AI"><span className="learning-launcher-icon"><Sparkles size={20} /></span><span className="learning-launcher-online" /><span className="learning-launcher-tooltip">Need help? Ask AI</span></button>}
    </div>
  );
}

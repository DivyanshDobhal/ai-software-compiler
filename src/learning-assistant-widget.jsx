import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, Bot, Check, ChevronDown, Loader2, MessageCircle, RotateCcw, Send, Sparkles, Trash2, X } from "lucide-react";

const suggestedQuestions = [
  "How do I create my first project?",
  "Explain the AI compilation pipeline.",
  "What does the architecture map show?",
  "How do I fix a validation error?",
  "Explain this like I am a beginner."
];

export default function LearningAssistantWidget({ context = {} }) {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([{ id: "welcome", role: "assistant", content: "Hi! I can explain the compiler, help you navigate a project, or walk through an error. What would you like to understand?" }]);
  const [pending, setPending] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") { setOpen(false); setMinimized(false); }
    };
    window.addEventListener("keydown", onKeyDown);
    if (!minimized) inputRef.current?.focus();
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, minimized]);

  useEffect(() => {
    if (open && !minimized && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, pending, open, minimized]);

  async function ask(question) {
    const cleanQuestion = String(question || "").trim();
    if (!cleanQuestion || pending) return;
    const userMessage = { id: `${Date.now()}-user`, role: "user", content: cleanQuestion };
    setMessages((current) => [...current, userMessage]);
    setInput("");
    setPending(true);
    try {
      const response = await fetch("/api/learning-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: cleanQuestion, mode: "explain", context: {
          section: context.section,
          audience: context.audience,
          experience: context.experience,
          goal: context.goal
        } })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "I couldn’t reach the learning assistant. Please try again.");
      setMessages((current) => [...current, {
        id: `${Date.now()}-assistant`, role: "assistant", content: result.answer || "I couldn’t find a verified answer for that yet.",
        source: result.source, followUpQuestions: result.followUpQuestions || []
      }]);
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : "I couldn’t reach the learning assistant. Please try again.";
      setMessages((current) => [...current, { id: `${Date.now()}-error`, role: "error", content: message, retryQuestion: cleanQuestion }]);
    } finally {
      setPending(false);
    }
  }

  function clearChat() {
    setMessages([{ id: `${Date.now()}-welcome`, role: "assistant", content: "Chat cleared. What would you like to understand?" }]);
    setInput("");
  }

  return (
    <div className="learning-assistant-widget">
      <AnimatePresence>
        {open && (
          <motion.section
            className={`learning-assistant-panel ${minimized ? "is-minimized" : ""}`}
            role="dialog"
            aria-label="AI Learning Assistant"
            initial={reduceMotion ? false : { opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18 }}
          >
            <header className="learning-assistant-header">
              <span className="learning-assistant-mark"><Sparkles size={16} /></span>
              <span className="learning-assistant-heading"><strong>AI Learning Assistant</strong><small>Grounded in the studio knowledge base</small></span>
              <button type="button" className="learning-assistant-icon" onClick={clearChat} aria-label="Clear conversation" title="Clear conversation"><Trash2 size={15} /></button>
              <button type="button" className="learning-assistant-icon" onClick={() => setMinimized((value) => !value)} aria-label={minimized ? "Restore assistant" : "Minimize assistant"} title={minimized ? "Restore" : "Minimize"}>{minimized ? <ChevronDown size={16} /> : <span className="learning-assistant-minimize" />}</button>
              <button type="button" className="learning-assistant-icon" onClick={() => { setOpen(false); setMinimized(false); }} aria-label="Close assistant" title="Close"><X size={16} /></button>
            </header>
            {!minimized && <>
              <div className="learning-assistant-messages" ref={scrollRef} aria-live="polite" aria-label="Conversation">
                {messages.map((message) => <div className={`learning-message learning-message-${message.role}`} key={message.id}>
                  {message.role === "assistant" && <span className="learning-message-avatar"><Bot size={14} /></span>}
                  <div className="learning-message-body"><p>{message.content}</p>
                    {message.source && <small className="learning-message-source">{message.source === "gemini" ? "AI answer · knowledge retrieved" : message.source === "dataset-fallback" ? "Knowledge base · AI temporarily unavailable" : "Knowledge base answer"}</small>}
                    {message.followUpQuestions?.slice(0, 2).map((question) => <button type="button" className="learning-follow-up" key={question} disabled={pending} onClick={() => ask(question)}>{question}<ArrowRight size={12} /></button>)}
                    {message.retryQuestion && <button type="button" className="learning-retry" disabled={pending} onClick={() => ask(message.retryQuestion)}><RotateCcw size={13} />Retry</button>}
                  </div>
                </div>)}
                {pending && <div className="learning-message learning-message-assistant"><span className="learning-message-avatar"><Bot size={14} /></span><div className="learning-message-body learning-typing" aria-label="Assistant is thinking"><i /><i /><i /><span>Thinking</span></div></div>}
              </div>
              {messages.length <= 1 && <div className="learning-suggestions" aria-label="Suggested questions">{suggestedQuestions.slice(0, 3).map((question) => <button type="button" key={question} disabled={pending} onClick={() => ask(question)}>{question}</button>)}</div>}
              <form className="learning-assistant-compose" onSubmit={(event) => { event.preventDefault(); void ask(input); }}>
                <textarea ref={inputRef} value={input} onChange={(event) => setInput(event.target.value.slice(0, 4000))} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void ask(input); } }} placeholder="Ask about a feature or error…" aria-label="Ask the learning assistant" rows={2} disabled={pending} />
                <div className="learning-assistant-compose-footer"><span>Enter to send · Shift+Enter for a new line</span><button type="submit" disabled={pending || !input.trim()} aria-label="Send message">{pending ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}</button></div>
              </form>
            </>}
          </motion.section>
        )}
      </AnimatePresence>
      <button type="button" className="learning-assistant-launcher" aria-expanded={open} aria-label={open ? "Close AI Learning Assistant" : "Need help? Ask AI"} onClick={() => { setOpen((value) => !value); setMinimized(false); }}>
        {open ? <X size={21} /> : <MessageCircle size={21} />}
        {!open && <span className="learning-assistant-tooltip">Need help? Ask AI</span>}
        <span className="learning-assistant-launcher-check" aria-hidden="true"><Check size={10} /></span>
      </button>
    </div>
  );
}

export const MAX_CHAT_MESSAGE_LENGTH = 4000;
export const MAX_PAGE_CONTEXT_LENGTH = 120;

const STOP_WORDS = new Set(["a", "about", "an", "and", "are", "as", "at", "be", "but", "can", "could", "did", "do", "does", "for", "from", "give", "have", "how", "i", "in", "is", "it", "me", "my", "now", "of", "on", "or", "please", "should", "so", "that", "the", "their", "them", "there", "these", "they", "this", "to", "was", "we", "what", "when", "where", "which", "who", "why", "will", "with", "you", "your"]);

export function normalizeText(value = "") {
  return String(value).toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

export function validateChatRequest(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { ok: false, status: 400, error: "Send a JSON object with a message." };
  if (typeof body.message !== "string" || !body.message.trim()) return { ok: false, status: 400, error: "Type a question first." };
  if (body.message.length > MAX_CHAT_MESSAGE_LENGTH) return { ok: false, status: 413, error: `Keep messages under ${MAX_CHAT_MESSAGE_LENGTH} characters.` };
  if (body.context !== undefined && (!body.context || typeof body.context !== "object" || Array.isArray(body.context))) return { ok: false, status: 400, error: "Page context must be a small object." };
  const modes = new Set(["explain", "walkthrough", "concept", "troubleshoot", "code"]);
  return { ok: true, message: body.message.trim(), context: sanitizePageContext(body.context), mode: modes.has(body.mode) ? body.mode : "explain" };
}

export function sanitizePageContext(context = {}) {
  const sections = new Set(["landing", "dashboard", "intent-extraction", "schema-generator", "system-design", "validation-engine", "runtime-generator", "runtime-execution", "projects", "repair-engine", "analytics", "settings"]);
  const audiences = new Set(["student", "developer", "founder", "business", "agency", "educator", "exploring"]);
  const experiences = new Set(["beginner", "learning", "comfortable", "experienced"]);
  const output = {};
  if (sections.has(context.section)) output.section = context.section;
  if (audiences.has(context.audience)) output.audience = context.audience;
  if (experiences.has(context.experience)) output.experience = context.experience;
  if (["academic", "hackathon", "portfolio", "research", "startup", "learning"].includes(context.goal)) output.goal = context.goal;
  return output;
}

export function retrieveKnowledge(message, records, limit = 5) {
  const normalized = normalizeText(message);
  const terms = [...new Set(normalized.split(/\s+/).filter((term) => term.length > 1 && !STOP_WORDS.has(term)))];
  if (!terms.length) return [];
  const ranked = records.filter((record) => record.verified === true).map((record) => {
    const question = normalizeText(record.question);
    const keywords = (record.keywords || []).map(normalizeText);
    const category = normalizeText(record.category);
    const feature = normalizeText(record.related_feature);
    let score = 0;
    for (const term of terms) {
      if (question.split(" ").includes(term)) score += 3;
      if (keywords.some((keyword) => keyword === term || keyword.split(" ").includes(term))) score += 3;
      else if (keywords.some((keyword) => keyword.includes(term))) score += 1.5;
      if (category.includes(term) || feature.includes(term)) score += 0.8;
    }
    if (keywords.some((keyword) => normalized.includes(keyword) && keyword.includes(" "))) score += 2.5;
    if (question === normalized) score += 5;
    return { record, score };
  }).filter(({ score }) => score > 0).sort((a, b) => b.score - a.score || a.record.id.localeCompare(b.record.id));
  return ranked.slice(0, limit).map(({ record, score }) => ({ ...record, retrievalScore: score }));
}

export function buildFallbackAnswer(records) {
  if (!records.length || records[0].retrievalScore < 2) {
    return "I couldn’t find enough verified information to answer that confidently. Try asking about the landing page, project creation, pipeline, schemas, architecture map, validation, preview, or sign-in. You can also share the exact error text without credentials.";
  }
  const best = records[0];
  const followUps = (best.follow_up_questions || []).slice(0, 2);
  return `${best.answer}${followUps.length ? `\n\nYou could also ask: ${followUps.join(" · ")}` : ""}`;
}

export function validateDataset(records) {
  const errors = [];
  const ids = new Set();
  const questions = new Set();
  const required = ["id", "category", "question", "answer", "keywords", "audience", "difficulty", "related_feature", "follow_up_questions", "source_file", "verified"];
  records.forEach((record, index) => {
    const line = index + 1;
    if (!record || typeof record !== "object" || Array.isArray(record)) { errors.push(`Line ${line}: expected a JSON object.`); return; }
    for (const field of required) if (!(field in record)) errors.push(`Line ${line}: missing ${field}.`);
    if (typeof record.id !== "string" || !record.id.trim()) errors.push(`Line ${line}: empty id.`);
    else if (ids.has(record.id)) errors.push(`Line ${line}: duplicate id ${record.id}.`);
    else ids.add(record.id);
    if (typeof record.question !== "string" || !record.question.trim()) errors.push(`Line ${line}: empty question.`);
    else {
      const key = normalizeText(record.question);
      if (questions.has(key)) errors.push(`Line ${line}: duplicate question ${record.question}.`);
      questions.add(key);
    }
    if (typeof record.answer !== "string" || !record.answer.trim()) errors.push(`Line ${line}: empty answer.`);
    if (!Array.isArray(record.keywords) || !Array.isArray(record.audience) || !Array.isArray(record.follow_up_questions)) errors.push(`Line ${line}: keywords, audience, and follow_up_questions must be arrays.`);
    if (typeof record.verified !== "boolean") errors.push(`Line ${line}: verified must be boolean.`);
  });
  return { valid: errors.length === 0, count: records.length, errors };
}

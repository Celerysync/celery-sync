// Typed chat can do what spoken Fern does. Before Fern writes her reply, a
// quick action step looks at the message with the same tools as voice
// (chatTools.json, copied from Fern's Hume tools). If they asked to do,
// record or change something, the app runs it with the very same code voice
// uses (useVoiceTools), including every confirmation rule. Fern's reply is
// then written knowing exactly what was done.
import CHAT_TOOLS from "./chatTools.json";
import { VOICE_ACTION_RULES } from "./voiceTabContext.js";

const ACTION_SYSTEM = `You decide whether the user's LATEST chat message asks you to do something in their CelerySync app, and if so you do it with the tools. You never write a reply to the user — another step does that.

Call tools ONLY when the latest message clearly asks to do, record or change something (e.g. "I've had my celery juice", "add magnesium at 9pm", "save my smoothie…", "log 2 glasses of water", "put potato bake on Thursday"), or answers yes/no to a question just asked about one of those. Look things up with a tool only when needed to do that. For plain questions or chat, call no tools and answer with the single word NONE.

If a tool answers needs_confirmation or needs_choice, do NOT call it again unless the user has already clearly said yes in this conversation — just stop. Never pass confirmed: true without a yes from the user.

${VOICE_ACTION_RULES}`;

const MAX_ROUNDS = 4;

// messages: [{ role, content }] (recent chat, ending with the user's message).
// execute(name, input) → result object. Returns [{ name, input, result }].
export async function runChatActions({ messages, execute, signal }) {
  const convo = messages.slice(-8).map(({ role, content }) => ({ role, content: String(content || "") })).filter((m) => m.content);
  // The API needs the conversation to start with the user.
  while (convo.length && convo[0].role !== "user") convo.shift();
  if (!convo.length) return [];
  const done = [];
  for (let round = 0; round < MAX_ROUNDS; round++) {
    const res = await fetch("/api/claude/tools", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system: ACTION_SYSTEM, messages: convo, tools: CHAT_TOOLS }),
      signal,
    });
    if (!res.ok) break;
    const { content, stop_reason: stop } = await res.json();
    const uses = (content || []).filter((b) => b.type === "tool_use");
    if (stop !== "tool_use" || !uses.length) break;
    convo.push({ role: "assistant", content });
    const results = [];
    for (const u of uses) {
      let result;
      try { result = await execute(u.name, u.input || {}); }
      catch (err) { result = { error: "failed", message: String(err?.message || err).slice(0, 200) }; }
      done.push({ name: u.name, input: u.input || {}, result });
      results.push({ type: "tool_result", tool_use_id: u.id, content: JSON.stringify(result ?? {}).slice(0, 4000) });
    }
    convo.push({ role: "user", content: results });
  }
  return done;
}

// For Fern's reply: what was just done, in plain words.
export function describeActions(done) {
  if (!done.length) return "";
  const lines = done.map(({ name, input, result }) => `- ${name}(${JSON.stringify(input).slice(0, 200)}) → ${JSON.stringify(result ?? {}).slice(0, 500)}`);
  return `\n\nWHAT THE APP JUST DID FOR THIS MESSAGE (already done, from the tools; report it truthfully and briefly. If a result says needs_confirmation or needs_choice, ask the user exactly that question. If a result has an error, say kindly that it didn't work and what to try. Never say anything was done that isn't listed here as saved):\n${lines.join("\n")}`;
}

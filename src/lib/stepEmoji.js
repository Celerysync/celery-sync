// A picture for a step from its own name, so the list is easy to scan.
// Only used when the step still has the default 🌿 / ✨ — a picture they
// chose themselves is always kept.
const RULES = [
  [/lemon|lime/, "🍋"],
  [/celery/, "🥬"],
  [/smoothie/, "🍓"],
  [/juice/, "🥤"],
  [/\bwater\b/, "💧"],
  [/\btea\b|tisane/, "🍵"],
  [/potato/, "🥔"],
  [/salad|lettuce|greens/, "🥗"],
  [/banana/, "🍌"],
  [/apple/, "🍎"],
  [/snack|fruit/, "🍎"],
  [/breakfast|lunch|dinner|meal|supper/, "🍽"],
  [/supplement|b12|zinc|vitamin|magnesium|spirulina|lysine|capsule|tablet/, "💊"],
  [/walk|exercise|yoga|stretch|move/, "🚶"],
  [/sleep|bed|nap|rest/, "😴"],
  [/bath|shower|skin|potion/, "🛁"],
  [/meditat|breath|pray|journal/, "🧘"],
  [/sun|outside|fresh air/, "🌞"],
];

export function stepEmoji(item) {
  const own = item?.emoji;
  if (own && own !== "🌿" && own !== "✨") return own;
  const name = String(item?.name || "").toLowerCase();
  for (const [re, emoji] of RULES) if (re.test(name)) return emoji;
  return own || "🌿";
}

// "B12 and zinc with my smoothie" → the step it's with ("smoothie"), or null.
export function withStepWords(text) {
  const m = String(text || "").match(/\bwith (?:my |the |a |our )?([a-z][a-z \-']{2,40}?)(?:[.,;!]|\band\b|$)/i);
  return m ? m[1].trim() : null;
}

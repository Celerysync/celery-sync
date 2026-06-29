# CelerySync — Product Spec: Real Problems → Safe Features (Build Reference)

> Companion to `LEGAL_CONSTRAINTS.md`. That file is the **what NOT to build** and the
> guardrails. This file is the **what TO build** — the real problems the MM community
> has and the legally-clean features that solve them.
> Read both together: every feature here is designed to stay inside the constraints doc.

---

## Core insight (the reframe that makes this solvable)

The legal constraints block the **commodity**, not the value.

- The protocol list is the commodity: it's in the book the user already owns, it doesn't
  change, and it's the least valuable thing we could offer.
- Everything the community actually struggles with lives in the **layer around** the
  protocol — adherence, feedback, overwhelm, isolation, sourcing. That layer is ours to
  build freely.
- So this is not a watered-down app. It's the genuinely useful app minus one feature
  ("look up condition → get his protocol") that was the commodity and the legal risk.

**Build the engine that's valuable with or without his content. Pursue the AW licence in
parallel.** If the licence lands, his protocols bolt on top of an already-great app and
we become his partner. If it never lands, the community still needs this.

---

## The 5 real problems (from inside the community) → safe features

### 1. Adherence is brutal
**Problem:** Celery juice every morning on an empty stomach, the daily detox smoothie,
supplements timed and stacked. People fall off because life gets in the way — not because
they don't know the protocol.

**Feature — the reminder / rhythm / tracking engine (THE CORE):**
- User configures their **own** regimen once (AI-assisted intake smooths it).
- Daily reminders, the daily rhythm engine, streaks, "did I take my zinc today" memory.
- Rx badge system / Rx-style tracking already built.

**Why it's safe:** functional software, content-neutral. We store the user's regimen as
facts (item / dose / time). We do NOT ship or store his condition→protocol mapping.
*(Constraints: §1 Allowed; §1 the engine model.)*

---

### 2. No feedback loop
**Problem:** People can't tell if it's working, so they quit before it could. Symptoms
fluctuate; memory is unreliable.

**Feature — descriptive symptom/energy tracking over time:**
- Log symptoms, energy, sleep, etc. Correlate against adherence.
- Show the user their **own** pattern: "here's your trend over 8 weeks."
- Use the existing Reports views (descriptive-only, GP PDF, disclaimers).

**Why it's safe:** purely **descriptive** — shows the user their own data. Does NOT
diagnose, does NOT claim causation, does NOT make treatment decisions. Stays inside the
TGA wellness exclusion.
- ⚠️ COPY GUARD: present as "your logged data" and "patterns in what you recorded."
  Never "this proves X is healing your Y" or anything that reads as diagnosis/prognosis.
*(Constraints: §2 — exclusion voided by diagnosis/prognosis claims.)*

---

### 3. Overwhelm and scatter
**Problem:** Info is spread across books, the app, podcasts, posts. Holding it all is
exhausting.

**Feature — calm operating system + original education + link-outs:**
- Our **own** original education on general mechanism (liver function, what hydration
  does, what vitamin C does) — written by us, citable to mainstream sources.
- **Link out** to AW's *official* videos/podcast for his specific framing.
- We are the calm OS; he is the source we point to.

**Why it's safe:** general physiology is ours to write; ideas aren't copyrightable. Links
to official sources are the search-engine-shaped (clean) model.
- ⚠️ GUARD: official sources only (fan reposts = contributory infringement). Don't
  transcribe/summarise his videos into in-app text. Don't let the LLM generate URLs.
*(Constraints: §1 Allowed — education + link out.)*

---

### 4. Isolation
**Problem:** GPs dismiss it, family doesn't get it — no support scaffolding.

**Feature — companionship + gentle accountability:**
- Encouragement, voice companionship (swappable voiceService.js, Phase 4).
- Gentle accountability nudges tied to the user's own goals.
- Optional community features later if desired.

**Why it's safe:** not regulated content. Keep the AI supportive, not diagnostic.
- ⚠️ GUARD: the AI must not move from "encouragement" into "you have X, you should take
  Y for it." Keep AI safety rails on (no diagnosis, no treatment, no Rx-med advice).
*(Constraints: §3 rails.)*

---

### 5. Sourcing and cost
**Problem:** Supplements are expensive; people want to know what actually matters and
where to get it.

**Feature — factual supplement info + comparisons + affiliate:**
- Supplement comparison content we write ourselves (e.g. brand vs brand on facts).
- Affiliate links; ties to planned monetisation + @toolsnottalks.

**Why it's safe:** facts + our own commentary, not his text. Keep claims to
"supports / involved in / general wellbeing."
- ⚠️ GUARD: affiliate + health claims is an ACL/FTC hotspot — claims tied to a sale get
  the most scrutiny. Substantiate or soften. No "cures/treats" near a buy link.
*(Constraints: §2 ACL; claim-language standard.)*

---

## What is deliberately OUT of scope (the one feature the law takes)

❌ **"Look up your condition → get the protocol."** This is the commodity and the core
copyright exposure (his compilation). Only ships via an AW licence. Everything users stay
for is still in scope without it.

---

## Cross-border (AU + US + EU/UK)

Same principle everywhere: **claims attached to your product** are the exposure.
Build to the strictest regulator and you're broadly covered.

- 🇦🇺 **AU / TGA:** one of the stricter regimes — our primary build target. Wellness
  exclusion (item 14B); claims determine status.
- 🇺🇸 **US / FTC:** polices health claims tied to a sale hard (substantiation; aggressive
  on wellness). Plus FDA for device-like software.
- 🇪🇺🇬🇧 **EU / UK:** medical-device-software lines similar in shape to the TGA's.
- **One claim-language standard** satisfying the strictest regulator we operate under =
  one app, not one per market.
- **Copyright is territorial but Berne Convention protects AW's works ~everywhere** —
  "fine in the US" never rescues hosting his compilation. Licence is the only clean route
  in every market.

---

## Posture that keeps us safe (beyond features)

1. **One claim-language standard on EVERY surface** — app UI, marketing, social, store
   listing, @toolsnottalks, anything an influencer says for us. The claim is the
   regulated thing.
   - ✅ supports / involved in / plays a role in / general wellbeing
   - ❌ heals / cures / treats / prevents / diagnoses — never near a named serious condition
2. **Real privacy setup** — health-adjacent data is sensitive in every market.
3. **"Information, not medical advice / consult your practitioner"** framing, used honestly.
4. **Corporate structure** (e.g. US entity / Wyoming LLC for US ops) — affects liability
   & tax, separate layer from claim-cleanliness. Sequence after the build basics.

---

## Build priority (suggested)

1. **Engine first** (Problem 1) — the reminder/rhythm/tracking core. Already largely built.
2. **Feedback loop** (Problem 2) — descriptive tracking + Reports. Highest retention value.
3. **Education + link-outs** (Problem 3) — original content; SEO/discovery upside.
4. **Companionship** (Problem 4) — voice (finish Phase 4 testing) + accountability.
5. **Sourcing/affiliate** (Problem 5) — monetisation layer; tighten claims near buy links.

---

## ⭐ Still needs professional sign-off (from constraints doc)
1. ⭐ IP attorney: confirm intake/storage model is not a reconstructable copy of his
   compilation.
2. ⭐ TGA / regulatory check: confirm feature set + final copy stays inside the wellness
   exclusion.

---

## One-line north star
**Build the app the community needs to actually DO the protocols and see if they're
working — not the app that contains the protocols. The constraint and the real need point
at the same build.**

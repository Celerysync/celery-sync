# CelerySync — Legal & Regulatory Constraints (Build Reference)

> Purpose: a build-facing reference for architecture and feature decisions. This is
> grounded in current AU regulatory + copyright sources (checked Jun 2026) but is
> **not legal advice**. The two starred items at the bottom need a real IP attorney
> and a TGA/regulatory check before launch. Build to these constraints in the meantime.

---

## TL;DR — the one rule that drives everything

**CelerySync is the engine. The user supplies the protocol content.**

- We build: reminders, tracking, daily rhythm, adherence, progress correlation, voice,
  original education on general mechanism.
- The user (who owns the books) enters/selects what *they* are following.
- We persist the user's **own regimen** (supplement, dose, time — facts), never a
  stored, queryable copy of AW's book or his condition→protocol mapping.

If a feature would require shipping AW's compilation, or would make a therapeutic
claim about a serious condition, it's out of scope until licensed / regulatory-cleared.

---

## 1. COPYRIGHT (Australia — Copyright Act 1968)

### What is NOT protected (free to build with)
- **Individual facts.** A supplement name, a dose, a timing ("16oz, morning, empty
  stomach"), a single ingredient quantity. Facts aren't copyrightable.
- **Ideas / concepts / theories.** AW's general ideas about how the body works are
  ideas; copyright protects the *expression*, not the idea, and does not stop us
  independently writing our own explanation of the same subject.
- **General physiology / nutrition science.** Liver function, what vitamin C does,
  hydration — ours to write from first principles and mainstream sources.

### What IS protected (do NOT reproduce or store-and-serve)
- **His expressive text.** Headnotes, explanations, the prose "why" of a protocol or
  recipe. Verbatim or close-paraphrase both count.
- **His COMPILATION.** Under AU law the *selection and arrangement* of facts is a
  protected literary work even when each individual fact is not. His condition→protocol
  mapping and his curated set of signature recipes are exactly this. "Has all the
  protocols in it" = reproducing his compilation. This is the main exposure.
- **Derivative works ("adaptations").** Restructuring his book into our own database
  is still derivative if the result is a reconstructable copy of his compilation —
  *no matter how it got there* (manual entry, scraping, or AI parsing an upload).

### "But it's public info" / "it's like a search engine" — both fail
- Publicly accessible ≠ free to copy. Copyright is automatic; fan reposts don't waive it.
- A search engine *indexes and links out*; it does not host the content. Our app must
  behave the same way for AW's material: **point to him, don't hold his content.**

### Hard NO-BUILD list (copyright)
- ❌ Book upload → AI ingests / embeds / caches / parses AW text.
- ❌ Pre-loaded protocol library (lookup: condition → his supplement+dose list).
- ❌ Stored, queryable database that reconstructs his condition→protocol mapping.
- ❌ Curated collection of his signature recipes, or his recipe "why" prose.
- ❌ Transcribing/summarising his videos or books into in-app text.
- ❌ LLM generating "what AW says about X" as app content.

### Allowed (copyright)
- ✅ Reminder/tracking/rhythm engine — functional software, content-neutral.
- ✅ User enters/selects their **own** regimen; we store facts (item, dose, time).
- ✅ Factual autocomplete from a list of supplement names / standard doses / timings.
- ✅ AI-assisted **intake**: AI helps the *user* structure *their own* routine into the
  tracker (user is the source; we store their regimen, not his book).
- ✅ Original education on general mechanism, written by us, citable to mainstream sources.
- ✅ **Link out** to AW's *official* channels (YouTube/site/podcast) as references inside
  our own original guidance. Official sources only — linking fan reposts = contributory
  infringement. Don't auto-generate URLs with the LLM (hallucination/wrong-video risk);
  link to his channel or a verified curated set.

### The clean way to ship his actual protocols pre-loaded
- ✅ A licence from AW. That's the only route to hosting his compilation, and it also
  turns us from a legal risk into a partner (ties to the licence/acquisition exit).

---

## 2. TGA (Australia — Therapeutic Goods Act 1989)

### The exclusion we want to stay inside (item 14B — general health/wellness software)
Consumer wellness software can be **excluded** from medical-device regulation. The
exclusion is **voided** if the software:
- makes claims about a **serious** disease, condition, ailment or defect; OR
- is used for **diagnosis, prognosis, or making decisions about treatment** of a
  disease/condition; OR
- is **also** intended for use in clinical practice.

If voided, the product may be a **Software as a Medical Device (SaMD)** and must be on
the ARTG before it can be marketed/supplied — a heavy compliance program we are not
doing at launch.

### Critical nuance: CLAIMS determine status
- The **claims** we make (in-app copy, marketing, social, store listing, influencer
  posts) can themselves establish a "therapeutic purpose" and pull us into regulation —
  even if the underlying function is benign.
- Using AI does **not** by itself change whether we're excluded. A neutral reminder tool
  the *user configures* is far safer than a system that *recommends* supplements *for
  conditions*.

### Build/copy rules (TGA)
- ✅ "Supports", "is involved in", "plays a role in", "may help with general wellbeing".
- ❌ "Heals", "cures", "treats", "prevents", "diagnoses" — and never tie these to a named
  serious condition (cancer, mental illness, etc. are explicitly restricted).
- Feature framing matters: **user-configured reminders/tracking = fine**;
  **app recommends a protocol for a condition = therapeutic claim = exclusion at risk.**
- Rename claim-y UI: "What fruits heal the brain" → "Fruits and brain health" /
  "Foods that support cognitive function".
- Keep descriptive-only / no-diagnosis / no-treatment posture everywhere (already a rail).
- Note the direction of travel: TGA is actively tightening on digital health / mental-
  health apps. Treat copy as a regulatory artifact, not marketing fluff.

### Also applies regardless of TGA
- **Australian Consumer Law (ACL):** no misleading/deceptive claims — applies even if
  we're TGA-excluded, and covers testimonials + influencer content.
- **Privacy Act:** health data is sensitive; need a real privacy policy matching actual
  practice, transparent collection, secure storage.

---

## 3. Existing rails to keep (don't regress)
- Never reproduce AW text verbatim; paraphrase + attribute.
- Never diagnose or treat; descriptive-only views.
- Never advise on prescription medications.
- Phase 1 deliberately removed book-upload — do not reintroduce it via a "public info"
  or "user owns the book" side door. The risk is the same regardless of sourcing story.

---

## 4. ⭐ Open items — get professional sign-off before launch
1. ⭐ **IP attorney:** confirm the engine-plus-user-content model as built (esp. that the
   stored regimen + any AI intake output is NOT a reconstructable copy of AW's
   compilation). This is the belief the whole app rests on — get it in writing.
2. ⭐ **TGA / regulatory check:** confirm the reminder/tracking feature set + final in-app
   and marketing copy stays inside the 14B wellness exclusion and doesn't read as SaMD.

---

## 5. Quick decision test for any new feature
1. Does it store or serve AW's text or his condition→protocol/recipe **compilation**?
   → If yes, **stop** (needs a licence).
2. Is the protocol content coming from the **user**, with us storing only facts
   (item/dose/time)? → OK.
3. Does any user-facing or marketing claim say heal/cure/treat/prevent/diagnose, or name
   a serious condition? → **Reword** to supports/involved-in/wellbeing.
4. Are we linking AW's content instead of hosting it, and only to **official** sources?
   → OK.

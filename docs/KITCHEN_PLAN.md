# Kitchen: plan

Status: **waiting for Alli's approval.** Nothing built or run.
Database change: `supabase/kitchen.sql` (additive, safe to re-run, undo included).

Agreed with Alli (2026-11-08): a **Kitchen** tab; recipes spoken in full and
sorted by Fern; a shopping list; photos of their own dishes; build in four steps.

## Rules (binding)

- Everything is the person's own: what they type, paste or say. The app ships
  no recipes, and nothing is shared between people.
- Fern only records and reads back what they gave her. She never invents,
  suggests or completes ingredients, amounts or steps; if something's missing
  she asks. Asked for something new, she says she only sees their own recipes
  and points to their books.
- No photographing book pages for the app to read. Photos are of their own
  finished dishes, kept private.
- What they made is shown descriptively ("Green smoothie, 5 times this week"),
  never what it did for them.
- Every tick is still one `activity_events` row; the recipe is noted on it.

## Step 1: the library, by tap and by voice

- **Kitchen tab**: Today · Kitchen · Companion · Progress · Settings. Sections:
  Juices, Smoothies, Meals, Snacks, Drinks, Other. Search by name or ingredient,
  favourites first, "+ Add".
- **Entry**: name, kind, ingredients (one per line, amounts as they said them),
  steps (numbered), notes, tags, favourite, photo.
- **Paste or type freely**: the add screen sorts free text into the fields,
  shown for checking before saving.
- **Fern** (voice and typed chat): "save a new smoothie…" in any order, over
  several turns if they like; she sorts it, reads back the summary
  ("a smoothie called…, 4 ingredients, 2 steps — save it?") and saves only on
  yes. Edits by voice: "change the spinach to kale", "add a step", "move it to
  snacks", "rename it". Same never-overwrite rule as programs.
- **Links**: a rhythm step can open a recipe (📖 on Today); program steps can
  too. "Choose tonight's meal" on a dinner step lists their meals.
- **Account**: recipes, shopping list and photos are included in "Download my
  data" and removed by "Delete my account". Privacy Policy updated to mention
  recipe photos.
- Kitchen is on both plans (it's part of the routine); Fern's help stays with
  Rhythm + Voice.

## Step 2: Fern in the kitchen

- "What's in my green smoothie?", "what can I make with potatoes and spinach?"
  (searches their own library only).
- "Put my liver smoothie on tomorrow morning", "I'm having the potato bake for
  dinner" (links it, and notes it when ticked).
- Cook-along: "read me the steps" — one step at a time, waits for "next",
  "repeat" or "back".

## Step 3: what they made, and carers

- Ticking a step with a recipe notes which one (`activity_events.recipe_id`,
  `recipe_name`). Progress shows "What you made" counts; the GP report gets a
  short descriptive section if they want it.
- The carer view shows tonight's chosen recipe, so a carer can prepare it.

## Step 4: shopping list

- Pick recipes ("this week") → one combined list of their ingredients, ticked
  off in the shop. Add anything by hand or by voice ("add lemons to my list").
- Combining is simple and honest: identical lines merge; nothing is
  converted or guessed.

## Database (supabase/kitchen.sql)

- `kitchen_items` (the library; one name per person; RLS by profile owner).
- `rhythm_items.recipe_id` (step → recipe).
- `activity_events.recipe_id`, `recipe_name` (which recipe a tick was; no FK so
  the ledger stays append-only and history survives deletes).
- `shopping_list_items` (RLS by profile owner).
- Private storage bucket `kitchen-photos` (5 MB images; each person's own
  folder only; shown via short-lived signed links).

## Order

Each step: build → tests → walk it on the real database with a test account
(deleted after) → Alli's OK → live (app, server if touched, Fern in Hume).

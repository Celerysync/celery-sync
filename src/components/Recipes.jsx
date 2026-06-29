import { useState, useRef, useEffect } from "react";
import C from "../lib/colors.js";
import { Btn, Card } from "./ui.jsx";
import { RECIPES, getForTimeOfDay, MEAL_TYPES } from "../data/recipes.js";
import { useRecipes } from "../hooks/useRecipes.js";
import { callClaude } from "../lib/api.js";
import Juices from "./Juices.jsx";

const MEAL_LABELS = {
  drink: "Drinks",
  breakfast: "Breakfast",
  snack: "Snacks",
  lunch: "Lunch",
  dinner: "Dinner",
};

const SLOT_LABELS = {
  breakfast: { emoji: "🌅", label: "Breakfast" },
  lunch: { emoji: "☀️", label: "Lunch" },
  dinner: { emoji: "🌙", label: "Dinner" },
  snacks: { emoji: "🍎", label: "Snacks" },
};

function todayMealKey() {
  const d = new Date();
  return `cs_meals_${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function RecipeCard({ recipe, onSave, saved, onAddToPlan, onLogMeal, compact = false }) {
  const [expanded, setExpanded] = useState(false);
  const [logged, setLogged] = useState(() => {
    try {
      const meals = JSON.parse(localStorage.getItem(todayMealKey()) || "[]");
      return meals.some((m) => m.id === recipe.id);
    } catch { return false; }
  });

  return (
    <div
      style={{
        background: C.white,
        border: `1.5px solid ${expanded ? C.sage : C.border}`,
        borderRadius: 16,
        overflow: "hidden",
        transition: "border-color 0.2s",
      }}
    >
      {/* Header — always visible */}
      <div
        style={{ padding: "12px 14px", cursor: "pointer" }}
        onClick={() => setExpanded((v) => !v)}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 22 }}>{recipe.emoji}</span>
              <div>
                <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal }}>
                  {recipe.name}
                </div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                  ⏱ {recipe.prepTime} min · {MEAL_LABELS[recipe.mealType] || recipe.mealType}
                  {recipe.cleanseDay ? ` · ${recipe.cleanseDay}` : ""}
                </div>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button
              onClick={(e) => { e.stopPropagation(); onSave(recipe.id); }}
              style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", padding: 2 }}
              title={saved ? "Unsave" : "Save recipe"}
            >
              {saved ? "❤️" : "🤍"}
            </button>
            <span style={{ fontSize: 12, color: C.muted }}>{expanded ? "▲" : "▼"}</span>
          </div>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{ padding: "0 14px 14px", borderTop: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 11, color: C.sage, fontWeight: 600, marginBottom: 8 }}>
            📚 {recipe.book}
          </div>

          {/* Ingredients */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 13, color: C.charcoal, marginBottom: 6 }}>
              Ingredients {recipe.servings > 1 ? `(serves ${recipe.servings})` : ""}
            </div>
            {recipe.ingredients.map((ing, i) => (
              <div key={i} style={{ display: "flex", gap: 8, padding: "4px 0", borderBottom: `1px solid ${C.border}40`, fontSize: 13, color: C.charcoal }}>
                <span style={{ color: C.sage, flexShrink: 0 }}>•</span>
                <span>{ing}</span>
              </div>
            ))}
          </div>

          {/* Steps */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 13, color: C.charcoal, marginBottom: 6 }}>
              Method
            </div>
            {recipe.steps.map((step, i) => (
              <div key={i} style={{ display: "flex", gap: 10, padding: "5px 0", fontSize: 13, color: C.charcoal, lineHeight: 1.55 }}>
                <span style={{
                  flexShrink: 0,
                  width: 20,
                  height: 20,
                  background: C.sage,
                  color: C.white,
                  borderRadius: "50%",
                  fontSize: 11,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  marginTop: 1,
                }}>
                  {i + 1}
                </span>
                <span>{step}</span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: onAddToPlan ? 8 : 0 }}>
            <button
              onClick={() => {
                if (logged) return;
                setLogged(true);
                onLogMeal?.(recipe);
              }}
              style={{
                padding: "7px 16px",
                borderRadius: 20,
                border: `1.5px solid ${logged ? C.sage : C.border}`,
                background: logged ? C.sageLight : C.mist,
                fontSize: 12,
                color: logged ? C.sageDark : C.mid,
                cursor: logged ? "default" : "pointer",
                fontFamily: "Georgia,serif",
                fontWeight: logged ? 700 : 400,
              }}
            >
              {logged ? "✓ Logged today" : "🍽 I ate this"}
            </button>
          </div>
          {onAddToPlan && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["breakfast", "lunch", "dinner", "snacks"].map((slot) => (
                <button
                  key={slot}
                  onClick={() => onAddToPlan(slot, recipe)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 20,
                    border: `1.5px solid ${C.border}`,
                    background: C.mist,
                    fontSize: 11.5,
                    color: C.mid,
                    cursor: "pointer",
                    fontFamily: "Georgia,serif",
                  }}
                >
                  + {SLOT_LABELS[slot].label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const SYMPTOM_CHIPS = [
  { label: "Fatigue", tag: "fatigue" },
  { label: "Brain Fog", tag: "brain-fog" },
  { label: "Anxiety", tag: "anxiety" },
  { label: "Liver", tag: "liver" },
  { label: "Adrenal", tag: "adrenal-fatigue" },
  { label: "Thyroid", tag: "thyroid" },
  { label: "Digestion", tag: "digestion" },
  { label: "Bloating", tag: "bloating" },
  { label: "Inflammation", tag: "inflammation" },
  { label: "Immune", tag: "immune" },
  { label: "Skin", tag: "skin" },
  { label: "Insomnia", tag: "insomnia" },
  { label: "Depression", tag: "depression" },
  { label: "Detox", tag: "detox" },
  { label: "Snacks", tag: "adrenal-fatigue", mealType: "snack" },
];

export default function Recipes({ user, navQuery }) {
  const [view, setView] = useState("juices"); // juices | browse | plan | shopping
  const [mealTypeFilter, setMealTypeFilter] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [symptomFilter, setSymptomFilter] = useState(null);
  const [pickingSlot, setPickingSlot] = useState(null);
  const [planSearch, setPlanSearch] = useState({});

  useEffect(() => {
    if (!navQuery) return;
    setSearchText(navQuery);
    setView("browse");
  }, [navQuery]);

  // AI custom recipe
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiRecipe, setAiRecipe] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  // Photo upload
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoBase64, setPhotoBase64] = useState(null);
  const [photoMime, setPhotoMime] = useState("image/jpeg");
  const [photoResult, setPhotoResult] = useState("");
  const [photoLoading, setPhotoLoading] = useState(false);
  const fileInputRef = useRef(null);

  // Shopping list manual add
  const [newItem, setNewItem] = useState("");

  const {
    savedIds, mealPlan, shoppingList,
    toggleSave, isSaved, assignToSlot, clearSlot,
    buildShoppingList, toggleShoppingItem, addShoppingItem, clearShoppingList,
  } = useRecipes();

  const [mealLogCount, setMealLogCount] = useState(() => {
    try { return JSON.parse(localStorage.getItem(todayMealKey()) || "[]").length; } catch { return 0; }
  });

  const logMeal = (recipe) => {
    const key = todayMealKey();
    try {
      const existing = JSON.parse(localStorage.getItem(key) || "[]");
      if (existing.some((m) => m.id === recipe.id)) return;
      const updated = [...existing, {
        id: recipe.id,
        name: recipe.name,
        emoji: recipe.emoji,
        mealType: recipe.mealType,
        loggedAt: new Date().toISOString(),
      }];
      localStorage.setItem(key, JSON.stringify(updated));
      setMealLogCount(updated.length);
    } catch {}
  };

  // Personalised section — recipes for user's own conditions
  const userConditionTags = (user?.conditions || []).map((c) => c.toLowerCase().replace(/[^a-z0-9]/g, "-"));
  const forYourHealing = RECIPES.filter((r) =>
    r.goodFor?.some((g) => userConditionTags.some((t) => g.includes(t)))
  ).slice(0, 6);

  // Filter recipes
  const filtered = RECIPES.filter((r) => {
    if (showSavedOnly && !savedIds.includes(r.id)) return false;
    if (mealTypeFilter !== "all" && r.mealType !== mealTypeFilter) return false;
    if (symptomFilter && !r.goodFor?.includes(symptomFilter)) return false;
    if (searchText && !r.name.toLowerCase().includes(searchText.toLowerCase()) &&
        !r.goodFor?.some((g) => g.includes(searchText.toLowerCase()))) return false;
    return true;
  });

  const timeOfDayRecipes = getForTimeOfDay().slice(0, 4);

  const generateAiRecipe = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiRecipe("");
    const result = await callClaude({
      tier: 'standard',
      maxTokens: 700,
      messages: [{
        role: "user",
        content: `You are a Medical Medium recipe creator. Generate a detailed, delicious recipe based on this request: "${aiPrompt}"

Rules — this recipe must:
- Contain NO eggs, dairy, gluten, corn, soy, pork, MSG, citric acid, natural flavours, nutritional yeast, or vinegar
- Use only whole plant foods, fruits, vegetables, legumes, herbs, and clean seasonings
- Be genuinely delicious and satisfying, not just "healthy"
- Reference Anthony William's teachings where relevant

Format:
## [Recipe Name] [emoji]
**Prep time:** X minutes | **Serves:** X
**Good for:** [list of conditions/symptoms this helps]

**Ingredients:**
- ingredient 1
- ingredient 2

**Method:**
1. Step one
2. Step two

**🌿 MM Note:** [Brief Anthony William teaching about key ingredients]

Keep it practical and mouth-watering.`,
      }],
    });
    setAiRecipe(result);
    setAiLoading(false);
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoMime(file.type || "image/jpeg");
    const reader = new FileReader();
    reader.onload = (ev) => {
      const full = ev.target.result;
      setPhotoPreview(full);
      // Strip data URL prefix for the API
      setPhotoBase64(full.split(",")[1]);
    };
    reader.readAsDataURL(file);
    setPhotoResult("");
  };

  const analysePhoto = async () => {
    if (!photoBase64) return;
    setPhotoLoading(true);
    setPhotoResult("");
    const result = await callClaude({
      tier: 'standard',
      maxTokens: 700,
      messages: [{
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: photoMime, data: photoBase64 },
          },
          {
            type: "text",
            text: `You are a Medical Medium recipe expert. Look at these ingredients and suggest 3 delicious Medical Medium-compliant meals or snacks I can make right now.

Rules:
- All suggestions must be free of: eggs, dairy, gluten, corn, soy, pork, MSG, citric acid, natural flavours, nutritional yeast, vinegar
- If you spot any of those items in the photo, acknowledge them but don't use them in recipes
- Be creative and practical — use what's actually there
- Reference Anthony William's teachings briefly for each suggestion

Format each suggestion as:
🍽 **[Meal Name]**
How to make it: [brief instructions]
🌿 MM benefit: [one sentence]`,
          },
        ],
      }],
    });
    setPhotoResult(result);
    setPhotoLoading(false);
  };

  const planRecipes = [
    mealPlan.breakfast,
    mealPlan.lunch,
    mealPlan.dinner,
    ...(mealPlan.snacks || []),
  ].filter(Boolean);

  const shoppingByCategory = shoppingList.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const uncheckedCount = shoppingList.filter((i) => !i.checked).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Header */}
      <div>
        <h2 style={{ margin: 0, fontFamily: "Georgia,serif", fontSize: 20, color: C.charcoal }}>
          🍽 Recipes & Meal Planner
        </h2>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
          100% Medical Medium compliant · No eggs · No dairy · No gluten
        </div>
      </div>

      {/* Teaching attribution */}
      <div style={{
        background: "#f0f9f0",
        border: "1px solid rgba(107,142,90,0.25)",
        borderRadius: 12,
        padding: "10px 12px",
        fontSize: 12,
        color: "#4a7a5a",
        lineHeight: 1.5,
      }}>
        📖 Recipes are inspired by and paraphrased from Anthony William's publicly shared teachings. This is not medical advice — always work with your healthcare provider. See his books and more in the <strong>Resources</strong> tab.
      </div>

      {/* View switcher */}
      <div style={{ display: "flex", background: C.mist, borderRadius: 12, padding: 4, gap: 4 }}>
        {[
          { id: "juices", label: "🥬 Juices" },
          { id: "browse", label: `Recipes${mealLogCount > 0 ? ` (${mealLogCount})` : ""}` },
          { id: "plan", label: "Plan" },
          { id: "shopping", label: `Shop${uncheckedCount > 0 ? ` (${uncheckedCount})` : ""}` },
        ].map((v) => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            style={{
              flex: 1,
              padding: "8px 4px",
              borderRadius: 9,
              border: "none",
              background: view === v.id ? C.white : "transparent",
              fontFamily: "Georgia,serif",
              fontSize: 12.5,
              color: view === v.id ? C.sageDark : C.muted,
              fontWeight: view === v.id ? 700 : 400,
              cursor: "pointer",
              boxShadow: view === v.id ? "0 1px 4px #00000012" : "none",
              transition: "all 0.2s",
            }}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* ── JUICES & SHOTS VIEW ────────────────────────────────── */}
      {view === "juices" && <Juices />}

      {/* ── BROWSE VIEW ────────────────────────────────────────── */}
      {view === "browse" && (
        <>
          {/* Search bar */}
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search recipes or symptoms…"
            style={{
              padding: "10px 16px",
              borderRadius: 30,
              border: `1.5px solid ${C.border}`,
              fontFamily: "Georgia,serif",
              fontSize: 14,
              outline: "none",
              background: C.mist,
            }}
          />

          {/* Symptom filter chips — shown when searching */}
          {searchText.trim() && (
            <div style={{ overflowX: "auto", paddingBottom: 4 }}>
              <div style={{ display: "flex", gap: 6, minWidth: "max-content" }}>
                {SYMPTOM_CHIPS.map((chip) => {
                  const active = symptomFilter === chip.tag;
                  return (
                    <button
                      key={chip.tag + chip.label}
                      onClick={() => setSymptomFilter(active ? null : chip.tag)}
                      style={{
                        padding: "5px 12px", borderRadius: 20,
                        border: `1.5px solid ${active ? C.sage : C.border}`,
                        background: active ? C.sageLight : "transparent",
                        color: active ? C.sageDark : C.mid,
                        fontSize: 11.5, fontFamily: "Georgia,serif",
                        cursor: "pointer", fontWeight: active ? 700 : 400, whiteSpace: "nowrap",
                      }}
                    >
                      {chip.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Search results — flat list when searching */}
          {searchText.trim() ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filtered.length === 0 && (
                <div style={{ textAlign: "center", color: C.muted, padding: "30px 0", fontSize: 13 }}>
                  No recipes match that search.
                </div>
              )}
              {filtered.map((r) => (
                <RecipeCard key={r.id} recipe={r} saved={isSaved(r.id)} onSave={toggleSave} onAddToPlan={assignToSlot} onLogMeal={logMeal} />
              ))}
            </div>
          ) : (
            /* ── SECTIONED VIEW — default when not searching ── */
            <>
              {[
                { id: "breakfast", emoji: "🌅", label: "Breakfast", note: "Start with lemon water → celery juice → then these" },
                { id: "snack",     emoji: "🍎", label: "Adrenal Snacks", note: "Every 90 minutes between meals to keep blood sugar stable" },
                { id: "lunch",     emoji: "☀️", label: "Lunch",     note: "Light on fat — fruit, salads, soups, simple meals" },
                { id: "dinner",    emoji: "🌙", label: "Dinner",    note: "Warm, nourishing, liver-supportive before rest" },
              ].map(({ id, emoji, label, note }) => {
                const sectionRecipes = RECIPES.filter((r) => r.mealType === id);
                if (sectionRecipes.length === 0) return null;
                return (
                  <div key={id}>
                    {/* Section header */}
                    <div style={{
                      display: "flex", alignItems: "flex-end", gap: 8,
                      marginBottom: 10, paddingBottom: 8,
                      borderBottom: `2px solid ${C.sage}30`,
                    }}>
                      <span style={{ fontSize: 22 }}>{emoji}</span>
                      <div>
                        <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 16, color: C.charcoal }}>
                          {label}
                        </div>
                        <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.4 }}>{note}</div>
                      </div>
                      <div style={{
                        marginLeft: "auto", fontSize: 11, color: C.sage,
                        fontFamily: "Georgia,serif", fontWeight: 700, whiteSpace: "nowrap",
                      }}>
                        {sectionRecipes.length} recipes
                      </div>
                    </div>
                    {/* Recipes in this section */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                      {sectionRecipes.map((r) => (
                        <RecipeCard key={r.id} recipe={r} saved={isSaved(r.id)} onSave={toggleSave} onAddToPlan={assignToSlot} onLogMeal={logMeal} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {/* AI custom recipe */}
          <Card>
            <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal, marginBottom: 10 }}>
              ✨ Generate a custom recipe
            </div>
            <div style={{ fontSize: 12.5, color: C.mid, marginBottom: 10 }}>
              Tell me what you're craving, what you have in the fridge, or what symptoms to cook for.
            </div>
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="e.g. a warming soup for joint pain… or something with sweet potato and lemon…"
              rows={2}
              style={{
                width: "100%",
                borderRadius: 12,
                border: `1.5px solid ${C.border}`,
                padding: "10px 12px",
                fontFamily: "Georgia,serif",
                fontSize: 13,
                resize: "none",
                outline: "none",
                background: C.mist,
                boxSizing: "border-box",
                marginBottom: 10,
              }}
            />
            <Btn full color={C.sageDark} onClick={generateAiRecipe} disabled={aiLoading || !aiPrompt.trim()}>
              {aiLoading ? "🌿 Creating your recipe…" : "Create MM Recipe"}
            </Btn>
            {aiRecipe && (
              <div style={{
                marginTop: 14,
                fontSize: 13.5,
                color: C.charcoal,
                lineHeight: 1.8,
                whiteSpace: "pre-wrap",
                borderTop: `1px solid ${C.border}`,
                paddingTop: 14,
              }}>
                {aiRecipe}
              </div>
            )}
          </Card>

          {/* Photo upload */}
          <Card>
            <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal, marginBottom: 6 }}>
              📷 What's in your fridge?
            </div>
            <div style={{ fontSize: 12.5, color: C.mid, marginBottom: 12 }}>
              Take a photo of your ingredients and I'll suggest MM-compliant meals you can make right now.
            </div>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              ref={fileInputRef}
              onChange={handlePhotoUpload}
              style={{ display: "none" }}
            />
            {!photoPreview ? (
              <Btn full color={C.sage} onClick={() => fileInputRef.current?.click()}>
                📷 Take / Upload Photo
              </Btn>
            ) : (
              <>
                <img
                  src={photoPreview}
                  alt="Ingredients"
                  style={{ width: "100%", borderRadius: 12, marginBottom: 10, maxHeight: 220, objectFit: "cover" }}
                />
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  <Btn full color={C.sageDark} onClick={analysePhoto} disabled={photoLoading}>
                    {photoLoading ? "🌿 Looking…" : "Get meal ideas from this photo"}
                  </Btn>
                  <button
                    onClick={() => { setPhotoPreview(null); setPhotoBase64(null); setPhotoResult(""); }}
                    style={{ padding: "0 14px", borderRadius: 12, border: `1px solid ${C.border}`, background: "none", cursor: "pointer", fontSize: 12, color: C.muted }}
                  >
                    Clear
                  </button>
                </div>
                {photoResult && (
                  <div style={{
                    fontSize: 13.5,
                    color: C.charcoal,
                    lineHeight: 1.8,
                    whiteSpace: "pre-wrap",
                    borderTop: `1px solid ${C.border}`,
                    paddingTop: 12,
                  }}>
                    {photoResult}
                  </div>
                )}
              </>
            )}
          </Card>
        </>
      )}

      {/* ── PLAN VIEW ──────────────────────────────────────────── */}
      {view === "plan" && (
        <>
          {Object.entries(SLOT_LABELS).map(([slot, { emoji, label }]) => {
            const isSnacks = slot === "snacks";
            const value = isSnacks ? mealPlan.snacks : mealPlan[slot];
            const hasValue = isSnacks ? value?.length > 0 : !!value;
            const mealType = slot === "snacks" ? "snack" : slot;
            const picking = pickingSlot === slot;
            const slotRecipes = RECIPES.filter((r) => r.mealType === mealType);
            const [slotSearch, setSlotSearch] = [
              planSearch[slot] || "",
              (q) => setPlanSearch((p) => ({ ...p, [slot]: q })),
            ];
            const visibleRecipes = slotSearch
              ? slotRecipes.filter((r) => r.name.toLowerCase().includes(slotSearch.toLowerCase()))
              : slotRecipes;

            return (
              <Card key={slot} style={{ border: picking ? `1.5px solid ${C.sage}` : undefined }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: hasValue ? 8 : 0 }}>
                  <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal }}>
                    {emoji} {label}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {hasValue && !picking && (
                      <button
                        onClick={() => clearSlot(slot)}
                        style={{ background: "none", border: "none", fontSize: 11, color: C.muted, cursor: "pointer" }}
                      >
                        Clear
                      </button>
                    )}
                    <button
                      onClick={() => setPickingSlot(picking ? null : slot)}
                      style={{
                        padding: "5px 12px",
                        borderRadius: 20,
                        border: `1.5px solid ${picking ? C.plum : C.sage}`,
                        background: picking ? C.plumLight : C.sageLight,
                        fontSize: 11.5,
                        color: picking ? C.plum : C.sageDark,
                        cursor: "pointer",
                        fontFamily: "Georgia,serif",
                        fontWeight: 700,
                      }}
                    >
                      {picking ? "✕ Done" : "+ Add"}
                    </button>
                  </div>
                </div>

                {/* Current selections */}
                {!picking && !hasValue && (
                  <div style={{ fontSize: 12, color: C.muted, fontStyle: "italic", paddingBottom: 2 }}>
                    Nothing planned yet
                  </div>
                )}
                {isSnacks && value?.map((r) => (
                  <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderTop: `1px solid ${C.border}40` }}>
                    <span style={{ fontSize: 13 }}>{r.emoji} {r.name}</span>
                    <button onClick={() => assignToSlot("snacks", r)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 11 }}>✕</button>
                  </div>
                ))}
                {!isSnacks && value && !picking && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0" }}>
                    <span style={{ fontSize: 13 }}>{value.emoji} {value.name}</span>
                    <span style={{ fontSize: 11, color: C.muted }}>⏱ {value.prepTime} min</span>
                  </div>
                )}

                {/* Inline recipe picker */}
                {picking && (
                  <div style={{ marginTop: 10, borderTop: `1px solid ${C.sage}30`, paddingTop: 10 }}>
                    <input
                      value={slotSearch}
                      onChange={(e) => setSlotSearch(e.target.value)}
                      placeholder={`Search ${label.toLowerCase()} recipes…`}
                      autoFocus
                      style={{
                        width: "100%", boxSizing: "border-box",
                        padding: "8px 12px", borderRadius: 20,
                        border: `1.5px solid ${C.border}`,
                        fontFamily: "Georgia,serif", fontSize: 13,
                        outline: "none", background: C.mist,
                        marginBottom: 8,
                      }}
                    />
                    <div style={{ display: "flex", flexDirection: "column", gap: 2, maxHeight: 260, overflowY: "auto" }}>
                      {visibleRecipes.map((r) => {
                        const alreadyAdded = isSnacks
                          ? value?.some((s) => s.id === r.id)
                          : value?.id === r.id;
                        return (
                          <button
                            key={r.id}
                            onClick={() => {
                              assignToSlot(slot, r);
                              if (!isSnacks) setPickingSlot(null);
                            }}
                            style={{
                              display: "flex", alignItems: "center", gap: 10,
                              padding: "9px 10px", borderRadius: 10,
                              border: `1.5px solid ${alreadyAdded ? C.sage : C.border}`,
                              background: alreadyAdded ? C.sageLight : C.white,
                              cursor: "pointer", textAlign: "left", width: "100%",
                            }}
                          >
                            <span style={{ fontSize: 18, flexShrink: 0 }}>{r.emoji}</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontFamily: "Georgia,serif", fontSize: 13, color: C.charcoal, fontWeight: alreadyAdded ? 700 : 400 }}>
                                {r.name}
                              </div>
                              <div style={{ fontSize: 11, color: C.muted }}>⏱ {r.prepTime} min</div>
                            </div>
                            {alreadyAdded && <span style={{ fontSize: 13, color: C.sage }}>✓</span>}
                          </button>
                        );
                      })}
                      {visibleRecipes.length === 0 && (
                        <div style={{ textAlign: "center", color: C.muted, fontSize: 12, padding: "12px 0" }}>
                          No {label.toLowerCase()} recipes found
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}

          {planRecipes.length > 0 && (
            <Btn
              full
              color={C.sageDark}
              onClick={() => { buildShoppingList(planRecipes); setView("shopping"); }}
            >
              🛒 Build shopping list from this plan
            </Btn>
          )}
        </>
      )}

      {/* ── SHOPPING VIEW ──────────────────────────────────────── */}
      {view === "shopping" && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 13, color: C.mid }}>
              {uncheckedCount > 0 ? `${uncheckedCount} items remaining` : shoppingList.length > 0 ? "All done! ✅" : "List is empty"}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {shoppingList.length > 0 && (
                <>
                  <button
                    onClick={() => {
                      const text = Object.entries(shoppingByCategory)
                        .map(([cat, items]) => `${cat}:\n${items.map(i => `• ${i.text}`).join("\n")}`)
                        .join("\n\n");
                      navigator.clipboard?.writeText(text).then(() => {
                        const btn = document.getElementById("cs-copy-btn");
                        if (btn) { btn.textContent = "Copied!"; setTimeout(() => { btn.textContent = "Copy"; }, 2000); }
                      });
                    }}
                    id="cs-copy-btn"
                    style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 20, padding: "4px 12px", fontSize: 12, color: C.sage, cursor: "pointer", fontFamily: "Georgia,serif", fontWeight: 700 }}
                  >
                    Copy
                  </button>
                  <button
                    onClick={clearShoppingList}
                    style={{ background: "none", border: "none", fontSize: 12, color: C.muted, cursor: "pointer" }}
                  >
                    Clear all
                  </button>
                </>
              )}
            </div>
          </div>

          {Object.entries(shoppingByCategory).map(([cat, items]) => (
            <Card key={cat}>
              <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 13, color: C.sageDark, marginBottom: 8 }}>
                {cat === "Produce & Fruit" ? "🥦" : cat === "Pantry" ? "🏺" : "💊"} {cat}
              </div>
              {items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => toggleShoppingItem(item.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 0",
                    borderBottom: `1px solid ${C.border}40`,
                    cursor: "pointer",
                  }}
                >
                  <div style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    border: `2px solid ${item.checked ? C.sage : C.border}`,
                    background: item.checked ? C.sage : "transparent",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    color: C.white,
                  }}>
                    {item.checked ? "✓" : ""}
                  </div>
                  <span style={{
                    fontSize: 13,
                    color: item.checked ? C.muted : C.charcoal,
                    textDecoration: item.checked ? "line-through" : "none",
                    lineHeight: 1.4,
                  }}>
                    {item.text}
                  </span>
                </div>
              ))}
            </Card>
          ))}

          {shoppingList.length === 0 && (
            <div style={{ textAlign: "center", color: C.muted, padding: "30px 0", fontSize: 13, lineHeight: 1.7 }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🛒</div>
              Plan your meals first, then generate your list.<br />Or add items manually below.
            </div>
          )}

          {/* Manual add */}
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newItem.trim()) {
                  addShoppingItem(newItem.trim());
                  setNewItem("");
                }
              }}
              placeholder="Add item manually…"
              style={{
                flex: 1,
                padding: "10px 16px",
                borderRadius: 30,
                border: `1.5px solid ${C.border}`,
                fontFamily: "Georgia,serif",
                fontSize: 13,
                outline: "none",
                background: C.mist,
              }}
            />
            <button
              onClick={() => { if (newItem.trim()) { addShoppingItem(newItem.trim()); setNewItem(""); } }}
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                border: "none",
                background: C.sageDark,
                color: C.white,
                fontSize: 20,
                cursor: "pointer",
              }}
            >
              +
            </button>
          </div>
        </>
      )}
    </div>
  );
}

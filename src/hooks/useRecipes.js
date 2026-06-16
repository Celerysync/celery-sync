import { useState, useCallback } from "react";
import { useLocalStorage } from "./useLocalStorage.js";

export function useRecipes() {
  const [savedIds, setSavedIds] = useLocalStorage("cs_savedRecipes", []);
  const [mealPlan, setMealPlan] = useLocalStorage("cs_mealPlan", {
    breakfast: null,
    lunch: null,
    dinner: null,
    snacks: [],
  });
  const [shoppingList, setShoppingList] = useLocalStorage("cs_shoppingList", []);

  const toggleSave = useCallback((id) => {
    setSavedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, [setSavedIds]);

  const isSaved = useCallback((id) => savedIds.includes(id), [savedIds]);

  const assignToSlot = useCallback((slot, recipe) => {
    setMealPlan((prev) => {
      if (slot === "snacks") {
        const already = prev.snacks || [];
        const exists = already.find((r) => r.id === recipe.id);
        return {
          ...prev,
          snacks: exists
            ? already.filter((r) => r.id !== recipe.id)
            : [...already, recipe],
        };
      }
      return { ...prev, [slot]: recipe };
    });
  }, [setMealPlan]);

  const clearSlot = useCallback((slot) => {
    setMealPlan((prev) => ({
      ...prev,
      [slot]: slot === "snacks" ? [] : null,
    }));
  }, [setMealPlan]);

  const buildShoppingList = useCallback((recipes) => {
    const allIngredients = recipes
      .filter(Boolean)
      .flatMap((r) => r.ingredients || []);

    const grouped = {
      produce: [],
      pantry: [],
      supplements: [],
      other: [],
    };

    const supplementKeywords = ["spirulina", "barley grass", "dulse", "blueberry powder", "tbsp", "tsp"];
    const produceKeywords = ["apple", "banana", "mango", "cucumber", "celery", "spinach",
      "asparagus", "lemon", "lime", "tomato", "potato", "zucchini", "lettuce",
      "watermelon", "melon", "papaya", "avocado", "ginger", "garlic", "onion",
      "leek", "carrot", "broccoli", "squash", "pumpkin", "mint", "cilantro",
      "parsley", "dill", "chives", "dates", "blueberries"];

    allIngredients.forEach((ing) => {
      const lower = ing.toLowerCase();
      if (supplementKeywords.some((k) => lower.includes(k))) {
        grouped.supplements.push(ing);
      } else if (produceKeywords.some((k) => lower.includes(k))) {
        grouped.produce.push(ing);
      } else {
        grouped.pantry.push(ing);
      }
    });

    // Deduplicate within each group
    Object.keys(grouped).forEach((key) => {
      grouped[key] = [...new Set(grouped[key])];
    });

    const list = [
      ...grouped.produce.map((i) => ({ text: i, category: "Produce & Fruit", checked: false, id: Math.random() })),
      ...grouped.pantry.map((i) => ({ text: i, category: "Pantry", checked: false, id: Math.random() })),
      ...grouped.supplements.map((i) => ({ text: i, category: "Supplements & Powders", checked: false, id: Math.random() })),
    ];

    setShoppingList(list);
  }, [setShoppingList]);

  const toggleShoppingItem = useCallback((id) => {
    setShoppingList((prev) =>
      prev.map((item) => item.id === id ? { ...item, checked: !item.checked } : item)
    );
  }, [setShoppingList]);

  const addShoppingItem = useCallback((text) => {
    setShoppingList((prev) => [
      ...prev,
      { text, category: "Other", checked: false, id: Math.random() },
    ]);
  }, [setShoppingList]);

  const clearShoppingList = useCallback(() => setShoppingList([]), [setShoppingList]);

  return {
    savedIds,
    mealPlan,
    shoppingList,
    toggleSave,
    isSaved,
    assignToSlot,
    clearSlot,
    buildShoppingList,
    toggleShoppingItem,
    addShoppingItem,
    clearShoppingList,
  };
}

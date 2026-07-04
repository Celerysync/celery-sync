import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase.js";

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export function useUserSupplements(profileId) {
  const [supplements, setSupplements] = useState([]);
  const [inventory, setInventory] = useState({}); // keyed by lowercase name
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profileId) { setLoading(false); return; }
    setLoading(true);

    const { data: existing } = await supabase
      .from("user_supplements")
      .select("id, name, dose_label, timing")
      .eq("profile_id", profileId)
      .order("created_at", { ascending: true });

    // One-time migration: if this profile has never synced supplements to
    // Supabase but has a local list, upload it so it's no longer device-only.
    if (!existing?.length) {
      let local = [];
      try { local = JSON.parse(localStorage.getItem("cs_custom_supps") || "[]"); } catch { local = []; }
      if (local.length) {
        const rows = local.map((s) => {
          const match = s.label.match(/^(.*?)(?:\s*\(([^)]+)\))?$/);
          return {
            profile_id: profileId,
            name: (match?.[1] || s.label).trim(),
            dose_label: match?.[2] || null,
            timing: s.timing || "morning_food",
          };
        });
        const { data: inserted } = await supabase.from("user_supplements").insert(rows).select("id, name, dose_label, timing");
        setSupplements(inserted || []);
        setLoading(false);
        return;
      }
    }

    setSupplements(existing || []);

    const { data: inv } = await supabase
      .from("supplement_inventory")
      .select("*")
      .eq("profile_id", profileId);
    const byName = {};
    for (const row of inv || []) byName[row.supplement_name.toLowerCase()] = row;
    setInventory(byName);
    setLoading(false);
  }, [profileId]);

  useEffect(() => { load(); }, [load]);

  const addSupplement = useCallback(async (name, doseLabel, timing) => {
    if (!profileId) return null;
    const { data } = await supabase
      .from("user_supplements")
      .insert({ profile_id: profileId, name: name.trim(), dose_label: doseLabel?.trim() || null, timing })
      .select("id, name, dose_label, timing")
      .single();
    if (data) setSupplements((prev) => [...prev, data]);
    return data;
  }, [profileId]);

  const removeSupplement = useCallback(async (id) => {
    if (!profileId) return;
    await supabase.from("user_supplements").delete().eq("id", id);
    setSupplements((prev) => prev.filter((s) => s.id !== id));
  }, [profileId]);

  // Doses/day for a given name = how many schedule rows share it (e.g. zinc at
  // morning + midday = 2/day). This is what "the app already knows from the
  // schedule" means — never stored redundantly.
  const dosesPerDayFor = useCallback((name) => {
    const lower = name.toLowerCase();
    return supplements.filter((s) => s.name.toLowerCase() === lower).length;
  }, [supplements]);

  const inventoryFor = useCallback((name) => inventory[name.toLowerCase()] || null, [inventory]);

  const setInventoryFor = useCallback(async (name, { unitsOnHand, unitsPerDose, restockThresholdDays }) => {
    if (!profileId) return;
    const row = {
      profile_id: profileId,
      supplement_name: name,
      units_on_hand: unitsOnHand,
      units_per_dose: unitsPerDose ?? 1,
      restock_threshold_days: restockThresholdDays ?? 7,
      low_stock_alerted_on: null, // any manual edit clears the alert flag so it can re-trigger later
      updated_at: new Date().toISOString(),
    };
    const { data } = await supabase
      .from("supplement_inventory")
      .upsert(row, { onConflict: "profile_id,supplement_name" })
      .select()
      .single();
    if (data) setInventory((prev) => ({ ...prev, [name.toLowerCase()]: data }));
  }, [profileId]);

  // Called when a dose is checked/unchecked — adjusts units_on_hand if this
  // supplement has tracking enabled. No-ops silently if it doesn't (rule: optional).
  const adjustStockOnDoseChange = useCallback(async (name, taken) => {
    const row = inventoryFor(name);
    if (!row || row.units_on_hand == null) return;
    const delta = (taken ? -1 : 1) * (row.units_per_dose || 1);
    const nextUnits = Math.max(0, row.units_on_hand + delta);
    const { data } = await supabase
      .from("supplement_inventory")
      .update({ units_on_hand: nextUnits, updated_at: new Date().toISOString() })
      .eq("profile_id", profileId)
      .eq("supplement_name", name)
      .select()
      .single();
    if (data) setInventory((prev) => ({ ...prev, [name.toLowerCase()]: data }));
  }, [profileId, inventoryFor]);

  // Days remaining + projected run-out date for display — pure arithmetic.
  const runOutInfoFor = useCallback((name) => {
    const row = inventoryFor(name);
    if (!row || row.units_on_hand == null) return null;
    const dosesPerDay = dosesPerDayFor(name);
    if (!dosesPerDay) return null;
    const dailyUse = (row.units_per_dose || 1) * dosesPerDay;
    if (!dailyUse) return null;
    const daysRemaining = Math.floor(row.units_on_hand / dailyUse);
    const runOutDate = new Date();
    runOutDate.setDate(runOutDate.getDate() + daysRemaining);
    return { daysRemaining, runOutDate, unitsOnHand: row.units_on_hand, unitsPerDose: row.units_per_dose, restockThresholdDays: row.restock_threshold_days };
  }, [inventoryFor, dosesPerDayFor]);

  return {
    supplements, loading, addSupplement, removeSupplement,
    inventoryFor, setInventoryFor, adjustStockOnDoseChange, runOutInfoFor, dosesPerDayFor,
    reload: load,
  };
}

export { todayStr };

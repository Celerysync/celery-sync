import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";
import { KITCHEN_CHANGED_EVENT, normalizeRecipe } from "../lib/kitchen.js";
import { announceActivity } from "../lib/appActivity.js";

const COLUMNS = "id, kind, name, ingredients, steps, notes, tags, favourite, photo_path, created_via, created_at, updated_at";
const cacheKey = (profileId) => `cs_kitchen_${profileId}`;

// The person's Kitchen. A copy is kept on the phone so recipes still open
// without signal (in the kitchen, at the shops).
export function useKitchen(profileId) {
  const [recipes, setRecipes] = useState(() => {
    try { return JSON.parse(localStorage.getItem(cacheKey(profileId)) || "[]"); } catch { return []; }
  });
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(() => typeof navigator !== "undefined" && navigator.onLine === false);

  const load = useCallback(async () => {
    if (!profileId) { setLoading(false); return; }
    // No signal: show the phone's copy straight away rather than waiting on
    // a request that can't go anywhere.
    if (navigator.onLine === false) { setOffline(true); setLoading(false); return; }
    const { data, error } = await supabase.from("kitchen_items").select(COLUMNS)
      .eq("profile_id", profileId).order("favourite", { ascending: false }).order("name");
    if (error) { setOffline(true); setLoading(false); return; }
    setRecipes(data || []);
    setOffline(false);
    setLoading(false);
    try { localStorage.setItem(cacheKey(profileId), JSON.stringify(data || [])); } catch { /* full */ }
  }, [profileId]);

  useEffect(() => {
    load();
    const wentOffline = () => setOffline(true);
    window.addEventListener(KITCHEN_CHANGED_EVENT, load);
    window.addEventListener("online", load);
    window.addEventListener("offline", wentOffline);
    return () => {
      window.removeEventListener(KITCHEN_CHANGED_EVENT, load);
      window.removeEventListener("online", load);
      window.removeEventListener("offline", wentOffline);
    };
  }, [load]);

  const changed = () => window.dispatchEvent(new Event(KITCHEN_CHANGED_EVENT));

  const save = useCallback(async (raw, { id = null, via = "tap" } = {}) => {
    const r = normalizeRecipe(raw);
    if (!r.name) throw new Error("Please give it a name.");
    const clash = recipes.find((x) => x.name.toLowerCase() === r.name.toLowerCase() && x.id !== id);
    if (clash) throw new Error(`You already have a recipe called "${r.name}". Choose another name, or edit that one.`);
    const row = { ...r, favourite: !!raw.favourite, updated_at: new Date().toISOString() };
    const { data, error } = id
      ? await supabase.from("kitchen_items").update(row).eq("id", id).select(COLUMNS).single()
      : await supabase.from("kitchen_items").insert({ ...row, profile_id: profileId, created_via: via }).select(COLUMNS).single();
    if (error) throw new Error("That didn't save. Please try again.");
    announceActivity(`${id ? "updated" : "saved"} the recipe "${data.name}" in their Kitchen`);
    changed();
    return data;
  }, [profileId, recipes]);

  const remove = useCallback(async (id) => {
    const gone = recipes.find((r) => r.id === id);
    if (gone?.photo_path) await supabase.storage.from("kitchen-photos").remove([gone.photo_path]);
    const { error } = await supabase.from("kitchen_items").delete().eq("id", id);
    if (error) throw new Error("That didn't delete. Please try again.");
    changed();
  }, [recipes]);

  const toggleFavourite = useCallback(async (recipe) => {
    setRecipes((prev) => prev.map((r) => (r.id === recipe.id ? { ...r, favourite: !r.favourite } : r)));
    await supabase.from("kitchen_items").update({ favourite: !recipe.favourite }).eq("id", recipe.id);
    changed();
  }, []);

  // Their own photo of the finished dish: shrunk on the phone, stored in their
  // private folder, shown with a short-lived link.
  const setPhoto = useCallback(async (recipe, file) => {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) throw new Error("Please sign in again.");
    // Shrunk on the phone when it can; otherwise the original, if it's a
    // kind and size the store takes.
    let blob = await shrinkImage(file).catch(() => null);
    let type = "image/jpeg";
    if (!blob) {
      if (!PHOTO_TYPES.includes(file.type) || file.size > 5 * 1024 * 1024) {
        throw new Error("That photo couldn't be used. Please try another one, or take a new photo.");
      }
      blob = file; type = file.type;
    }
    const ext = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic" }[type];
    const path = `${userId}/${recipe.id}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("kitchen-photos").upload(path, blob, { contentType: type });
    if (error) throw new Error("The photo didn't upload. Please try again.");
    if (recipe.photo_path) await supabase.storage.from("kitchen-photos").remove([recipe.photo_path]);
    await supabase.from("kitchen_items").update({ photo_path: path }).eq("id", recipe.id);
    changed();
  }, []);

  return { recipes, loading, offline, reload: load, save, remove, toggleFavourite, setPhoto };
}

const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];

const signed = new Map(); // path → { url, until }
export async function photoUrl(path) {
  if (!path) return null;
  const hit = signed.get(path);
  if (hit && hit.until > Date.now()) return hit.url;
  const { data } = await supabase.storage.from("kitchen-photos").createSignedUrl(path, 3600);
  if (data?.signedUrl) signed.set(path, { url: data.signedUrl, until: Date.now() + 50 * 60_000 });
  return data?.signedUrl || null;
}

async function shrinkImage(file, max = 1600) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't read that photo."))), "image/jpeg", 0.85));
}

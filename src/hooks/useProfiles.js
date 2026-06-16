import { useState, useCallback } from "react";
import { supabase } from "../lib/supabase.js";
import { useLocalStorage } from "./useLocalStorage.js";

export const AVATAR_OPTIONS = ["🌿","🌸","🌺","💫","🌙","☀️","🦋","🌻","🍃","💚","🌈","⭐"];

export function useProfiles(authUser) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeProfileId, setActiveProfileId] = useLocalStorage("cs_activeProfileId", null);

  const activeProfile = profiles.find((p) => p.id === activeProfileId) ?? profiles[0] ?? null;

  const _createInDb = useCallback(async (payload) => {
    const { data, error } = await supabase
      .from("profiles")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  }, []);

  const loadProfiles = useCallback(async () => {
    if (!authUser?.id) { setLoading(false); return; }
    try {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", authUser.id)
        .order("created_at", { ascending: true });

      if (!data || data.length === 0) {
        // Migrate from localStorage cs_user if it exists
        const localUser = (() => {
          try { return JSON.parse(localStorage.getItem("cs_user")); } catch { return null; }
        })();
        const payload = {
          user_id: authUser.id,
          name: localUser?.name || "Me",
          symptoms: localUser?.symptoms || [],
          goal: localUser?.goal || "",
          avatar_emoji: "🌿",
        };
        const created = await _createInDb(payload);
        setProfiles([created]);
        setActiveProfileId(created.id);
      } else {
        setProfiles(data);
        // Ensure activeProfileId points to a real profile
        if (!activeProfileId || !data.find((p) => p.id === activeProfileId)) {
          setActiveProfileId(data[0].id);
        }
      }
    } catch (e) {
      console.warn("Load profiles:", e.message);
    }
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.id]);

  const createProfile = useCallback(async ({ name, symptoms = [], goal = "", avatar_emoji = "🌿" }) => {
    const created = await _createInDb({
      user_id: authUser.id,
      name, symptoms, goal, avatar_emoji,
    });
    setProfiles((prev) => [...prev, created]);
    return created;
  }, [authUser?.id, _createInDb]);

  const updateProfile = useCallback(async (id, updates) => {
    const { data } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (data) setProfiles((prev) => prev.map((p) => p.id === id ? data : p));
  }, []);

  const deleteProfile = useCallback(async (id) => {
    await supabase.from("profiles").delete().eq("id", id);
    setProfiles((prev) => {
      const remaining = prev.filter((p) => p.id !== id);
      if (activeProfileId === id && remaining.length > 0) {
        setActiveProfileId(remaining[0].id);
      }
      return remaining;
    });
  }, [activeProfileId, setActiveProfileId]);

  const switchProfile = useCallback((id) => setActiveProfileId(id), [setActiveProfileId]);

  return {
    profiles,
    activeProfile,
    activeProfileId,
    profilesLoading: loading,
    loadProfiles,
    createProfile,
    updateProfile,
    deleteProfile,
    switchProfile,
  };
}

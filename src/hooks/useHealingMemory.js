import { useState, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase.js";
import { callClaude } from "../lib/api.js";

export function useHealingMemory(authUser, profileId) {
  const [healingProfile, setHealingProfile] = useState(null);
  const [priorMessages, setPriorMessages] = useState([]);
  const [memoryLoading, setMemoryLoading] = useState(true);
  const exchangeCountRef = useRef(0);

  const loadMemory = useCallback(async () => {
    if (!authUser?.id || !profileId) {
      setMemoryLoading(false);
      return;
    }
    try {
      const [{ data: profile }, { data: msgs }] = await Promise.all([
        supabase
          .from("healing_profiles")
          .select("*")
          .eq("profile_id", profileId)
          .maybeSingle(),
        supabase
          .from("conversations")
          .select("role, content, created_at")
          .eq("profile_id", profileId)
          .order("created_at", { ascending: false })
          .limit(24),
      ]);
      if (profile) setHealingProfile(profile);
      if (msgs) setPriorMessages([...msgs].reverse());
    } catch (e) {
      // Non-fatal — app works without memory
      console.warn("Memory load:", e.message);
    }
    setMemoryLoading(false);
  }, [authUser?.id]);

  const saveExchange = useCallback(
    async (userMsg, assistantMsg) => {
      if (!authUser?.id || !profileId) return;
      try {
        await supabase.from("conversations").insert([
          { user_id: authUser.id, profile_id: profileId, role: "user", content: userMsg },
          { user_id: authUser.id, profile_id: profileId, role: "assistant", content: assistantMsg },
        ]);
        exchangeCountRef.current += 1;
        // Every 4 exchanges, regenerate the healing summary
        if (exchangeCountRef.current % 4 === 0) {
          refreshHealingSummary(authUser.id);
        }
      } catch (e) {
        console.warn("Save exchange:", e.message);
      }
    },
    [authUser?.id]
  );

  const refreshHealingSummary = useCallback(async (userId) => {
    if (!profileId) return;
    try {
      const { data: recent } = await supabase
        .from("conversations")
        .select("role, content")
        .eq("profile_id", profileId)
        .order("created_at", { ascending: false })
        .limit(30);

      if (!recent?.length) return;

      const transcript = [...recent]
        .reverse()
        .map((m) => `${m.role === "user" ? "User" : "Guide"}: ${m.content}`)
        .join("\n");

      const summary = await callClaude({
        tier: 'quick',
        maxTokens: 350,
        messages: [
          {
            role: "user",
            content: `Extract a concise healing profile summary (150 words max) from this Medical Medium conversation. Capture: the user's main conditions, supplements they're currently taking or interested in, any healing wins mentioned, challenges, emotional state, and anything a healer would want to remember for next session. Write as flowing notes, not bullet points.

Conversation:
${transcript}`,
          },
        ],
      });

      const updated = {
        profile_id: profileId,
        healing_summary: summary,
        updated_at: new Date().toISOString(),
      };

      await supabase
        .from("healing_profiles")
        .upsert(updated, { onConflict: "profile_id" });

      setHealingProfile((p) => ({ ...p, ...updated }));
    } catch (e) {
      console.warn("Summary refresh:", e.message);
    }
  }, []);

  const clearMemory = useCallback(async () => {
    if (!profileId) return;
    await Promise.all([
      supabase.from("conversations").delete().eq("profile_id", profileId),
      supabase.from("healing_profiles").delete().eq("profile_id", profileId),
    ]);
    setHealingProfile(null);
    setPriorMessages([]);
    exchangeCountRef.current = 0;
  }, [authUser?.id]);

  return {
    healingProfile,
    priorMessages,
    memoryLoading,
    loadMemory,
    saveExchange,
    clearMemory,
  };
}

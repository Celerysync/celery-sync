import { useState, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase.js";
import { callClaude } from "../lib/api.js";

export function useHealingMemory(authUser, profileId) {
  const [healingProfile, setHealingProfile] = useState(null);
  const [priorMessages, setPriorMessages] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [memoryLoading, setMemoryLoading] = useState(true);
  const exchangeCountRef = useRef(0);

  const loadMemory = useCallback(async () => {
    if (!authUser?.id || !profileId) {
      setMemoryLoading(false);
      return;
    }
    try {
      const [{ data: profile }, { data: msgs }, { data: stones }] = await Promise.all([
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
        supabase
          .from("healing_milestones")
          .select("insight, category, session_date")
          .eq("profile_id", profileId)
          .order("created_at", { ascending: false })
          .limit(40),
      ]);
      if (profile) setHealingProfile(profile);
      if (msgs) setPriorMessages([...msgs].reverse());
      if (stones) setMilestones([...stones].reverse());
    } catch (e) {
      console.warn("Memory load:", e.message);
    }
    setMemoryLoading(false);
  }, [authUser?.id, profileId]);

  const saveExchange = useCallback(
    async (userMsg, assistantMsg) => {
      if (!authUser?.id || !profileId) return;
      try {
        await supabase.from("conversations").insert([
          { user_id: authUser.id, profile_id: profileId, role: "user", content: userMsg },
          { user_id: authUser.id, profile_id: profileId, role: "assistant", content: assistantMsg },
        ]);
        exchangeCountRef.current += 1;

        // Extract milestones from every exchange (fire-and-forget)
        extractMilestones(userMsg, assistantMsg);

        // Every 4 exchanges, regenerate the rolling healing summary
        if (exchangeCountRef.current % 4 === 0) {
          refreshHealingSummary();
        }
      } catch (e) {
        console.warn("Save exchange:", e.message);
      }
    },
    [authUser?.id, profileId]
  );

  const extractMilestones = useCallback(async (userMsg, assistantMsg) => {
    if (!authUser?.id || !profileId) return;
    try {
      await fetch("/api/memory/milestone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: authUser.id,
          profileId,
          userMsg,
          assistantMsg,
        }),
      });
    } catch (e) {
      // Non-fatal — silently skip
    }
  }, [authUser?.id, profileId]);

  const refreshHealingSummary = useCallback(async () => {
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
        tier: "quick",
        maxTokens: 400,
        messages: [{
          role: "user",
          content: `Extract a concise healing profile summary (200 words max) from this Medical Medium conversation.
Capture: main conditions, supplements currently taking with doses, recent healing wins, current challenges, emotional state, patterns noticed, and anything a healer would want to remember for the next session.
Write as warm flowing notes, not bullet points. Start with their name if mentioned.

Conversation:
${transcript}`,
        }],
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
  }, [profileId]);

  const clearMemory = useCallback(async () => {
    if (!profileId) return;
    await Promise.all([
      supabase.from("conversations").delete().eq("profile_id", profileId),
      supabase.from("healing_profiles").delete().eq("profile_id", profileId),
      supabase.from("healing_milestones").delete().eq("profile_id", profileId),
    ]);
    setHealingProfile(null);
    setPriorMessages([]);
    setMilestones([]);
    exchangeCountRef.current = 0;
  }, [profileId]);

  return {
    healingProfile,
    priorMessages,
    milestones,
    memoryLoading,
    loadMemory,
    saveExchange,
    clearMemory,
  };
}

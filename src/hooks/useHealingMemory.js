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
      const [{ data: recent }, { data: currentProfile }] = await Promise.all([
        supabase
          .from("conversations")
          .select("role, content")
          .eq("profile_id", profileId)
          .order("created_at", { ascending: false })
          .limit(30),
        supabase
          .from("healing_profiles")
          .select("healing_summary, hard_times, current_focus, wins, preferences")
          .eq("profile_id", profileId)
          .maybeSingle(),
      ]);

      if (!recent?.length) return;

      const transcript = [...recent]
        .reverse()
        .map((m) => `${m.role === "user" ? "User" : "Guide"}: ${m.content}`)
        .join("\n");

      const existing = currentProfile || {};
      const prefStr = existing.preferences
        ? JSON.stringify(existing.preferences)
        : '{"prefers":[],"avoids":[]}';

      const raw = await callClaude({
        tier: "quick",
        maxTokens: 500,
        messages: [{
          role: "user",
          content: `You update the memory of a personal wellness companion.
Use ONLY what this person has explicitly reported about themselves — never infer, diagnose, or add anything they did not say.

CURRENT MEMORY:
Rolling summary: ${existing.healing_summary || "(none yet)"}
Hard times of day: ${existing.hard_times || "(none yet)"}
Current focus: ${existing.current_focus || "(none yet)"}
Wins: ${existing.wins || "(none yet)"}
Preferences: ${prefStr}

RECENT CONVERSATION:
${transcript}

Return ONLY valid JSON, no preamble, no explanation:
{
  "healing_summary": "Warm flowing notes, 150 words max. Their name if known. What they are working on, how they have been feeling, key patterns a caring companion would want to remember.",
  "hard_times": "Times of day or situations they regularly find hard. Plain text, 50 words max. Merge new with existing — do not discard.",
  "current_focus": "Their current cleanse, protocol, or goal. 30 words max. Replace only if they mentioned a change.",
  "wins": "Their 3–5 most recent positive moments or improvements. 70 words max. Keep most recent, drop oldest when full.",
  "preferences": {"prefers": [], "avoids": []}
}

Rules:
• Capture only what the user reported — no inferred conditions or diagnoses.
• Never use heal / cure / treat / diagnose / prescribe language.
• If a field has no new information, return the existing value unchanged.
• Merge carefully — new information adds to, does not erase, existing memory.
• If the conversation is purely small talk, return all existing values unchanged.`,
        }],
      });

      let parsed;
      try {
        const jsonMatch = raw?.match(/\{[\s\S]*\}/);
        parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      } catch {
        parsed = null;
      }

      if (!parsed) return;

      const updated = {
        profile_id: profileId,
        healing_summary: parsed.healing_summary || existing.healing_summary,
        hard_times: parsed.hard_times || existing.hard_times,
        current_focus: parsed.current_focus || existing.current_focus,
        wins: parsed.wins || existing.wins,
        preferences: parsed.preferences || existing.preferences || { prefers: [], avoids: [] },
        memory_updated_at: new Date().toISOString(),
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

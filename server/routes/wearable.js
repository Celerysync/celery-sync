import { Router } from "express";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const router = Router();

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Save or update Oura personal access token for a user
router.post("/oura/token", async (req, res) => {
  const { userId, token } = req.body;
  if (!userId || !token) return res.status(400).json({ error: "userId and token required" });

  // Validate token against Oura API before saving
  const test = await fetch("https://api.ouraring.com/v2/usercollection/personal_info", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!test.ok) return res.status(400).json({ error: "Invalid Oura token — please check and try again" });

  const { error } = await supabaseAdmin.from("wearable_tokens").upsert(
    { user_id: userId, source: "oura", token },
    { onConflict: "user_id,source" }
  );
  if (error) return res.status(500).json({ error: error.message });

  res.json({ ok: true });
});

// Remove Oura token
router.delete("/oura/token", async (req, res) => {
  const { userId } = req.body;
  await supabaseAdmin.from("wearable_tokens").delete().eq("user_id", userId).eq("source", "oura");
  res.json({ ok: true });
});

// Sync last N days of Oura data into daily_checkins
async function syncOuraForUser(userId, token, days = 7) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  const fmt = (d) => d.toISOString().split("T")[0];

  const headers = { Authorization: `Bearer ${token}` };

  const [sleepRes, readinessRes] = await Promise.all([
    fetch(`https://api.ouraring.com/v2/usercollection/daily_sleep?start_date=${fmt(start)}&end_date=${fmt(end)}`, { headers }),
    fetch(`https://api.ouraring.com/v2/usercollection/daily_readiness?start_date=${fmt(start)}&end_date=${fmt(end)}`, { headers }),
  ]);

  if (!sleepRes.ok || !readinessRes.ok) throw new Error("Oura API error");

  const sleepData = await sleepRes.json();
  const readinessData = await readinessRes.json();

  // Build date-keyed maps
  const sleepByDate = {};
  for (const item of (sleepData.data || [])) {
    sleepByDate[item.day] = item;
  }
  const readinessByDate = {};
  for (const item of (readinessData.data || [])) {
    readinessByDate[item.day] = item;
  }

  const allDates = new Set([...Object.keys(sleepByDate), ...Object.keys(readinessByDate)]);
  const upserts = [];

  for (const date of allDates) {
    const sleep = sleepByDate[date];
    const readiness = readinessByDate[date];

    const row = {
      user_id: userId,
      check_date: date,
      wearable_source: "oura",
    };
    if (sleep) {
      if (sleep.total_sleep_duration) row.sleep_hours = Math.round((sleep.total_sleep_duration / 3600) * 10) / 10;
      if (sleep.score) row.sleep_score = sleep.score;
      if (sleep.average_hrv) row.hrv = Math.round(sleep.average_hrv);
      // Map sleep score → quality 1-5
      if (sleep.score) row.sleep_quality = sleep.score >= 85 ? 5 : sleep.score >= 70 ? 4 : sleep.score >= 55 ? 3 : sleep.score >= 40 ? 2 : 1;
    }
    if (readiness?.resting_heart_rate) row.resting_hr = readiness.resting_heart_rate;

    upserts.push(row);
  }

  if (upserts.length > 0) {
    const { error } = await supabaseAdmin
      .from("daily_checkins")
      .upsert(upserts, { onConflict: "profile_id,check_date", ignoreDuplicates: false });
    // Note: profile_id is not set here — Oura sync updates existing checkins by user_id+check_date
    // We use a separate upsert path that only updates wearable columns
    if (error) {
      // Fallback: update each row individually to preserve existing user data
      for (const row of upserts) {
        await supabaseAdmin
          .from("daily_checkins")
          .update({
            sleep_hours: row.sleep_hours,
            sleep_quality: row.sleep_quality,
            sleep_score: row.sleep_score,
            hrv: row.hrv,
            resting_hr: row.resting_hr,
            wearable_source: "oura",
          })
          .eq("user_id", userId)
          .eq("check_date", row.check_date);
      }
    }
  }

  // Update last_sync timestamp
  await supabaseAdmin
    .from("wearable_tokens")
    .update({ last_sync: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("source", "oura");

  return upserts.length;
}

// Manual sync triggered by user
router.post("/oura/sync", async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "userId required" });

  const { data: tokenRow } = await supabaseAdmin
    .from("wearable_tokens")
    .select("token")
    .eq("user_id", userId)
    .eq("source", "oura")
    .single();

  if (!tokenRow) return res.status(404).json({ error: "No Oura token saved" });

  try {
    const count = await syncOuraForUser(userId, tokenRow.token, 14);
    res.json({ ok: true, days: count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get wearable connection status
router.get("/status/:userId", async (req, res) => {
  const { userId } = req.params;
  const { data } = await supabaseAdmin
    .from("wearable_tokens")
    .select("source, last_sync, created_at")
    .eq("user_id", userId);
  res.json({ tokens: data || [] });
});

// ── Apple Health via iOS Shortcuts ──────────────────────────────────────────
// Apple exposes no cloud API for Health data — a native app is the only
// official path. Instead, a personal iOS Shortcut automation reads last
// night's sleep and POSTs it here daily. Auth is a per-user random ingest
// token (NOT the Supabase user id, which appears in client URLs and must
// never be a write credential on an unauthenticated endpoint).

// Create (or return the existing) ingest token for this user
router.post("/shortcut/token", async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "userId required" });

  const { data: existing } = await supabaseAdmin
    .from("wearable_tokens")
    .select("token")
    .eq("user_id", userId)
    .eq("source", "shortcut")
    .maybeSingle();
  if (existing?.token) return res.json({ token: existing.token });

  const token = crypto.randomBytes(24).toString("hex");
  const { error } = await supabaseAdmin.from("wearable_tokens").upsert(
    { user_id: userId, source: "shortcut", token },
    { onConflict: "user_id,source" }
  );
  if (error) return res.status(500).json({ error: error.message });
  res.json({ token });
});

// Called by the user's iOS Shortcut — token authenticates, fields optional.
// The Shortcut recipe sends its own local date (yyyy-MM-dd) because this
// server runs in UTC and an Australian morning is still "yesterday" here.
router.post("/shortcut/ingest", async (req, res) => {
  const { token, date, sleep_hours, hrv, resting_hr } = req.body || {};
  if (!token) return res.status(401).json({ error: "Missing token" });

  const { data: tokenRow } = await supabaseAdmin
    .from("wearable_tokens")
    .select("user_id")
    .eq("source", "shortcut")
    .eq("token", String(token))
    .maybeSingle();
  if (!tokenRow) return res.status(401).json({ error: "Unknown token" });

  const userId = tokenRow.user_id;
  const checkDate = /^\d{4}-\d{2}-\d{2}$/.test(String(date || "")) ? date : new Date().toISOString().split("T")[0];

  // Only columns daily_checkins actually has — no steps/readiness/updated_at
  // (setting phantom columns is what silently broke manual entry for months).
  const row = { wearable_source: "apple_health" };
  const sleepNum = parseFloat(sleep_hours);
  if (Number.isFinite(sleepNum) && sleepNum > 0 && sleepNum <= 24) {
    row.sleep_hours = Math.round(sleepNum * 10) / 10;
    row.sleep_quality = sleepNum >= 8 ? 5 : sleepNum >= 7 ? 4 : sleepNum >= 6 ? 3 : sleepNum >= 5 ? 2 : 1;
  }
  if (Number.isFinite(parseInt(hrv))) row.hrv = parseInt(hrv);
  if (Number.isFinite(parseInt(resting_hr))) row.resting_hr = parseInt(resting_hr);
  if (Object.keys(row).length <= 1) return res.status(400).json({ error: "No usable metrics in payload" });

  const { data: updated, error } = await supabaseAdmin
    .from("daily_checkins")
    .update(row)
    .eq("user_id", userId)
    .eq("check_date", checkDate)
    .select("id");
  if (error) return res.status(500).json({ error: error.message });
  if (!updated?.length) {
    // New row needs a profile_id or the app's per-profile queries never see
    // it — use the user's original (oldest) profile.
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    const { error: insertErr } = await supabaseAdmin
      .from("daily_checkins")
      .insert({ user_id: userId, profile_id: profile?.id ?? null, check_date: checkDate, ...row });
    if (insertErr) return res.status(500).json({ error: insertErr.message });
  }

  await supabaseAdmin
    .from("wearable_tokens")
    .update({ last_sync: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("source", "shortcut");

  res.json({ ok: true, date: checkDate, saved: Object.keys(row).filter((k) => !["wearable_source", "updated_at"].includes(k)) });
});

// Manual wearable data entry — Garmin, Whoop, Fitbit, Samsung etc.
// 2026-07-19 fix: this wrote columns daily_checkins doesn't have
// (updated_at, steps, readiness_score), so EVERY manual save 500'd — and the
// "no row yet" fallback relied on the update erroring, so it never inserted
// either. Now writes real columns only, detects the missing row properly,
// and attaches new rows to the user's original profile so the UI sees them.
router.post("/manual", async (req, res) => {
  const { userId, date, source, sleep_hours, sleep_quality, hrv, resting_hr } = req.body;
  if (!userId || !date) return res.status(400).json({ error: "userId and date required" });
  const row = { wearable_source: source || "manual" };
  if (sleep_hours != null && sleep_hours !== "") row.sleep_hours = parseFloat(sleep_hours);
  if (sleep_quality != null && sleep_quality !== "") row.sleep_quality = parseInt(sleep_quality);
  if (hrv != null && hrv !== "") row.hrv = parseInt(hrv);
  if (resting_hr != null && resting_hr !== "") row.resting_hr = parseInt(resting_hr);
  if (Object.keys(row).length <= 1) return res.status(400).json({ error: "Enter at least one number to save" });

  const { data: updated, error } = await supabaseAdmin
    .from("daily_checkins")
    .update(row)
    .eq("user_id", userId)
    .eq("check_date", date)
    .select("id");
  if (error) return res.status(500).json({ error: error.message });
  if (!updated?.length) {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    const { error: insertErr } = await supabaseAdmin
      .from("daily_checkins")
      .insert({ user_id: userId, profile_id: profile?.id ?? null, check_date: date, ...row });
    if (insertErr) return res.status(500).json({ error: insertErr.message });
  }
  res.json({ ok: true });
});

// Called by cron — sync all users with Oura tokens
export async function syncAllOuraUsers() {
  const { data: tokens } = await supabaseAdmin
    .from("wearable_tokens")
    .select("user_id, token")
    .eq("source", "oura");

  if (!tokens?.length) return;

  for (const { user_id, token } of tokens) {
    try {
      await syncOuraForUser(user_id, token, 3);
    } catch (err) {
      console.warn(`Oura sync failed for ${user_id}:`, err.message);
    }
  }
  console.log(`🔗 Oura synced ${tokens.length} users`);
}

export default router;

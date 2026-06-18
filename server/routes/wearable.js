import { Router } from "express";
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

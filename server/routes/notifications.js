import express from "express";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    "mailto:hello@celerysync.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// Save push subscription
router.post("/subscribe", async (req, res) => {
  const { userId, subscription, timezone, morningStartHour } = req.body;
  if (!userId || !subscription?.endpoint) return res.status(400).json({ error: "Missing data" });

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      timezone: timezone || "UTC",
      morning_start_hour: morningStartHour ?? 6,
    },
    { onConflict: "user_id,endpoint" }
  );
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// Update notification preferences (morning start time, etc.)
router.post("/preferences", async (req, res) => {
  const { userId, morningStartHour } = req.body;
  if (!userId) return res.status(400).json({ error: "Missing userId" });
  const { error } = await supabase.from("push_subscriptions")
    .update({ morning_start_hour: morningStartHour ?? 6 })
    .eq("user_id", userId);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

const DEFAULT_REMINDER_PREFS = { morningProtocol: true, adrenalSnack: true };

// Read current reminder toggle prefs (morningProtocol/adrenalSnack push categories)
router.get("/reminder-preferences", async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: "Missing userId" });
  const { data } = await supabase
    .from("push_subscriptions")
    .select("reminder_prefs")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  res.json({ reminderPrefs: data?.reminder_prefs || DEFAULT_REMINDER_PREFS });
});

// Update reminder toggle prefs — makes the Settings toggles actually control
// the server-side pushes, not just the client-side in-app banners.
router.post("/reminder-preferences", async (req, res) => {
  const { userId, reminderPrefs } = req.body;
  if (!userId || !reminderPrefs) return res.status(400).json({ error: "Missing data" });
  const { error } = await supabase.from("push_subscriptions")
    .update({ reminder_prefs: reminderPrefs })
    .eq("user_id", userId);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// Remove push subscription
router.post("/unsubscribe", async (req, res) => {
  const { userId, endpoint } = req.body;
  if (!userId || !endpoint) return res.status(400).json({ error: "Missing data" });
  await supabase.from("push_subscriptions").delete()
    .eq("user_id", userId).eq("endpoint", endpoint);
  res.json({ ok: true });
});

// Send an immediate test push to one user — lets them verify delivery works
router.post("/test", async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "Missing userId" });
  const { data: subs } = await supabase.from("push_subscriptions").select("*").eq("user_id", userId);
  if (!subs?.length) return res.status(404).json({ error: "No subscription found for this user" });

  const payload = JSON.stringify({
    title: "🌿 Test notification",
    body: "If you can see this, background notifications are working!",
    tag: "test-push",
  });
  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload).catch(async (err) => {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        }
        throw err;
      })
    )
  );
  const sent = results.filter((r) => r.status === "fulfilled").length;
  if (sent === 0) {
    const firstError = results.find((r) => r.status === "rejected")?.reason?.message || "Unknown error";
    return res.status(500).json({ error: firstError });
  }
  res.json({ ok: true, sent });
});

// Internal: send a push to all matching subscriptions
export async function sendPushToAll({ title, body, tag, url }) {
  const { data: subs } = await supabase.from("push_subscriptions").select("*");
  if (!subs?.length) return;
  const payload = JSON.stringify({ title, body, tag, url });
  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        payload
      ).catch(async (err) => {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        }
        throw err;
      })
    )
  );
  const sent = results.filter((r) => r.status === "fulfilled").length;
  console.log(`Push "${title}": sent ${sent}/${subs.length}`);
  return sent;
}

// Internal: send to users whose adjusted local hour matches (respects per-user morning start time)
// Maps a PUSH_SCHEDULE tag to the reminder_prefs category it's gated by.
// Tags not listed here (e.g. "evening") aren't gated by any toggle.
function reminderCategoryForTag(tag) {
  if (tag?.startsWith("morning-")) return "morningProtocol";
  if (tag?.startsWith("snack-")) return "adrenalSnack";
  return null;
}

export async function sendToUsersAtLocalHour({ hour, title, body, tag, url }) {
  const { data: subs } = await supabase.from("push_subscriptions").select("*");
  if (!subs?.length) return;

  const category = reminderCategoryForTag(tag);

  const matching = subs.filter((sub) => {
    try {
      if (category && sub.reminder_prefs?.[category] === false) return false;
      const now = new Date();
      const localHour = parseInt(
        now.toLocaleTimeString("en-US", { timeZone: sub.timezone || "UTC", hour: "numeric", hour12: false }),
        10
      );
      // Shift scheduled hour by user's morning preference offset (default wake 6am)
      const offset = (sub.morning_start_hour ?? 6) - 6;
      const adjustedHour = (hour + offset + 24) % 24;
      return localHour === adjustedHour;
    } catch {
      return false;
    }
  });

  if (!matching.length) return;
  const payload = JSON.stringify({ title, body, tag, url });
  const results = await Promise.allSettled(
    matching.map((sub) =>
      webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload)
        .catch(async (err) => {
          if (err.statusCode === 410 || err.statusCode === 404) {
            await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
          }
          throw err;
        })
    )
  );
  const sent = results.filter((r) => r.status === "fulfilled").length;
  if (sent > 0) console.log(`Push [hour=${hour}] "${title}": sent ${sent}/${matching.length}`);
}

export default router;

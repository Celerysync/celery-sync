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
  const { userId, subscription, timezone } = req.body;
  if (!userId || !subscription?.endpoint) return res.status(400).json({ error: "Missing data" });

  const { error } = await supabase.from("push_subscriptions").upsert(
    { user_id: userId, endpoint: subscription.endpoint, keys: subscription.keys, timezone: timezone || "UTC" },
    { onConflict: "user_id,endpoint" }
  );
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

// Internal: send to users in a specific local hour window
export async function sendToUsersAtLocalHour({ hour, title, body, tag, url }) {
  const { data: subs } = await supabase.from("push_subscriptions").select("*");
  if (!subs?.length) return;

  const matching = subs.filter((sub) => {
    try {
      const now = new Date();
      const localHour = parseInt(
        now.toLocaleTimeString("en-US", { timeZone: sub.timezone || "UTC", hour: "numeric", hour12: false }),
        10
      );
      return localHour === hour;
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

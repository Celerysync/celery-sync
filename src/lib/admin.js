// The owner account. Entitlement is decided in one place (useSubscription)
// rather than by patching an isAdmin check into each gate — doing it per call
// site is how the owner ended up able to open paid tabs while still being
// silently denied wearables and companion memory.
//
// Not a security boundary: this only controls what the owner's own client
// renders. Anything that actually matters is enforced server-side against
// ADMIN_EMAIL (see server/routes/analytics.js, server/routes/hume.js).
export const ADMIN_EMAIL = (
  import.meta.env.VITE_ADMIN_EMAIL || "allij@live.com.au"
).toLowerCase();

export const isAdminEmail = (email) => !!email && email.toLowerCase() === ADMIN_EMAIL;

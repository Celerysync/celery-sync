import { supabase } from "./supabase.js";
import { API_URL } from "./env.js";

// Every call to our own server (/api/...) carries the signed-in user's
// Supabase access token, so the server can check WHO is asking instead of
// trusting a userId the page sends. Installed once at startup (main.jsx) so
// no caller can forget it — there are dozens of fetch("/api/...") calls.
// getSession() refreshes an expired token before handing it over.

function isOurApi(url) {
  try {
    const u = new URL(url, window.location.origin);
    if (!u.pathname.startsWith("/api/")) return false;
    if (u.origin === window.location.origin) return true;
    return !!API_URL && u.origin === new URL(API_URL, window.location.origin).origin;
  } catch {
    return false;
  }
}

export function installAuthFetch() {
  const original = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input?.url;
    if (!url || !isOurApi(url)) return original(input, init);

    const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
    if (!headers.has("Authorization")) {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (token) headers.set("Authorization", `Bearer ${token}`);
    }
    return original(input, { ...init, headers });
  };
}

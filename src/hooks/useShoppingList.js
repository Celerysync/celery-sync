import { useCallback, useEffect, useState } from "react";
import { loadList, setChecked, SHOPPING_CHANGED_EVENT } from "../lib/shopping.js";

const cacheKey = (pid) => `cs_kitchen_shop_${pid}`; // cs_kitchen_ prefix: cleared on sign out
const pendingKey = (pid) => `cs_kitchen_shop_pending_${pid}`;
const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || "null") ?? d; } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* full */ } };

// The list, kept on the phone too: in a shop with no signal it still shows,
// and ticks are saved on the phone and sent when signal comes back.
export function useShoppingList(profileId) {
  const [rows, setRows] = useState(() => read(cacheKey(profileId), []));
  const [offline, setOffline] = useState(() => navigator.onLine === false);
  const [pending, setPending] = useState(() => read(pendingKey(profileId), []).length);

  const applyPending = (list) => {
    const p = read(pendingKey(profileId), []);
    if (!p.length) return list;
    const want = new Map(p.flatMap((x) => x.ids.map((id) => [id, x.checked])));
    return list.map((r) => (want.has(r.id) ? { ...r, checked: want.get(r.id) } : r));
  };

  const load = useCallback(async () => {
    if (!profileId) return;
    if (navigator.onLine === false) { setOffline(true); return; }
    // Send any ticks made without signal first.
    const p = read(pendingKey(profileId), []);
    const left = [];
    for (const x of p) { try { await setChecked(x.ids, x.checked); } catch { left.push(x); } }
    write(pendingKey(profileId), left);
    setPending(left.length);
    try {
      const list = applyPending(await loadList(profileId));
      setRows(list); setOffline(false); write(cacheKey(profileId), list);
    } catch { setOffline(true); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  useEffect(() => {
    load();
    const off = () => setOffline(true);
    window.addEventListener(SHOPPING_CHANGED_EVENT, load);
    window.addEventListener("online", load);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener(SHOPPING_CHANGED_EVENT, load);
      window.removeEventListener("online", load);
      window.removeEventListener("offline", off);
    };
  }, [load]);

  const toggle = useCallback(async (line) => {
    const checked = !line.checked;
    const ids = new Set(line.ids);
    setRows((prev) => { const next = prev.map((r) => (ids.has(r.id) ? { ...r, checked } : r)); write(cacheKey(profileId), next); return next; });
    try {
      if (navigator.onLine === false) throw new Error("offline");
      await setChecked(line.ids, checked);
    } catch {
      const p = read(pendingKey(profileId), []).filter((x) => !x.ids.some((id) => ids.has(id)));
      p.push({ ids: line.ids, checked });
      write(pendingKey(profileId), p);
      setPending(p.length);
      setOffline(true);
    }
  }, [profileId]);

  return { rows, offline, pending, toggle, reload: load };
}

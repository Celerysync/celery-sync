// Newer Node versions ship their own (empty) localStorage global, which hides
// the simulated browser's. A tiny in-memory stand-in keeps tests predictable.
const store = new Map();
const memoryStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => void store.set(k, String(v)),
  removeItem: (k) => void store.delete(k),
  clear: () => store.clear(),
  key: (i) => [...store.keys()][i] ?? null,
  get length() { return store.size; },
};
Object.defineProperty(globalThis, "localStorage", { value: memoryStorage, configurable: true });
if (typeof window !== "undefined") {
  Object.defineProperty(window, "localStorage", { value: memoryStorage, configurable: true });
}

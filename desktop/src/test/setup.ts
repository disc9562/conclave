// vitest's jsdom exposes a `localStorage` object that has no setItem/getItem,
// so any zustand `persist` store throws "storage.setItem is not a function" the
// instant state is written. Install a minimal in-memory Storage so persisted
// stores (e.g. the roundtable history) work under test.
function createMemoryStorage(): Storage {
  const m = new Map<string, string>()
  return {
    get length() { return m.size },
    clear: () => m.clear(),
    getItem: (k) => (m.has(k) ? m.get(k)! : null),
    key: (i) => [...m.keys()][i] ?? null,
    removeItem: (k) => { m.delete(k) },
    setItem: (k, v) => { m.set(k, String(v)) },
  }
}

if (typeof globalThis.localStorage?.setItem !== 'function') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: createMemoryStorage(),
    configurable: true,
    writable: true,
  })
}

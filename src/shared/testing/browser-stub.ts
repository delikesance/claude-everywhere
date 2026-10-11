export function installStorageStub(): Map<string, unknown> {
  const store = new Map<string, unknown>();
  const local = {
    get: async (key: string) => (store.has(key) ? { [key]: store.get(key) } : {}),
    set: async (items: Record<string, unknown>) => {
      for (const [key, value] of Object.entries(items)) store.set(key, structuredClone(value));
    },
  };
  Object.assign(globalThis, { browser: { storage: { local } } });
  return store;
}

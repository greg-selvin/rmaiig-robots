export function clearSavedFormDrafts(storage: Pick<Storage, "length" | "key" | "removeItem">, userId: string) {
  const prefixes = [`rmaiig-form-draft:${userId}:`, `rmaiig-form-open:${userId}:`];
  try {
    for (let index = storage.length - 1; index >= 0; index--) {
      const key = storage.key(index);
      if (key && prefixes.some(prefix => key.startsWith(prefix))) storage.removeItem(key);
    }
  } catch {}
}

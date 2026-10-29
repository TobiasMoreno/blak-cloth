/**
 * Lee una clave de localStorage y, si no existe, la toma de su nombre anterior (`lm-studio-*`)
 * y la migra, así nadie pierde el carrito o los favoritos por el cambio de nombre.
 */
export function readStorage(key: string, legacyKey?: string): string | null {
  try {
    const current = localStorage.getItem(key);
    if (current !== null || !legacyKey) return current;

    const legacy = localStorage.getItem(legacyKey);
    if (legacy !== null) {
      localStorage.setItem(key, legacy);
      localStorage.removeItem(legacyKey);
    }
    return legacy;
  } catch {
    return null;
  }
}

export function writeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.error(`Error saving ${key} to localStorage:`, error);
  }
}

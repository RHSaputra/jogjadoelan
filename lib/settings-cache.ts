declare global {
  var __SETTINGS_CACHE__: Record<string, { value: unknown; expiry: number }> | undefined;
}

const cache = global.__SETTINGS_CACHE__ ?? {};
if (process.env.NODE_ENV !== "production") {
  global.__SETTINGS_CACHE__ = cache;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes TTL

export function getCachedSetting(key: string): unknown {
  const item = cache[key];
  if (item && item.expiry > Date.now()) {
    return item.value;
  }
  return null;
}

export function setCachedSetting(key: string, value: unknown) {
  cache[key] = {
    value,
    expiry: Date.now() + CACHE_TTL,
  };
}

export function invalidateSettingCache(key?: string) {
  if (key) {
    delete cache[key];
  } else {
    for (const k of Object.keys(cache)) {
      delete cache[k];
    }
  }
}

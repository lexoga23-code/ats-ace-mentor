const EXPIRATION_MS = 24 * 60 * 60 * 1000; // 24 hours

interface StoredItem<T> {
  value: T;
  timestamp: number;
}

export function setWithExpiry<T>(key: string, value: T, expirationMs = EXPIRATION_MS): void {
  const item: StoredItem<T> = {
    value,
    timestamp: Date.now(),
  };
  localStorage.setItem(key, JSON.stringify(item));
}

export function getWithExpiry<T>(key: string): T | null {
  const itemStr = localStorage.getItem(key);
  if (!itemStr) return null;

  try {
    const item: StoredItem<T> = JSON.parse(itemStr);
    const now = Date.now();

    if (now - item.timestamp > EXPIRATION_MS) {
      localStorage.removeItem(key);
      return null;
    }

    return item.value;
  } catch {
    // If parsing fails, try to return raw value (backward compatibility)
    try {
      return JSON.parse(itemStr) as T;
    } catch {
      return null;
    }
  }
}

export function cleanExpiredStorage(): void {
  const keysToCheck = [
    "scorecv_analysis",
    "scorecv_data",
    "scorecv_history",
  ];

  for (const key of keysToCheck) {
    getWithExpiry(key); // This will auto-remove if expired
  }
}

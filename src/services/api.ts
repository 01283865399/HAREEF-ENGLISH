export const MOCK_API_DELAY = 240;

export function delay(ms = MOCK_API_DELAY): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export async function mockRequest<T>(request: () => T): Promise<T> {
  await delay();
  try {
    return request();
  } catch (error) {
    throw error instanceof Error ? error : new Error("تعذّر إكمال الطلب.");
  }
}

export function readStorage<T>(key: string, fallback: T): T {
  const raw = window.localStorage.getItem(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error(`تعذّرت قراءة البيانات المحفوظة: ${key}`);
  }
}

export function writeStorage<T>(key: string, value: T): void {
  window.localStorage.setItem(key, JSON.stringify(value));
}

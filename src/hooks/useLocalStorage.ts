import { useCallback, useState } from "react";

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    const raw = window.localStorage.getItem(key);
    return raw === null ? initialValue : (JSON.parse(raw) as T);
  });

  const update = useCallback(
    (next: T) => {
      window.localStorage.setItem(key, JSON.stringify(next));
      setValue(next);
    },
    [key],
  );

  return [value, update] as const;
}

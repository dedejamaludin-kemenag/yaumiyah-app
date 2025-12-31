const KEY = "yaumiyah.v1";

export type YaumiyahState = {
  version: 1;
  practices: { id: string; label: string; enabled: boolean }[];
  days: Record<string, Record<string, boolean>>;
  lastDateKey: string;
};

export function loadState(): YaumiyahState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.version !== 1) return null;
    return parsed as YaumiyahState;
  } catch {
    return null;
  }
}

export function saveState(state: YaumiyahState) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

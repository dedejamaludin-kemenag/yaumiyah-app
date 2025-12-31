import { getWibDateKey, addDaysKey } from "./dateWib";
import { loadState, saveState } from "./storage";
import type { YaumiyahState } from "./storage";

const DEFAULT_PRACTICES = [
  { id: "shubuh", label: "Shalat Shubuh tepat waktu", enabled: true },
  { id: "dzuhur", label: "Shalat Dzuhur tepat waktu", enabled: true },
  { id: "ashar", label: "Shalat Ashar tepat waktu", enabled: true },
  { id: "maghrib", label: "Shalat Maghrib tepat waktu", enabled: true },
  { id: "isya", label: "Shalat Isya tepat waktu", enabled: true },
  { id: "quran", label: "Tilawah Al-Qur'an", enabled: true },
  { id: "dzikir", label: "Dzikir pagi/petang", enabled: true },
  { id: "sedekah", label: "Sedekah / kebaikan hari ini", enabled: true },
  { id: "olahraga", label: "Olahraga / jalan kaki", enabled: true },
];

let stateCache: YaumiyahState | null = null;

export function getState(): YaumiyahState {
  if (stateCache) return stateCache;

  const today = getWibDateKey();
  const loaded = loadState();
  if (loaded) {
    stateCache = loaded;
    return loaded;
  }

  const init: YaumiyahState = {
    version: 1,
    practices: DEFAULT_PRACTICES,
    days: { [today]: {} },
    lastDateKey: today,
  };
  saveState(init);
  stateCache = init;
  return init;
}

export function ensureTodayInitialized() {
  const s = getState();
  const today = getWibDateKey();
  if (s.lastDateKey !== today) {
    // Pastikan hari-hari yang terlewat tetap ada key kosong biar rekap rapi
    let k = s.lastDateKey;
    while (k !== today) {
      k = addDaysKey(k, 1);
      if (!s.days[k]) s.days[k] = {};
    }
    s.lastDateKey = today;
    persist();
  }
}

export function persist() {
  const s = getState();
  saveState(s);
}

export function togglePracticeEnabled(id: string) {
  const s = getState();
  const p = s.practices.find((x) => x.id === id);
  if (!p) return;
  p.enabled = !p.enabled;
  persist();
}

export function setChecked(dateKey: string, practiceId: string, checked: boolean) {
  const s = getState();
  if (!s.days[dateKey]) s.days[dateKey] = {};
  s.days[dateKey][practiceId] = checked;
  persist();
}

export function isChecked(dateKey: string, practiceId: string): boolean {
  const s = getState();
  return Boolean(s.days?.[dateKey]?.[practiceId]);
}

export function getTodayKey(): string {
  return getWibDateKey();
}

export function getEnabledPracticeIds(): string[] {
  const s = getState();
  return s.practices.filter((p) => p.enabled).map((p) => p.id);
}

export function getTodayProgress(): { done: number; total: number; pct: number } {
  const s = getState();
  const today = getTodayKey();
  const enabled = s.practices.filter((p) => p.enabled);
  const total = enabled.length || 1;
  const done = enabled.filter((p) => isChecked(today, p.id)).length;
  const pct = Math.round((done / total) * 100);
  return { done, total: enabled.length, pct };
}

export function getStreak(): number {
  const s = getState();
  const enabledIds = getEnabledPracticeIds();
  if (enabledIds.length === 0) return 0;

  let streak = 0;
  let k = getTodayKey();

  // streak mundur dari hari ini sampai gagal
  for (let i = 0; i < 365; i++) {
    const day = s.days[k] || {};
    const ok = enabledIds.every((id) => Boolean(day[id]));
    if (!ok) break;
    streak += 1;
    k = addDaysKey(k, -1);
  }
  return streak;
}

export function getLastNDays(n: number): { dateKey: string; pct: number }[] {
  const s = getState();
  const enabledIds = getEnabledPracticeIds();
  const total = enabledIds.length || 1;

  const out: { dateKey: string; pct: number }[] = [];
  let k = getTodayKey();
  for (let i = 0; i < n; i++) {
    const day = s.days[k] || {};
    const done = enabledIds.filter((id) => Boolean(day[id])).length;
    const pct = enabledIds.length === 0 ? 0 : Math.round((done / total) * 100);
    out.push({ dateKey: k, pct });
    k = addDaysKey(k, -1);
  }
  return out;
}

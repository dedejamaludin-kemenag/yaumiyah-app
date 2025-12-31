import { useEffect, useState } from "react";
import {
  getState,
  getTodayKey,
  isChecked,
  setChecked,
  getTodayProgress,
  ensureTodayInitialized,
} from "../app/yaumiyah";

export default function Checklist() {
  const [tick, setTick] = useState(0); // trigger re-render
  const today = getTodayKey();
  const s = getState();
  const enabled = s.practices.filter((p) => p.enabled);
  const prog = getTodayProgress();

  useEffect(() => {
    ensureTodayInitialized();
    const t = setInterval(() => setTick((x) => x + 1), 1000 * 30); // refresh ringan
    return () => clearInterval(t);
  }, []);

  return (
    <div className="page">
      <header className="topbar">
        <div>
          <div className="title">Checklist</div>
          <div className="muted">WIB: {today} • {prog.done}/{prog.total} • {prog.pct}%</div>
        </div>
      </header>

      <div className="card">
        <div className="section-title">Amalan Hari Ini</div>
        <div className="progress-row">
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${prog.pct}%` }} />
          </div>
          <div className="muted small">{prog.pct}%</div>
        </div>

        <div className="list">
          {enabled.map((p) => {
            const checked = isChecked(today, p.id);
            return (
              <label key={p.id} className={"item" + (checked ? " done" : "")}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    setChecked(today, p.id, e.target.checked);
                    setTick((x) => x + 1);
                  }}
                />
                <span>{p.label}</span>
              </label>
            );
          })}
          {enabled.length === 0 ? (
            <div className="muted small">Tidak ada amalan aktif. Aktifkan di Pengaturan.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

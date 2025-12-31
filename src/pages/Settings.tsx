import { useState } from "react";
import { getState, togglePracticeEnabled } from "../app/yaumiyah";

export default function Settings() {
  const [tick, setTick] = useState(0);
  const s = getState();

  return (
    <div className="page">
      <header className="topbar">
        <div>
          <div className="title">Pengaturan</div>
          <div className="muted">Aktifkan/Nonaktifkan amalan</div>
        </div>
      </header>

      <div className="card">
        <div className="section-title">Daftar Amalan</div>
        <div className="list">
          {s.practices.map((p) => (
            <button
              key={p.id}
              className={"toggle" + (p.enabled ? " on" : "")}
              onClick={() => {
                togglePracticeEnabled(p.id);
                setTick((x) => x + 1);
              }}
            >
              <span>{p.enabled ? "🟢" : "⚫"}</span>
              <span className="grow">{p.label}</span>
              <span className="muted small">{p.enabled ? "Aktif" : "Nonaktif"}</span>
            </button>
          ))}
        </div>

        <div className="muted small" style={{ marginTop: 10 }}>
          Catatan: yang dinonaktifkan tidak dihitung dalam progres/streak.
        </div>
      </div>
    </div>
  );
}

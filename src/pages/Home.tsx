import { Link } from "react-router-dom";
import StatCard from "../components/StatCard";
import { getTodayProgress, getStreak, getTodayKey } from "../app/yaumiyah";

export default function Home() {
  const today = getTodayKey();
  const prog = getTodayProgress();
  const streak = getStreak();

  return (
    <div className="page">
      <header className="topbar">
        <div>
          <div className="title">Yaumiyah</div>
          <div className="muted">Hari ini (WIB): {today}</div>
        </div>
        <Link to="/yaumiyah" className="btn">
          Buka Checklist
        </Link>
      </header>

      <div className="grid2">
        <StatCard title="Progress Hari Ini" value={`${prog.pct}%`} hint={`${prog.done}/${prog.total} amalan`} />
        <StatCard title="Streak Sempurna" value={`${streak} hari`} hint="Berturut-turut lengkap" />
      </div>

      <div className="card">
        <div className="section-title">Mode santai tapi konsisten</div>
        <div className="muted">
          Checklist ini sengaja sederhana: yang penting kamu bisa “cek” amalan, lihat progres,
          lalu besok reset otomatis. Nggak perlu drama dependency.
        </div>
      </div>
    </div>
  );
}

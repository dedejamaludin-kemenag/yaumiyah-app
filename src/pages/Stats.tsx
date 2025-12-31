import { useEffect, useMemo, useState } from "react";
import BottomNav from "../components/BottomNav";
import LogoutModal from "../components/LogoutModal";
import { clearSession, getSession } from "../app/session";
import { db } from "../app/supabase";
import { applyYaumiyahOverrides } from "../app/overrides";
import type { YaumiyahItem } from "../app/overrides";
import { useNavigate } from "react-router-dom";

function hasAnyInput(checks: Record<string, any>) {
  if (!checks) return false;
  for (const v of Object.values(checks)) {
    if (v === true) return true;
    if (v === 1) return true;
    if (typeof v === "number" && v > 0) return true;
  }
  return false;
}

export default function Stats() {
  const nav = useNavigate();
  const user = useMemo(() => getSession()!, []);
  const [logoutOpen, setLogoutOpen] = useState(false);

  const [totalDays, setTotalDays] = useState("0 Hari");
  const [avgScore, setAvgScore] = useState("0%");
  const [rows, setRows] = useState<any[]>([]);
  const [empty, setEmpty] = useState(false);

  useEffect(() => {
    init();
  }, []);

  async function init() {
    const { data: itemsData } = await db.from("yaumiyah_items").select("*").eq("is_active", true).order("sort_order");
    const items = (itemsData || []) as YaumiyahItem[];
    applyYaumiyahOverrides(items);

    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const startStr = start.toISOString().slice(0, 10);
    const endStr = end.toISOString().slice(0, 10);

    const { data: logsData } = await db
      .from("yaumiyah_daily")
      .select("log_date, checks")
      .eq("user_id", user.id)
      .gte("log_date", startStr)
      .lt("log_date", endStr)
      .order("log_date", { ascending: true });

    calculate(items, (logsData || []) as any[]);
  }

  function calculate(items: YaumiyahItem[], logs: { log_date: string; checks: Record<string, any> }[]) {
    const norm = (x: any) => String(x || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const filledLogs = (logs || []).filter((l) => l && hasAnyInput(l.checks || {}));

    if (filledLogs.length === 0) {
      setEmpty(true);
      setTotalDays("0 Hari");
      setAvgScore("0%");
      setRows([]);
      return;
    }

    const weekKey = (dateStr: string) => {
      const parts = dateStr.split("-").map(Number);
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      const day = tmp.getUTCDay() || 7; // Mon=1..Sun=7
      tmp.setUTCDate(tmp.getUTCDate() + 4 - day);
      const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
      const weekNo = Math.ceil((((+tmp - +yearStart) / 86400000) + 1) / 7);
      return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
    };

    const weeks = new Set<string>();
    const fridays = new Set<string>();
    filledLogs.forEach((l) => {
      weeks.add(weekKey(l.log_date));
      const [y, m, d] = l.log_date.split("-").map(Number);
      const dt = new Date(y, m - 1, d);
      if (dt.getDay() === 5) fridays.add(l.log_date);
    });

    const denomDaily = filledLogs.length;
    const denomWeekly = weeks.size;
    const denomFriday = fridays.size;

    const detectMode = (item: YaumiyahItem) => {
      if (item.calc_mode) return item.calc_mode;
      const k = norm(item.code);
      if (k === "puasa" || k === "olahraga") return "weekly";
      if (k.includes("jumat") || k.includes("jumuah") || k.includes("kahfi") || k.includes("alkahfi") || k.includes("shalawatjumat")) return "friday";
      return "daily";
    };

    const byDate = new Map(filledLogs.map((l) => [l.log_date, l.checks || {}]));

    const itemStats = items.map((item) => {
      const target = item.target_min || 1;
      const mode = detectMode(item);

      let successCount = 0;
      let denom = denomDaily;

      if (mode === "weekly") {
        denom = denomWeekly;
        const wkSuccess = new Map<string, boolean>();
        filledLogs.forEach((l) => {
          const wk = weekKey(l.log_date);
          if (!wkSuccess.has(wk)) wkSuccess.set(wk, false);
          const raw = l.checks?.[item.code];
          const val = raw === true ? 1 : typeof raw === "number" ? raw : 0;
          if (val >= target) wkSuccess.set(wk, true);
        });
        wkSuccess.forEach((v) => { if (v) successCount++; });
      } else if (mode === "friday") {
        denom = denomFriday;
        fridays.forEach((dateStr) => {
          const checks = byDate.get(dateStr) || {};
          const raw = checks[item.code];
          const val = raw === true ? 1 : typeof raw === "number" ? raw : 0;
          if (val >= target) successCount++;
        });
      } else {
        denom = denomDaily;
        filledLogs.forEach((l) => {
          const raw = l.checks?.[item.code];
          const val = raw === true ? 1 : typeof raw === "number" ? raw : 0;
          if (val >= target) successCount++;
        });
      }

      const percentage = denom > 0 ? Math.round((successCount / denom) * 100) : 0;
      return { ...item, percentage, _mode: mode };
    });

    itemStats.sort((a, b) => b.percentage - a.percentage);
    const avg = Math.round(itemStats.reduce((acc, cur) => acc + cur.percentage, 0) / (itemStats.length || 1));

    setTotalDays(`${denomDaily} Hari`);
    setAvgScore(`${avg}%`);
    setRows(itemStats);
    setEmpty(false);
  }

  function modeTag(m: string) {
    if (m === "weekly") return <span className="text-[10px] ml-2 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-bold">Pekan</span>;
    if (m === "friday") return <span className="text-[10px] ml-2 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-bold">Jumat</span>;
    return null;
  }

  return (
    <div className="min-h-screen pb-[110px]">
      <div className="text-white p-6 pb-8 rounded-b-[2.5rem] shadow-xl mb-6 sticky top-0 z-40 bg-[#047857]">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="font-bold text-2xl">Statistik Bulanan</h1>
            <p className="text-emerald-100 text-xs mt-1 opacity-90">Pantau konsistensi ibadahmu</p>
          </div>
          <button onClick={() => setLogoutOpen(true)} className="bg-black/20 backdrop-blur-sm p-3 rounded-2xl text-xs hover:bg-black/30 transition shadow-sm border border-white/10">
            <i className="fa-solid fa-power-off text-white"></i>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-6">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/20">
            <p className="text-[10px] text-emerald-100 opacity-80 uppercase font-bold">Total Pengisian</p>
            <p className="text-2xl font-black mt-1">{totalDays}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/20">
            <p className="text-[10px] text-emerald-100 opacity-80 uppercase font-bold">Rata-rata Capaian</p>
            <p className="text-2xl font-black mt-1">{avgScore}</p>
          </div>
        </div>
      </div>

      <div className="px-4 max-w-md mx-auto space-y-4 -mt-2">
        {empty ? (
          <div className="text-center py-10 bg-white rounded-2xl">
            <p className="text-gray-400 text-sm">Belum ada cukup data bulan ini.</p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <i className="fa-solid fa-trophy text-amber-400"></i> Peringkat Konsistensi
            </h3>

            {rows.map((item, idx) => {
              let colorClass = "text-emerald-600";
              let barClass = "bg-emerald-500";
              if (item.percentage < 50) { colorClass = "text-rose-500"; barClass = "bg-rose-500"; }
              else if (item.percentage < 80) { colorClass = "text-amber-500"; barClass = "bg-amber-500"; }

              return (
                <div key={item.code} className="flex items-center gap-3 mb-4">
                  <div className="w-8 text-center text-xs font-bold text-gray-400">#{idx + 1}</div>
                  <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 shadow-sm border border-gray-100">
                    <i className={`fa-solid ${item.icon || "fa-star"} text-xs`}></i>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-xs font-bold text-gray-700">{item.name}{modeTag(item._mode)}</span>
                      <span className={`text-xs font-bold ${colorClass}`}>{item.percentage}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${barClass} rounded-full`} style={{ width: `${item.percentage}%` }}></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />

      <LogoutModal
        open={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        onConfirm={() => {
          clearSession();
          nav("/login", { replace: true });
        }}
      />
    </div>
  );
}

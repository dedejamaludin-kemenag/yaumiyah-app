import { useEffect, useMemo, useState } from "react";
import BottomNav from "../components/BottomNav";
import LogoutModal from "../components/LogoutModal";
import { clearSession, getSession } from "../app/session";
import { db } from "../app/supabase";
import { applyYaumiyahOverrides } from "../app/overrides";
import type { YaumiyahItem } from "../app/overrides";
import { useNavigate } from "react-router-dom";

function getLocalISODate(d: Date) {
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().split("T")[0];
}
function hasAnyInput(checks: Record<string, any>) {
  if (!checks) return false;
  for (const v of Object.values(checks)) {
    if (v === true) return true;
    if (v === 1) return true;
    if (typeof v === "number" && v > 0) return true;
  }
  return false;
}

export default function Recap() {
  const nav = useNavigate();
  const user = useMemo(() => getSession()!, []);
  const [logoutOpen, setLogoutOpen] = useState(false);

  const [items, setItems] = useState<YaumiyahItem[]>([]);
  const [logs, setLogs] = useState<{ log_date: string; checks: Record<string, any> }[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    init();
  }, []);

  async function init() {
    const { data: itemsData } = await db.from("yaumiyah_items").select("*").eq("is_active", true).order("sort_order");
    const list = (itemsData || []) as YaumiyahItem[];
    applyYaumiyahOverrides(list);
    setItems(list);

    const { data: logsData } = await db
      .from("yaumiyah_daily")
      .select("log_date, checks")
      .eq("user_id", user.id)
      .order("log_date", { ascending: false })
      .limit(30);

    setLogs((logsData || []) as any);
  }

  const headerDate = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const dates = useMemo(() => {
    const todayStr = getLocalISODate(new Date());
    const datesSet = new Set<string>([todayStr]);
    (logs || []).forEach((l) => {
      if (l?.log_date && hasAnyInput(l.checks || {})) datesSet.add(l.log_date);
    });
    return Array.from(datesSet).sort((a, b) => b.localeCompare(a));
  }, [logs]);

  function findChecks(dateStr: string) {
    const row = logs.find((l) => l.log_date === dateStr);
    return row?.checks || {};
  }

  return (
    <div className="min-h-screen pb-[110px]">
      <div className="text-white p-6 pb-8 rounded-b-[2.5rem] shadow-xl mb-6 sticky top-0 z-40 bg-[#047857]">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="font-bold text-2xl">Jurnal Ibadah</h1>
            <p className="text-emerald-100 text-xs mt-1 opacity-90">{headerDate}</p>
          </div>
          <button onClick={() => setLogoutOpen(true)} className="bg-black/20 backdrop-blur-sm p-3 rounded-2xl text-xs hover:bg-black/30 transition shadow-sm border border-white/10">
            <i className="fa-solid fa-power-off text-white"></i>
          </button>
        </div>

        <div className="flex gap-6 text-xs text-white px-1 justify-center text-center">
          <div className="flex items-center gap-2 justify-center min-w-[92px]">
            <div className="w-3 h-3 bg-emerald-400 rounded border border-white/50"></div>
            <span className="font-medium opacity-90">Tercapai</span>
          </div>
          <div className="flex items-center gap-2 justify-center min-w-[92px]">
            <div className="w-3 h-3 bg-rose-400 rounded border border-white/50"></div>
            <span className="font-medium opacity-90">Belum</span>
          </div>
        </div>
      </div>

      <div className="px-4 max-w-md mx-auto space-y-3 pb-6 -mt-2">
        {dates.map((d) => {
          const checks = findChecks(d);
          const filled = hasAnyInput(checks);

          const [y, m, day] = d.split("-").map(Number);
          const dateObj = new Date(y, m - 1, day);
          const dayName = dateObj.toLocaleDateString("id-ID", { weekday: "long" });
          const dateNum = dateObj.toLocaleDateString("id-ID", { day: "numeric", month: "short" });

          let totalWeight = 0;
          let achievedWeight = 0;

          const details = items.map((item) => {
            const raw = checks[item.code];
            const val = raw === true ? 1 : typeof raw === "number" ? raw : 0;
            const target = item.target_min || 1;
            const ok = val >= target;

            const w = item.weight || 1;
            totalWeight += w;
            if (ok) achievedWeight += w;

            const cardCls = ok ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200";
            const textCls = ok ? "text-emerald-800" : "text-rose-700";
            const iconBg = ok ? "bg-white text-emerald-600" : "bg-white text-rose-400";
            const valueDisplay = item.input_type === "bool" ? (ok ? "Ya" : "Belum") : (<>{val} <span className="opacity-60">/{target}</span></>);

            return (
              <div key={item.code} className={`flex items-center gap-3 p-3 rounded-2xl border ${cardCls}`}>
                <div className={`w-8 h-8 rounded-full ${iconBg} border border-white/50 shadow-sm flex items-center justify-center text-xs`}>
                  <i className={`fa-solid ${item.icon || "fa-star"}`}></i>
                </div>
                <div className="flex-1">
                  <p className={`text-[10px] ${textCls} uppercase font-extrabold opacity-70 mb-0.5`}>{item.name}</p>
                  <p className={`text-xs font-black ${textCls}`}>{valueDisplay}</p>
                </div>
              </div>
            );
          });

          const progressPct = filled && totalWeight > 0 ? Math.round((achievedWeight / totalWeight) * 100) : 0;

          let badgeClass = "bg-rose-100 text-rose-700 border-rose-200";
          let badgeText = "Belum Diisi";
          if (filled) {
            if (progressPct >= 100) { badgeClass = "bg-emerald-100 text-emerald-700 border-emerald-200"; badgeText = "Sempurna"; }
            else if (progressPct >= 50) { badgeClass = "bg-amber-100 text-amber-700 border-amber-200"; badgeText = "Baik"; }
            else { badgeClass = "bg-rose-100 text-rose-700 border-rose-200"; badgeText = "Kurang"; }
          }

          const open = expanded === d;

          return (
            <div key={d} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-3 group">
              <div className="p-4 cursor-pointer" onClick={() => setExpanded(open ? null : d)}>
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-gray-100 w-10 h-10 rounded-xl flex flex-col items-center justify-center text-gray-600">
                      <span className="text-[8px] uppercase font-bold">{dayName.substring(0, 3)}</span>
                      <span className="text-sm font-black leading-none">{dateObj.getDate()}</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800 text-sm">{dayName}, {dateNum}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${badgeClass} font-bold`}>{badgeText}</span>
                        <span className="text-[10px] text-gray-400 font-medium">{progressPct}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-50 group-hover:bg-gray-100 transition">
                    <i className={"fa-solid fa-chevron-down text-gray-400 text-xs transition " + (open ? "rotate-180" : "")}></i>
                  </div>
                </div>

                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full" style={{ width: `${Math.max(progressPct, 5)}%` }} />
                </div>
              </div>

              {open && (
                <div className="bg-gray-50/50 border-t border-dashed border-gray-200">
                  <div className="p-4">
                    {filled ? (
                      <div className="grid grid-cols-2 gap-2">{details}</div>
                    ) : (
                      <p className="text-center text-xs text-gray-400 py-2 italic">Belum ada laporan.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
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

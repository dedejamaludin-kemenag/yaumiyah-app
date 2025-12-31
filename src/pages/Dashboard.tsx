import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../components/BottomNav";
import LogoutModal from "../components/LogoutModal";
import { clearSession, getSession } from "../app/session";
import { db } from "../app/supabase";
import { applyYaumiyahOverrides } from "../app/overrides";
import type { YaumiyahItem } from "../app/overrides";

function localISODate(d = new Date()) {
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().split("T")[0];
}
function isFriday(dateISO: string) {
  const d = new Date(dateISO + "T00:00:00+07:00");
  return d.getDay() === 5;
}

export default function Dashboard() {
  const nav = useNavigate();
  const user = useMemo(() => getSession()!, []);
  const [logoutOpen, setLogoutOpen] = useState(false);

  const [dateStr, setDateStr] = useState(localISODate());
  const [items, setItems] = useState<YaumiyahItem[]>([]);
  const [itemMap, setItemMap] = useState<Record<string, YaumiyahItem>>({});
  const [checks, setChecks] = useState<Record<string, any>>({});
  const saveTimer = useRef<any>(null);

  useEffect(() => {
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateStr]);

  async function init() {
    const friday = isFriday(dateStr);

    const { data } = await db
      .from("yaumiyah_items")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");

    let list = (data || []).filter((it: any) => (it.category === "jumat" ? friday : true));
    applyYaumiyahOverrides(list);

    setItems(list);
    setItemMap(Object.fromEntries(list.map((it) => [it.code, it])));

    // load checks (maybeSingle biar gak 406)
    const { data: row } = await db
      .from("yaumiyah_daily")
      .select("checks")
      .eq("user_id", user.id)
      .eq("log_date", dateStr)
      .maybeSingle();

    setChecks((row?.checks as any) || {});
  }

  function update(key: string, val: any, max?: number | null) {
    const it = itemMap[key];
    let next = val;

    if (it?.input_type === "bool") {
      next = (val === true || Number(val) === 1) ? 1 : 0;
    } else if (typeof next === "number") {
      if (next < 0) next = 0;
      if (typeof max === "number" && !Number.isNaN(max) && next > max) next = max;
    }

    setChecks((prev) => {
      const merged = { ...prev, [key]: next };
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => saveToDB(merged), 400);
      return merged;
    });
  }

  function step(key: string, delta: number, max?: number | null) {
    const it = itemMap[key];
    if (it?.input_type === "bool") {
      update(key, delta > 0 ? 1 : 0);
      return;
    }
    const cur = typeof checks[key] === "number" ? checks[key] : 0;
    let next = cur + delta;
    if (next < 0) next = 0;
    if (typeof max === "number" && next > max) next = max;
    update(key, next, max ?? null);
  }

  async function saveToDB(payloadChecks: Record<string, any>) {
    await db.from("yaumiyah_daily").upsert(
      {
        user_id: user.id,
        log_date: dateStr,
        checks: payloadChecks,
        filled_at: new Date().toISOString(),
      },
      { onConflict: "user_id,log_date" }
    );
  }

  return (
    <div className="min-h-screen pb-[110px]">
      <div className="text-white p-6 pb-8 rounded-b-[2.5rem] shadow-xl mb-6 sticky top-0 z-40 bg-[#047857]">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="font-bold text-2xl">Input Amalan</h1>
            <p className="text-emerald-100 text-xs mt-1 opacity-90">Isi target harianmu</p>
          </div>
          <button onClick={() => setLogoutOpen(true)} className="bg-black/20 p-3 rounded-2xl text-xs">
            <i className="fa-solid fa-power-off"></i>
          </button>
        </div>
        <div className="flex justify-center">
          <input
            type="date"
            value={dateStr}
            onChange={(e) => setDateStr(e.target.value)}
            className="bg-white/15 border border-white/30 text-white px-3 py-2 rounded-xl text-sm outline-none"
          />
        </div>
      </div>

      <div className="px-4 max-w-md mx-auto space-y-3 -mt-2">
        {items.map((item) => {
          const raw = checks[item.code];
          const iconCls = item.icon || "fa-star";
          const title = item.display_name || item.name || "";
          const subtitle =
            item.display_note ||
            (item.input_type === "bool" ? "Ya/Tidak" : item.target_min ? `Min ${item.target_min}` : "Input angka");

          const btnCls =
            "w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 active:scale-95 transition text-gray-700 font-extrabold";
          const valCls = "min-w-[64px] text-center font-extrabold text-sm";

          let control: JSX.Element;
          if (item.input_type === "bool") {
            const cur = typeof raw === "number" ? raw : raw === true ? 1 : 0;
            const labelVal = cur === 1 ? "Ya" : "Tidak";
            control = (
              <div className="flex items-center gap-2">
                <button className={btnCls} onClick={() => step(item.code, -1)}>-</button>
                <div className={valCls}>{labelVal}</div>
                <button className={btnCls} onClick={() => step(item.code, +1)}>+</button>
              </div>
            );
          } else {
            const num = typeof raw === "number" ? raw : 0;
            const max = typeof item.target_max === "number" ? item.target_max : null;
            control = (
              <div className="flex items-center gap-2">
                <button className={btnCls} onClick={() => step(item.code, -1, max)}>-</button>
                <div className={valCls}>{num}</div>
                <button className={btnCls} onClick={() => step(item.code, +1, max)}>+</button>
              </div>
            );
          }

          return (
            <div key={item.code} className="bg-white p-4 rounded-2xl shadow border flex justify-between">
              <div className="flex gap-3 items-center">
                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-emerald-600">
                  <i className={`fa-solid ${iconCls}`}></i>
                </div>
                <div>
                  <h4 className="font-bold text-sm text-gray-800">{title}</h4>
                  <p className="text-[10px] text-gray-400">{subtitle}</p>
                </div>
              </div>
              {control}
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

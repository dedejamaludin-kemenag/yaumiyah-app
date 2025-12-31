import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../app/supabase";
import { getSession, saveSession } from "../app/session";
import { isStandaloneMode, registerPush, upsertPushSubscription } from "../app/push";

export default function Login() {
  const nav = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const [showInstall, setShowInstall] = useState(false);
  const [showNotifButton, setShowNotifButton] = useState(false);
  const [notifModal, setNotifModal] = useState(false);

  const [welcome, setWelcome] = useState(false);
  const [welcomeName, setWelcomeName] = useState("...");

  const deferredPrompt = useRef<any>(null);

  const standalone = useMemo(() => isStandaloneMode(), []);

  useEffect(() => {
    // jika sudah login, langsung ke dashboard
    if (getSession()) nav("/dashboard", { replace: true });

    // register SW
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    // install prompt (hanya jika bukan standalone)
    const onBip = (e: any) => {
      e.preventDefault();
      deferredPrompt.current = e;
      setShowInstall(true);
    };
    if (!standalone) window.addEventListener("beforeinstallprompt", onBip);

    // notif logic (hanya saat mode app)
    if (standalone && "Notification" in window && "PushManager" in window) {
      if (Notification.permission === "default") setShowNotifButton(true);
      if (Notification.permission === "granted") {
        (async () => {
          const sub = await registerPush();
          if (sub) localStorage.setItem("temp_push_sub", JSON.stringify(sub));
        })();
      }
    }

    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, [nav, standalone]);

  async function doInstall() {
    const dp = deferredPrompt.current;
    if (!dp) return;
    dp.prompt();
    const { outcome } = await dp.userChoice;
    if (outcome === "accepted") setShowInstall(false);
    deferredPrompt.current = null;
  }

  async function confirmNotif() {
    setNotifModal(false);
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return;

    const sub = await registerPush();
    if (sub) {
      localStorage.setItem("temp_push_sub", JSON.stringify(sub));
      setShowNotifButton(false);
    }
  }

  async function handleLogin() {
    if (!username || !password) return alert("Isi username & password");

    setBusy(true);
    try {
      const { data, error } = await db
        .from("users")
        .select("*")
        .eq("username", username)
        .eq("password", password)
        .single();

      if (error || !data) {
        alert("Login gagal! Username atau password salah.");
        setBusy(false);
        return;
      }

      saveSession(data);
      const sapaan = data.full_name || data.username;
      setWelcomeName(sapaan);
      setWelcome(true);

      // temp push sub -> tempel ke user
      try {
        const raw = localStorage.getItem("temp_push_sub");
        if (raw) {
          const subJson = JSON.parse(raw);
          // PushSubscription object gak bisa direcreate 100% dari JSON,
          // jadi: kalau sudah permission granted, kita register ulang untuk dapat object valid
          if ("Notification" in window && Notification.permission === "granted") {
            const sub = await registerPush();
            if (sub) {
              await upsertPushSubscription(data.id, sub);
              localStorage.removeItem("temp_push_sub");
            }
          }
        }
      } catch {}

      setTimeout(() => nav("/dashboard", { replace: true }), 3333);
    } catch (e) {
      console.error(e);
      alert("Koneksi error");
      setBusy(false);
    }
  }

  return (
    <div className="bg-gray-50 min-h-screen relative overflow-x-hidden">
      <div className="absolute top-0 left-0 w-full h-80 bg-[#047857] rounded-b-[3rem] z-0 shadow-xl"></div>

      <div className="relative z-10 w-full max-w-sm mx-auto px-6 pt-14 pb-10">
        <div className="text-center mb-8">
          <div className="w-24 h-24 bg-white rounded-3xl mx-auto shadow-lg flex items-center justify-center mb-4 text-[#047857]">
            <i className="fa-solid fa-kaaba text-5xl"></i>
          </div>
          <h1 className="text-white text-2xl font-bold tracking-wide">Yaumiyah</h1>
          <p className="text-emerald-100 text-sm opacity-90">Pantau ibadah harianmu</p>
        </div>

        <div className="space-y-3 mb-4">
          {showInstall && (
            <button onClick={doInstall} className="w-full rounded-2xl px-4 py-3 flex items-center justify-between bg-white/15 backdrop-blur border border-white/20 text-white hover:bg-white/20 transition">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 w-8 h-8 flex items-center justify-center rounded-lg"><i className="fa-solid fa-download text-sm"></i></div>
                <div className="text-left">
                  <p className="font-bold text-xs">Instal Aplikasi</p>
                  <p className="text-[10px] opacity-80">Akses lebih cepat & offline</p>
                </div>
              </div>
              <span className="text-[10px] bg-white/20 px-2 py-1 rounded-full font-bold">Instal</span>
            </button>
          )}

          {showNotifButton && (
            <button onClick={() => setNotifModal(true)} className="w-full rounded-2xl px-4 py-3 flex items-center justify-between bg-white/15 backdrop-blur border border-white/20 text-white hover:bg-white/20 transition">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 w-8 h-8 flex items-center justify-center rounded-lg"><i className="fa-solid fa-bell text-sm"></i></div>
                <div className="text-left">
                  <p className="font-bold text-xs">Aktifkan Notifikasi Harian</p>
                  <p className="text-[10px] opacity-80">Pengingat input jam 16:00</p>
                </div>
              </div>
              <span className="text-[10px] bg-white/20 px-2 py-1 rounded-full font-bold">Aktifkan</span>
            </button>
          )}
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden relative min-h-[340px] transition-all duration-500">
          {!welcome ? (
            <div className="p-8">
              <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">Masuk Akun</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Username</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                      <i className="fa-solid fa-user text-sm"></i>
                    </div>
                    <input value={username} onChange={(e) => setUsername(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:bg-white transition text-sm font-semibold text-gray-700" placeholder="Username Anda" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                      <i className="fa-solid fa-lock text-sm"></i>
                    </div>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:bg-white transition text-sm font-semibold text-gray-700" placeholder="••••••••" />
                  </div>
                </div>

                <button disabled={busy} onClick={handleLogin} className="w-full bg-[#047857] hover:bg-emerald-800 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-200 transition-transform active:scale-95 flex items-center justify-center gap-2 mt-4">
                  {busy ? <i className="fa-solid fa-circle-notch fa-spin"></i> : (<><span>Masuk</span><i className="fa-solid fa-arrow-right"></i></>)}
                </button>
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 bg-white z-20 flex flex-col items-center justify-center p-6 text-center transition-opacity duration-700">
              <div className="flex-1 flex flex-col items-center justify-center w-full">
                <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mb-6 animate-bounce shadow-sm border border-emerald-100 mx-auto">
                  <i className="fa-solid fa-handshake text-4xl text-emerald-600"></i>
                </div>
                <div className="space-y-2">
                  <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Ahlan wa Sahlan</p>
                  <h3 className="text-2xl font-black text-gray-800 leading-tight px-4">{welcomeName}</h3>
                </div>
                <div className="mt-10 flex items-center justify-center gap-2 text-emerald-600 text-xs font-medium animate-pulse bg-emerald-50 px-4 py-2 rounded-full">
                  <i className="fa-solid fa-circle-notch fa-spin"></i>
                  <span>Menyiapkan Jurnal...</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-gray-400 text-xs mt-8">© 2024 Aplikasi Ibadah Pegawai</p>
      </div>

      {notifModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-[2rem] w-4/5 max-w-xs shadow-2xl">
            <div className="text-center">
              <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-5 text-3xl shadow-inner animate-pulse">
                <i className="fa-solid fa-bell"></i>
              </div>
              <h3 className="font-bold text-gray-800 text-lg mb-2">Jangan Lewatkan Pahala</h3>
              <p className="text-gray-500 text-xs leading-relaxed mb-6">
                Izinkan notifikasi agar kami bisa mengingatkan target ibadah harianmu tepat waktu.
              </p>
              <div className="space-y-3">
                <button onClick={confirmNotif} className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition shadow-lg shadow-emerald-200">
                  Ya, Aktifkan
                </button>
                <button onClick={() => setNotifModal(false)} className="w-full py-3 bg-transparent hover:bg-gray-50 text-gray-400 rounded-xl font-bold text-xs transition">
                  Nanti Saja
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

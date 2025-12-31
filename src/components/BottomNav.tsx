import { NavLink } from "react-router-dom";

export default function BottomNav() {
  const base = "flex flex-col items-center transition text-gray-400 hover:text-emerald-600 group";
  const active = "flex flex-col items-center transition text-emerald-700";

  return (
    <div className="fixed bottom-6 left-4 right-4 bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-100 max-w-md mx-auto z-50">
      <div className="flex justify-between px-6 py-3">
        <NavLink to="/dashboard" className={({ isActive }) => (isActive ? active : base)}>
          <div className={ "w-10 h-10 rounded-2xl flex items-center justify-center transition " + (location.pathname === "/dashboard" ? "bg-emerald-100 text-emerald-700 shadow-sm" : "bg-transparent group-hover:bg-emerald-50")}>
            <i className="fa-solid fa-pen-to-square text-xl mb-1"></i>
          </div>
          <span className="text-[10px] font-bold">Input</span>
        </NavLink>

        <NavLink to="/rekap" className={({ isActive }) => (isActive ? active : base)}>
          <div className={ "w-10 h-10 rounded-2xl flex items-center justify-center transition " + (location.pathname === "/rekap" ? "bg-emerald-100 text-emerald-700 shadow-sm" : "bg-transparent group-hover:bg-emerald-50")}>
            <i className="fa-solid fa-book-open text-xl mb-1"></i>
          </div>
          <span className="text-[10px] font-bold">Jurnal</span>
        </NavLink>

        <NavLink to="/stats" className={({ isActive }) => (isActive ? active : base)}>
          <div className={ "w-10 h-10 rounded-2xl flex items-center justify-center transition " + (location.pathname === "/stats" ? "bg-emerald-100 text-emerald-700 shadow-sm" : "bg-transparent group-hover:bg-emerald-50")}>
            <i className="fa-solid fa-chart-pie text-xl mb-1"></i>
          </div>
          <span className="text-[10px] font-bold">Statistik</span>
        </NavLink>
      </div>
    </div>
  );
}

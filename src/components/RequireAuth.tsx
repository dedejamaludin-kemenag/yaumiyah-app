import { Navigate, useLocation } from "react-router-dom";
import { getSession } from "../app/session";

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  const s = getSession();
  if (!s) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  return <>{children}</>;
}

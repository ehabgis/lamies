import { createContext, useContext, useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { api } from "./api";
const Context = createContext(null);
export function SessionProvider({ children }) {
  const [user, setUser] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  async function refresh() {
    setLoading(true);
    try {
      const result = await api("/auth/me");
      setUser(result.user || null);
      setError("");
    } catch (e) {
      if (e.status !== 401) setError(e.message);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    refresh();
  }, []);
  async function logout() {
    await api("/auth/logout", { method: "POST" });
    setUser(null);
  }
  return (
    <Context.Provider
      value={{ user, setUser, loading, error, refresh, logout }}
    >
      {children}
    </Context.Provider>
  );
}
export const useSession = () => useContext(Context);
export function AccountGuard({ admin = false }) {
  const { user, loading, error, refresh } = useSession();
  if (loading)
    return (
      <div className="platform-loading" role="status">
        جارٍ فتح رحلتك…
      </div>
    );
  if (error)
    return (
      <div className="platform-loading" role="alert">
        {error}
        <button onClick={refresh}>إعادة المحاولة</button>
      </div>
    );
  if (!user) return <Navigate to="/" replace />;
  if (admin && !["super_admin", "content_admin", "teacher"].includes(user.role))
    return <Navigate to="/journey" replace />;
  return <Outlet />;
}

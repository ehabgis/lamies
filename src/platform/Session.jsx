import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { api, clearCsrf, onSessionMismatch, onUnauthorized } from "./api";
import { chooseAccount } from "./guestProfile";
import { resetPrivateState, setIdentity } from "./privateState";
const Context = createContext(null);
// How often a tab coming back into view checks that it is still the same account.
const RECHECK_MS = 15000;
export function SessionProvider({ children }) {
  const [user, setUser] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const userRef = useRef(null);
  userRef.current = user;
  const checkedAt = useRef(0);
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
      checkedAt.current = Date.now();
      setLoading(false);
    }
  }
  useEffect(() => {
    refresh();
  }, []);
  // A signed-in student gets their own journey progress on this device.
  useEffect(() => {
    if (user?.role === "student") chooseAccount(user);
  }, [user?.id]);
  // The smart teacher's chats, answers and consent belong to one account:
  // a different one (or none) clears them (privateState.js), and the open
  // pages are built again (App.jsx keys them by `accountKey`) so nothing the
  // previous person typed stays on screen.
  const [accountKey, setAccountKey] = useState(0);
  useEffect(() => {
    if (!loading && setIdentity(user)) setAccountKey((k) => k + 1);
  }, [loading, user?.id]);
  // The server ended the session (expired, disabled, signed out elsewhere).
  useEffect(
    () =>
      onUnauthorized(() => {
        if (userRef.current) {
          clearCsrf();
          setUser(null);
        }
      }),
    [],
  );
  // Another tab may have signed out or into another account: check again
  // when this tab is shown, and at once when the server refused this tab's
  // CSRF token. A different account (or none) clears the private state via
  // the identity effect above; the refused request is not sent again.
  useEffect(() => {
    const recheck = async (now = false) => {
      if (!now && (document.visibilityState !== "visible" || Date.now() - checkedAt.current < RECHECK_MS)) return;
      checkedAt.current = Date.now();
      try {
        const result = await api("/auth/me");
        const next = result.user || null;
        if ((next?.id || null) !== (userRef.current?.id || null)) setUser(next);
      } catch {}
    };
    const onVisible = () => recheck();
    document.addEventListener("visibilitychange", onVisible);
    const offMismatch = onSessionMismatch(() => recheck(true));
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      offMismatch();
    };
  }, []);
  async function logout() {
    // Clear this tab first, so nothing private stays even if the request fails.
    resetPrivateState();
    try {
      await api("/auth/logout", { method: "POST" });
    } catch (e) {
      // A session that already ended is signed out; other failures are reported.
      if (e.status !== 401) throw e;
    }
    clearCsrf();
    setUser(null);
  }
  return (
    <Context.Provider
      value={{ user, setUser, loading, error, refresh, logout, accountKey }}
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

import { createContext, useContext, useEffect, useState } from "react";
import { authApi } from "../api/auth";
import { setUnauthorizedHandler } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, ask the backend who we are (validates the httpOnly session cookie).
  useEffect(() => {
    let active = true;
    authApi
      .me()
      .then((u) => {
        if (active) setUser(u);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // When any request 401s, drop the user so the app routes back to login.
  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
  }, []);

  async function login(email, password) {
    const u = await authApi.login(email, password);
    setUser(u);
    return u;
  }

  async function logout() {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
    }
  }

  const role = user?.role ?? null;

  return (
    <AuthContext.Provider value={{ user, role, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

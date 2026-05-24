import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

const ROLES = ["admin", "staff", "engineer", "student"];

export function AuthProvider({ children }) {
  const [role, setRole] = useState(() => {
    const saved = sessionStorage.getItem("dl_role");
    return ROLES.includes(saved) ? saved : null;
  });

  function login(selectedRole) {
    sessionStorage.setItem("dl_role", selectedRole);
    setRole(selectedRole);
  }

  function logout() {
    sessionStorage.removeItem("dl_role");
    setRole(null);
  }

  return (
    <AuthContext.Provider value={{ role, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

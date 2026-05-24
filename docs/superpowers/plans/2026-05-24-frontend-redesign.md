# Frontend Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the drone lab inventory frontend with a dark collapsible sidebar, IBM Plex Sans font, blue accent (#2563eb), and a role-based login screen (Admin/Staff/Lab Engineer/Student) with student restricted to check-in/out only.

**Architecture:** React context (`AuthContext`) stores the selected role in `sessionStorage`. A `ProtectedRoute` wrapper redirects unauthenticated users to `/login`. The layout shell switches from a top navbar to a dark collapsible sidebar rendered inside `App.jsx`. All styling lives in a rewritten `index.css`.

**Tech Stack:** React 18, React Router v6, plain CSS (no Tailwind), IBM Plex Sans + IBM Plex Mono (Google Fonts)

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `frontend/index.html` | Modify | Add Google Fonts link tags |
| `frontend/src/context/AuthContext.jsx` | Create | Role state, login(), logout(), sessionStorage |
| `frontend/src/pages/Login.jsx` | Create | Role-selection login screen |
| `frontend/src/App.jsx` | Rewrite | AuthProvider, sidebar shell, protected routes |
| `frontend/src/index.css` | Rewrite | Full enterprise design system |
| `frontend/src/components/Sidebar.jsx` | Create | Collapsible dark sidebar with nav + account footer |
| `frontend/src/components/Navbar.jsx` | Delete content / keep file | Replaced by Sidebar — file emptied or removed from imports |
| `frontend/src/components/ItemTable.jsx` | Modify | New badge styles, mono asset codes, row hover |
| `frontend/src/pages/Dashboard.jsx` | Modify | New metric cards, category bars, activity list |
| `frontend/src/pages/InventoryList.jsx` | Modify | Student banner, hide Add Item for students |
| `frontend/src/pages/ItemDetail.jsx` | Modify | New 2-col layout, structured detail fields |
| `frontend/src/pages/AddItem.jsx` | Modify | New form card styles |
| `frontend/src/pages/Transactions.jsx` | Modify | New table styles |
| `frontend/src/pages/QRLookup.jsx` | Modify | New panel styles |

---

## Task 1: Google Fonts + AuthContext

**Files:**
- Modify: `frontend/index.html`
- Create: `frontend/src/context/AuthContext.jsx`

- [ ] **Add Google Fonts to index.html**

Replace the contents of `frontend/index.html` with:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Drone Lab Inventory</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Create AuthContext**

Create `frontend/src/context/AuthContext.jsx`:

```jsx
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
```

- [ ] **Commit**

```bash
git add frontend/index.html frontend/src/context/AuthContext.jsx
git commit -m "feat: add Google Fonts and AuthContext for role-based auth"
```

---

## Task 2: Login Page

**Files:**
- Create: `frontend/src/pages/Login.jsx`

- [ ] **Create Login.jsx**

Create `frontend/src/pages/Login.jsx`:

```jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ROLES = [
  {
    key: "admin",
    label: "Admin",
    description: "Full system access including user management",
    color: "#2563eb",
    bg: "#eff6ff",
    initials: "AD",
  },
  {
    key: "staff",
    label: "Staff",
    description: "Manage inventory, transactions, and reports",
    color: "#7c3aed",
    bg: "#faf5ff",
    initials: "ST",
  },
  {
    key: "engineer",
    label: "Lab Engineer",
    description: "Equipment maintenance and lab operations",
    color: "#16a34a",
    bg: "#f0fdf4",
    initials: "LE",
  },
  {
    key: "student",
    label: "Student",
    description: "Check in and check out equipment only",
    color: "#ea580c",
    bg: "#fff7ed",
    initials: "ST",
  },
];

export default function Login() {
  const [selected, setSelected] = useState(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  function handleContinue() {
    if (!selected) return;
    login(selected);
    navigate("/", { replace: true });
  }

  return (
    <div className="login-shell">
      <div className="login-left">
        <div className="login-brand">
          <div className="login-mark">DL</div>
          <div>
            <div className="login-brand-name">Drone Lab</div>
            <div className="login-brand-sub">Inventory System</div>
          </div>
        </div>
        <div className="login-tagline">
          <strong>Asset Management Platform</strong>
          Track, check out, and manage all drone lab equipment from a single place.
        </div>
      </div>

      <div className="login-right">
        <h1 className="login-heading">Who are you?</h1>
        <p className="login-sub">Select your role to continue.</p>

        <div className="role-grid">
          {ROLES.map((r) => (
            <button
              key={r.key}
              type="button"
              className={`role-card${selected === r.key ? " selected" : ""}`}
              onClick={() => setSelected(r.key)}
            >
              <div className="role-icon" style={{ background: r.bg }}>
                <span style={{ color: r.color, fontWeight: 700, fontSize: "13px" }}>
                  {r.initials}
                </span>
              </div>
              <div className="role-name">{r.label}</div>
              <div className="role-desc">{r.description}</div>
            </button>
          ))}
        </div>

        <button
          className="login-continue"
          disabled={!selected}
          onClick={handleContinue}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Commit**

```bash
git add frontend/src/pages/Login.jsx
git commit -m "feat: add role-selection login page"
```

---

## Task 3: Rewrite App.jsx

**Files:**
- Modify: `frontend/src/App.jsx`

- [ ] **Rewrite App.jsx**

Replace the entire contents of `frontend/src/App.jsx`:

```jsx
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import Sidebar from "./components/Sidebar.jsx";
import AddItem from "./pages/AddItem.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import InventoryList from "./pages/InventoryList.jsx";
import ItemDetail from "./pages/ItemDetail.jsx";
import Login from "./pages/Login.jsx";
import QRLookup from "./pages/QRLookup.jsx";
import Transactions from "./pages/Transactions.jsx";

function ProtectedRoute({ children, allowStudent = true }) {
  const { role } = useAuth();
  if (!role) return <Navigate to="/login" replace />;
  if (role === "student" && !allowStudent) return <Navigate to="/inventory" replace />;
  return children;
}

function AppShell() {
  const { role } = useAuth();
  const location = useLocation();
  const isLogin = location.pathname === "/login";

  if (isLogin) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-area">
        <Routes>
          <Route path="/" element={<ProtectedRoute allowStudent={false}><Dashboard /></ProtectedRoute>} />
          <Route path="/inventory" element={<ProtectedRoute><InventoryList /></ProtectedRoute>} />
          <Route path="/inventory/new" element={<ProtectedRoute allowStudent={false}><AddItem /></ProtectedRoute>} />
          <Route path="/items/:itemId" element={<ProtectedRoute><ItemDetail /></ProtectedRoute>} />
          <Route path="/qr-lookup" element={<ProtectedRoute allowStudent={false}><QRLookup /></ProtectedRoute>} />
          <Route path="/transactions" element={<ProtectedRoute allowStudent={false}><Transactions /></ProtectedRoute>} />
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to={role === "student" ? "/inventory" : "/"} replace />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
```

- [ ] **Commit**

```bash
git add frontend/src/App.jsx
git commit -m "feat: add auth routing and protected routes"
```

---

## Task 4: Create Sidebar Component

**Files:**
- Create: `frontend/src/components/Sidebar.jsx`

- [ ] **Create Sidebar.jsx**

Create `frontend/src/components/Sidebar.jsx`:

```jsx
import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ROLE_LABELS = {
  admin: "Administrator",
  staff: "Staff",
  engineer: "Lab Engineer",
  student: "Student",
};

const ROLE_INITIALS = {
  admin: "AD",
  staff: "SF",
  engineer: "LE",
  student: "ST",
};

const NAV_MAIN = [
  {
    to: "/",
    label: "Dashboard",
    studentAllowed: false,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
      </svg>
    ),
  },
  {
    to: "/inventory",
    label: "Inventory",
    studentAllowed: true,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      </svg>
    ),
  },
  {
    to: "/inventory/new",
    label: "Add Item",
    studentAllowed: false,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
    ),
  },
];

const NAV_RECORDS = [
  {
    to: "/transactions",
    label: "Transactions",
    studentAllowed: false,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/>
        <polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
      </svg>
    ),
  },
  {
    to: "/qr-lookup",
    label: "QR Lookup",
    studentAllowed: false,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="3" y="14" width="7" height="7"/>
        <line x1="14" y1="14" x2="14" y2="20"/><line x1="14" y1="17" x2="20" y2="17"/>
      </svg>
    ),
  },
];

function NavItem({ item, collapsed, isStudent }) {
  const restricted = isStudent && !item.studentAllowed;

  if (restricted) {
    return (
      <div className="nav-item nav-item--disabled">
        <span className="nav-icon">{item.icon}</span>
        {!collapsed && (
          <>
            <span className="nav-text">{item.label}</span>
            <span className="nav-restricted">Restricted</span>
          </>
        )}
      </div>
    );
  }

  return (
    <NavLink
      to={item.to}
      end={item.to === "/"}
      className={({ isActive }) => `nav-item${isActive ? " nav-item--active" : ""}`}
    >
      <span className="nav-icon">{item.icon}</span>
      {!collapsed && <span className="nav-text">{item.label}</span>}
    </NavLink>
  );
}

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { role, logout } = useAuth();
  const navigate = useNavigate();
  const isStudent = role === "student";

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <aside className={`sidebar${collapsed ? " sidebar--collapsed" : ""}`}>
      <div className="sidebar-logo">
        <div className="sidebar-mark">DL</div>
        {!collapsed && (
          <div>
            <div className="sidebar-brand">Drone Lab</div>
            <div className="sidebar-sub">Inventory System</div>
          </div>
        )}
      </div>

      <nav className="sidebar-nav">
        {!collapsed && <div className="nav-group-label">Main</div>}
        {NAV_MAIN.map((item) => (
          <NavItem key={item.to} item={item} collapsed={collapsed} isStudent={isStudent} />
        ))}

        {!collapsed && <div className="nav-group-label" style={{ marginTop: "8px" }}>Records</div>}
        {NAV_RECORDS.map((item) => (
          <NavItem key={item.to} item={item} collapsed={collapsed} isStudent={isStudent} />
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-account">
          <div className="sidebar-avatar">{ROLE_INITIALS[role]}</div>
          {!collapsed && (
            <div className="sidebar-account-info">
              <div className="sidebar-account-name">{ROLE_LABELS[role]}</div>
              <button type="button" className="sidebar-logout" onClick={handleLogout}>
                Sign out
              </button>
            </div>
          )}
        </div>
        <button
          type="button"
          className="sidebar-toggle"
          onClick={() => setCollapsed((c) => !c)}
          aria-label="Toggle sidebar"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {collapsed
              ? <><polyline points="9 18 15 12 9 6"/></>
              : <><polyline points="15 18 9 12 15 6"/></>}
          </svg>
        </button>
      </div>
    </aside>
  );
}
```

- [ ] **Commit**

```bash
git add frontend/src/components/Sidebar.jsx
git commit -m "feat: collapsible dark sidebar with role-aware nav"
```

---

## Task 5: Rewrite index.css

**Files:**
- Modify: `frontend/src/index.css`

- [ ] **Rewrite index.css**

Replace the entire contents of `frontend/src/index.css` with:

```css
/* ── Design tokens ─────────────────────────────── */
:root {
  --color-primary:        #2563eb;
  --color-primary-hover:  #1d4ed8;
  --color-primary-light:  #eff6ff;
  --color-primary-border: #bfdbfe;

  --color-sidebar:        #0f172a;
  --color-sidebar-hover:  #1e293b;
  --color-sidebar-active: #1e3a5f;
  --color-sidebar-border: #1e293b;

  --color-border:   #e2e8f0;
  --color-border-light: #f1f5f9;
  --color-surface:  #ffffff;
  --color-bg:       #f1f5f9;
  --color-text:     #0f172a;
  --color-text-2:   #334155;
  --color-muted:    #64748b;
  --color-muted-2:  #94a3b8;

  --font-body: 'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif;
  --font-mono: 'IBM Plex Mono', ui-monospace, monospace;

  --radius-sm: 4px;
  --radius:    6px;
  --radius-md: 8px;
  --radius-lg: 10px;

  color-scheme: light;
}

/* ── Reset ──────────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: var(--font-body); background: var(--color-bg); color: var(--color-text); font-size: 13px; line-height: 1.5; min-height: 100vh; }
a { color: inherit; text-decoration: none; }
button { font-family: var(--font-body); cursor: pointer; }

/* ── Shell layout ───────────────────────────────── */
.app-shell { display: flex; height: 100vh; overflow: hidden; }

.main-area { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

/* ── Sidebar ────────────────────────────────────── */
.sidebar {
  width: 220px;
  background: var(--color-sidebar);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  transition: width 0.22s ease;
  overflow: hidden;
}
.sidebar--collapsed { width: 56px; }

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px 13px 14px;
  border-bottom: 1px solid var(--color-sidebar-border);
  flex-shrink: 0;
  overflow: hidden;
  white-space: nowrap;
}
.sidebar-mark {
  width: 30px; height: 30px;
  background: var(--color-primary);
  border-radius: var(--radius);
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-weight: 700; font-size: 12px;
  flex-shrink: 0;
}
.sidebar-brand { color: #f1f5f9; font-weight: 600; font-size: 13px; }
.sidebar-sub   { color: #475569; font-size: 10px; font-weight: 400; margin-top: 1px; }

.sidebar-nav { flex: 1; padding: 8px 0; overflow: hidden; }

.nav-group-label {
  padding: 12px 13px 4px;
  font-size: 9.5px; font-weight: 600;
  color: #334155; letter-spacing: 1px; text-transform: uppercase;
  white-space: nowrap;
}

.nav-item {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 13px;
  border-left: 2px solid transparent;
  color: #94a3b8;
  font-size: 12.5px; font-weight: 500;
  white-space: nowrap; overflow: hidden;
  transition: background 0.1s;
  text-decoration: none;
}
.nav-item:hover { background: var(--color-sidebar-hover); color: #cbd5e1; }
.nav-item--active { background: var(--color-sidebar-active) !important; border-left-color: var(--color-primary); color: #e2e8f0 !important; }
.nav-item--disabled { opacity: 0.4; cursor: not-allowed; }
.nav-item--disabled:hover { background: transparent; }

.nav-icon { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.nav-text { flex: 1; }
.nav-restricted {
  font-size: 9px; font-weight: 600; letter-spacing: 0.3px;
  background: #1e293b; color: #475569;
  padding: 2px 5px; border-radius: 3px; margin-left: auto;
}

.sidebar-footer {
  border-top: 1px solid var(--color-sidebar-border);
  padding: 10px 13px;
  display: flex; align-items: center; justify-content: space-between;
  flex-shrink: 0;
}
.sidebar-account { display: flex; align-items: center; gap: 8px; min-width: 0; overflow: hidden; }
.sidebar-avatar {
  width: 28px; height: 28px; border-radius: 50%;
  background: #1e3a5f; color: #60a5fa;
  display: flex; align-items: center; justify-content: center;
  font-size: 9.5px; font-weight: 700; flex-shrink: 0;
}
.sidebar-account-info { min-width: 0; overflow: hidden; }
.sidebar-account-name { font-size: 11.5px; font-weight: 600; color: #e2e8f0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sidebar-logout {
  background: none; border: none; padding: 0;
  font-size: 10px; color: #475569; cursor: pointer;
  font-family: var(--font-body); font-weight: 500;
  display: flex; align-items: center; gap: 4px; margin-top: 1px;
}
.sidebar-logout:hover { color: #94a3b8; }

.sidebar-toggle {
  width: 26px; height: 26px;
  background: #1e293b; border: none; border-radius: var(--radius-sm);
  display: flex; align-items: center; justify-content: center;
  color: #475569; flex-shrink: 0; transition: background 0.1s;
}
.sidebar-toggle:hover { background: #334155; color: #94a3b8; }

/* ── Topbar ─────────────────────────────────────── */
.topbar {
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  padding: 0 24px;
  height: 54px;
  display: flex; align-items: center; justify-content: space-between;
  flex-shrink: 0;
}
.topbar-left { display: flex; flex-direction: column; gap: 1px; }
.topbar-breadcrumb { font-size: 10px; font-weight: 500; color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.6px; }
.topbar-title { font-size: 16px; font-weight: 700; color: var(--color-text); line-height: 1.1; }
.topbar-actions { display: flex; align-items: center; gap: 8px; }

/* ── Buttons ────────────────────────────────────── */
.btn {
  display: inline-flex; align-items: center; justify-content: center;
  gap: 6px; border-radius: var(--radius); font-size: 12px; font-weight: 600;
  padding: 7px 14px; border: 1px solid transparent; cursor: pointer;
  font-family: var(--font-body); white-space: nowrap; min-height: 34px;
}
.btn-primary { background: var(--color-primary); color: #fff; border-color: var(--color-primary); }
.btn-primary:hover { background: var(--color-primary-hover); border-color: var(--color-primary-hover); }
.btn-secondary { background: var(--color-surface); color: var(--color-text-2); border-color: var(--color-border); }
.btn-secondary:hover { background: #f8fafc; }
.btn:disabled { opacity: 0.45; cursor: not-allowed; }

/* ── Page content area ──────────────────────────── */
.page-content { flex: 1; overflow-y: auto; padding: 22px 24px; }
.page-stack { display: flex; flex-direction: column; gap: 16px; }

/* ── Panels / Cards ─────────────────────────────── */
.panel {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}
.panel-head {
  padding: 13px 18px;
  border-bottom: 1px solid var(--color-border-light);
  display: flex; justify-content: space-between; align-items: center;
}
.panel-head h2, .panel-head h3 { font-size: 13px; font-weight: 600; color: var(--color-text); margin: 0; }
.panel-head span { font-size: 11px; color: var(--color-muted-2); }
.panel-body { padding: 14px 18px; }

/* ── Metric cards ───────────────────────────────── */
.metric-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.metric-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 16px 18px;
}
.metric-label { font-size: 10.5px; font-weight: 600; color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 10px; }
.metric-value { font-size: 28px; font-weight: 700; color: var(--color-text); line-height: 1; margin-bottom: 5px; }
.metric-value--blue  { color: var(--color-primary); }
.metric-value--green { color: #16a34a; }
.metric-footer { font-size: 10.5px; color: var(--color-muted-2); display: flex; align-items: center; gap: 4px; }
.metric-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; }

/* ── Split panel row ────────────────────────────── */
.panel-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

/* ── Category bar rows ──────────────────────────── */
.cat-row { display: flex; align-items: center; gap: 10px; padding: 7px 0; border-bottom: 1px solid var(--color-border-light); }
.cat-row:last-child { border-bottom: none; }
.cat-name { font-size: 11.5px; font-weight: 500; color: var(--color-text-2); width: 150px; flex-shrink: 0; }
.cat-bar-wrap { flex: 1; height: 3px; background: #f1f5f9; border-radius: 999px; overflow: hidden; }
.cat-bar { height: 100%; background: var(--color-primary); border-radius: 999px; }
.cat-count { font-size: 11px; font-weight: 600; color: var(--color-muted); min-width: 16px; text-align: right; }

/* ── Activity list ──────────────────────────────── */
.activity-row { display: flex; align-items: flex-start; gap: 10px; padding: 7px 0; border-bottom: 1px solid var(--color-border-light); }
.activity-row:last-child { border-bottom: none; }
.activity-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; margin-top: 4px; }
.activity-dot--in  { background: #22c55e; }
.activity-dot--out { background: #ef4444; }
.activity-text { font-size: 11.5px; color: var(--color-text-2); line-height: 1.45; }
.activity-text strong { color: var(--color-text); font-weight: 600; }
.activity-time { font-size: 10.5px; color: var(--color-muted-2); margin-top: 1px; }

/* ── Table ──────────────────────────────────────── */
.table-wrap { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); overflow: hidden; }
.table-toolbar { padding: 12px 16px; border-bottom: 1px solid var(--color-border-light); display: flex; gap: 8px; align-items: center; }
.table-search {
  flex: 1; height: 32px; border: 1px solid var(--color-border); border-radius: var(--radius);
  padding: 0 10px; font-size: 12px; color: var(--color-text); background: #f8fafc;
  font-family: var(--font-body); outline: none;
}
.table-search:focus { border-color: var(--color-primary); background: var(--color-surface); }
.table-filter {
  height: 32px; padding: 0 10px; border: 1px solid var(--color-border); border-radius: var(--radius);
  background: var(--color-surface); font-size: 12px; color: var(--color-text-2);
  font-family: var(--font-body); cursor: pointer; outline: none;
}

table { width: 100%; border-collapse: collapse; min-width: 700px; }
.table-wrap { overflow-x: auto; }
thead th {
  padding: 9px 14px; font-size: 10.5px; font-weight: 600; color: var(--color-muted);
  text-transform: uppercase; letter-spacing: 0.5px;
  background: #f8fafc; border-bottom: 1px solid var(--color-border); text-align: left;
  white-space: nowrap;
}
tbody td { padding: 10px 14px; border-bottom: 1px solid var(--color-border-light); font-size: 12.5px; color: var(--color-text-2); vertical-align: middle; }
tbody tr:last-child td { border-bottom: none; }
tbody tr:hover td { background: #fafbfc; }

.asset-code { font-family: var(--font-mono); font-weight: 600; color: var(--color-primary); font-size: 12px; }
.item-name { font-weight: 600; color: var(--color-text); font-size: 12.5px; }
.item-sub  { font-size: 10.5px; color: var(--color-muted-2); margin-top: 1px; }

/* ── Sort button ────────────────────────────────── */
.sort-btn {
  display: flex; align-items: center; gap: 5px;
  background: transparent; border: none; padding: 9px 14px;
  font-size: 10.5px; font-weight: 600; color: var(--color-muted);
  text-transform: uppercase; letter-spacing: 0.5px;
  cursor: pointer; font-family: var(--font-body); width: 100%;
}
.sort-btn:hover { background: #f0f3f7; color: var(--color-text-2); }
thead th { padding: 0; }
.sort-icon { color: #a0adb8; flex-shrink: 0; height: 11px; width: 9px; }
.sort-icon.active { color: var(--color-primary); }

/* ── Badges ─────────────────────────────────────── */
.badge {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 8px; border-radius: var(--radius-sm);
  font-size: 10.5px; font-weight: 600; white-space: nowrap;
  border: 1px solid transparent;
}
.badge--available  { background: #f0fdf4; color: #15803d; border-color: #bbf7d0; }
.badge--checked-out{ background: #fef2f2; color: #dc2626; border-color: #fecaca; }
.badge--excellent  { background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; }
.badge--good       { background: #f0fdf4; color: #16a34a; border-color: #bbf7d0; }
.badge--fair       { background: #fefce8; color: #a16207; border-color: #fde68a; }
.badge--poor       { background: #fef2f2; color: #dc2626; border-color: #fecaca; }

/* ── Row action buttons ─────────────────────────── */
.row-actions { display: flex; gap: 6px; }
.row-btn {
  padding: 4px 10px; border-radius: var(--radius-sm);
  font-size: 11px; font-weight: 600; border: 1px solid var(--color-border);
  background: var(--color-surface); cursor: pointer; color: var(--color-text-2);
  font-family: var(--font-body); min-height: 28px;
}
.row-btn:hover { background: #f8fafc; }
.row-btn--primary { border-color: var(--color-primary-border); color: var(--color-primary); background: var(--color-primary-light); }
.row-btn--primary:hover { background: #dbeafe; }
.row-btn:disabled { opacity: 0.35; cursor: not-allowed; }

/* ── Form ───────────────────────────────────────── */
.form-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 20px 24px; }
.form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
.form-grid .wide { grid-column: 1 / -1; }
.form-group { display: flex; flex-direction: column; gap: 5px; }
.form-label { font-size: 11.5px; font-weight: 600; color: var(--color-text-2); }
.form-input, .form-select, .form-textarea {
  border: 1px solid var(--color-border); border-radius: var(--radius);
  background: var(--color-surface); color: var(--color-text);
  font: inherit; padding: 7px 10px; font-size: 12.5px; outline: none;
  transition: border-color 0.12s;
}
.form-input:focus, .form-select:focus, .form-textarea:focus { border-color: var(--color-primary); }
.form-textarea { resize: vertical; min-height: 80px; }
.form-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; }

/* ── Modal ──────────────────────────────────────── */
.modal-backdrop {
  position: fixed; inset: 0; z-index: 50;
  background: rgba(15, 23, 42, 0.45);
  display: flex; align-items: center; justify-content: center; padding: 18px;
}
.modal {
  background: var(--color-surface); border-radius: var(--radius-md);
  box-shadow: 0 20px 60px rgba(15, 23, 42, 0.25);
  padding: 20px; width: 100%; max-width: 480px;
  display: flex; flex-direction: column; gap: 14px;
}
.modal-header { display: flex; justify-content: space-between; align-items: flex-start; }
.modal-header h2 { font-size: 15px; font-weight: 700; }
.modal-close {
  width: 30px; height: 30px; border-radius: var(--radius-sm);
  background: #f1f5f9; border: none; cursor: pointer; color: var(--color-text-2);
  display: flex; align-items: center; justify-content: center; font-size: 16px;
}
.modal-close:hover { background: #e2e8f0; }
.modal-actions { display: flex; gap: 8px; justify-content: flex-end; }

/* ── Info banner ────────────────────────────────── */
.info-banner {
  background: var(--color-primary-light); border: 1px solid var(--color-primary-border);
  border-radius: var(--radius); padding: 10px 14px;
  font-size: 12px; color: #1d4ed8; font-weight: 500;
  display: flex; align-items: center; gap: 8px;
}

/* ── Login page ─────────────────────────────────── */
.login-shell { display: flex; min-height: 100vh; }
.login-left {
  width: 340px; flex-shrink: 0; background: var(--color-sidebar);
  display: flex; flex-direction: column; padding: 40px 36px;
}
.login-brand { display: flex; align-items: center; gap: 10px; margin-bottom: 48px; }
.login-mark { width: 34px; height: 34px; background: var(--color-primary); border-radius: var(--radius); display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 13px; }
.login-brand-name { color: #f1f5f9; font-weight: 700; font-size: 14px; }
.login-brand-sub  { color: #475569; font-size: 10.5px; margin-top: 1px; }
.login-tagline { margin-top: auto; border-top: 1px solid #1e293b; padding-top: 20px; color: #64748b; font-size: 12px; line-height: 1.7; }
.login-tagline strong { display: block; color: #e2e8f0; font-size: 13px; margin-bottom: 5px; }

.login-right { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; background: #f8fafc; }
.login-heading { font-size: 22px; font-weight: 700; color: var(--color-text); margin-bottom: 6px; }
.login-sub { font-size: 12.5px; color: var(--color-muted); margin-bottom: 28px; }
.role-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; width: 100%; max-width: 380px; }
.role-card {
  border: 1.5px solid var(--color-border); border-radius: var(--radius-md);
  padding: 16px; cursor: pointer; text-align: left;
  background: var(--color-surface); transition: border-color 0.12s, background 0.12s;
  display: flex; flex-direction: column; gap: 7px;
}
.role-card:hover { border-color: var(--color-primary); background: var(--color-primary-light); }
.role-card.selected { border-color: var(--color-primary); background: var(--color-primary-light); }
.role-icon { width: 32px; height: 32px; border-radius: var(--radius); display: flex; align-items: center; justify-content: center; }
.role-name { font-size: 13px; font-weight: 700; color: var(--color-text); }
.role-desc { font-size: 10.5px; color: var(--color-muted); line-height: 1.4; }
.login-continue {
  margin-top: 18px; width: 100%; max-width: 380px;
  padding: 10px; background: var(--color-primary); color: #fff;
  border: none; border-radius: var(--radius-md); font-size: 13px; font-weight: 600;
  cursor: pointer; font-family: var(--font-body); transition: background 0.12s;
}
.login-continue:hover { background: var(--color-primary-hover); }
.login-continue:disabled { background: #cbd5e1; cursor: not-allowed; }

/* ── Detail layout ──────────────────────────────── */
.detail-layout { display: grid; grid-template-columns: 1fr 270px; gap: 16px; align-items: start; }
.detail-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.detail-field { display: flex; flex-direction: column; gap: 3px; }
.detail-field--wide { grid-column: 1 / -1; }
.detail-field-label { font-size: 10px; font-weight: 600; color: var(--color-muted-2); text-transform: uppercase; letter-spacing: 0.6px; }
.detail-field-value { font-size: 12.5px; font-weight: 500; color: var(--color-text); }

/* ── QR panel ───────────────────────────────────── */
.qr-panel { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 18px; text-align: center; }
.qr-image { width: 150px; height: 150px; border: 1px solid var(--color-border); border-radius: var(--radius); object-fit: contain; background: #f8fafc; }
.qr-empty { width: 150px; height: 150px; border: 1px solid var(--color-border); border-radius: var(--radius); background: #f8fafc; display: flex; align-items: center; justify-content: center; color: var(--color-muted); font-size: 12px; }
.qr-code-label { font-family: var(--font-mono); font-weight: 600; font-size: 12px; color: var(--color-primary); letter-spacing: 1px; }

/* ── User pills ─────────────────────────────────── */
.user-list { display: flex; flex-direction: column; gap: 8px; }
.user-row { display: flex; align-items: center; gap: 8px; padding: 7px 0; border-bottom: 1px solid var(--color-border-light); }
.user-row:last-child { border-bottom: none; }
.user-avatar { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 9.5px; font-weight: 700; flex-shrink: 0; }
.user-name { font-size: 12px; font-weight: 600; color: var(--color-text); }
.user-role { font-size: 10px; color: var(--color-muted-2); }

/* ── Lookup form ────────────────────────────────── */
.lookup-form { display: grid; grid-template-columns: 1fr auto; gap: 8px; }

/* ── Alerts ─────────────────────────────────────── */
.alert { background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; border-radius: var(--radius); padding: 12px 14px; font-size: 12.5px; font-weight: 500; }
.loading { background: var(--color-surface); border: 1px solid var(--color-border); color: var(--color-muted); border-radius: var(--radius); padding: 14px; font-size: 12.5px; }
.empty-state { background: var(--color-surface); border: 1px solid var(--color-border); color: var(--color-muted); border-radius: var(--radius); padding: 32px; text-align: center; font-size: 12.5px; }

/* ── Responsive ─────────────────────────────────── */
@media (max-width: 900px) {
  .metric-grid { grid-template-columns: 1fr 1fr; }
  .panel-row { grid-template-columns: 1fr; }
  .detail-layout { grid-template-columns: 1fr; }
  .detail-grid { grid-template-columns: 1fr 1fr; }
  .form-grid { grid-template-columns: 1fr; }
  .login-left { display: none; }
}
@media (max-width: 600px) {
  .metric-grid { grid-template-columns: 1fr; }
  .role-grid { grid-template-columns: 1fr; }
  .page-content { padding: 14px 16px; }
}
```

- [ ] **Commit**

```bash
git add frontend/src/index.css
git commit -m "feat: rewrite index.css with enterprise design system"
```

---

## Task 6: Update Dashboard

**Files:**
- Modify: `frontend/src/pages/Dashboard.jsx`

- [ ] **Rewrite Dashboard.jsx**

Replace entire contents of `frontend/src/pages/Dashboard.jsx`:

```jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { categoriesApi } from "../api/categories";
import { getErrorMessage } from "../api/client";
import { itemsApi } from "../api/items";
import { transactionsApi } from "../api/transactions";
import { usersApi } from "../api/users";

export default function Dashboard() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [itemData, catData, txData, userData] = await Promise.all([
          itemsApi.list(),
          categoriesApi.list(),
          transactionsApi.list({ limit: 8 }),
          usersApi.list(),
        ]);
        setItems(itemData);
        setCategories(catData);
        setTransactions(txData);
        setUsers(userData);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const totalUnits = items.reduce((s, i) => s + i.quantity, 0);
  const availableUnits = items.reduce((s, i) => s + i.available_quantity, 0);
  const checkedOut = totalUnits - availableUnits;

  const catCounts = categories.map((c) => ({
    name: c.name,
    count: items.filter((i) => i.category_id === c.id).length,
  })).filter((c) => c.count > 0);
  const maxCount = Math.max(...catCounts.map((c) => c.count), 1);

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <span className="topbar-breadcrumb">Overview</span>
          <span className="topbar-title">Dashboard</span>
        </div>
        <div className="topbar-actions">
          <Link className="btn btn-primary" to="/inventory/new">Add Item</Link>
        </div>
      </div>

      <div className="page-content">
        {error && <div className="alert">{error}</div>}
        {loading ? (
          <div className="loading">Loading dashboard...</div>
        ) : (
          <div className="page-stack">
            <div className="metric-grid">
              <div className="metric-card">
                <div className="metric-label">Total Assets</div>
                <div className="metric-value metric-value--blue">{items.length}</div>
                <div className="metric-footer">Across {categories.length} categories</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Available</div>
                <div className="metric-value metric-value--green">{availableUnits}</div>
                <div className="metric-footer">
                  <span className="metric-dot" style={{ background: "#22c55e" }} />
                  {totalUnits > 0 ? Math.round((availableUnits / totalUnits) * 100) : 0}% availability
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Checked Out</div>
                <div className="metric-value">{checkedOut}</div>
                <div className="metric-footer">{checkedOut === 0 ? "No active loans" : "Active loans"}</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Locations</div>
                <div className="metric-value" style={{ color: "#7c3aed" }}>{users.length}</div>
                <div className="metric-footer">Registered users</div>
              </div>
            </div>

            <div className="panel-row">
              <div className="panel">
                <div className="panel-head">
                  <h3>Inventory by Category</h3>
                  <span>{catCounts.length} categories</span>
                </div>
                <div className="panel-body">
                  {catCounts.map((c) => (
                    <div key={c.name} className="cat-row">
                      <span className="cat-name">{c.name}</span>
                      <div className="cat-bar-wrap">
                        <div className="cat-bar" style={{ width: `${(c.count / maxCount) * 100}%` }} />
                      </div>
                      <span className="cat-count">{c.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel">
                <div className="panel-head">
                  <h3>Recent Activity</h3>
                  <span>Last {transactions.length} events</span>
                </div>
                <div className="panel-body">
                  {transactions.length === 0 && <p className="empty-state" style={{ padding: "12px 0", border: "none", textAlign: "left" }}>No transactions yet.</p>}
                  {transactions.map((tx) => (
                    <div key={tx.id} className="activity-row">
                      <div className={`activity-dot activity-dot--${tx.type === "checkout" ? "out" : "in"}`} />
                      <div>
                        <div className="activity-text">
                          <strong>{tx.type === "checkout" ? "Check Out" : "Check In"}</strong>
                          {" — "}{tx.item_id && `Item #${tx.item_id}`}
                          {tx.quantity > 1 && ` ×${tx.quantity}`}
                        </div>
                        <div className="activity-time">{new Date(tx.created_at).toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
```

- [ ] **Commit**

```bash
git add frontend/src/pages/Dashboard.jsx
git commit -m "feat: update dashboard with enterprise metric cards and activity feed"
```

---

## Task 7: Update InventoryList

**Files:**
- Modify: `frontend/src/pages/InventoryList.jsx`

- [ ] **Update InventoryList.jsx**

Replace entire contents of `frontend/src/pages/InventoryList.jsx`:

```jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { categoriesApi } from "../api/categories";
import { getErrorMessage } from "../api/client";
import { itemsApi } from "../api/items";
import { locationsApi } from "../api/locations";
import { usersApi } from "../api/users";
import CheckinModal from "../components/CheckinModal.jsx";
import CheckoutModal from "../components/CheckoutModal.jsx";
import ItemTable from "../components/ItemTable.jsx";
import { useAuth } from "../context/AuthContext";

export default function InventoryList() {
  const { role } = useAuth();
  const isStudent = role === "student";

  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState("");
  const [conditionFilter, setConditionFilter] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [checkoutItem, setCheckoutItem] = useState(null);
  const [checkinItem, setCheckinItem] = useState(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [itemData, categoryData, locationData, userData] = await Promise.all([
        itemsApi.list(), categoriesApi.list(), locationsApi.list(), usersApi.list(),
      ]);
      setItems(itemData);
      setCategories(categoryData);
      setLocations(locationData);
      setUsers(userData);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (conditionFilter && item.condition !== conditionFilter) return false;
      if (!q) return true;
      return [item.asset_code, item.name, item.serial_number, item.condition]
        .filter(Boolean).some((v) => v.toLowerCase().includes(q));
    });
  }, [items, query, conditionFilter]);

  async function checkout(payload) {
    await itemsApi.checkout(checkoutItem.id, payload);
    setCheckoutItem(null);
    await load();
  }

  async function checkin(payload) {
    await itemsApi.checkin(checkinItem.id, payload);
    setCheckinItem(null);
    await load();
  }

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <span className="topbar-breadcrumb">Assets</span>
          <span className="topbar-title">Inventory</span>
        </div>
        <div className="topbar-actions">
          {!isStudent && (
            <Link className="btn btn-primary" to="/inventory/new">Add Item</Link>
          )}
        </div>
      </div>

      <div className="page-content">
        <div className="page-stack">
          {isStudent && (
            <div className="info-banner">
              You have student access — check in and check out only. Contact a lab engineer for other requests.
            </div>
          )}
          {error && <div className="alert">{error}</div>}
          <div className="table-wrap">
            <div className="table-toolbar">
              <input
                className="table-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search asset, name, serial, condition…"
              />
              <select className="table-filter" value={conditionFilter} onChange={(e) => setConditionFilter(e.target.value)}>
                <option value="">All conditions</option>
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
              </select>
            </div>
            {loading ? (
              <div className="loading" style={{ borderRadius: 0, border: "none", borderTop: "1px solid var(--color-border-light)" }}>
                Loading inventory...
              </div>
            ) : (
              <ItemTable
                items={filteredItems}
                categories={categories}
                locations={locations}
                onCheckout={setCheckoutItem}
                onCheckin={setCheckinItem}
              />
            )}
          </div>
        </div>
      </div>

      <CheckoutModal item={checkoutItem} users={users} onClose={() => setCheckoutItem(null)} onSubmit={checkout} />
      <CheckinModal item={checkinItem} users={users} onClose={() => setCheckinItem(null)} onSubmit={checkin} />
    </>
  );
}
```

- [ ] **Commit**

```bash
git add frontend/src/pages/InventoryList.jsx
git commit -m "feat: update inventory list with student banner and new layout"
```

---

## Task 8: Update ItemTable

**Files:**
- Modify: `frontend/src/components/ItemTable.jsx`

- [ ] **Update ItemTable.jsx**

Replace entire contents of `frontend/src/components/ItemTable.jsx`:

```jsx
import { useState } from "react";
import { Link } from "react-router-dom";

function nameById(collection, id) {
  return collection.find((e) => e.id === id)?.name || "—";
}

const COLUMNS = [
  { key: "asset_code", label: "Asset" },
  { key: "name", label: "Name" },
  { key: "category", label: "Category" },
  { key: "location", label: "Location" },
  { key: "available", label: "Available" },
  { key: "condition", label: "Condition" },
  { key: "status", label: "Status" },
];

function SortIcon({ direction }) {
  if (direction === "asc") return (
    <svg className="sort-icon active" viewBox="0 0 10 12" fill="currentColor"><path d="M5 1l4 5H1z"/></svg>
  );
  if (direction === "desc") return (
    <svg className="sort-icon active" viewBox="0 0 10 12" fill="currentColor"><path d="M5 11L1 6h8z"/></svg>
  );
  return (
    <svg className="sort-icon" viewBox="0 0 10 14" fill="currentColor"><path d="M5 1l4 5H1zM5 13L1 8h8z"/></svg>
  );
}

function conditionBadgeClass(condition) {
  const map = { excellent: "badge--excellent", good: "badge--good", fair: "badge--fair", poor: "badge--poor" };
  return map[condition] || "badge--good";
}

export default function ItemTable({ items, categories = [], locations = [], onCheckout, onCheckin }) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("none");

  function handleSort(key) {
    if (sortKey !== key) { setSortKey(key); setSortDir("asc"); return; }
    if (sortDir === "asc") { setSortDir("desc"); return; }
    setSortDir("none"); setSortKey(null);
  }

  function getValue(item, key) {
    if (key === "category") return nameById(categories, item.category_id);
    if (key === "location") return nameById(locations, item.location_id);
    if (key === "available") return item.available_quantity;
    if (key === "status") return item.available_quantity < item.quantity ? "checked out" : "available";
    return item[key] ?? "";
  }

  const sorted = [...items].sort((a, b) => {
    if (!sortKey || sortDir === "none") return 0;
    const av = getValue(a, sortKey), bv = getValue(b, sortKey);
    const cmp = typeof av === "number" ? av - bv : String(av).localeCompare(String(bv));
    return sortDir === "asc" ? cmp : -cmp;
  });

  if (items.length === 0) {
    return <div className="empty-state">No items match the current filters.</div>;
  }

  return (
    <table>
      <thead>
        <tr>
          {COLUMNS.map((col) => (
            <th key={col.key}>
              <button className="sort-btn" onClick={() => handleSort(col.key)}>
                {col.label}
                <SortIcon direction={sortKey === col.key ? sortDir : "none"} />
              </button>
            </th>
          ))}
          <th><div style={{ padding: "9px 14px" }}>Actions</div></th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((item) => {
          const checkedOut = item.quantity - item.available_quantity;
          const isAvailable = checkedOut === 0;
          return (
            <tr key={item.id}>
              <td>
                <Link className="asset-code" to={`/items/${item.id}`}>{item.asset_code}</Link>
              </td>
              <td>
                <div className="item-name">{item.name}</div>
                {item.serial_number && <div className="item-sub">SN: {item.serial_number}</div>}
              </td>
              <td>{nameById(categories, item.category_id)}</td>
              <td>{nameById(locations, item.location_id)}</td>
              <td>{item.available_quantity} / {item.quantity}</td>
              <td>
                <span className={`badge ${conditionBadgeClass(item.condition)}`}>
                  {item.condition}
                </span>
              </td>
              <td>
                <span className={`badge ${isAvailable ? "badge--available" : "badge--checked-out"}`}>
                  {isAvailable ? "Available" : "Checked Out"}
                </span>
              </td>
              <td>
                <div className="row-actions">
                  <button className="row-btn row-btn--primary" onClick={() => onCheckout(item)} disabled={item.available_quantity < 1}>
                    Check Out
                  </button>
                  <button className="row-btn" onClick={() => onCheckin(item)} disabled={checkedOut < 1}>
                    Check In
                  </button>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
```

- [ ] **Commit**

```bash
git add frontend/src/components/ItemTable.jsx
git commit -m "feat: update ItemTable with enterprise badge styles and mono asset codes"
```

---

## Task 9: Update Modals

**Files:**
- Modify: `frontend/src/components/CheckoutModal.jsx`
- Modify: `frontend/src/components/CheckinModal.jsx`

- [ ] **Update CheckoutModal.jsx class names**

In `frontend/src/components/CheckoutModal.jsx`, replace CSS class names to use new design system:
- `modal-backdrop` → keep as `modal-backdrop`
- `modal` → keep as `modal`
- `modal-header` → keep as `modal-header`
- `icon-button` → replace with `modal-close`
- `modal-actions` → keep as `modal-actions`
- All `<label>` wrapping `<input>` → wrap in `<div className="form-group">` with `<label className="form-label">` and `<input className="form-input">` / `<select className="form-select">` / `<textarea className="form-textarea">`
- Buttons: replace `button` with `<button className="btn btn-primary">` and `button.secondary` with `<button className="btn btn-secondary">`

Read the file and apply these class replacements throughout.

- [ ] **Update CheckinModal.jsx class names**

Apply the same class name replacements to `frontend/src/components/CheckinModal.jsx`.

- [ ] **Commit**

```bash
git add frontend/src/components/CheckoutModal.jsx frontend/src/components/CheckinModal.jsx
git commit -m "feat: update modal components to use new design system classes"
```

---

## Task 10: Update Remaining Pages

**Files:**
- Modify: `frontend/src/pages/ItemDetail.jsx`
- Modify: `frontend/src/pages/AddItem.jsx`
- Modify: `frontend/src/pages/Transactions.jsx`
- Modify: `frontend/src/pages/QRLookup.jsx`

- [ ] **Update ItemDetail.jsx**

Replace the `<section className="page-stack">` wrapper and all inner structure:
- Outer wrapper: remove `page-stack`, instead render topbar outside content
- Add topbar at top: breadcrumb = `Inventory / {item.asset_code}`, title = `{item.name}`, actions = Check In + Check Out buttons
- Content: `<div className="page-content"><div className="detail-layout">` — left col has two panels (Asset Information, Transaction History), right col has QR panel + users panel
- Asset information: `<div className="detail-grid">` with `detail-field` divs (label + value)
- QR panel: use `.qr-panel`, `.qr-image`, `.qr-empty`, `.qr-code-label`
- Users: `.user-list` with `.user-row`, `.user-avatar`, `.user-name`, `.user-role`
- Transactions: `.activity-row` with `.activity-dot--in`/`.activity-dot--out`
- All badge classes updated to new `.badge .badge--*` format

- [ ] **Update AddItem.jsx**

- Remove `page-stack` / `panel` outer wrapper
- Add topbar: breadcrumb = `Inventory`, title = `Add Item`, no action buttons
- Wrap form in `<div className="page-content"><div className="form-card"><div className="form-grid">`
- Each field: `<div className="form-group"><label className="form-label">` + `<input className="form-input">` / `<select className="form-select">` / `<textarea className="form-textarea">`
- Submit button: `<button className="btn btn-primary">`
- Cancel link: `<Link className="btn btn-secondary">`
- Actions in `<div className="form-actions">`

- [ ] **Update Transactions.jsx**

- Remove `page-stack` outer wrapper
- Add topbar: breadcrumb = `Records`, title = `Transactions`, no action buttons
- Wrap table in `<div className="page-content"><div className="table-wrap">`
- Toolbar: `<div className="table-toolbar">` with `<select className="table-filter">`
- Table header/cell classes: same as ItemTable (use `sort-btn`, `badge badge--*`)
- Status badges: checkout = `badge badge--checked-out`, checkin = `badge badge--available`

- [ ] **Update QRLookup.jsx**

- Remove `page-stack` outer wrapper
- Add topbar: breadcrumb = `Tools`, title = `QR Lookup`
- Content: `<div className="page-content">` with `<div className="panel">` containing the lookup form
- Form: `<div className="lookup-form">` with `<input className="form-input">` and `<button className="btn btn-primary">`
- Result: render inside a panel using `detail-field`, `badge`, `qr-panel` classes

- [ ] **Commit**

```bash
git add frontend/src/pages/ItemDetail.jsx frontend/src/pages/AddItem.jsx frontend/src/pages/Transactions.jsx frontend/src/pages/QRLookup.jsx
git commit -m "feat: update all pages to enterprise layout with topbar and new CSS classes"
```

---

## Task 11: Cleanup

**Files:**
- Modify: `frontend/src/components/Navbar.jsx`
- Modify: `frontend/.gitignore` (if needed)

- [ ] **Empty Navbar.jsx** (Sidebar replaces it; keep file to avoid import errors if referenced elsewhere)

Replace contents of `frontend/src/components/Navbar.jsx` with:

```jsx
// Replaced by Sidebar component
export default function Navbar() { return null; }
```

- [ ] **Add .superpowers to .gitignore**

Add `.superpowers/` to `/home/youssef/Documents/Inventory_management_system/.gitignore`.

- [ ] **Verify the app**

```bash
cd /home/youssef/Documents/Inventory_management_system/frontend
npm run dev
```

Open http://localhost:5173 and verify:
1. Redirects to `/login` immediately
2. All 4 role cards show, Continue disabled until one selected
3. Admin/Staff/Engineer: see all nav items, no student banner
4. Student: only Inventory accessible, others show "Restricted", banner visible
5. Sidebar collapse/expand works with arrow toggle
6. Check out and check in modals still work
7. Sorting on inventory table works
8. Sign out returns to login

- [ ] **Final commit**

```bash
git add frontend/src/components/Navbar.jsx .gitignore
git commit -m "feat: complete enterprise frontend redesign with auth and collapsible sidebar"
```

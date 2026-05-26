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
    to: "/check-in-out",
    label: "Check In / Out",
    studentAllowed: true,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 12l2 2 4-4"/><path d="M21 12c0 4.97-4.03 9-9 9S3 16.97 3 12 7.03 3 12 3s9 4.03 9 9z"/>
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
      end={item.to === "/" || item.to === "/inventory"}
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

      <div className="sidebar-footer" style={collapsed ? { justifyContent: 'center' } : {}}>
        {!collapsed && (
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
        )}
        <button
          type="button"
          className="sidebar-toggle"
          onClick={() => setCollapsed((c) => !c)}
          aria-label="Toggle sidebar"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {collapsed
              ? <polyline points="9 18 15 12 9 6"/>
              : <polyline points="15 18 9 12 15 6"/>}
          </svg>
        </button>
      </div>
    </aside>
  );
}

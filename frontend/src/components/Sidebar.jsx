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
    to: "/checkout-desk",
    label: "Checkout Desk",
    studentAllowed: true,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18"/>
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
  const [mainOpen, setMainOpen] = useState(true);
  const [recordsOpen, setRecordsOpen] = useState(true);
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
        {!collapsed && (
          <button
            type="button"
            className="nav-group-label"
            onClick={() => setMainOpen((open) => !open)}
            aria-expanded={mainOpen}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "none",
              border: 0,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            <span>Main</span>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                transform: mainOpen ? "rotate(90deg)" : "rotate(0deg)",
                transition: "transform 160ms ease",
              }}
              aria-hidden="true"
            >
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        )}
        {collapsed ? (
          NAV_MAIN.map((item) => (
            <NavItem key={item.to} item={item} collapsed={collapsed} isStudent={isStudent} />
          ))
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateRows: mainOpen ? '1fr' : '0fr',
            transition: 'grid-template-rows 220ms ease',
          }}>
            <div style={{ overflow: 'hidden' }}>
              {NAV_MAIN.map((item) => (
                <NavItem key={item.to} item={item} collapsed={collapsed} isStudent={isStudent} />
              ))}
            </div>
          </div>
        )}

        {!collapsed && (
          <button
            type="button"
            className="nav-group-label"
            onClick={() => setRecordsOpen((open) => !open)}
            aria-expanded={recordsOpen}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "none",
              border: 0,
              marginTop: "8px",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            <span>Records</span>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                transform: recordsOpen ? "rotate(90deg)" : "rotate(0deg)",
                transition: "transform 160ms ease",
              }}
              aria-hidden="true"
            >
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        )}
        {collapsed ? (
          NAV_RECORDS.map((item) => (
            <NavItem key={item.to} item={item} collapsed={collapsed} isStudent={isStudent} />
          ))
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateRows: recordsOpen ? '1fr' : '0fr',
            transition: 'grid-template-rows 220ms ease',
          }}>
            <div style={{ overflow: 'hidden' }}>
              {NAV_RECORDS.map((item) => (
                <NavItem key={item.to} item={item} collapsed={collapsed} isStudent={isStudent} />
              ))}
            </div>
          </div>
        )}
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

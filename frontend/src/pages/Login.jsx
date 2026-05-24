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
    initials: "SF",
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

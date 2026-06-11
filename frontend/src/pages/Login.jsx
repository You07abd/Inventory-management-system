import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getErrorMessage } from "../api/client";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || !password) return;
    setSubmitting(true);
    setError(null);
    try {
      const user = await login(email.trim(), password);
      // Students land on the inventory; everyone else on the dashboard.
      navigate(user.role === "student" ? "/inventory" : "/", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
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
        <h1 className="login-heading">Sign in</h1>
        <p className="login-sub">Use your lab account to continue.</p>

        <form className="login-form-fields" onSubmit={handleSubmit} style={{ width: "100%", maxWidth: 380 }}>
          {error && <div className="alert" style={{ marginBottom: 14 }}>{error}</div>}

          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label" htmlFor="email">Email</label>
            <input
              id="email"
              className="form-input"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: 4 }}>
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              className="form-input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button className="login-continue" type="submit" disabled={submitting || !email || !password}>
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

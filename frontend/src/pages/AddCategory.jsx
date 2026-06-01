import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { categoriesApi } from "../api/categories";
import { getErrorMessage } from "../api/client";
import { ICON_MAP } from "../utils/categoryMeta.jsx";

export default function AddCategory() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    icon: "",
    color: "#2563eb",
  });

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await categoriesApi.create({
        name: form.name,
        description: form.description || null,
        icon: form.icon || null,
        color: form.color,
      });
      navigate("/");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <span className="topbar-breadcrumb">Inventory</span>
          <span className="topbar-title">Add Category</span>
        </div>
      </div>

      <div className="page-content">
        {error && <div className="alert" style={{ marginBottom: "16px" }}>{error}</div>}
        <form className="form-card" onSubmit={submit}>
          <div className="form-grid">
            <div className="form-group wide">
              <label className="form-label">Name</label>
              <input className="form-input" value={form.name} onChange={(e) => update("name", e.target.value)} required />
            </div>
            <div className="form-group wide">
              <label className="form-label">Description</label>
              <textarea className="form-textarea" value={form.description} onChange={(e) => update("description", e.target.value)} rows="3" />
            </div>
            <div className="form-group wide">
              <label className="form-label">Icon</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {Object.entries(ICON_MAP).map(([name, Icon]) => {
                  const selected = form.icon === name;
                  return (
                    <button
                      key={name}
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => update("icon", selected ? "" : name)}
                      aria-pressed={selected}
                      title={name}
                      style={{
                        borderColor: selected ? "#2563eb" : undefined,
                        color: selected ? "#2563eb" : undefined,
                        minWidth: "42px",
                        justifyContent: "center",
                      }}
                    >
                      <Icon />
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Color</label>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <input className="form-input" type="color" value={form.color} onChange={(e) => update("color", e.target.value)} style={{ width: "56px", padding: "3px" }} />
                <span style={{ fontSize: "12.5px", color: "var(--color-text-2)" }}>{form.color}</span>
              </div>
            </div>
          </div>
          <div className="form-actions">
            <Link className="btn btn-secondary" to="/">Cancel</Link>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving..." : "Create Category"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

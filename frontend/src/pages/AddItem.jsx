import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { categoriesApi } from "../api/categories";
import { getErrorMessage } from "../api/client";
import { itemsApi } from "../api/items";
import { locationsApi } from "../api/locations";

export default function AddItem() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    serial_number: "",
    quantity: 1,
    condition: "good",
    category_id: "",
    location_id: "",
  });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [cats, locs] = await Promise.all([categoriesApi.list(), locationsApi.list()]);
        if (!active) return;
        setCategories(cats);
        setLocations(locs);
      } catch (err) {
        if (active) setError(getErrorMessage(err));
      }
    })();
    return () => { active = false; };
  }, []);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        name: form.name,
        description: form.description || null,
        serial_number: form.serial_number || null,
        quantity: Number(form.quantity),
        condition: form.condition,
        category_id: form.category_id ? Number(form.category_id) : null,
        location_id: form.location_id ? Number(form.location_id) : null,
      };
      const item = await itemsApi.create(payload);
      navigate(`/items/${item.id}`);
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
          <span className="topbar-title">Add Item</span>
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
            <div className="form-group">
              <label className="form-label">Serial Number</label>
              <input className="form-input" value={form.serial_number} onChange={(e) => update("serial_number", e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Quantity</label>
              <input className="form-input" type="number" min="1" value={form.quantity} onChange={(e) => update("quantity", e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Condition</label>
              <select className="form-select" value={form.condition} onChange={(e) => update("condition", e.target.value)}>
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
                <option value="needs_inspection">Needs Inspection</option>
                <option value="damaged">Damaged</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-select" value={form.category_id} onChange={(e) => update("category_id", e.target.value)}>
                <option value="">Unassigned</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Location</label>
              <select className="form-select" value={form.location_id} onChange={(e) => update("location_id", e.target.value)}>
                <option value="">Unassigned</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>{location.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-actions">
            <Link className="btn btn-secondary" to="/inventory">Cancel</Link>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving…" : "Create Item"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

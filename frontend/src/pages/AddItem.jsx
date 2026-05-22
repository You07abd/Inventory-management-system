import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

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
    location_id: ""
  });

  useEffect(() => {
    async function loadOptions() {
      try {
        const [categoryData, locationData] = await Promise.all([categoriesApi.list(), locationsApi.list()]);
        setCategories(categoryData);
        setLocations(locationData);
      } catch (err) {
        setError(getErrorMessage(err));
      }
    }
    loadOptions();
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
        available_quantity: null,
        condition: form.condition,
        status: "available",
        category_id: form.category_id ? Number(form.category_id) : null,
        location_id: form.location_id ? Number(form.location_id) : null
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
    <section className="page-stack narrow">
      <div className="page-header">
        <div>
          <span className="label">New Asset</span>
          <h1>Add Inventory Item</h1>
        </div>
      </div>
      {error && <div className="alert">{error}</div>}
      <form className="form-grid" onSubmit={submit}>
        <label className="wide">
          Name
          <input value={form.name} onChange={(event) => update("name", event.target.value)} required />
        </label>
        <label className="wide">
          Description
          <textarea value={form.description} onChange={(event) => update("description", event.target.value)} rows="3" />
        </label>
        <label>
          Serial Number
          <input value={form.serial_number} onChange={(event) => update("serial_number", event.target.value)} />
        </label>
        <label>
          Quantity
          <input type="number" min="1" value={form.quantity} onChange={(event) => update("quantity", event.target.value)} required />
        </label>
        <label>
          Condition
          <select value={form.condition} onChange={(event) => update("condition", event.target.value)}>
            <option value="excellent">Excellent</option>
            <option value="good">Good</option>
            <option value="needs_inspection">Needs inspection</option>
            <option value="damaged">Damaged</option>
          </select>
        </label>
        <label>
          Category
          <select value={form.category_id} onChange={(event) => update("category_id", event.target.value)}>
            <option value="">Unassigned</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Location
          <select value={form.location_id} onChange={(event) => update("location_id", event.target.value)}>
            <option value="">Unassigned</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </label>
        <div className="form-actions wide">
          <button type="submit" disabled={saving}>
            {saving ? "Saving" : "Create Item"}
          </button>
        </div>
      </form>
    </section>
  );
}

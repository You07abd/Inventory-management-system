import { useState } from "react";

export default function CheckinModal({ item, users, onClose, onSubmit }) {
  const [form, setForm] = useState({
    user_id: item?.current_holder_id || users[0]?.id || "",
    quantity: 1,
    condition_on_return: item?.condition || "good",
    notes: ""
  });
  const [saving, setSaving] = useState(false);

  if (!item) {
    return null;
  }

  const maxQuantity = Math.max((item.quantity || 0) - (item.available_quantity || 0), 0);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await onSubmit({
        user_id: Number(form.user_id),
        quantity: Number(form.quantity),
        condition_on_return: form.condition_on_return || null,
        notes: form.notes || null
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <form className="modal" onSubmit={submit}>
        <div className="modal-header">
          <div>
            <span className="label">Checkin</span>
            <h2>{item.name}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
            X
          </button>
        </div>
        <label>
          User
          <select value={form.user_id} onChange={(event) => update("user_id", event.target.value)} required>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.role})
              </option>
            ))}
          </select>
        </label>
        <label>
          Quantity
          <input
            type="number"
            min="1"
            max={maxQuantity}
            value={form.quantity}
            onChange={(event) => update("quantity", event.target.value)}
            required
          />
        </label>
        <label>
          Return Condition
          <select value={form.condition_on_return} onChange={(event) => update("condition_on_return", event.target.value)}>
            <option value="excellent">Excellent</option>
            <option value="good">Good</option>
            <option value="needs_inspection">Needs inspection</option>
            <option value="damaged">Damaged</option>
          </select>
        </label>
        <label>
          Notes
          <textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} rows="3" />
        </label>
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" disabled={saving || maxQuantity < 1 || users.length === 0}>
            {saving ? "Saving" : "Checkin"}
          </button>
        </div>
      </form>
    </div>
  );
}

import { useState } from "react";

export default function CheckoutModal({ item, users, onClose, onSubmit }) {
  const [form, setForm] = useState({
    user_id: users[0]?.id || "",
    quantity: 1,
    due_date: "",
    notes: ""
  });
  const [saving, setSaving] = useState(false);

  if (!item) {
    return null;
  }

  const maxQuantity = Math.max(item.available_quantity || 0, 0);

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
        due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
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
            <span className="label">Checkout</span>
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
          Due Date
          <input type="datetime-local" value={form.due_date} onChange={(event) => update("due_date", event.target.value)} />
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
            {saving ? "Saving" : "Checkout"}
          </button>
        </div>
      </form>
    </div>
  );
}

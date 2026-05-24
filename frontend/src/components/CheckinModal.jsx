import { useState } from "react";

export default function CheckinModal({ item, users, onClose, onSubmit }) {
  const [form, setForm] = useState({
    user_id: item?.current_holder_id || users[0]?.id || "",
    quantity: 1,
    condition_on_return: item?.condition || "good",
    notes: ""
  });
  const [saving, setSaving] = useState(false);

  if (!item) return null;

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
            <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "3px" }}>Check In</div>
            <h2>{item.name}</h2>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="form-group">
          <label className="form-label">User</label>
          <select className="form-select" value={form.user_id} onChange={(e) => update("user_id", e.target.value)} required>
            {users.map((user) => (
              <option key={user.id} value={user.id}>{user.name} ({user.role})</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Quantity</label>
          <input className="form-input" type="number" min="1" max={maxQuantity} value={form.quantity} onChange={(e) => update("quantity", e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">Return Condition</label>
          <select className="form-select" value={form.condition_on_return} onChange={(e) => update("condition_on_return", e.target.value)}>
            <option value="excellent">Excellent</option>
            <option value="good">Good</option>
            <option value="needs_inspection">Needs inspection</option>
            <option value="damaged">Damaged</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Notes</label>
          <textarea className="form-textarea" value={form.notes} onChange={(e) => update("notes", e.target.value)} rows="3" />
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving || maxQuantity < 1 || users.length === 0}>
            {saving ? "Saving…" : "Check In"}
          </button>
        </div>
      </form>
    </div>
  );
}

import { useState } from "react";

// First-class audited stock adjustment: set an absolute quantity or apply a
// +/- delta, always with a required reason.
export default function AdjustStockModal({ item, onClose, onSubmit }) {
  const [mode, setMode] = useState("delta"); // 'delta' | 'set'
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  if (!item) return null;

  const checkedOut = item.quantity - item.available_quantity;
  const parsed = Number(amount);
  const hasAmount = amount !== "" && !Number.isNaN(parsed);
  const newQuantity = !hasAmount ? null : mode === "set" ? parsed : item.quantity + parsed;
  const invalid = newQuantity != null && (newQuantity < 0 || newQuantity < checkedOut);

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await onSubmit(
        mode === "set"
          ? { new_quantity: parsed, reason }
          : { delta: parsed, reason }
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <form className="modal" onSubmit={submit}>
        <div className="modal-header">
          <div>
            <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "3px" }}>Adjust Stock</div>
            <h2>{item.name}</h2>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <p style={{ color: "var(--color-muted)", fontSize: "12px", margin: "0 0 12px" }}>
          Current: <strong>{item.quantity}</strong> total · {item.available_quantity} available
          {checkedOut > 0 && ` · ${checkedOut} checked out`}
        </p>

        <div className="form-group">
          <label className="form-label">Adjustment Type</label>
          <div style={{ display: "flex", gap: "8px" }}>
            <button type="button" className={`btn ${mode === "delta" ? "btn-primary" : "btn-secondary"}`} onClick={() => setMode("delta")}>
              Add / Remove
            </button>
            <button type="button" className={`btn ${mode === "set" ? "btn-primary" : "btn-secondary"}`} onClick={() => setMode("set")}>
              Set Quantity
            </button>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">{mode === "set" ? "New Quantity" : "Change (use negative to remove)"}</label>
          <input
            className="form-input"
            type="number"
            value={amount}
            min={mode === "set" ? 0 : undefined}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={mode === "set" ? String(item.quantity) : "e.g. 5 or -3"}
            required
          />
          {hasAmount && (
            <p style={{ margin: "5px 0 0", fontSize: "12px", color: invalid ? "#dc2626" : "var(--color-muted)" }}>
              {invalid
                ? newQuantity < 0
                  ? "Quantity cannot go below zero."
                  : `Quantity cannot go below the ${checkedOut} currently checked out.`
                : `New total: ${newQuantity}`}
            </p>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Reason</label>
          <textarea
            className="form-textarea"
            rows="2"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Annual stock count, damaged units written off, new purchase received"
            required
          />
        </div>

        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving || !hasAmount || invalid || !reason.trim()}>
            {saving ? "Saving…" : "Apply Adjustment"}
          </button>
        </div>
      </form>
    </div>
  );
}

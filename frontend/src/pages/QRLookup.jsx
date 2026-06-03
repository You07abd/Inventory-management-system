import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getErrorMessage } from "../api/client";
import { unitsApi } from "../api/units";
import { usersApi } from "../api/users";
import QRCodeDisplay from "../components/QRCodeDisplay.jsx";

function conditionBadgeClass(condition) {
  const map = { good: "badge--good", needs_repair: "badge--fair", damaged: "badge--poor" };
  return map[condition] || "badge--good";
}

export default function QRLookup() {
  const [assetCode, setAssetCode] = useState("");
  const [unit, setUnit] = useState(null);
  const [users, setUsers] = useState([]);
  const [actionOpen, setActionOpen] = useState(null);
  const [actionForm, setActionForm] = useState({ user_id: "", conditionReport: "", notes: "", due_date: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    usersApi.list().then((data) => {
      if (active) setUsers(data);
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setUnit(null);
    try {
      const result = await unitsApi.getByAssetCode(assetCode.trim());
      setUnit(result);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function checkoutUnit() {
    setError("");
    try {
      await unitsApi.checkout(unit.id, {
        user_id: Number(actionForm.user_id),
        notes: actionForm.notes || null,
        due_date: actionForm.due_date ? actionForm.due_date + "T00:00:00" : null,
      });
      const refreshed = await unitsApi.getByAssetCode(unit.asset_code);
      setUnit(refreshed);
      setActionOpen(null);
      setActionForm({ user_id: "", conditionReport: "", notes: "", due_date: "" });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function checkinUnit() {
    setError("");
    try {
      await unitsApi.checkin(unit.id, {
        user_id: unit.current_holder_id,
        condition_on_return: actionForm.conditionReport || null,
        notes: actionForm.notes || null,
      });
      if (actionForm.conditionReport) {
        await unitsApi.update(unit.id, { condition: actionForm.conditionReport });
      }
      const refreshed = await unitsApi.getByAssetCode(unit.asset_code);
      setUnit(refreshed);
      setActionOpen(null);
      setActionForm({ user_id: "", conditionReport: "", notes: "", due_date: "" });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <span className="topbar-breadcrumb">Tools</span>
          <span className="topbar-title">QR Lookup</span>
        </div>
      </div>

      <div className="page-content">
        <div className="page-stack">
          <div className="panel">
            <div className="panel-head"><h3>Find Asset by Code</h3></div>
            <div className="panel-body">
              <form className="lookup-form" onSubmit={submit}>
                <input
                  className="form-input"
                  value={assetCode}
                  onChange={(e) => setAssetCode(e.target.value)}
                  placeholder="SAFCSP-DRONE-0001"
                  autoFocus
                  required
                />
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? "Searching…" : "Lookup"}
                </button>
              </form>
            </div>
          </div>

          {error && <div className="alert">{error}</div>}

          {unit && (
            <div className="panel">
              <div className="panel-head">
                <h3>{unit.asset_code}</h3>
                <span className={`badge ${unit.status === "available" ? "badge--available" : "badge--checked-out"}`}>
                  {unit.status === "available" ? "Available" : "Checked Out"}
                </span>
              </div>
              <div className="panel-body">
                <div style={{ display: "flex", gap: "24px", alignItems: "flex-start" }}>
                  <QRCodeDisplay item={unit} />
                  <div className="detail-grid" style={{ flex: 1 }}>
                    <div className="detail-field">
                      <div className="detail-field-label">Asset Code</div>
                      <div className="detail-field-value" style={{ fontFamily: "var(--font-mono)", color: "var(--color-primary)", fontWeight: 600 }}>{unit.asset_code}</div>
                    </div>
                    <div className="detail-field">
                      <div className="detail-field-label">Serial Number</div>
                      <div className="detail-field-value">{unit.serial_number || "—"}</div>
                    </div>
                    <div className="detail-field">
                      <div className="detail-field-label">Condition</div>
                      <div className="detail-field-value">
                        <span className={`badge ${conditionBadgeClass(unit.condition)}`}>{unit.condition?.replace(/_/g, " ")}</span>
                      </div>
                    </div>
                    <div className="detail-field">
                      <div className="detail-field-label">Status</div>
                      <div className="detail-field-value">
                        <span className={`inv-card__chip inv-card__chip--${unit.status === "available" ? "available" : "out"}`}>
                          {unit.status === "available" ? "Available" : "Checked Out"}
                        </span>
                      </div>
                    </div>
                    <div className="detail-field">
                      <div className="detail-field-label">Location</div>
                      <div className="detail-field-value">{unit.location_name || "—"}</div>
                    </div>
                    <div className="detail-field">
                      <div className="detail-field-label">Holder</div>
                      <div className="detail-field-value">{unit.current_holder_name || "—"}</div>
                    </div>
                    <div className="detail-field detail-field--wide">
                      <div className="detail-field-label">Parent Model</div>
                      <div className="detail-field-value">
                        {unit.item_name || "—"}
                        {unit.item_asset_code ? <span style={{ fontFamily: "var(--font-mono)", color: "var(--color-muted)", marginLeft: "8px" }}>{unit.item_asset_code}</span> : null}
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: "14px", display: "flex", gap: "8px" }}>
                  {unit.item_id && <Link className="btn btn-secondary" to={`/items/${unit.item_id}`}>Open Model</Link>}
                  {unit.status === "available" && <button className="btn btn-primary" onClick={() => setActionOpen("checkout")}>Check Out</button>}
                  {unit.status === "checked_out" && <button className="btn btn-primary" onClick={() => setActionOpen("checkin")}>Check In</button>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {actionOpen === "checkout" && (
        <div className="modal-backdrop" onClick={() => setActionOpen(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Check Out Unit</h2>
              <button className="modal-close" onClick={() => setActionOpen(null)}>×</button>
            </div>
            <p style={{ fontWeight: 600 }}>{unit?.asset_code}</p>
            <div className="form-grid" style={{ marginTop: "12px" }}>
              <div className="form-group">
                <label className="form-label">User *</label>
                <select className="form-select" value={actionForm.user_id}
                  onChange={(e) => setActionForm((f) => ({ ...f, user_id: e.target.value }))} required>
                  <option value="">Select user</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Expected Return Date</label>
                <input className="form-input" type="date" min={new Date().toLocaleDateString("en-CA")}
                  value={actionForm.due_date} onChange={(e) => setActionForm((f) => ({ ...f, due_date: e.target.value }))} />
              </div>
              <div className="form-group wide">
                <label className="form-label">Notes</label>
                <textarea className="form-textarea" rows={2} value={actionForm.notes}
                  onChange={(e) => setActionForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setActionOpen(null)}>Cancel</button>
              <button className="btn btn-primary" disabled={!actionForm.user_id} onClick={checkoutUnit}>Check Out</button>
            </div>
          </div>
        </div>
      )}

      {actionOpen === "checkin" && (
        <div className="modal-backdrop" onClick={() => setActionOpen(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Check In Unit</h2>
              <button className="modal-close" onClick={() => setActionOpen(null)}>×</button>
            </div>
            <p style={{ fontWeight: 600 }}>{unit?.asset_code}</p>
            <div className="form-grid" style={{ marginTop: "12px" }}>
              <div className="form-group wide">
                <label className="form-label">Notes</label>
                <textarea className="form-textarea" rows={2} value={actionForm.notes}
                  onChange={(e) => setActionForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
              <div className="form-group wide">
                <label className="form-label">Flag Condition Issue</label>
                <select className="form-select" value={actionForm.conditionReport}
                  onChange={(e) => setActionForm((f) => ({ ...f, conditionReport: e.target.value }))}
                  style={{ color: actionForm.conditionReport ? "#dc2626" : "inherit" }}>
                  <option value="">None — returned fine</option>
                  <option value="needs_repair">Needs Repair</option>
                  <option value="damaged">Damaged</option>
                </select>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setActionOpen(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={checkinUnit}>Check In</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

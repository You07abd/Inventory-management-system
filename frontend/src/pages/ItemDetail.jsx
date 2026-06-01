import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { categoriesApi } from "../api/categories";
import { getErrorMessage } from "../api/client";
import { itemsApi } from "../api/items";
import { locationsApi } from "../api/locations";
import { transactionsApi } from "../api/transactions";
import { unitsApi } from "../api/units";
import { usersApi } from "../api/users";
import CheckinModal from "../components/CheckinModal.jsx";
import CheckoutModal from "../components/CheckoutModal.jsx";
import QRCodeDisplay from "../components/QRCodeDisplay.jsx";

function findName(collection, id) {
  return collection.find((entry) => entry.id === id)?.name || "Unassigned";
}

function conditionBadgeClass(condition) {
  const map = { excellent: "badge--excellent", good: "badge--good", fair: "badge--fair", poor: "badge--poor" };
  return map[condition] || "badge--good";
}

export default function ItemDetail() {
  const { itemId } = useParams();
  const [item, setItem] = useState(null);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [units, setUnits] = useState([]);
  const [users, setUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [unitError, setUnitError] = useState("");
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [addUnitForm, setAddUnitForm] = useState({ serial_number: "", condition: "good", location_id: "" });
  const [addingUnit, setAddingUnit] = useState(false);
  const [editingUnitId, setEditingUnitId] = useState(null);
  const [editUnitForm, setEditUnitForm] = useState({});
  const [qrUnit, setQrUnit] = useState(null); // unit object or null
  const [checkoutUnitId, setCheckoutUnitId] = useState(null);
  const [checkinUnitId, setCheckinUnitId] = useState(null);
  const [unitActionForm, setUnitActionForm] = useState({ user_id: "", condition_on_return: "good", notes: "", due_date: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [itemData, categoryData, locationData, userData, transactionData, unitData] = await Promise.all([
        itemsApi.get(itemId),
        categoriesApi.list(),
        locationsApi.list(),
        usersApi.list(),
        transactionsApi.list({ item_id: itemId }),
        unitsApi.listByItem(itemId),
      ]);
      setItem(itemData);
      setCategories(categoryData);
      setLocations(locationData);
      setUsers(userData);
      setTransactions(transactionData);
      setUnits(unitData);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    (async () => {
      try {
        const [itemData, categoryData, locationData, userData, transactionData, unitData] = await Promise.all([
          itemsApi.get(itemId),
          categoriesApi.list(),
          locationsApi.list(),
          usersApi.list(),
          transactionsApi.list({ item_id: itemId }),
          unitsApi.listByItem(itemId),
        ]);
        if (!active) return;
        setItem(itemData);
        setCategories(categoryData);
        setLocations(locationData);
        setUsers(userData);
        setTransactions(transactionData);
        setUnits(unitData);
      } catch (err) {
        if (active) setError(getErrorMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [itemId]);

  const checkedOut = useMemo(() => (!item ? 0 : item.quantity - item.available_quantity), [item]);

  async function checkout(payload) {
    try {
      await itemsApi.checkout(item.id, payload);
      setCheckoutOpen(false);
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function checkin(payload) {
    try {
      await itemsApi.checkin(item.id, payload);
      setCheckinOpen(false);
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function addUnit() {
    setAddingUnit(true);
    setUnitError("");
    try {
      await unitsApi.create(itemId, {
        serial_number: addUnitForm.serial_number || null,
        condition: addUnitForm.condition,
        location_id: addUnitForm.location_id ? Number(addUnitForm.location_id) : null,
      });
      setShowAddUnit(false);
      setAddUnitForm({ serial_number: "", condition: "good", location_id: "" });
      const refreshed = await unitsApi.listByItem(itemId);
      setUnits(refreshed);
      await load();
    } catch (err) {
      setUnitError(getErrorMessage(err));
    } finally {
      setAddingUnit(false);
    }
  }

  async function saveEditUnit(unitId) {
    setUnitError("");
    try {
      await unitsApi.update(unitId, {
        serial_number: editUnitForm.serial_number || null,
        condition: editUnitForm.condition,
        location_id: editUnitForm.location_id ? Number(editUnitForm.location_id) : null,
        notes: editUnitForm.notes || null,
      });
      setEditingUnitId(null);
      const refreshed = await unitsApi.listByItem(itemId);
      setUnits(refreshed);
    } catch (err) {
      setUnitError(getErrorMessage(err));
    }
  }

  async function deleteUnit(unitId) {
    if (!confirm("Delete this unit? This cannot be undone.")) return;
    setUnitError("");
    try {
      await unitsApi.remove(unitId);
      const refreshed = await unitsApi.listByItem(itemId);
      setUnits(refreshed);
      await load();
    } catch (err) {
      setUnitError(getErrorMessage(err));
    }
  }

  function printUnitQR(unit) {
    const win = window.open('', '_blank', 'width=420,height=540');
    win.document.write(`<!DOCTYPE html><html><head><title>QR — ${unit.asset_code}</title>
      <style>
        body { font-family: sans-serif; text-align: center; padding: 32px; margin: 0; }
        img { width: 220px; height: 220px; display: block; margin: 0 auto 16px; }
        h2 { margin: 0 0 6px; font-size: 18px; font-family: monospace; }
        p { margin: 0; color: #666; font-size: 13px; }
      </style></head><body>
      <img src="${unit.qr_code}" alt="QR code" />
      <h2>${unit.asset_code}</h2>
      <p>${item?.name ?? ''}</p>
      <script>window.onload = function() { window.print(); };<\/script>
      </body></html>`);
    win.document.close();
  }

  async function checkoutUnit() {
    setUnitError("");
    try {
      await unitsApi.checkout(checkoutUnitId, {
        user_id: Number(unitActionForm.user_id),
        notes: unitActionForm.notes || null,
        due_date: unitActionForm.due_date ? unitActionForm.due_date + "T00:00:00" : null,
      });
      setCheckoutUnitId(null);
      setUnitActionForm({ user_id: "", condition_on_return: "good", notes: "", due_date: "" });
      const refreshed = await unitsApi.listByItem(itemId);
      setUnits(refreshed);
      await load();
    } catch (err) {
      setUnitError(getErrorMessage(err));
    }
  }

  async function checkinUnit() {
    const unit = units.find((u) => u.id === checkinUnitId);
    setUnitError("");
    try {
      await unitsApi.checkin(checkinUnitId, {
        user_id: unit.current_holder_id,
        condition_on_return: unitActionForm.condition_on_return,
        notes: unitActionForm.notes || null,
      });
      setCheckinUnitId(null);
      setUnitActionForm({ user_id: "", condition_on_return: "good", notes: "", due_date: "" });
      const refreshed = await unitsApi.listByItem(itemId);
      setUnits(refreshed);
      await load();
    } catch (err) {
      setUnitError(getErrorMessage(err));
    }
  }

  if (loading) return <div className="loading" style={{ margin: "24px" }}>Loading item...</div>;
  if (error) return <div className="alert" style={{ margin: "24px" }}>{error}</div>;
  if (!item) return <div className="empty-state" style={{ margin: "24px" }}>Item not found.</div>;

  const isAvailable = checkedOut === 0;

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <span className="topbar-breadcrumb">Inventory / {item.asset_code}</span>
          <span className="topbar-title">{item.name}</span>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-secondary" onClick={() => setCheckinOpen(true)} disabled={checkedOut < 1}>Check In</button>
          <button className="btn btn-primary" onClick={() => setCheckoutOpen(true)} disabled={item.available_quantity < 1}>Check Out</button>
        </div>
      </div>

      <div className="page-content">
        <div className="page-stack">
          <div className="detail-layout">
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="panel">
                <div className="panel-head">
                  <h3>Asset Information</h3>
                  <span className={`badge ${isAvailable ? "badge--available" : "badge--checked-out"}`}>
                    {isAvailable ? "Available" : "Checked Out"}
                  </span>
                </div>
                <div className="panel-body">
                  <div className="detail-grid">
                    <div className="detail-field">
                      <div className="detail-field-label">Asset Code</div>
                      <div className="detail-field-value" style={{ fontFamily: "var(--font-mono)", color: "var(--color-primary)", fontWeight: 600 }}>{item.asset_code}</div>
                    </div>
                    <div className="detail-field">
                      <div className="detail-field-label">Serial Number</div>
                      <div className="detail-field-value">{item.serial_number || "—"}</div>
                    </div>
                    <div className="detail-field">
                      <div className="detail-field-label">Condition</div>
                      <div className="detail-field-value">
                        <span className={`badge ${conditionBadgeClass(item.condition)}`}>{item.condition}</span>
                      </div>
                    </div>
                    <div className="detail-field">
                      <div className="detail-field-label">Category</div>
                      <div className="detail-field-value">{findName(categories, item.category_id)}</div>
                    </div>
                    <div className="detail-field">
                      <div className="detail-field-label">Location</div>
                      <div className="detail-field-value">{findName(locations, item.location_id)}</div>
                    </div>
                    <div className="detail-field">
                      <div className="detail-field-label">Availability</div>
                      <div className="detail-field-value">{item.available_quantity} / {item.quantity} units</div>
                    </div>
                    {item.description && (
                      <div className="detail-field detail-field--wide">
                        <div className="detail-field-label">Description</div>
                        <div className="detail-field-value">{item.description}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="panel">
                <div className="panel-head">
                  <h3>Transaction History</h3>
                  <span>{transactions.length} records</span>
                </div>
                <div className="panel-body">
                  {transactions.length === 0 && <div style={{ color: "var(--color-muted)", fontSize: "12px" }}>No transactions for this item.</div>}
                  {transactions.map((tx) => (
                    <div key={tx.id} className="activity-row">
                      <div className={`activity-dot activity-dot--${tx.type === "checkout" ? "out" : "in"}`} />
                      <div>
                        <div className="activity-text">
                          <strong>{tx.type === "checkout" ? "Check Out" : "Check In"}</strong>
                          {" — "}Qty {tx.quantity} · User #{tx.user_id}
                        </div>
                        <div className="activity-time">{new Date(tx.created_at).toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="panel">
                <div className="panel-head"><h3>QR Code</h3></div>
                <QRCodeDisplay item={item} />
              </div>
            </div>
          </div>

          {/* Physical Units Section */}
          <div className="panel">
            <div className="panel-head">
              <h3>Physical Units ({units.length})</h3>
              <button className="btn btn-primary" onClick={() => setShowAddUnit((v) => !v)}>
                {showAddUnit ? "Cancel" : "+ Add Unit"}
              </button>
            </div>

            {showAddUnit && (
              <div className="panel-body" style={{ borderBottom: "1px solid var(--color-border-light)" }}>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Serial Number</label>
                    <input className="form-input" value={addUnitForm.serial_number}
                      onChange={(e) => setAddUnitForm((f) => ({ ...f, serial_number: e.target.value }))}
                      placeholder="Optional" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Condition</label>
                    <select className="form-select" value={addUnitForm.condition}
                      onChange={(e) => setAddUnitForm((f) => ({ ...f, condition: e.target.value }))}>
                      <option value="excellent">Excellent</option>
                      <option value="good">Good</option>
                      <option value="fair">Fair</option>
                      <option value="poor">Poor</option>
                      <option value="needs_inspection">Needs Inspection</option>
                      <option value="damaged">Damaged</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Location</label>
                    <select className="form-select" value={addUnitForm.location_id}
                      onChange={(e) => setAddUnitForm((f) => ({ ...f, location_id: e.target.value }))}>
                      <option value="">Default (inherit from model)</option>
                      {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>
                </div>
                {unitError && <div className="alert" style={{ marginTop: "8px" }}>{unitError}</div>}
                <button className="btn btn-primary" style={{ marginTop: "12px" }} onClick={addUnit} disabled={addingUnit}>
                  {addingUnit ? "Adding..." : "Add Unit"}
                </button>
              </div>
            )}

            <div className="table-wrap">
              <table className="inv-table">
                <thead>
                  <tr>
                    <th><div style={{ padding: "9px 14px" }}>#</div></th>
                    <th><div style={{ padding: "9px 14px" }}>Asset Code</div></th>
                    <th><div style={{ padding: "9px 14px" }}>Serial Number</div></th>
                    <th><div style={{ padding: "9px 14px" }}>Condition</div></th>
                    <th><div style={{ padding: "9px 14px" }}>Status</div></th>
                    <th><div style={{ padding: "9px 14px" }}>Location</div></th>
                    <th><div style={{ padding: "9px 14px" }}>Holder</div></th>
                    <th><div style={{ padding: "9px 14px" }}>Actions</div></th>
                  </tr>
                </thead>
                <tbody>
                  {units.length === 0 && (
                    <tr><td colSpan={8}><div className="empty-state">No units yet. Add one above.</div></td></tr>
                  )}
                  {units.map((unit) => (
                    <tr key={unit.id}>
                      <td style={{ color: "var(--color-muted)", fontSize: "12px" }}>{unit.unit_number}</td>
                      <td><span className="asset-code">{unit.asset_code}</span></td>
                      <td>
                        {editingUnitId === unit.id ? (
                          <input className="form-input" style={{ width: "140px" }}
                            value={editUnitForm.serial_number || ""}
                            onChange={(e) => setEditUnitForm((f) => ({ ...f, serial_number: e.target.value }))} />
                        ) : (
                          <span style={{ color: "var(--color-muted)", fontSize: "12px" }}>{unit.serial_number || "—"}</span>
                        )}
                      </td>
                      <td>
                        {editingUnitId === unit.id ? (
                          <select className="form-select" value={editUnitForm.condition}
                            onChange={(e) => setEditUnitForm((f) => ({ ...f, condition: e.target.value }))}>
                            <option value="excellent">Excellent</option>
                            <option value="good">Good</option>
                            <option value="fair">Fair</option>
                            <option value="poor">Poor</option>
                            <option value="needs_inspection">Needs Inspection</option>
                            <option value="damaged">Damaged</option>
                          </select>
                        ) : (
                          <span style={{ fontSize: "12px", textTransform: "capitalize" }}>{unit.condition.replace(/_/g, " ")}</span>
                        )}
                      </td>
                      <td>
                        <span className={"inv-card__chip inv-card__chip--" + (unit.status === "available" ? "available" : "out")}>
                          {unit.status === "available" ? "Available" : "Checked Out"}
                        </span>
                      </td>
                      <td>
                        {editingUnitId === unit.id ? (
                          <select className="form-select" value={editUnitForm.location_id || ""}
                            onChange={(e) => setEditUnitForm((f) => ({ ...f, location_id: e.target.value }))}>
                            <option value="">—</option>
                            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                          </select>
                        ) : (
                          <span style={{ color: "var(--color-muted)", fontSize: "12px" }}>{unit.location_name || "—"}</span>
                        )}
                      </td>
                      <td style={{ color: "var(--color-muted)", fontSize: "12px" }}>{unit.current_holder_name || "—"}</td>
                      <td>
                        {editingUnitId === unit.id ? (
                          <div className="row-actions">
                            <button className="row-btn row-btn--primary" onClick={() => saveEditUnit(unit.id)}>Save</button>
                            <button className="row-btn" onClick={() => setEditingUnitId(null)}>Cancel</button>
                          </div>
                        ) : (
                          <div className="row-actions">
                            <button className='row-btn' onClick={() => setQrUnit(unit)}>QR</button>
                            <button className="row-btn" onClick={() => { setEditingUnitId(unit.id); setEditUnitForm({ serial_number: unit.serial_number || "", condition: unit.condition, location_id: unit.location_id || "", notes: unit.notes || "" }); }}>Edit</button>
                            {unit.status === "available" && (
                              <button className="row-btn row-btn--primary" onClick={() => { setCheckoutUnitId(unit.id); setUnitActionForm({ user_id: "", condition_on_return: "good", notes: "", due_date: "" }); }}>Out</button>
                            )}
                            {unit.status === "checked_out" && (
                              <button className="row-btn" onClick={() => { setCheckinUnitId(unit.id); setUnitActionForm({ user_id: "", condition_on_return: "good", notes: "", due_date: "" }); }}>In</button>
                            )}
                            <button className="row-btn" style={{ color: "#dc2626" }} onClick={() => deleteUnit(unit.id)}>Del</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Unit Checkout Modal */}
      {checkoutUnitId && (() => {
        const unit = units.find((u) => u.id === checkoutUnitId);
        return (
          <div className="modal-backdrop" onClick={() => setCheckoutUnitId(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Check Out Unit</h2>
                <button className="modal-close" onClick={() => setCheckoutUnitId(null)}>×</button>
              </div>
              <p style={{ fontWeight: 600 }}>{unit?.asset_code}</p>
              <p style={{ color: "var(--color-muted)", fontSize: "13px", marginTop: "4px" }}>{item?.name}</p>
              <div className="form-grid" style={{ marginTop: "12px" }}>
                <div className="form-group">
                  <label className="form-label">User *</label>
                  <select className="form-select" value={unitActionForm.user_id}
                    onChange={(e) => setUnitActionForm((f) => ({ ...f, user_id: e.target.value }))} required>
                    <option value="">Select user</option>
                    {users.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Expected Return Date</label>
                  <input className="form-input" type="date" min={new Date().toLocaleDateString("en-CA")}
                    value={unitActionForm.due_date} onChange={(e) => setUnitActionForm((f) => ({ ...f, due_date: e.target.value }))} />
                </div>
                <div className="form-group wide">
                  <label className="form-label">Notes</label>
                  <textarea className="form-textarea" rows={2} value={unitActionForm.notes}
                    onChange={(e) => setUnitActionForm((f) => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>
              {unitError && <div className="alert">{unitError}</div>}
              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => setCheckoutUnitId(null)}>Cancel</button>
                <button className="btn btn-primary" disabled={!unitActionForm.user_id} onClick={checkoutUnit}>Check Out</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Unit Checkin Modal */}
      {checkinUnitId && (() => {
        const unit = units.find((u) => u.id === checkinUnitId);
        return (
          <div className="modal-backdrop" onClick={() => setCheckinUnitId(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Check In Unit</h2>
                <button className="modal-close" onClick={() => setCheckinUnitId(null)}>×</button>
              </div>
              <p style={{ fontWeight: 600 }}>{unit?.asset_code}</p>
              <p style={{ color: "var(--color-muted)", fontSize: "13px", marginTop: "4px" }}>Held by: {unit?.current_holder_name || "—"}</p>
              <div className="form-grid" style={{ marginTop: "12px" }}>
                <div className="form-group wide">
                  <label className="form-label">Condition on Return</label>
                  <select className="form-select" value={unitActionForm.condition_on_return}
                    onChange={(e) => setUnitActionForm((f) => ({ ...f, condition_on_return: e.target.value }))}>
                    <option value="excellent">Excellent</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                    <option value="poor">Poor</option>
                    <option value="needs_inspection">Needs Inspection</option>
                    <option value="damaged">Damaged</option>
                  </select>
                </div>
                <div className="form-group wide">
                  <label className="form-label">Notes</label>
                  <textarea className="form-textarea" rows={2} value={unitActionForm.notes}
                    onChange={(e) => setUnitActionForm((f) => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>
              {unitError && <div className="alert">{unitError}</div>}
              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => setCheckinUnitId(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={checkinUnit}>Check In</button>
              </div>
            </div>
          </div>
        );
      })()}

      {qrUnit && (
        <div className='modal-backdrop' onClick={() => setQrUnit(null)}>
          <div className='modal' onClick={(e) => e.stopPropagation()} style={{ maxWidth: '340px', textAlign: 'center' }}>
            <div className='modal-header'>
              <h2>Unit QR Code</h2>
              <button className='modal-close' onClick={() => setQrUnit(null)}>×</button>
            </div>
            {qrUnit.qr_code ? (
              <img src={qrUnit.qr_code} alt={`QR for ${qrUnit.asset_code}`} style={{ width: '200px', height: '200px', display: 'block', margin: '12px auto' }} />
            ) : (
              <div style={{ padding: '32px 0', color: 'var(--color-muted)' }}>No QR code available for this unit.</div>
            )}
            <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '14px', margin: '0 0 4px' }}>{qrUnit.asset_code}</p>
            <p style={{ color: 'var(--color-muted)', fontSize: '12px', margin: '0 0 20px' }}>{item?.name}</p>
            <div className='modal-actions'>
              <button className='btn btn-secondary' onClick={() => setQrUnit(null)}>Close</button>
              {qrUnit.qr_code && (
                <button className='btn btn-primary' onClick={() => printUnitQR(qrUnit)}>Print</button>
              )}
            </div>
          </div>
        </div>
      )}

      {checkoutOpen && <CheckoutModal item={checkoutOpen ? item : null} users={users} onClose={() => setCheckoutOpen(false)} onSubmit={checkout} />}
      {checkinOpen && <CheckinModal item={checkinOpen ? item : null} users={users} onClose={() => setCheckinOpen(false)} onSubmit={checkin} />}
    </>
  );
}

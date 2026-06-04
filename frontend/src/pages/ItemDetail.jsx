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

function findName(collection, id, fallback = "Unassigned") {
  if (id == null) return fallback;
  return collection.find((entry) => entry.id === id)?.name || fallback;
}

function conditionBadgeClass(condition) {
  const map = { good: "badge--good", needs_repair: "badge--fair", damaged: "badge--poor" };
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
  const [unitActionForm, setUnitActionForm] = useState({ user_id: "", conditionReport: "", notes: "", due_date: "" });
  const [error, setError] = useState("");
  const [switchingMode, setSwitchingMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [openKebabId, setOpenKebabId] = useState(null);
  const [activityExpanded, setActivityExpanded] = useState(false);

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

  useEffect(() => {
    if (!openKebabId) return;
    function handleClick() { setOpenKebabId(null); }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [openKebabId]);

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
      setUnitActionForm({ user_id: "", conditionReport: "", notes: "", due_date: "" });
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
        condition_on_return: unitActionForm.conditionReport || null,
        notes: unitActionForm.notes || null,
      });
      if (unitActionForm.conditionReport) {
        await unitsApi.update(checkinUnitId, { condition: unitActionForm.conditionReport });
      }
      setCheckinUnitId(null);
      setUnitActionForm({ user_id: "", conditionReport: "", notes: "", due_date: "" });
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
  const availableCount = units.filter((u) => u.status === 'available').length;
  const ACTIVITY_PREVIEW = 4;
  const visibleTransactions = activityExpanded ? transactions : transactions.slice(0, ACTIVITY_PREVIEW);
  const hiddenCount = transactions.length - ACTIVITY_PREVIEW;

  return (
    <>
      {/* ── Topbar ── */}
      <div className='topbar'>
        <div className='topbar-left'>
          <span className='topbar-breadcrumb'>
            Inventory / {findName(categories, item.category_id, 'Uncategorized')}
          </span>
          <span className='topbar-title'>{item.name}</span>
        </div>
        <div className='topbar-actions'>
          <button className='btn btn-secondary' onClick={() => setCheckinOpen(true)} disabled={checkedOut < 1}>
            Check In
          </button>
          <button className='btn btn-primary' onClick={() => setCheckoutOpen(true)} disabled={item.available_quantity < 1}>
            Check Out
          </button>
        </div>
      </div>

      {/* ── Two-column grid ── */}
      <div className='page-content' style={{ padding: 0 }}>
        <div className='item-detail-grid'>

          {/* LEFT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

            {/* Units panel */}
            {item.track_units && (
              <div className='panel'>
                <div className='panel-head'>
                  <div>
                    <h3 style={{ display: 'inline' }}>Units</h3>
                    <span style={{ marginLeft: '8px' }}>
                      {units.length} total · {availableCount} available
                    </span>
                  </div>
                  <button className='btn btn-primary' style={{ fontSize: '11px', padding: '4px 12px' }}
                    onClick={() => setShowAddUnit((v) => !v)}>
                    {showAddUnit ? 'Cancel' : '+ Add Unit'}
                  </button>
                </div>

                {showAddUnit && (
                  <div className='panel-body' style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                    <div className='form-grid'>
                      <div className='form-group'>
                        <label className='form-label'>Serial Number</label>
                        <input className='form-input' value={addUnitForm.serial_number}
                          onChange={(e) => setAddUnitForm((f) => ({ ...f, serial_number: e.target.value }))}
                          placeholder='Optional' />
                      </div>
                      <div className='form-group'>
                        <label className='form-label'>Condition</label>
                        <select className='form-select' value={addUnitForm.condition}
                          onChange={(e) => setAddUnitForm((f) => ({ ...f, condition: e.target.value }))}>
                          <option value='good'>Good</option>
                          <option value='needs_repair'>Needs Repair</option>
                          <option value='damaged'>Damaged</option>
                        </select>
                      </div>
                      <div className='form-group'>
                        <label className='form-label'>Location</label>
                        <select className='form-select' value={addUnitForm.location_id}
                          onChange={(e) => setAddUnitForm((f) => ({ ...f, location_id: e.target.value }))}>
                          <option value=''>Default (inherit from model)</option>
                          {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                      </div>
                    </div>
                    {unitError && <div className='alert' style={{ marginTop: '8px' }}>{unitError}</div>}
                    <button className='btn btn-primary' style={{ marginTop: '12px' }} onClick={addUnit} disabled={addingUnit}>
                      {addingUnit ? 'Adding...' : 'Add Unit'}
                    </button>
                  </div>
                )}

                {units.length === 0 && (
                  <div className='panel-body'>
                    <div className='empty-state'>No units added yet.</div>
                  </div>
                )}

                {units.map((unit) => {
                  const isEditing = editingUnitId === unit.id;
                  const isAvailableUnit = unit.status === 'available';
                  const accentClass = isAvailableUnit ? 'unit-row__accent--available' : 'unit-row__accent--out';
                  const kebabOpen = openKebabId === unit.id;

                  if (isEditing) {
                    return (
                      <div key={unit.id} className='unit-row unit-row--editing'>
                        <div className={`unit-row__accent ${accentClass}`} />
                        <div className='unit-row__edit-fields'>
                          <input className='form-input' placeholder='Serial number'
                            value={editUnitForm.serial_number || ''}
                            onChange={(e) => setEditUnitForm((f) => ({ ...f, serial_number: e.target.value }))} />
                          <select className='form-select' value={editUnitForm.condition}
                            onChange={(e) => setEditUnitForm((f) => ({ ...f, condition: e.target.value }))}>
                            <option value='good'>Good</option>
                            <option value='needs_repair'>Needs Repair</option>
                            <option value='damaged'>Damaged</option>
                          </select>
                          <select className='form-select' value={editUnitForm.location_id || ''}
                            onChange={(e) => setEditUnitForm((f) => ({ ...f, location_id: e.target.value }))}>
                            <option value=''>— Location —</option>
                            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                          </select>
                        </div>
                        <div className='unit-row__actions'>
                          <button className='row-btn row-btn--primary' onClick={() => saveEditUnit(unit.id)}>Save</button>
                          <button className='row-btn' onClick={() => setEditingUnitId(null)}>Cancel</button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={unit.id} className='unit-row'>
                      <div className={`unit-row__accent ${accentClass}`} />
                      <div className='unit-row__body'>
                        <div className='unit-row__top'>
                          <span className='unit-row__code'>{unit.asset_code}</span>
                          <span className={'inv-card__chip inv-card__chip--' + (isAvailableUnit ? 'available' : 'out')}>
                            {isAvailableUnit ? 'Available' : 'Checked Out'}
                          </span>
                        </div>
                        <div className='unit-row__meta'>
                          {unit.serial_number ? `SN: ${unit.serial_number} · ` : ''}
                          {unit.condition.replace(/_/g, ' ')}
                          {isAvailableUnit
                            ? (unit.location_name ? ` · ${unit.location_name}` : '')
                            : (unit.current_holder_name ? ` · ${unit.current_holder_name}` : '')
                          }
                          {!isAvailableUnit && unit.due_date
                            ? ` · Due ${new Date(unit.due_date).toLocaleDateString()}`
                            : ''
                          }
                        </div>
                      </div>
                      <div className='unit-row__actions'>
                        {isAvailableUnit ? (
                          <button className='row-btn row-btn--primary'
                            onClick={() => { setCheckoutUnitId(unit.id); setUnitActionForm({ user_id: '', conditionReport: '', notes: '', due_date: '' }); }}>
                            Check Out
                          </button>
                        ) : (
                          <button className='row-btn' style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }}
                            onClick={() => { setCheckinUnitId(unit.id); setUnitActionForm({ user_id: '', conditionReport: '', notes: '', due_date: '' }); }}>
                            Check In
                          </button>
                        )}
                        <div className='unit-kebab' onClick={(e) => e.stopPropagation()}>
                          <button className='unit-kebab__btn'
                            onClick={() => setOpenKebabId(kebabOpen ? null : unit.id)}>
                            ⋯
                          </button>
                          <div className={'unit-kebab__menu' + (kebabOpen ? ' unit-kebab__menu--open' : '')}>
                            <button className='unit-kebab__item' onClick={() => { setQrUnit(unit); setOpenKebabId(null); }}>
                              QR Code
                            </button>
                            <button className='unit-kebab__item' onClick={() => {
                              setEditingUnitId(unit.id);
                              setEditUnitForm({ serial_number: unit.serial_number || '', condition: unit.condition, location_id: unit.location_id || '', notes: unit.notes || '' });
                              setOpenKebabId(null);
                            }}>
                              Edit
                            </button>
                            <button className='unit-kebab__item unit-kebab__item--danger'
                              onClick={() => { deleteUnit(unit.id); setOpenKebabId(null); }}>
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {unitError && <div className='alert' style={{ margin: '10px 14px' }}>{unitError}</div>}
              </div>
            )}

            {/* Recent Activity panel */}
            <div className='panel'>
              <div className='panel-head'>
                <h3>Recent Activity</h3>
                {transactions.length > ACTIVITY_PREVIEW && (
                  <button style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '11px', cursor: 'pointer' }}
                    onClick={() => setActivityExpanded((v) => !v)}>
                    {activityExpanded ? 'Show less' : 'View all →'}
                  </button>
                )}
              </div>
              <div className='panel-body' style={{ paddingTop: '4px', paddingBottom: '4px' }}>
                {transactions.length === 0 && (
                  <div style={{ color: 'var(--color-muted)', fontSize: '12px' }}>No transactions yet.</div>
                )}
                {visibleTransactions.map((tx) => {
                  const isCheckoutTx = tx.type === 'checkout';
                  const typeLabel = isCheckoutTx ? 'Check Out' : 'Check In';
                  return (
                    <div key={tx.id} className='activity-row'>
                      <div className={`activity-dot activity-dot--${isCheckoutTx ? 'out' : 'in'}`} />
                      <div>
                        <div className='activity-text'>
                          <strong>{typeLabel}</strong>
                          {' — '}
                          {tx.user_name ?? `User #${tx.user_id}`}
                          {tx.unit_asset_code && (
                            <>
                              {' · '}
                              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-primary)', fontSize: '12px' }}>
                                {tx.unit_asset_code}
                              </span>
                            </>
                          )}
                          {tx.quantity > 1 && (
                            <span style={{ color: 'var(--color-muted)', fontSize: '12px' }}> · Qty {tx.quantity}</span>
                          )}
                        </div>
                        <div className='activity-time'>{new Date(tx.created_at).toLocaleString()}</div>
                        {isCheckoutTx && tx.due_date && (
                          <div style={{ color: 'var(--color-muted)', fontSize: '12px', marginTop: '3px' }}>
                            Due {new Date(tx.due_date).toLocaleDateString()}
                            {tx.returned_at && (
                              <span style={{ color: '#16a34a' }}> · Returned {new Date(tx.returned_at).toLocaleDateString()}</span>
                            )}
                          </div>
                        )}
                        {tx.condition_on_return && (
                          <div style={{ color: 'var(--color-muted)', fontSize: '12px', marginTop: '3px', textTransform: 'capitalize' }}>
                            Returned as: {tx.condition_on_return.replace(/_/g, ' ')}
                          </div>
                        )}
                        {tx.notes && (
                          <div style={{ color: 'var(--color-muted)', fontSize: '12px', fontStyle: 'italic', marginTop: '3px' }}>
                            {tx.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {!activityExpanded && hiddenCount > 0 && (
                <div className='activity-footer'>
                  <button onClick={() => setActivityExpanded(true)}>
                    Show {hiddenCount} more record{hiddenCount !== 1 ? 's' : ''}
                  </button>
                </div>
              )}
            </div>

          </div>

          {/* RIGHT SIDEBAR */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

            <div className='panel'>
              <div className='panel-head'><h3>Item Info</h3></div>
              <div className='panel-body' style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className='sidebar-field'>
                  <div className='sidebar-field-label'>Asset Code</div>
                  <div className='sidebar-field-value'>
                    <span style={{ fontFamily: 'var(--font-mono)', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>
                      {item.asset_code}
                    </span>
                  </div>
                </div>
                <div className='sidebar-field'>
                  <div className='sidebar-field-label'>Category</div>
                  <div className='sidebar-field-value'>{findName(categories, item.category_id, 'Uncategorized')}</div>
                </div>
                <div className='sidebar-field'>
                  <div className='sidebar-field-label'>Location</div>
                  <div className='sidebar-field-value'>{findName(locations, item.location_id)}</div>
                </div>
                <div className='sidebar-field'>
                  <div className='sidebar-field-label'>Condition</div>
                  <div className='sidebar-field-value'>
                    <span className={`badge ${conditionBadgeClass(item.condition)}`}>
                      {item.condition?.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
                <div className='sidebar-field'>
                  <div className='sidebar-field-label'>Tracking</div>
                  <div className='sidebar-field-value'>{item.track_units ? 'Unit tracked' : 'Bulk / Pool'}</div>
                </div>
                <div className='sidebar-field'>
                  <div className='sidebar-field-label'>Availability</div>
                  <div className='sidebar-field-value' style={{ fontSize: '14px', fontWeight: 700 }}>
                    {item.available_quantity}
                    <span style={{ color: 'var(--color-muted-2)', fontWeight: 400, fontSize: '12px' }}> of {item.quantity} available</span>
                  </div>
                </div>
                {item.description && (
                  <div className='sidebar-field'>
                    <div className='sidebar-field-label'>Description</div>
                    <div className='sidebar-field-value' style={{ fontSize: '12px', color: 'var(--color-muted-2)' }}>{item.description}</div>
                  </div>
                )}
              </div>
            </div>

            <div className='panel'>
              <div className='panel-head'><h3>Actions</h3></div>
              <div className='panel-body' style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  className='btn btn-secondary'
                  style={{ width: '100%', textAlign: 'left', fontSize: '12px' }}
                  disabled={switchingMode}
                  onClick={async () => {
                    setSwitchingMode(true);
                    try {
                      await itemsApi.update(item.id, { track_units: !item.track_units });
                      await load();
                    } catch (err) {
                      setError(getErrorMessage(err));
                    } finally {
                      setSwitchingMode(false);
                    }
                  }}
                >
                  {switchingMode ? 'Switching...' : '⇄ Switch tracking mode'}
                </button>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* Modals — unchanged */}
      {checkoutUnitId && (() => {
        const unit = units.find((u) => u.id === checkoutUnitId);
        return (
          <div className='modal-backdrop' onClick={() => setCheckoutUnitId(null)}>
            <div className='modal' onClick={(e) => e.stopPropagation()}>
              <div className='modal-header'>
                <h2>Check Out Unit</h2>
                <button className='modal-close' onClick={() => setCheckoutUnitId(null)}>×</button>
              </div>
              <p style={{ fontWeight: 600 }}>{unit?.asset_code}</p>
              <p style={{ color: 'var(--color-muted)', fontSize: '13px', marginTop: '4px' }}>{item?.name}</p>
              <div className='form-grid' style={{ marginTop: '12px' }}>
                <div className='form-group'>
                  <label className='form-label'>User *</label>
                  <select className='form-select' value={unitActionForm.user_id}
                    onChange={(e) => setUnitActionForm((f) => ({ ...f, user_id: e.target.value }))} required>
                    <option value=''>Select user</option>
                    {users.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                  </select>
                </div>
                <div className='form-group'>
                  <label className='form-label'>Expected Return Date</label>
                  <input className='form-input' type='date' min={new Date().toLocaleDateString('en-CA')}
                    value={unitActionForm.due_date} onChange={(e) => setUnitActionForm((f) => ({ ...f, due_date: e.target.value }))} />
                </div>
                <div className='form-group wide'>
                  <label className='form-label'>Notes</label>
                  <textarea className='form-textarea' rows={2} value={unitActionForm.notes}
                    onChange={(e) => setUnitActionForm((f) => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>
              {unitError && <div className='alert'>{unitError}</div>}
              <div className='modal-actions'>
                <button className='btn btn-secondary' onClick={() => setCheckoutUnitId(null)}>Cancel</button>
                <button className='btn btn-primary' disabled={!unitActionForm.user_id} onClick={checkoutUnit}>Check Out</button>
              </div>
            </div>
          </div>
        );
      })()}

      {checkinUnitId && (() => {
        const unit = units.find((u) => u.id === checkinUnitId);
        return (
          <div className='modal-backdrop' onClick={() => setCheckinUnitId(null)}>
            <div className='modal' onClick={(e) => e.stopPropagation()}>
              <div className='modal-header'>
                <h2>Check In Unit</h2>
                <button className='modal-close' onClick={() => setCheckinUnitId(null)}>×</button>
              </div>
              <p style={{ fontWeight: 600 }}>{unit?.asset_code}</p>
              <p style={{ color: 'var(--color-muted)', fontSize: '13px', marginTop: '4px' }}>Held by: {unit?.current_holder_name || '—'}</p>
              <div className='form-grid' style={{ marginTop: '12px' }}>
                <div className='form-group wide'>
                  <label className='form-label'>Notes</label>
                  <textarea className='form-textarea' rows={2} value={unitActionForm.notes}
                    onChange={(e) => setUnitActionForm((f) => ({ ...f, notes: e.target.value }))} />
                </div>
                <div className='form-group wide'>
                  <label className='form-label'>Flag Condition Issue</label>
                  <select className='form-select' value={unitActionForm.conditionReport}
                    onChange={(e) => setUnitActionForm((f) => ({ ...f, conditionReport: e.target.value }))}
                    style={{ color: unitActionForm.conditionReport ? '#dc2626' : 'inherit' }}>
                    <option value=''>None — returned fine</option>
                    <option value='needs_repair'>Needs Repair</option>
                    <option value='damaged'>Damaged</option>
                  </select>
                </div>
              </div>
              {unitError && <div className='alert'>{unitError}</div>}
              <div className='modal-actions'>
                <button className='btn btn-secondary' onClick={() => setCheckinUnitId(null)}>Cancel</button>
                <button className='btn btn-primary' onClick={checkinUnit}>Check In</button>
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

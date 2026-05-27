import { useState, useMemo, useEffect } from "react";
import { getErrorMessage } from "../../api/client";
import { itemsApi } from "../../api/items";
import { categoriesApi } from "../../api/categories";
import { usersApi } from "../../api/users";
import { unitsApi } from "../../api/units";
import { CATEGORY_META, DEFAULT_META } from "../../utils/categoryMeta.jsx";

const CONDITIONS = [
  { value: "excellent", label: "Excellent" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "poor", label: "Poor" },
  { value: "needs_inspection", label: "Needs Inspection" },
  { value: "damaged", label: "Damaged" },
];

export default function CheckInMode() {
  const [allItems, setAllItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [checkedOutUnits, setCheckedOutUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [returnCart, setReturnCart] = useState([]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [viewMode, setViewMode] = useState("grid");
  const [ciGridPage, setCiGridPage] = useState("categories");
  const [ciGridDir, setCiGridDir] = useState(null);
  const [ciSelectedCat, setCiSelectedCat] = useState(null);
  const [ciSelectedItem, setCiSelectedItem] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadData() {
      setLoading(true);
      setLoadError(null);
      try {
        const [items, loadedCategories, loadedUsers] = await Promise.all([
          itemsApi.list({ limit: 500 }),
          categoriesApi.list(),
          usersApi.list(),
        ]);
        const allUnits = await Promise.all(
          items.filter((i) => i.available_quantity < i.quantity).map((i) => unitsApi.listByItem(i.id))
        );
        const flatUnits = allUnits.flat().filter((u) => u.status === "checked_out");
        if (!active) return;
        setAllItems(items);
        setCategories(loadedCategories);
        setUsers(loadedUsers);
        setCheckedOutUnits(flatUnits);
      } catch (err) {
        if (active) setLoadError(getErrorMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();
    return () => { active = false; };
  }, []);

  const holderMap = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u.name])), [users]);
  const itemById = (id) => allItems.find((i) => i.id === id);
  const itemName = (id) => itemById(id)?.name ?? "";
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return checkedOutUnits;
    return checkedOutUnits.filter((u) =>
      u.asset_code.toLowerCase().includes(q) ||
      (allItems.find((i) => i.id === u.item_id)?.name || "").toLowerCase().includes(q) ||
      (u.serial_number || "").toLowerCase().includes(q)
    );
  }, [checkedOutUnits, query, allItems]);
  const cartItemIds = useMemo(() => new Set(returnCart.map((r) => r.unit.id)), [returnCart]);
  const catsWithCheckedOut = useMemo(
    () => new Set(checkedOutUnits.map((u) => allItems.find((i) => i.id === u.item_id)?.category_id ?? 0)),
    [checkedOutUnits, allItems]
  );
  const checkedOutItemsForCat = useMemo(() => {
    if (!ciSelectedCat) return [];
    const ids = new Set(
      checkedOutUnits
        .filter((u) => (allItems.find((i) => i.id === u.item_id)?.category_id ?? 0) === ciSelectedCat.id)
        .map((u) => u.item_id)
    );
    return allItems.filter((i) => ids.has(i.id));
  }, [checkedOutUnits, allItems, ciSelectedCat]);
  const checkedOutUnitsForItem = useMemo(
    () => checkedOutUnits.filter((u) => u.item_id === ciSelectedItem?.id),
    [checkedOutUnits, ciSelectedItem]
  );

  function switchCiView(mode) {
    setViewMode(mode);
    setCiGridPage("categories");
    setCiGridDir("forward");
    setCiSelectedCat(null);
    setCiSelectedItem(null);
  }

  function addToReturnCart(unit) {
    if (!unit.current_holder_id || cartItemIds.has(unit.id)) return;
    setReturnCart((prev) => [...prev, { unit, condition: "good" }]);
  }

  function removeFromReturnCart(unitId) {
    setReturnCart((prev) => prev.filter((r) => r.unit.id !== unitId));
  }

  function updateCartCondition(unitId, val) {
    setReturnCart((prev) => prev.map((r) => r.unit.id === unitId ? { ...r, condition: val } : r));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    const returned = [];
    const failed = [];
    for (const row of returnCart) {
      if (!row.unit.current_holder_id) {
        failed.push({ unit: row.unit, error: "No holder on record" });
        continue;
      }
      try {
        await unitsApi.checkin(row.unit.id, {
          user_id: row.unit.current_holder_id,
          condition_on_return: row.condition,
          notes: notes || null,
        });
        returned.push(row.unit);
      } catch (err) {
        failed.push({ unit: row.unit, error: getErrorMessage(err) });
      }
    }
    setReturnCart((prev) => prev.filter((r) => failed.some((f) => f.unit.id === r.unit.id)));
    setNotes("");
    setReceipt({ returned, failed });
    try {
      const refreshedItems = await itemsApi.list({ limit: 500 });
      setAllItems(refreshedItems);
      const allUnits = await Promise.all(refreshedItems.filter((i) => i.available_quantity < i.quantity).map((i) => unitsApi.listByItem(i.id)));
      setCheckedOutUnits(allUnits.flat().filter((u) => u.status === "checked_out"));
    } catch (_) {
      // non-critical refresh failure
    }
    setSubmitting(false);
  }

  return (
    <>
      {loadError && <div className="alert">{loadError}</div>}

      <div className="panel">
        <div className="panel-body" style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <input className="form-input" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search units to return..." style={{ flex: 1 }} />
          <button type="button" className={`btn ${viewMode === "grid" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => switchCiView("grid")} style={{ whiteSpace: "nowrap" }}>Grid</button>
          <button type="button" className={`btn ${viewMode === "list" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => switchCiView("list")} style={{ whiteSpace: "nowrap" }}>List</button>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading items...</div>
      ) : viewMode === "list" || query.trim() ? (
        <div className="panel">
          <div className="panel-head">
            <h3>{query.trim() ? `Results for "${query}"` : "Checked Out Units"}</h3>
            <span style={{ color: "var(--color-muted)", fontSize: "13px" }}>{filtered.length} units</span>
          </div>
          {viewMode === "grid" && query.trim() && (
            <div style={{ color: "var(--color-muted)", fontSize: "12.5px", padding: "12px 14px 0" }}>Clear search to browse by category</div>
          )}
          <div className="table-wrap">
            <table className="inv-table">
              <thead>
                <tr>
                  <th style={{ width: "4px", padding: 0 }} />
                  <th><div style={{ padding: "9px 14px" }}>Code</div></th>
                  <th><div style={{ padding: "9px 14px" }}>Model</div></th>
                  <th><div style={{ padding: "9px 14px" }}>Held By</div></th>
                  <th><div style={{ padding: "9px 14px" }}>Condition</div></th>
                  <th><div style={{ padding: "9px 14px" }}>Action</div></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((unit) => (
                  <tr key={unit.id} data-status="out">
                    <td className="inv-table__accent" />
                    <td><span className="asset-code">{unit.asset_code}</span></td>
                    <td>{itemName(unit.item_id)}</td>
                    <td style={{ color: "var(--color-muted)", fontSize: "13px" }}>{holderMap[unit.current_holder_id] ?? unit.current_holder_name ?? "—"}</td>
                    <td>{unit.condition?.replace(/_/g, " ")}</td>
                    <td>
                      {cartItemIds.has(unit.id)
                        ? <button className="row-btn" disabled style={{ opacity: 0.5 }}>Added</button>
                        : !unit.current_holder_id
                          ? <button className="row-btn" disabled style={{ opacity: 0.5 }}>No holder</button>
                          : <button className="row-btn row-btn--primary" onClick={() => addToReturnCart(unit)}>Return</button>}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={6}><div className="empty-state">No units found.</div></td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      ) : checkedOutUnits.length === 0 ? (
        <div className="empty-state">No units are currently checked out.</div>
      ) : ciGridPage === "categories" ? (
        <div className={`panel${ciGridDir ? ` grid-panel--${ciGridDir}` : ""}`}>
          <div className="panel-head">
            <h3>Browse by Category</h3>
            <span style={{ color: "var(--color-muted)", fontSize: "13px" }}>{checkedOutUnits.length} units out</span>
          </div>
          <div className="browse-grid">
            {categories.filter((cat) => catsWithCheckedOut.has(cat.id)).map((cat) => {
              const meta = CATEGORY_META[cat.name] ?? DEFAULT_META;
              const Icon = meta.Icon;
              const count = checkedOutUnits.filter((u) => itemById(u.item_id)?.category_id === cat.id).length;
              return (
                <button key={cat.id} type="button" className="browse-card" onClick={() => {
                  setCiSelectedCat({ id: cat.id, name: cat.name });
                  setCiGridDir("forward");
                  setCiGridPage("items");
                }}>
                  <span className="browse-card__icon" style={{ color: meta.color, background: meta.bg }}><Icon /></span>
                  <span className="browse-card__label">{cat.name}</span>
                  <span className="browse-card__sub">{count} units out</span>
                  <div className="cat-card-overlay" style={{ background: meta.bg, color: meta.color, justifyContent: "center", alignItems: "center", textAlign: "center" }}>
                    <div className="cat-card-overlay__title">{cat.name}</div>
                    {cat.description && <div className="cat-card-overlay__desc">{cat.description}</div>}
                  </div>
                </button>
              );
            })}
            {catsWithCheckedOut.has(0) && (
              <button type="button" className="browse-card" onClick={() => {
                setCiSelectedCat({ id: 0, name: "Uncategorized" });
                setCiGridDir("forward");
                setCiGridPage("items");
              }}>
                <span className="browse-card__icon" style={{ color: DEFAULT_META.color, background: DEFAULT_META.bg }}>
                  <DEFAULT_META.Icon />
                </span>
                <span className="browse-card__label">Uncategorized</span>
                <span className="browse-card__sub">{checkedOutUnits.filter((u) => itemById(u.item_id)?.category_id == null).length} units out</span>
              </button>
            )}
          </div>
        </div>
      ) : ciGridPage === "items" ? (
        <div className={`panel${ciGridDir ? ` grid-panel--${ciGridDir}` : ""}`}>
          <div className="panel-head">
            <button type="button" className="btn btn-secondary" onClick={() => {
              setCiGridDir("backward");
              setCiGridPage("categories");
              setCiSelectedCat(null);
            }}>Back</button>
            <h3>{ciSelectedCat?.name ?? "Items"}</h3>
            <span style={{ color: "var(--color-muted)", fontSize: "13px" }}>{checkedOutItemsForCat.length} models</span>
          </div>
          <div className="inv-grid">
            {checkedOutItemsForCat.map((item) => {
              const count = checkedOutUnits.filter((u) => u.item_id === item.id).length;
              return (
                <div key={item.id} className="inv-card" onClick={() => {
                  setCiSelectedItem(item);
                  setCiGridDir("forward");
                  setCiGridPage("units");
                }} style={{ cursor: "pointer" }}>
                  <div className="inv-card__header">
                    <span className="inv-card__code">{item.asset_code}</span>
                    <span className="inv-card__chip inv-card__chip--out">{count} out</span>
                  </div>
                  <div className="inv-card__name">{item.name}</div>
                  <div className="inv-card__meta"><span>{item.location_name || "—"}</span></div>
                  <div className="inv-card__footer">
                    <span className="inv-card__stats">{item.condition.replace(/_/g, " ")}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className={`panel${ciGridDir ? ` grid-panel--${ciGridDir}` : ""}`}>
          <div className="panel-head">
            <button type="button" className="btn btn-secondary" onClick={() => {
              setCiGridDir("backward");
              setCiGridPage("items");
              setCiSelectedItem(null);
            }}>Back</button>
            <h3>{ciSelectedItem?.name}</h3>
            <span style={{ color: "var(--color-muted)", fontSize: "13px" }}>{checkedOutUnitsForItem.length} units out</span>
          </div>
          <div className="inv-grid">
            {checkedOutUnitsForItem.map((unit) => {
              const inCart = cartItemIds.has(unit.id);
              const noHolder = !unit.current_holder_id;
              return (
                <div key={unit.id} className="inv-card" onClick={() => { if (!inCart && !noHolder) addToReturnCart(unit); }}
                  style={{ cursor: inCart || noHolder ? "default" : "pointer", opacity: noHolder ? 0.5 : 1 }}>
                  <div className="inv-card__header">
                    <span className="inv-card__code">{unit.asset_code}</span>
                    <span className={`inv-card__chip inv-card__chip--${inCart ? "in-cart" : "out"}`}>{inCart ? "In Cart" : noHolder ? "No Holder" : "Checked Out"}</span>
                  </div>
                  <div className="inv-card__name">{ciSelectedItem?.name}</div>
                  <div className="inv-card__meta"><span>Held by {holderMap[unit.current_holder_id] ?? unit.current_holder_name ?? "—"}</span></div>
                  <div className="inv-card__footer">
                    <span className="inv-card__stats">{unit.condition.replace(/_/g, " ")}</span>
                    {!inCart && !noHolder && (
                      <button className="row-btn row-btn--primary" onClick={(e) => { e.stopPropagation(); addToReturnCart(unit); }}>Return</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {returnCart.length > 0 && (
        <div className="panel">
          <div className="panel-head"><h3>Return Cart — {returnCart.length} {returnCart.length === 1 ? "unit" : "units"}</h3></div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th><div style={{ padding: "9px 14px" }}>Asset Code</div></th>
                  <th><div style={{ padding: "9px 14px" }}>Model</div></th>
                  <th><div style={{ padding: "9px 14px" }}>Qty Out</div></th>
                  <th><div style={{ padding: "9px 14px" }}>Condition</div></th>
                  <th><div style={{ padding: "9px 14px" }}>Remove</div></th>
                </tr>
              </thead>
              <tbody>
                {returnCart.map((row) => (
                  <tr key={row.unit.id}>
                    <td><span className="asset-code" style={{ color: "#059669" }}>{row.unit.asset_code}</span></td>
                    <td>{itemName(row.unit.item_id)}</td>
                    <td>1</td>
                    <td>
                      <select className="form-select" value={row.condition}
                        onChange={(e) => updateCartCondition(row.unit.id, e.target.value)}
                        style={{ padding: "5px 8px", fontSize: "13px" }}>
                        {CONDITIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                    </td>
                    <td><button className="row-btn" onClick={() => removeFromReturnCart(row.unit.id)}>×</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {returnCart.length > 0 && (
        <div className="panel">
          <div className="panel-head"><h3>Return selected units</h3></div>
          <div className="panel-body">
            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: "12px" }}>
                <label className="form-label">Notes (optional)</label>
                <textarea className="form-textarea" value={notes} onChange={(e) => setNotes(e.target.value)} rows="2" />
              </div>
              {submitError && <div className="alert" style={{ marginBottom: "12px" }}>{submitError}</div>}
              <button type="submit" className="btn btn-primary" disabled={submitting || returnCart.length === 0}
                style={{ background: "#059669", borderColor: "#059669" }}>
                {submitting ? "Returning..." : `Return ${returnCart.length} ${returnCart.length === 1 ? "Unit" : "Units"}`}
              </button>
            </form>
          </div>
        </div>
      )}

      {receipt && (
        <>
          {receipt.returned.length > 0 && (
            <div className="panel" style={{ borderColor: "#bbf7d0" }}>
              <div className="panel-head" style={{ background: "#d1fae5", borderColor: "#bbf7d0" }}>
                <h3 style={{ color: "#065f46" }}>Returned — {receipt.returned.length} {receipt.returned.length === 1 ? "unit" : "units"}</h3>
              </div>
              <div className="panel-body">
                <ul style={{ margin: 0, padding: "0 0 0 18px" }}>
                  {receipt.returned.map((unit) => (
                    <li key={unit.id}><span className="asset-code" style={{ marginRight: "8px" }}>{unit.asset_code}</span>{itemName(unit.item_id)}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          {receipt.failed.length > 0 && (
            <div className="panel" style={{ borderColor: "#fecaca" }}>
              <div className="panel-head" style={{ background: "#fee2e2", borderColor: "#fecaca" }}>
                <h3 style={{ color: "#991b1b" }}>Failed — still checked out</h3>
              </div>
              <div className="panel-body">
                <ul style={{ margin: "0 0 10px", padding: "0 0 0 18px" }}>
                  {receipt.failed.map(({ unit, error }) => (
                    <li key={unit.id}><span className="asset-code" style={{ marginRight: "8px" }}>{unit.asset_code}</span>{itemName(unit.item_id)} — {error}</li>
                  ))}
                </ul>
                <p style={{ fontSize: "13px", color: "var(--color-muted)", margin: 0 }}>Failed units remain in cart — fix and retry.</p>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}

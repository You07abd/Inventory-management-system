import { useState, useMemo, useEffect } from "react";
import { getErrorMessage } from "../../api/client";
import { itemsApi } from "../../api/items";
import { categoriesApi } from "../../api/categories";
import { locationsApi } from "../../api/locations";
import { usersApi } from "../../api/users";
import { unitsApi } from "../../api/units";
import { getCategoryMeta, UNCATEGORIZED_CATEGORY } from "../../utils/categoryMeta.jsx";

const CONDITIONS = [
  { value: "good", label: "Good" },
  { value: "needs_repair", label: "Needs Repair" },
  { value: "damaged", label: "Damaged" },
];
const UNCATEGORIZED_META = getCategoryMeta(UNCATEGORIZED_CATEGORY);

export default function CheckInMode() {
  const [allItems, setAllItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
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
  const [listCategoryFilter, setListCategoryFilter] = useState(null);
  const [locationFilter, setLocationFilter] = useState(null);
  const [conditionFilter, setConditionFilter] = useState("");
  const [bulkReturnItem, setBulkReturnItem] = useState(null);
  const [bulkReturnQty, setBulkReturnQty] = useState(1);
  const [bulkReturnUserId, setBulkReturnUserId] = useState("");
  const [bulkReturnError, setBulkReturnError] = useState(null);
  const [bulkReturnSubmitting, setBulkReturnSubmitting] = useState(false);
  const [conditionReported, setConditionReported] = useState({});

  useEffect(() => {
    let active = true;

    async function loadData() {
      setLoading(true);
      setLoadError(null);
      try {
        const [items, loadedCategories, loadedLocations, loadedUsers] = await Promise.all([
          itemsApi.list({ limit: 500 }),
          categoriesApi.list(),
          locationsApi.list(),
          usersApi.list(),
        ]);
        const allUnits = await Promise.all(
          items.filter((i) => i.available_quantity < i.quantity).map((i) => unitsApi.listByItem(i.id))
        );
        const flatUnits = allUnits.flat().filter((u) => u.status === "checked_out");
        if (!active) return;
        setAllItems(items);
        setCategories(loadedCategories);
        setLocations(loadedLocations);
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
  const searchFiltered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return checkedOutUnits;
    return checkedOutUnits.filter((u) =>
      u.asset_code.toLowerCase().includes(q) ||
      (allItems.find((i) => i.id === u.item_id)?.name || "").toLowerCase().includes(q) ||
      (u.serial_number || "").toLowerCase().includes(q)
    );
  }, [checkedOutUnits, query, allItems]);
  const filtered = useMemo(() => {
    return searchFiltered.filter((unit) => {
      const itemCategoryId = allItems.find((i) => i.id === unit.item_id)?.category_id ?? null;
      if (listCategoryFilter === "uncategorized" && itemCategoryId != null) return false;
      if (listCategoryFilter !== null && listCategoryFilter !== "uncategorized" && itemCategoryId !== listCategoryFilter) return false;
      if (locationFilter !== null && unit.location_id !== locationFilter) return false;
      if (conditionFilter && unit.condition !== conditionFilter) return false;
      return true;
    });
  }, [searchFiltered, allItems, listCategoryFilter, locationFilter, conditionFilter]);
  const listUncategorizedCount = searchFiltered.filter((unit) => (allItems.find((i) => i.id === unit.item_id)?.category_id ?? null) == null).length;
  const cartItemIds = useMemo(() => new Set(returnCart.map((r) => r.unit.id)), [returnCart]);
  const catsWithCheckedOut = useMemo(
    () => new Set(checkedOutUnits.map((u) => allItems.find((i) => i.id === u.item_id)?.category_id ?? null)),
    [checkedOutUnits, allItems]
  );
  const checkedOutItemsForCat = useMemo(() => {
    if (!ciSelectedCat) return [];
    const ids = new Set(
      checkedOutUnits
        .filter((u) => (allItems.find((i) => i.id === u.item_id)?.category_id ?? null) === ciSelectedCat.id)
        .map((u) => u.item_id)
    );
    return allItems.filter((i) => ids.has(i.id));
  }, [checkedOutUnits, allItems, ciSelectedCat]);
  const checkedOutUnitsForItem = useMemo(
    () => checkedOutUnits.filter((u) => u.item_id === ciSelectedItem?.id),
    [checkedOutUnits, ciSelectedItem]
  );
  const bulkItems = useMemo(
    () => allItems.filter((i) => !i.track_units && i.available_quantity < i.quantity),
    [allItems]
  );

  async function handleBulkReturn() {
    if (!bulkReturnUserId || bulkReturnQty < 1) return;
    setBulkReturnSubmitting(true);
    setBulkReturnError(null);
    try {
      await itemsApi.checkin(bulkReturnItem.id, {
        user_id: Number(bulkReturnUserId),
        quantity: bulkReturnQty,
      });
      setBulkReturnItem(null);
      const refreshedItems = await itemsApi.list({ limit: 500 });
      setAllItems(refreshedItems);
    } catch (err) {
      setBulkReturnError(getErrorMessage(err));
    } finally {
      setBulkReturnSubmitting(false);
    }
  }

  function switchCiView(mode) {
    setViewMode(mode);
    setCiGridPage("categories");
    setCiGridDir("forward");
    setCiSelectedCat(null);
    setCiSelectedItem(null);
    setListCategoryFilter(null);
    setLocationFilter(null);
    setConditionFilter("");
  }

  function addToReturnCart(unit) {
    if (!unit.current_holder_id || cartItemIds.has(unit.id)) return;
    setReturnCart((prev) => [...prev, { unit }]);
  }

  function removeFromReturnCart(unitId) {
    setReturnCart((prev) => prev.filter((r) => r.unit.id !== unitId));
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
          condition_on_return: null,
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
          <div className="inv-layout">
            <aside className="inv-filter-panel">
              <div className="inv-filter-section">
                <div className="inv-filter-title">Category</div>
                <button
                  type="button"
                  className={`inv-filter-btn ${listCategoryFilter === null ? "inv-filter-btn--active" : ""}`}
                  onClick={() => setListCategoryFilter(null)}
                >
                  All
                  <span className="inv-filter-count">{searchFiltered.length}</span>
                </button>
                {listUncategorizedCount > 0 && (
                  <button
                    type="button"
                    className={`inv-filter-btn ${listCategoryFilter === "uncategorized" ? "inv-filter-btn--active" : ""}`}
                    onClick={() => setListCategoryFilter(listCategoryFilter === "uncategorized" ? null : "uncategorized")}
                  >
                    <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: UNCATEGORIZED_META.color, flexShrink: 0 }} />
                    Uncategorized
                    <span className="inv-filter-count">{listUncategorizedCount}</span>
                  </button>
                )}
                {categories.map((cat) => {
                  const meta = getCategoryMeta(cat);
                  const count = searchFiltered.filter((unit) => (allItems.find((i) => i.id === unit.item_id)?.category_id ?? null) === cat.id).length;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      className={`inv-filter-btn ${listCategoryFilter === cat.id ? "inv-filter-btn--active" : ""}`}
                      onClick={() => setListCategoryFilter(listCategoryFilter === cat.id ? null : cat.id)}
                    >
                      <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: meta.color, flexShrink: 0 }} />
                      {cat.name}
                      <span className="inv-filter-count">{count}</span>
                    </button>
                  );
                })}
              </div>

              <div className="inv-filter-section">
                <div className="inv-filter-title">Location</div>
                <button
                  type="button"
                  className={`inv-filter-btn ${locationFilter === null ? "inv-filter-btn--active" : ""}`}
                  onClick={() => setLocationFilter(null)}
                >
                  All
                  <span className="inv-filter-count">{searchFiltered.length}</span>
                </button>
                {locations.map((loc) => {
                  const count = searchFiltered.filter((unit) => unit.location_id === loc.id).length;
                  return (
                    <button
                      key={loc.id}
                      type="button"
                      className={`inv-filter-btn ${locationFilter === loc.id ? "inv-filter-btn--active" : ""}`}
                      onClick={() => setLocationFilter(locationFilter === loc.id ? null : loc.id)}
                    >
                      {loc.name}
                      <span className="inv-filter-count">{count}</span>
                    </button>
                  );
                })}
              </div>

              <div className="inv-filter-section">
                <div className="inv-filter-title">Condition</div>
                <select
                  className="table-filter"
                  style={{ width: "100%" }}
                  value={conditionFilter}
                  onChange={(e) => setConditionFilter(e.target.value)}
                >
                  <option value="">All conditions</option>
                  {CONDITIONS.map((condition) => (
                    <option key={condition.value} value={condition.value}>{condition.label}</option>
                  ))}
                </select>
              </div>
            </aside>

            <main>
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
            </main>
          </div>
          {bulkItems.length > 0 && (
            <div style={{ borderTop: "1px solid var(--color-border-light)", padding: "12px 14px" }}>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-muted)", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Bulk Items
              </div>
              <table className="inv-table">
                <thead>
                  <tr>
                    <th style={{ width: "4px", padding: 0 }} />
                    <th><div style={{ padding: "9px 14px" }}>Code</div></th>
                    <th><div style={{ padding: "9px 14px" }}>Name</div></th>
                    <th><div style={{ padding: "9px 14px" }}>Out</div></th>
                    <th><div style={{ padding: "9px 14px" }}>Action</div></th>
                  </tr>
                </thead>
                <tbody>
                  {bulkItems.map((item) => {
                    const checkedOutQty = item.quantity - item.available_quantity;
                    return (
                      <tr key={item.id} data-status="out">
                        <td className="inv-table__accent" />
                        <td><span className="asset-code">{item.asset_code}</span></td>
                        <td>{item.name}</td>
                        <td style={{ color: "var(--color-muted)", fontSize: "13px" }}>{checkedOutQty} of {item.quantity}</td>
                        <td>
                          <button
                            className="row-btn row-btn--primary"
                            style={{ background: "#059669", borderColor: "#059669" }}
                            onClick={() => {
                              setBulkReturnItem(item);
                              setBulkReturnQty(checkedOutQty);
                              setBulkReturnUserId("");
                              setBulkReturnError(null);
                            }}
                          >
                            Return
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : checkedOutUnits.length === 0 && bulkItems.length === 0 ? (
        <div className="empty-state">No units are currently checked out.</div>
      ) : ciGridPage === "categories" ? (
        <div className={`panel${ciGridDir ? ` grid-panel--${ciGridDir}` : ""}`}>
          <div className="panel-head">
            <h3>Browse by Category</h3>
            <span style={{ color: "var(--color-muted)", fontSize: "13px" }}>{checkedOutUnits.length} units out</span>
          </div>
          <div className="browse-grid">
            {categories.filter((cat) => catsWithCheckedOut.has(cat.id)).map((cat) => {
              const meta = getCategoryMeta(cat);
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
            {catsWithCheckedOut.has(null) && (
              <button type="button" className="browse-card" onClick={() => {
                setCiSelectedCat(UNCATEGORIZED_CATEGORY);
                setCiGridDir("forward");
                setCiGridPage("items");
              }}>
                <span className="browse-card__icon" style={{ color: UNCATEGORIZED_META.color, background: UNCATEGORIZED_META.bg }}>
                  <UNCATEGORIZED_META.Icon />
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
                  <th><div style={{ padding: "9px 14px" }}>Held By</div></th>
                  <th><div style={{ padding: "9px 14px" }}>Remove</div></th>
                </tr>
              </thead>
              <tbody>
                {returnCart.map((row) => (
                  <tr key={row.unit.id}>
                    <td><span className="asset-code" style={{ color: "#059669" }}>{row.unit.asset_code}</span></td>
                    <td>{itemName(row.unit.item_id)}</td>
                    <td style={{ color: "var(--color-muted)", fontSize: "13px" }}>{holderMap[row.unit.current_holder_id] ?? row.unit.current_holder_name ?? "—"}</td>
                    <td><button type="button" className="row-btn" onClick={() => removeFromReturnCart(row.unit.id)}>×</button></td>
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
                <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                  {receipt.returned.map((unit) => (
                    <li key={unit.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px 0" }}>
                      <span className="asset-code" style={{ marginRight: "4px" }}>{unit.asset_code}</span>
                      <span style={{ flex: 1 }}>{itemName(unit.item_id)}</span>
                      {conditionReported[unit.id] ? (
                        <span style={{ fontSize: "11px", fontWeight: 600, color: conditionReported[unit.id] === "damaged" ? "#dc2626" : "#d97706" }}>
                          ⚠ {conditionReported[unit.id] === "damaged" ? "Damaged" : "Needs Repair"}
                        </span>
                      ) : (
                        <span style={{ display: "flex", gap: "4px" }}>
                          <button type="button" className="row-btn" style={{ fontSize: "11px" }}
                            onClick={async () => {
                              await unitsApi.update(unit.id, { condition: "needs_repair" });
                              setConditionReported((prev) => ({ ...prev, [unit.id]: "needs_repair" }));
                            }}>
                            Needs Repair
                          </button>
                          <button type="button" className="row-btn" style={{ fontSize: "11px", color: "#dc2626" }}
                            onClick={async () => {
                              await unitsApi.update(unit.id, { condition: "damaged" });
                              setConditionReported((prev) => ({ ...prev, [unit.id]: "damaged" }));
                            }}>
                            Damaged
                          </button>
                        </span>
                      )}
                    </li>
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
      {bulkReturnItem && (
        <div className="modal-backdrop" onClick={() => setBulkReturnItem(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Return Bulk Item</h2>
              <button type="button" className="modal-close" onClick={() => setBulkReturnItem(null)}>×</button>
            </div>
            <p style={{ fontWeight: 600 }}>{bulkReturnItem.name}</p>
            <p style={{ color: "var(--color-muted)", fontSize: "13px", marginBottom: "12px" }}>
              {bulkReturnItem.quantity - bulkReturnItem.available_quantity} units currently out
            </p>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Returning User *</label>
                <select className="form-select" value={bulkReturnUserId} onChange={(e) => setBulkReturnUserId(e.target.value)}>
                  <option value="">Select user</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Quantity Returning</label>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <button type="button" className="btn btn-secondary" style={{ padding: "6px 12px", fontWeight: 700 }}
                    onClick={() => setBulkReturnQty((q) => Math.max(1, q - 1))}>−</button>
                  <input className="form-input" type="number" min={1}
                    max={bulkReturnItem.quantity - bulkReturnItem.available_quantity}
                    value={bulkReturnQty}
                    onChange={(e) => setBulkReturnQty(Math.max(1, Math.min(bulkReturnItem.quantity - bulkReturnItem.available_quantity, Number(e.target.value))))}
                    style={{ width: "60px", textAlign: "center" }} />
                  <button type="button" className="btn btn-secondary" style={{ padding: "6px 12px", fontWeight: 700 }}
                    onClick={() => setBulkReturnQty((q) => Math.min(bulkReturnItem.quantity - bulkReturnItem.available_quantity, q + 1))}>+</button>
                </div>
              </div>
            </div>
            {bulkReturnError && <div className="alert" style={{ marginTop: "8px" }}>{bulkReturnError}</div>}
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setBulkReturnItem(null)}>Cancel</button>
              <button
                className="btn btn-primary"
                style={{ background: "#059669", borderColor: "#059669" }}
                disabled={!bulkReturnUserId || bulkReturnSubmitting}
                onClick={handleBulkReturn}
              >
                {bulkReturnSubmitting ? "Returning..." : `Return ${bulkReturnQty} Unit${bulkReturnQty !== 1 ? "s" : ""}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

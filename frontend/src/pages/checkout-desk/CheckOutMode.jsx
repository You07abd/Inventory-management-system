import { useState, useMemo, useEffect } from "react";
import { getErrorMessage } from "../../api/client";
import { itemsApi } from "../../api/items";
import { categoriesApi } from "../../api/categories";
import { usersApi } from "../../api/users";
import { unitsApi } from "../../api/units";
import { CATEGORY_META, DEFAULT_META, BoxIcon } from "../../utils/categoryMeta.jsx";

const emptyForm = { user_id: "", due_date: "", notes: "" };

export default function CheckOutMode() {
  const [allItems, setAllItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [itemsOpen, setItemsOpen] = useState(true);
  const [cartOpen, setCartOpen] = useState(true);
  const [viewMode, setViewMode] = useState("grid");
  const [gridPage, setGridPage] = useState("categories");
  const [gridDir, setGridDir] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemUnits, setItemUnits] = useState([]);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [pendingCartItem, setPendingCartItem] = useState(null);
  const [pendingQty, setPendingQty] = useState(1);
  const [showCheckoutConfirm, setShowCheckoutConfirm] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [items, loadedUsers, loadedCats] = await Promise.all([
          itemsApi.list({ limit: 500 }),
          usersApi.list(),
          categoriesApi.list(),
        ]);
        if (!active) return;
        setAllItems(items);
        setUsers(loadedUsers);
        setCategories(loadedCats);
      } catch (err) {
        if (active) setError(getErrorMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();
    return () => { active = false; };
  }, []);

  const holderMap = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u.name])), [users]);
  const cartItemIds = useMemo(() => new Set(cart.map((c) => c.unit.id)), [cart]);
  const itemName = (itemId) => allItems.find((i) => i.id === itemId)?.name ?? "";
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allItems;
    return allItems.filter((i) =>
      i.name.toLowerCase().includes(q) ||
      i.asset_code.toLowerCase().includes(q) ||
      (i.serial_number || "").toLowerCase().includes(q)
    );
  }, [allItems, query]);
  const availableItems = useMemo(
    () => allItems.filter((i) => i.available_quantity > 0 && i.condition !== "damaged"),
    [allItems]
  );
  const selectedCategoryItems = useMemo(() => {
    if (!selectedCategory) return [];
    return allItems.filter((item) =>
      selectedCategory.id === null ? item.category_id === null : item.category_id === selectedCategory.id
    );
  }, [allItems, selectedCategory]);

  function itemDisabledReason(item) {
    if (item.condition === "damaged") return "Damaged";
    if (item.available_quantity <= 0) return `Out — ${holderMap[item.current_holder_id] ?? "Unknown"}`;
    return null;
  }

  function loadUnitsForItem(item) {
    setSelectedItem(item);
    setGridDir("forward");
    setGridPage("units");
    setLoadingUnits(true);
    unitsApi.listByItem(item.id).then((data) => {
      setItemUnits(data.filter((u) => u.status === "available" && !cartItemIds.has(u.id)));
      setLoadingUnits(false);
    }).catch(() => setLoadingUnits(false));
  }

  function switchView(mode) {
    setViewMode(mode);
    setGridPage("categories");
    setGridDir("forward");
    setSelectedCategory(null);
    setSelectedItem(null);
    setItemUnits([]);
  }

  function addToCart(unit, quantity = 1) {
    setCart((prev) => [...prev, { unit, quantity: 1 }]);
    setItemUnits((prev) => prev.filter((u) => u.id !== unit.id));
  }

  function removeFromCart(unitId) {
    setCart((prev) => prev.filter(({ unit }) => unit.id !== unitId));
  }

  function updateForm(key, val) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result = await unitsApi.cartCheckout({
        unit_ids: cart.map(({ unit }) => unit.id),
        user_id: Number(form.user_id),
        due_date: form.due_date || null,
        notes: form.notes || null,
      });
      setReceipt(result);
      setCart([]);
      setForm(emptyForm);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  function startNewCart() {
    setCart([]);
    setForm(emptyForm);
    setReceipt(null);
    setError(null);
  }

  return (
    <>
      {error && <div className="alert">{error}</div>}

      <div className="panel">
        <div className="panel-body" style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <input className="form-input" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by asset code, name, or serial number..." style={{ flex: 1 }} />
          <button type="button" className={`btn ${viewMode === "grid" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => switchView("grid")} style={{ whiteSpace: "nowrap" }}>Grid</button>
          <button type="button" className={`btn ${viewMode === "list" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => switchView("list")} style={{ whiteSpace: "nowrap" }}>List</button>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading items...</div>
      ) : viewMode === "list" || query.trim() ? (
        <div className="panel">
          <div className="panel-head" onClick={() => setItemsOpen((o) => !o)} style={{ cursor: "pointer", userSelect: "none" }}>
            <h3>{query ? `Results for "${query}"` : "All Items"}</h3>
            <span style={{ color: "var(--color-muted)", fontSize: "13px" }}>{filtered.length} items</span>
          </div>
          <div style={{ display: "grid", gridTemplateRows: itemsOpen ? "1fr" : "0fr", transition: "grid-template-rows 220ms ease" }}>
            <div style={{ overflow: "hidden" }}>
              {viewMode === "grid" && query.trim() && (
                <div style={{ color: "var(--color-muted)", fontSize: "12.5px", padding: "12px 14px 0" }}>Clear search to browse by category</div>
              )}
              <div className="table-wrap" style={{ maxHeight: "420px", overflowY: "auto" }}>
                <table className="inv-table">
                  <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
                    <tr>
                      <th style={{ width: "4px", padding: 0 }} />
                      <th><div style={{ padding: "9px 14px" }}>Code</div></th>
                      <th><div style={{ padding: "9px 14px" }}>Name</div></th>
                      <th><div style={{ padding: "9px 14px" }}>Location</div></th>
                      <th><div style={{ padding: "9px 14px" }}>Status</div></th>
                      <th><div style={{ padding: "9px 14px" }}></div></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((item) => {
                      const reason = itemDisabledReason(item);
                      const checkedOut = item.quantity - item.available_quantity;
                      const partial = checkedOut > 0 && item.available_quantity > 0;
                      const fullyOut = item.available_quantity === 0;
                      const statusKey = fullyOut ? "out" : partial ? "partial" : "available";
                      return (
                        <tr key={item.id} data-status={statusKey} style={{ opacity: reason ? 0.5 : 1 }}>
                          <td className="inv-table__accent" />
                          <td><span className="asset-code">{item.asset_code}</span></td>
                          <td>{item.name}</td>
                          <td style={{ color: "var(--color-muted)", fontSize: "13px" }}>{item.location_name || "—"}</td>
                          <td>
                            <span className={`inv-table__status inv-table__status--${statusKey}`}>
                              <span className="inv-table__dot" />
                              {fullyOut ? "Checked Out" : partial ? "Partial" : "Available"}
                            </span>
                          </td>
                          <td>
                            {reason
                              ? <button className="row-btn" disabled style={{ opacity: 0.5 }}>{reason}</button>
                              : <button className="row-btn row-btn--primary" onClick={() => loadUnitsForItem(item)}>Units</button>}
                          </td>
                        </tr>
                      );
                    })}
                    {filtered.length === 0 && <tr><td colSpan={6}><div className="empty-state">No items found.</div></td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : gridPage === "categories" ? (
        <div className={`panel${gridDir ? ` grid-panel--${gridDir}` : ""}`}>
          <div className="panel-head">
            <h3>Browse by Category</h3>
            <span style={{ color: "var(--color-muted)", fontSize: "13px" }}>{categories.length} categories</span>
          </div>
          <div className="browse-grid">
            {categories.map((category) => {
              const meta = CATEGORY_META[category.name] ?? DEFAULT_META;
              const Icon = meta.Icon;
              const count = availableItems.filter((item) => item.category_id === category.id).length;
              return (
                <button key={category.id} type="button" className="browse-card" onClick={() => {
                  setSelectedCategory(category);
                  setGridDir("forward");
                  setGridPage("items");
                }}>
                  <span className="browse-card__icon" style={{ color: meta.color, background: meta.bg }}><Icon /></span>
                  <span className="browse-card__label">{category.name}</span>
                  <span className="browse-card__sub">{count} available</span>
                  <div className="cat-card-overlay" style={{ background: meta.bg, color: meta.color, justifyContent: "center", alignItems: "center", textAlign: "center" }}>
                    <div className="cat-card-overlay__title">{category.name}</div>
                    {category.description && <div className="cat-card-overlay__desc">{category.description}</div>}
                  </div>
                </button>
              );
            })}
            {allItems.some((item) => item.category_id === null) && (
              <button type="button" className="browse-card" onClick={() => {
                setSelectedCategory({ id: null, name: "Uncategorized" });
                setGridDir("forward");
                setGridPage("items");
              }}>
                <span className="browse-card__icon" style={{ color: DEFAULT_META.color, background: DEFAULT_META.bg }}><BoxIcon /></span>
                <span className="browse-card__label">Uncategorized</span>
                <span className="browse-card__sub">{availableItems.filter((item) => item.category_id === null).length} available</span>
                <div className="cat-card-overlay" style={{ background: DEFAULT_META.bg, color: DEFAULT_META.color, justifyContent: "center", alignItems: "center", textAlign: "center" }}>
                  <div className="cat-card-overlay__title">Uncategorized</div>
                </div>
              </button>
            )}
          </div>
        </div>
      ) : gridPage === "items" ? (
        <div className={`panel${gridDir ? ` grid-panel--${gridDir}` : ""}`}>
          <div className="panel-head">
            <button type="button" className="btn btn-secondary" onClick={() => {
              setGridDir("backward");
              setGridPage("categories");
              setSelectedCategory(null);
            }}>Back</button>
            <h3>{selectedCategory?.name ?? "Items"}</h3>
            <span style={{ color: "var(--color-muted)", fontSize: "13px" }}>{selectedCategoryItems.length} items</span>
          </div>
          <div className="inv-grid">
            {selectedCategoryItems.map((item) => {
              const reason = itemDisabledReason(item);
              const fullyOut = item.available_quantity === 0;
              const partial = !fullyOut && item.available_quantity < item.quantity;
              const statusKey = reason ? "disabled" : fullyOut ? "out" : partial ? "partial" : "available";
              const chipLabel = reason === "Damaged" ? "Damaged" : fullyOut ? "Out" : partial ? "Partial" : "Available";
              return (
                <div key={item.id} className="inv-card" onClick={() => {
                  if (item.available_quantity > 0 && item.condition !== "damaged") loadUnitsForItem(item);
                }} style={{ cursor: reason ? "default" : "pointer", opacity: reason ? 0.5 : 1 }}>
                  <div className="inv-card__header">
                    <span className="inv-card__code">{item.asset_code}</span>
                    <span className={`inv-card__chip inv-card__chip--${statusKey}`}>{chipLabel}</span>
                  </div>
                  <div className="inv-card__name">{item.name}</div>
                  <div className="inv-card__meta"><span>{item.location_name || "—"}</span></div>
                  <div className="inv-card__footer">
                    <span className="inv-card__stats">{item.available_quantity}/{item.quantity}<span className="inv-card__sep"> · </span>{item.condition.replace(/_/g, " ")}</span>
                  </div>
                </div>
              );
            })}
            {selectedCategoryItems.length === 0 && <div className="empty-state" style={{ gridColumn: "1 / -1" }}>No items found.</div>}
          </div>
        </div>
      ) : (
        <div className={"panel" + (gridDir ? " grid-panel--" + gridDir : "")}>
          <div className="panel-head">
            <button type="button" className="btn btn-secondary" onClick={() => { setGridDir("backward"); setGridPage("items"); setSelectedItem(null); setItemUnits([]); }}>Back</button>
            <h3>{selectedItem?.name}</h3>
            <span style={{ color: "var(--color-muted)", fontSize: "13px" }}>{itemUnits.length} unit{itemUnits.length !== 1 ? "s" : ""} available</span>
          </div>
          {loadingUnits ? (
            <div className="loading">Loading units...</div>
          ) : itemUnits.length === 0 ? (
            <div className="empty-state">No available units for this model.</div>
          ) : (
            <div className="inv-grid" style={{ padding: "14px" }}>
              {itemUnits.map((unit) => (
                <div key={unit.id} className="inv-card" style={{ cursor: "pointer" }} onClick={() => { setPendingCartItem(unit); setPendingQty(1); }}>
                  <div className="inv-card__header">
                    <span className="inv-card__code">{unit.asset_code}</span>
                    <span className="inv-card__chip inv-card__chip--available">Available</span>
                  </div>
                  <div className="inv-card__name">{selectedItem?.name}</div>
                  <div className="inv-card__meta"><span>{unit.location_name || "—"}</span></div>
                  <div className="inv-card__footer">
                    <span className="inv-card__stats">
                      {unit.serial_number ? "SN: " + unit.serial_number : "No serial"}
                      <span className="inv-card__sep"> · </span>
                      {unit.condition.replace(/_/g, " ")}
                    </span>
                    <button className="row-btn row-btn--primary" onClick={(e) => { e.stopPropagation(); setPendingCartItem(unit); setPendingQty(1); }}>Add</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="panel">
        <div className="panel-head" onClick={() => setCartOpen((o) => !o)} style={{ cursor: "pointer", userSelect: "none" }}>
          <h3>Cart — {cart.length} {cart.length === 1 ? "unit" : "units"}</h3>
        </div>
        <div style={{ display: "grid", gridTemplateRows: cartOpen ? "1fr" : "0fr", transition: "grid-template-rows 220ms ease" }}>
          <div style={{ overflow: "hidden" }}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th><div style={{ padding: "9px 14px" }}>Asset Code</div></th>
                    <th><div style={{ padding: "9px 14px" }}>Model</div></th>
                    <th><div style={{ padding: "9px 14px" }}>Location</div></th>
                    <th><div style={{ padding: "9px 14px" }}></div></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.length === 0 ? (
                    <tr><td colSpan={4}><div className="empty-state">No units added yet.</div></td></tr>
                  ) : cart.map(({ unit }) => (
                    <tr key={unit.id}>
                      <td><span className="asset-code">{unit.asset_code}</span></td>
                      <td>{itemName(unit.item_id)}</td>
                      <td style={{ color: "var(--color-muted)", fontSize: "13px" }}>{unit.location_name || "—"}</td>
                      <td><button className="row-btn" onClick={() => removeFromCart(unit.id)}>×</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {cart.length > 0 && (
        <div className="panel">
          <div className="panel-head"><h3>Checkout Details</h3></div>
          <div className="panel-body">
            <form onSubmit={(e) => { e.preventDefault(); setShowCheckoutConfirm(true); }}>
              <div className="form-card">
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">User *</label>
                    <select className="form-select" value={form.user_id} onChange={(e) => updateForm("user_id", e.target.value)} required>
                      <option value="" disabled>Select user</option>
                      {users.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Expected Return Date</label>
                    <input className="form-input" type="date" min={new Date().toLocaleDateString("en-CA")}
                      value={form.due_date} onChange={(e) => updateForm("due_date", e.target.value)} />
                  </div>
                  <div className="form-group wide">
                    <label className="form-label">Notes</label>
                    <textarea className="form-textarea" value={form.notes} onChange={(e) => updateForm("notes", e.target.value)} rows="3" />
                  </div>
                </div>
              </div>
              <button type="submit" className="btn btn-primary" disabled={submitting || !form.user_id || cart.length === 0} style={{ marginTop: "12px" }}>
                {submitting ? "Saving..." : `Check Out ${cart.length} ${cart.length === 1 ? "Unit" : "Units"}`}
              </button>
            </form>
          </div>
        </div>
      )}

      {receipt && (
        <div className="panel">
          <div className="panel-head" style={{ background: "var(--color-primary-light)", borderColor: "var(--color-primary-border)" }}>
            <h3 style={{ color: "var(--color-primary)" }}>Checked out successfully</h3>
          </div>
          <div className="panel-body">
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "13px", marginBottom: "12px" }}>Session ID: {receipt.session_id}</p>
            <ul style={{ margin: "0 0 16px", padding: "0 0 0 18px" }}>
              {(receipt.unit_ids || []).map((unitId) => (
                <li key={unitId} style={{ marginBottom: "4px" }}>{receipt.item_name_map?.[unitId] || `Unit #${unitId}`}</li>
              ))}
            </ul>
            <button type="button" className="btn btn-primary" onClick={startNewCart}>Start New Checkout</button>
          </div>
        </div>
      )}

      {pendingCartItem && (
        <div className="modal-backdrop" onClick={() => { setPendingCartItem(null); setPendingQty(1); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add to Cart?</h2>
              <button className="modal-close" onClick={() => { setPendingCartItem(null); setPendingQty(1); }}>×</button>
            </div>
            <div>
              <p style={{ fontWeight: 600 }}>{pendingCartItem.asset_code}</p>
              <p style={{ color: "var(--color-muted)", fontSize: "13px" }}>{selectedItem?.name}</p>
              <p style={{ fontSize: "13px", marginTop: "6px" }}>{pendingCartItem.location_name || "—"}</p>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => { setPendingCartItem(null); setPendingQty(1); }}>Cancel</button>
              <button className="btn btn-primary" onClick={() => { addToCart(pendingCartItem); setPendingCartItem(null); setPendingQty(1); }}>Add to Cart</button>
            </div>
          </div>
        </div>
      )}

      {showCheckoutConfirm && (
        <div className="modal-backdrop" onClick={() => setShowCheckoutConfirm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Confirm Checkout</h2>
              <button className="modal-close" onClick={() => setShowCheckoutConfirm(false)}>×</button>
            </div>
            <div>
              <p style={{ fontSize: "13px", color: "var(--color-muted)", marginBottom: "8px" }}>
                Checking out {cart.length} {cart.length === 1 ? "unit" : "units"} for <strong>{users.find((u) => u.id === Number(form.user_id))?.name ?? "—"}</strong>
              </p>
              <ul style={{ margin: "0 0 8px", padding: "0 0 0 18px", fontSize: "13px" }}>
                {cart.map(({ unit }) => (
                  <li key={unit.id}><span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", marginRight: "6px" }}>{unit.asset_code}</span>{itemName(unit.item_id)}</li>
                ))}
              </ul>
              {form.due_date && <p style={{ fontSize: "13px", color: "var(--color-muted)" }}>Due: {new Date(form.due_date + "T00:00:00").toLocaleDateString()}</p>}
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowCheckoutConfirm(false)}>Go Back</button>
              <button className="btn btn-primary" disabled={submitting} onClick={() => { setShowCheckoutConfirm(false); handleSubmit(); }}>
                {submitting ? "Saving..." : "Confirm Checkout"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

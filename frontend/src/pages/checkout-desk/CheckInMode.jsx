import { useState, useMemo, useEffect } from "react";
import { getErrorMessage } from "../../api/client";
import { itemsApi } from "../../api/items";
import { categoriesApi } from "../../api/categories";
import { usersApi } from "../../api/users";

const DroneIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/>
    <circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>
    <circle cx="12" cy="12" r="3"/>
    <line x1="8" y1="8" x2="10" y2="10"/><line x1="16" y1="8" x2="14" y2="10"/>
    <line x1="8" y1="16" x2="10" y2="14"/><line x1="16" y1="16" x2="14" y2="14"/>
  </svg>
);
const CameraIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
);
const BatteryIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="6" width="18" height="12" rx="2"/>
    <line x1="23" y1="13" x2="23" y2="11"/>
    <line x1="5" y1="12" x2="13" y2="12"/>
    <line x1="9" y1="8" x2="9" y2="16"/>
  </svg>
);
const GamepadIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="6" width="20" height="12" rx="5"/>
    <line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/>
    <circle cx="16" cy="10" r="1" fill="currentColor"/><circle cx="18" cy="12" r="1" fill="currentColor"/>
  </svg>
);
const WrenchIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
  </svg>
);
const ShieldIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);
const BoxIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
);

const CATEGORY_META = {
  "Drones":              { color: "#2563eb", bg: "#eff6ff", Icon: DroneIcon },
  "Cameras & Payloads":  { color: "#7c3aed", bg: "#f5f3ff", Icon: CameraIcon },
  "Batteries & Power":   { color: "#d97706", bg: "#fffbeb", Icon: BatteryIcon },
  "Controllers & Comms": { color: "#0891b2", bg: "#ecfeff", Icon: GamepadIcon },
  "Tools & Maintenance": { color: "#475569", bg: "#f8fafc", Icon: WrenchIcon },
  "Safety Equipment":    { color: "#dc2626", bg: "#fef2f2", Icon: ShieldIcon },
};
const DEFAULT_META = { color: "#94a3b8", bg: "#f8fafc", Icon: BoxIcon };

const CONDITIONS = [
  { value: "excellent", label: "Excellent" },
  { value: "good", label: "Good" },
  { value: "needs_inspection", label: "Needs Inspection" },
  { value: "damaged", label: "Damaged" },
];

export default function CheckInMode() {
  const [allItems, setAllItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [expandedCats, setExpandedCats] = useState(new Set());
  const [returnCart, setReturnCart] = useState([]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [viewMode, setViewMode] = useState("list");
  const [ciGridPage, setCiGridPage] = useState("categories");
  const [ciSelectedCat, setCiSelectedCat] = useState(null);

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
        if (!active) return;
        setAllItems(items);
        setCategories(loadedCategories);
        setUsers(loadedUsers);
      } catch (err) {
        if (!active) return;
        setLoadError(getErrorMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, []);

  const holderMap = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u.name])), [users]);
  const returnableItems = useMemo(() => allItems.filter((i) => i.available_quantity < i.quantity), [allItems]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return returnableItems;
    return returnableItems.filter((i) =>
      i.name.toLowerCase().includes(q) ||
      i.asset_code.toLowerCase().includes(q) ||
      (i.serial_number || "").toLowerCase().includes(q)
    );
  }, [returnableItems, query]);
  const cartItemIds = useMemo(() => new Set(returnCart.map((r) => r.item.id)), [returnCart]);
  const grouped = useMemo(() => {
    const map = new Map();
    for (const item of returnableItems) {
      const key = item.category_id ?? 0;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    }
    return map;
  }, [returnableItems]);

  function toggleCat(catId) {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId); else next.add(catId);
      return next;
    });
  }

  function switchCiView(mode) {
    setViewMode(mode);
    setCiGridPage("categories");
    setCiSelectedCat(null);
  }

  function addToReturnCart(item) {
    const quantity = item.quantity - item.available_quantity;
    setReturnCart((prev) => [...prev, { item, quantity, condition: "good" }]);
  }

  function removeFromReturnCart(itemId) {
    setReturnCart((prev) => prev.filter((r) => r.item.id !== itemId));
  }

  function updateCartQty(itemId, val) {
    const quantity = Math.max(1, parseInt(val, 10) || 1);
    setReturnCart((prev) =>
      prev.map((r) =>
        r.item.id === itemId
          ? { ...r, quantity: Math.min(quantity, r.item.quantity - r.item.available_quantity) }
          : r
      )
    );
  }

  function updateCartCondition(itemId, val) {
    setReturnCart((prev) => prev.map((r) => r.item.id === itemId ? { ...r, condition: val } : r));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    const returned = [];
    const failed = [];
    for (const row of returnCart) {
      try {
        await itemsApi.checkin(row.item.id, {
          user_id: row.item.current_holder_id,
          quantity: row.quantity,
          condition_on_return: row.condition,
          notes: notes || null,
        });
        returned.push(row.item);
      } catch (err) {
        failed.push({ item: row.item, error: getErrorMessage(err) });
      }
    }
    setReturnCart((prev) => prev.filter((r) => failed.some((f) => f.item.id === r.item.id)));
    setNotes("");
    setReceipt({ returned, failed });
    setSubmitting(false);
  }

  return (
    <>
      {loadError && <div className="alert">{loadError}</div>}

      {/* Search */}
      <div className="panel">
        <div className="panel-body" style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <input
            className="form-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search items to return…"
            style={{ flex: 1 }}
          />
          <button
            type="button"
            className={`btn ${viewMode === "list" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => switchCiView("list")}
            style={{ whiteSpace: "nowrap" }}
          >
            List
          </button>
          <button
            type="button"
            className={`btn ${viewMode === "grid" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => switchCiView("grid")}
            style={{ whiteSpace: "nowrap" }}
          >
            Browse
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading items…</div>
      ) : viewMode === "list" || query.trim() ? (
        query.trim() ? (
          <div className="panel">
            <div className="panel-head">
              <h3>Results for "{query}"</h3>
              <span style={{ color: "var(--color-muted)", fontSize: "13px" }}>{filtered.length} items</span>
            </div>
            {viewMode === "grid" && (
              <div style={{ color: "var(--color-muted)", fontSize: "12.5px", padding: "12px 14px 0" }}>
                Clear search to browse by category
              </div>
            )}
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th><div style={{ padding: "9px 14px" }}>Code</div></th>
                    <th><div style={{ padding: "9px 14px" }}>Name</div></th>
                    <th><div style={{ padding: "9px 14px" }}>Held by</div></th>
                    <th><div style={{ padding: "9px 14px" }}>Qty out</div></th>
                    <th><div style={{ padding: "9px 14px" }}></div></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr key={item.id}>
                      <td><span className="asset-code" style={{ color: "#059669" }}>{item.asset_code}</span></td>
                      <td>{item.name}</td>
                      <td style={{ color: "var(--color-muted)", fontSize: "13px" }}>{holderMap[item.current_holder_id] ?? "—"}</td>
                      <td>{item.quantity - item.available_quantity}</td>
                      <td>
                        {cartItemIds.has(item.id)
                          ? <button className="row-btn" disabled style={{ opacity: 0.5 }}>Added</button>
                          : <button className="row-btn row-btn--primary" onClick={() => addToReturnCart(item)}>Return</button>
                        }
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={5}><div className="empty-state">No items found.</div></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : returnableItems.length === 0 ? (
          <div className="empty-state">No items are currently checked out.</div>
        ) : (
          [...grouped.entries()].map(([catId, items]) => {
            const catName = catId === 0
              ? "Uncategorized"
              : (categories.find((c) => c.id === catId)?.name ?? "Unknown Category");
            const isOpen = expandedCats.has(catId);
            return (
              <div key={catId} className="panel">
                <div className="panel-head"
                     style={{ cursor: "pointer", userSelect: "none" }}
                     onClick={() => toggleCat(catId)}>
                  <h3>
                    {catName}
                    <span style={{ color: "var(--color-muted)", fontWeight: 400, marginLeft: "8px" }}>
                      ({items.length})
                    </span>
                  </h3>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                       stroke="currentColor" strokeWidth="2"
                       strokeLinecap="round" strokeLinejoin="round"
                       style={{ transform: isOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 160ms ease" }}>
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateRows: isOpen ? '1fr' : '0fr',
                  transition: 'grid-template-rows 220ms ease',
                }}>
                  <div style={{ overflow: 'hidden' }}>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th><div style={{ padding: "9px 14px" }}>Code</div></th>
                            <th><div style={{ padding: "9px 14px" }}>Name</div></th>
                            <th><div style={{ padding: "9px 14px" }}>Held by</div></th>
                            <th><div style={{ padding: "9px 14px" }}>Qty out</div></th>
                            <th><div style={{ padding: "9px 14px" }}></div></th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((item) => (
                            <tr key={item.id}>
                              <td><span className="asset-code" style={{ color: "#059669" }}>{item.asset_code}</span></td>
                              <td>{item.name}</td>
                              <td style={{ color: "var(--color-muted)", fontSize: "13px" }}>{holderMap[item.current_holder_id] ?? "—"}</td>
                              <td>{item.quantity - item.available_quantity}</td>
                              <td>
                                {cartItemIds.has(item.id)
                                  ? <button className="row-btn" disabled style={{ opacity: 0.5 }}>Added</button>
                                  : <button className="row-btn row-btn--primary" onClick={() => addToReturnCart(item)}>Return</button>
                                }
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )
      ) : ciGridPage === "categories" ? (
        <div className="panel">
          <div className="panel-head">
            <h3>Browse by Category</h3>
            <span style={{ color: "var(--color-muted)", fontSize: "13px" }}>{returnableItems.length} items out</span>
          </div>
          <div className="browse-grid">
            {[...grouped.entries()].map(([catId, items]) => {
              const catName = catId === 0
                ? "Uncategorized"
                : (categories.find((c) => c.id === catId)?.name ?? "Unknown Category");
              const meta = CATEGORY_META[catName] ?? DEFAULT_META;
              const Icon = meta.Icon;
              return (
                <button
                  key={catId}
                  type="button"
                  className="browse-card"
                  onClick={() => {
                    setCiSelectedCat({ id: catId, name: catName });
                    setCiGridPage("items");
                  }}
                >
                  <span className="browse-card__icon" style={{ color: meta.color, background: meta.bg }}>
                    <Icon />
                  </span>
                  <span className="browse-card__label">{catName}</span>
                  <span className="browse-card__sub">{items.length} items out</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="panel">
          <div className="panel-head">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setCiGridPage("categories");
                setCiSelectedCat(null);
              }}
            >
              Back
            </button>
            <h3>{ciSelectedCat?.name ?? "Items"}</h3>
            <span style={{ color: "var(--color-muted)", fontSize: "13px" }}>
              {returnableItems.filter((item) => (item.category_id ?? 0) === ciSelectedCat?.id).length} items
            </span>
          </div>
          <div className="browse-grid">
            {returnableItems
              .filter((item) => (item.category_id ?? 0) === ciSelectedCat?.id)
              .map((item) => {
                const inCart = cartItemIds.has(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`browse-card ${inCart ? "browse-card--in-cart" : ""}`}
                    onClick={() => {
                      if (!inCart) addToReturnCart(item);
                    }}
                  >
                    <span className="browse-card__code">{item.asset_code}</span>
                    <span className="browse-card__label">{item.name}</span>
                    <span className="browse-card__sub">Held by {holderMap[item.current_holder_id] ?? "—"}</span>
                    <span className="browse-card__sub">{item.quantity - item.available_quantity} out</span>
                    {inCart && <span className="badge badge--available">Added</span>}
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {/* Return cart */}
      {returnCart.length > 0 && (
        <div className="panel">
          <div className="panel-head">
            <h3>Return Cart — {returnCart.length} {returnCart.length === 1 ? "item" : "items"}</h3>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th><div style={{ padding: "9px 14px" }}>Code</div></th>
                  <th><div style={{ padding: "9px 14px" }}>Name</div></th>
                  <th><div style={{ padding: "9px 14px" }}>Qty</div></th>
                  <th><div style={{ padding: "9px 14px" }}>Condition</div></th>
                  <th><div style={{ padding: "9px 14px" }}></div></th>
                </tr>
              </thead>
              <tbody>
                {returnCart.map((row) => (
                  <tr key={row.item.id}>
                    <td><span className="asset-code" style={{ color: "#059669" }}>{row.item.asset_code}</span></td>
                    <td>{row.item.name}</td>
                    <td>
                      <input type="number" className="form-input"
                             min={1} max={row.item.quantity - row.item.available_quantity}
                             value={row.quantity}
                             onChange={(e) => updateCartQty(row.item.id, e.target.value)}
                             style={{ width: "70px", padding: "6px 8px" }} />
                    </td>
                    <td>
                      <select className="form-select" value={row.condition}
                              onChange={(e) => updateCartCondition(row.item.id, e.target.value)}
                              style={{ padding: "5px 8px", fontSize: "13px" }}>
                        {CONDITIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                    </td>
                    <td>
                      <button className="row-btn" onClick={() => removeFromReturnCart(row.item.id)}>×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Submit */}
      {returnCart.length > 0 && (
        <div className="panel">
          <div className="panel-head"><h3>Return selected items</h3></div>
          <div className="panel-body">
            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: "12px" }}>
                <label className="form-label">Notes (optional)</label>
                <textarea className="form-textarea" value={notes}
                          onChange={(e) => setNotes(e.target.value)} rows="2" />
              </div>
              {submitError && <div className="alert" style={{ marginBottom: "12px" }}>{submitError}</div>}
              <button type="submit" className="btn btn-primary"
                      disabled={submitting || returnCart.length === 0}
                      style={{ background: "#059669", borderColor: "#059669" }}>
                {submitting ? "Returning…" : `Return ${returnCart.length} ${returnCart.length === 1 ? "Item" : "Items"}`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Receipt */}
      {receipt && (
        <>
          {receipt.returned.length > 0 && (
            <div className="panel" style={{ borderColor: "#bbf7d0" }}>
              <div className="panel-head" style={{ background: "#d1fae5", borderColor: "#bbf7d0" }}>
                <h3 style={{ color: "#065f46" }}>Returned — {receipt.returned.length} {receipt.returned.length === 1 ? "item" : "items"}</h3>
              </div>
              <div className="panel-body">
                <ul style={{ margin: 0, padding: "0 0 0 18px" }}>
                  {receipt.returned.map((item) => (
                    <li key={item.id}>
                      <span className="asset-code" style={{ marginRight: "8px" }}>{item.asset_code}</span>
                      {item.name}
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
                  {receipt.failed.map(({ item, error }) => (
                    <li key={item.id}>
                      <span className="asset-code" style={{ marginRight: "8px" }}>{item.asset_code}</span>
                      {item.name} — {error}
                    </li>
                  ))}
                </ul>
                <p style={{ fontSize: "13px", color: "var(--color-muted)", margin: 0 }}>Failed items remain in cart — fix and retry.</p>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}

import React, { useState, useMemo, useEffect } from "react";
import { getErrorMessage } from "../../api/client";
import { itemsApi } from "../../api/items";
import { categoriesApi } from "../../api/categories";
import { locationsApi } from "../../api/locations";
import { usersApi } from "../../api/users";
import { unitsApi } from "../../api/units";
import { checkoutApi } from "../../api/checkout";
import { getCategoryMeta, UNCATEGORIZED_CATEGORY } from "../../utils/categoryMeta.jsx";
import DatePicker from "../../components/DatePicker";
import LiveScanMode from "./LiveScanMode";

const emptyForm = { user_id: "", due_date: "", notes: "" };

export default function CheckOutMode() {
  const [allItems, setAllItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [unitCart, setUnitCart] = useState(() => { try { const s = localStorage.getItem('checkout_unit_cart'); return s ? JSON.parse(s) : []; } catch { return []; } });
  const [bulkCart, setBulkCart] = useState(() => { try { const s = localStorage.getItem('checkout_bulk_cart'); return s ? JSON.parse(s) : []; } catch { return []; } });
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
  const [fungibleItem, setFungibleItem] = useState(null);
  const [fungibleQty, setFungibleQty] = useState(1);
  const [itemUnits, setItemUnits] = useState([]);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [pendingCartItem, setPendingCartItem] = useState(null);
  const [showCheckoutConfirm, setShowCheckoutConfirm] = useState(false);
  const [liveScanActive, setLiveScanActive] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [categoryOrder, setCategoryOrder] = useState([]);
  const [hiddenCategoryIds, setHiddenCategoryIds] = useState([]);
  const [listCategoryFilter, setListCategoryFilter] = useState(null);
  const [locationFilter, setLocationFilter] = useState(null);
  const [conditionFilter, setConditionFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [expandedItemId, setExpandedItemId] = useState(null);
  const [expandedUnits, setExpandedUnits] = useState([]);
  const [loadingExpanded, setLoadingExpanded] = useState(false);
  const [listBulkQtys, setListBulkQtys] = useState({});

  useEffect(() => {
    let active = true;

    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [items, loadedUsers, loadedCats, loadedLocations] = await Promise.all([
          itemsApi.list({ limit: 500 }),
          usersApi.list(),
          categoriesApi.list(),
          locationsApi.list(),
        ]);
        if (!active) return;
        setAllItems(items);
        setUsers(loadedUsers);
        setCategories(loadedCats);
        setLocations(loadedLocations);
        const existingIds = loadedCats.map(c => c.id);
        const hasUncategorized = items.some(i => i.category_id === null);
        const allAvailableIds = [...existingIds, null];
        const rawOrder = localStorage.getItem('checkout_cat_order');
        const rawHidden = localStorage.getItem('checkout_cat_hidden');
        const savedOrder = rawOrder ? JSON.parse(rawOrder) : null;
        const savedHidden = rawHidden ? JSON.parse(rawHidden) : [];
        const mergedOrder = savedOrder
          ? [...savedOrder.filter(id => allAvailableIds.includes(id)), ...allAvailableIds.filter(id => !savedOrder.includes(id))]
          : allAvailableIds;
        setCategoryOrder(mergedOrder);
        setHiddenCategoryIds(savedHidden);
      } catch (err) {
        if (active) setError(getErrorMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (categoryOrder.length > 0) localStorage.setItem('checkout_cat_order', JSON.stringify(categoryOrder));
  }, [categoryOrder]);

  useEffect(() => {
    localStorage.setItem('checkout_cat_hidden', JSON.stringify(hiddenCategoryIds));
  }, [hiddenCategoryIds]);

  useEffect(() => { localStorage.setItem('checkout_unit_cart', JSON.stringify(unitCart)); }, [unitCart]);
  useEffect(() => { localStorage.setItem('checkout_bulk_cart', JSON.stringify(bulkCart)); }, [bulkCart]);

  const holderMap = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u.name])), [users]);
  const cartItemIds = useMemo(() => new Set(unitCart.map((c) => c.unit.id)), [unitCart]);
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
  const listFiltered = useMemo(() => {
    return filtered.filter((item) => {
      if (conditionFilter && item.condition !== conditionFilter) return false;
      if (listCategoryFilter === "uncategorized" && item.category_id != null) return false;
      if (listCategoryFilter !== null && listCategoryFilter !== "uncategorized" && item.category_id !== listCategoryFilter) return false;
      if (locationFilter !== null && item.location_id !== locationFilter) return false;
      if (statusFilter === "available" && item.available_quantity !== item.quantity) return false;
      if (statusFilter === "partial" && !(item.available_quantity > 0 && item.available_quantity < item.quantity)) return false;
      if (statusFilter === "out" && item.available_quantity !== 0) return false;
      return true;
    });
  }, [filtered, listCategoryFilter, locationFilter, conditionFilter, statusFilter]);
  const listUncategorizedCount = filtered.filter((item) => item.category_id == null).length;
  const listUncategorizedMeta = getCategoryMeta(UNCATEGORIZED_CATEGORY);

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
    setFungibleItem(null);
    setFungibleQty(1);
    setItemUnits([]);
    setListCategoryFilter(null);
    setLocationFilter(null);
    setConditionFilter("");
    setStatusFilter("");
    setExpandedItemId(null);
    setExpandedUnits([]);
    setListBulkQtys({});
  }

  function moveCategoryUp(id) {
    setCategoryOrder(prev => {
      const idx = prev.indexOf(id);
      if (idx <= 0) return prev;
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  }

  function moveCategoryDown(id) {
    setCategoryOrder(prev => {
      const idx = prev.indexOf(id);
      if (idx < 0 || idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  }

  function hideCategory(id) {
    setHiddenCategoryIds(prev => [...prev, id]);
  }

  function restoreCategory(id) {
    setHiddenCategoryIds(prev => prev.filter(hid => hid !== id));
  }

  function addUnitToCart(unit) {
    setUnitCart((prev) => [...prev, { unit }]);
    setItemUnits((prev) => prev.filter((u) => u.id !== unit.id));
  }

  function removeUnitFromCart(unitId) {
    setUnitCart((prev) => prev.filter(({ unit }) => unit.id !== unitId));
  }

  function addBulkToCart(item, quantity) {
    setBulkCart((prev) => {
      const existing = prev.find((e) => e.item.id === item.id);
      if (existing) return prev.map((e) => e.item.id === item.id ? { ...e, quantity: e.quantity + quantity } : e);
      return [...prev, { item, quantity }];
    });
  }

  function removeBulkFromCart(itemId) {
    setBulkCart((prev) => prev.filter((e) => e.item.id !== itemId));
  }

  function getListBulkQty(itemId) { return listBulkQtys[itemId] ?? 1; }
  function setListBulkQtyForItem(itemId, qty) { setListBulkQtys((prev) => ({ ...prev, [itemId]: qty })); }

  function toggleExpand(item) {
    if (itemDisabledReason(item)) return;
    if (expandedItemId === item.id) {
      setExpandedItemId(null);
      setExpandedUnits([]);
      return;
    }
    setExpandedItemId(item.id);
    setExpandedUnits([]);
    if (item.track_units === false) return; // bulk — no units to fetch
    setLoadingExpanded(true);
    unitsApi.listByItem(item.id).then((data) => {
      setExpandedUnits(data.filter((u) => u.status === "available" && !cartItemIds.has(u.id)));
      setLoadingExpanded(false);
    }).catch(() => setLoadingExpanded(false));
  }

  function updateForm(key, val) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result = await checkoutApi.unifiedCart({
        unit_ids: unitCart.map(({ unit }) => unit.id),
        bulk_items: bulkCart.map(({ item, quantity }) => ({ item_id: item.id, quantity })),
        user_id: Number(form.user_id),
        due_date: form.due_date || null,
        notes: form.notes || null,
      });
      setReceipt(result);
      setUnitCart([]);
      setBulkCart([]);
      setForm(emptyForm);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  function startNewCart() {
    setUnitCart([]);
    setBulkCart([]);
    localStorage.removeItem('checkout_unit_cart');
    localStorage.removeItem('checkout_bulk_cart');
    setForm(emptyForm);
    setReceipt(null);
    setError(null);
  }

  return (
    <>
      {error && <div className="alert">{error}</div>}

      {!liveScanActive && (
        <div className="panel">
          <div className="panel-body" style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <input className="form-input" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by asset code, name, or serial number..." style={{ flex: 1 }} />
            <button type="button" className={`btn ${viewMode === "grid" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => switchView("grid")} style={{ whiteSpace: "nowrap" }} disabled={liveScanActive}>Grid</button>
            <button type="button" className={`btn ${viewMode === "list" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => switchView("list")} style={{ whiteSpace: "nowrap" }} disabled={liveScanActive}>List</button>
            <button type="button" className={`btn ${liveScanActive ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setLiveScanActive((v) => !v)} style={{ whiteSpace: "nowrap" }}>
              Live Scan
            </button>
          </div>
        </div>
      )}

      {liveScanActive ? (
        <LiveScanMode
          cart={unitCart}
          onAddUnit={addUnitToCart}
          onClose={() => setLiveScanActive(false)}
        />
      ) : loading ? (
        <div className="loading">Loading items...</div>
      ) : viewMode === "list" || query.trim() ? (
        <div className="panel">
          <div className="panel-head" onClick={() => setItemsOpen((o) => !o)} style={{ cursor: "pointer", userSelect: "none" }}>
            <h3>{query ? `Results for "${query}"` : "All Items"}</h3>
            <span style={{ color: "var(--color-muted)", fontSize: "13px" }}>{listFiltered.length} items</span>
          </div>
          <div style={{ display: "grid", gridTemplateRows: itemsOpen ? "1fr" : "0fr", transition: "grid-template-rows 220ms ease" }}>
            <div style={{ overflow: "hidden" }}>
              <div className="inv-layout">
                <aside className="inv-filter-panel">
                  <div className="inv-filter-section">
                    <div className="inv-filter-title">Status</div>
                    {[
                      { key: "", label: "All", count: filtered.length },
                      { key: "available", label: "Available", count: filtered.filter(i => i.available_quantity === i.quantity).length },
                      { key: "partial", label: "Partial", count: filtered.filter(i => i.available_quantity > 0 && i.available_quantity < i.quantity).length },
                      { key: "out", label: "Out", count: filtered.filter(i => i.available_quantity === 0).length },
                    ].map(({ key, label, count }) => (
                      <button
                        key={key}
                        type="button"
                        className={`inv-filter-btn ${statusFilter === key ? "inv-filter-btn--active" : ""}`}
                        onClick={() => {
                          setStatusFilter(key);
                          setExpandedItemId(null);
                        }}
                      >
                        {label}
                        <span className="inv-filter-count">{count}</span>
                      </button>
                    ))}
                  </div>

                  <div className="inv-filter-section">
                    <div className="inv-filter-title">Category</div>
                    <button
                      type="button"
                      className={`inv-filter-btn ${listCategoryFilter === null ? "inv-filter-btn--active" : ""}`}
                      onClick={() => {
                        setListCategoryFilter(null);
                        setExpandedItemId(null);
                      }}
                    >
                      All
                      <span className="inv-filter-count">{filtered.length}</span>
                    </button>
                    {listUncategorizedCount > 0 && !hiddenCategoryIds.includes(null) && (
                      <button
                        type="button"
                        className={`inv-filter-btn ${listCategoryFilter === "uncategorized" ? "inv-filter-btn--active" : ""}`}
                        onClick={() => {
                          setListCategoryFilter(listCategoryFilter === "uncategorized" ? null : "uncategorized");
                          setExpandedItemId(null);
                        }}
                      >
                        <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: listUncategorizedMeta.color, flexShrink: 0 }} />
                        Uncategorized
                        <span className="inv-filter-count">{listUncategorizedCount}</span>
                      </button>
                    )}
                    {categoryOrder
                      .filter(id => id !== null && !hiddenCategoryIds.includes(id))
                      .map(id => categories.find(c => c.id === id))
                      .filter(Boolean)
                      .map((cat) => {
                        const meta = getCategoryMeta(cat);
                        const count = filtered.filter(i => i.category_id === cat.id).length;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            className={`inv-filter-btn ${listCategoryFilter === cat.id ? "inv-filter-btn--active" : ""}`}
                            onClick={() => {
                              setListCategoryFilter(listCategoryFilter === cat.id ? null : cat.id);
                              setExpandedItemId(null);
                            }}
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
                      onClick={() => {
                        setLocationFilter(null);
                        setExpandedItemId(null);
                      }}
                    >
                      All
                      <span className="inv-filter-count">{filtered.length}</span>
                    </button>
                    {locations.map((loc) => {
                      const count = filtered.filter(i => i.location_id === loc.id).length;
                      return (
                        <button
                          key={loc.id}
                          type="button"
                          className={`inv-filter-btn ${locationFilter === loc.id ? "inv-filter-btn--active" : ""}`}
                          onClick={() => {
                            setLocationFilter(locationFilter === loc.id ? null : loc.id);
                            setExpandedItemId(null);
                          }}
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
                      onChange={(e) => {
                        setConditionFilter(e.target.value);
                        setExpandedItemId(null);
                      }}
                    >
                      <option value="">All conditions</option>
                      <option value="excellent">Excellent</option>
                      <option value="good">Good</option>
                      <option value="fair">Fair</option>
                      <option value="poor">Poor</option>
                      <option value="needs_inspection">Needs Inspection</option>
                      <option value="damaged">Damaged</option>
                    </select>
                  </div>
                </aside>

                <main>
                  <div className="table-wrap">
                    <table className="inv-table">
                      <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
                        <tr>
                          <th style={{ width: "4px", padding: 0 }} />
                          <th><div style={{ padding: "9px 14px" }}>Code</div></th>
                          <th><div style={{ padding: "9px 14px" }}>Name</div></th>
                          {listCategoryFilter === null && <th><div style={{ padding: "9px 14px" }}>Category</div></th>}
                          <th><div style={{ padding: "9px 14px" }}>Location</div></th>
                          <th><div style={{ padding: "9px 14px" }}>Status</div></th>
                          <th><div style={{ padding: "9px 14px" }}></div></th>
                        </tr>
                      </thead>
                      <tbody>
                        {listFiltered.map((item) => {
                          const reason = itemDisabledReason(item);
                          const checkedOut = item.quantity - item.available_quantity;
                          const partial = checkedOut > 0 && item.available_quantity > 0;
                          const fullyOut = item.available_quantity === 0;
                          const statusKey = fullyOut ? "out" : partial ? "partial" : "available";
                          const category = item.category_id === null
                            ? UNCATEGORIZED_CATEGORY
                            : categories.find(c => c.id === item.category_id);
                          return (
                            <React.Fragment key={item.id}>
                              <tr
                                data-status={statusKey}
                                onClick={reason ? undefined : () => toggleExpand(item)}
                                style={{ opacity: reason ? 0.5 : 1, cursor: reason ? "default" : "pointer" }}
                              >
                                <td className="inv-table__accent" />
                                <td><span className="asset-code">{item.asset_code}</span></td>
                                <td>{item.name}</td>
                                {listCategoryFilter === null && (
                                  <td style={{ color: "var(--color-muted)", fontSize: "13px" }}>{category?.name || "—"}</td>
                                )}
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
                                    : (
                                      <button
                                        className="row-btn row-btn--primary"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleExpand(item);
                                        }}
                                      >
                                        {expandedItemId === item.id ? "Close" : "Units"}
                                      </button>
                                    )}
                                </td>
                              </tr>
                              <tr>
                                <td colSpan={listCategoryFilter === null ? 7 : 6} style={{ padding: 0, border: "none" }}>
                                  <div style={{
                                    opacity: expandedItemId === item.id ? 1 : 0,
                                    transform: expandedItemId === item.id ? "translateY(0)" : "translateY(-6px)",
                                    maxHeight: expandedItemId === item.id ? "2000px" : 0,
                                    overflow: "hidden",
                                    padding: expandedItemId === item.id ? "12px 14px" : 0,
                                    borderTop: expandedItemId === item.id ? "1px solid var(--color-border-light)" : "none",
                                    background: expandedItemId === item.id ? "var(--color-surface-raised, var(--color-bg))" : undefined,
                                    transition: "opacity 200ms cubic-bezier(0.16,1,0.3,1), transform 200ms cubic-bezier(0.16,1,0.3,1)",
                                    pointerEvents: expandedItemId === item.id ? "auto" : "none",
                                  }}>
                                    {item.track_units === false ? (
                                      <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 0" }}>
                                        <button type="button" className="btn btn-secondary" style={{ padding: "6px 12px", fontWeight: 700 }}
                                          onClick={() => setListBulkQtyForItem(item.id, Math.max(1, getListBulkQty(item.id) - 1))}>−</button>
                                        <input type="number" min={1} max={item.available_quantity}
                                          value={getListBulkQty(item.id)}
                                          onChange={(e) => setListBulkQtyForItem(item.id, Math.max(1, Math.min(item.available_quantity, Number(e.target.value))))}
                                          className="form-input" style={{ width: "60px", textAlign: "center" }} />
                                        <button type="button" className="btn btn-secondary" style={{ padding: "6px 12px", fontWeight: 700 }}
                                          onClick={() => setListBulkQtyForItem(item.id, Math.min(item.available_quantity, getListBulkQty(item.id) + 1))}>+</button>
                                        <button className="row-btn row-btn--primary"
                                          onClick={() => { addBulkToCart(item, getListBulkQty(item.id)); setExpandedItemId(null); }}>
                                          Add to Cart
                                        </button>
                                      </div>
                                    ) : loadingExpanded ? (
                                      <div className="loading">Loading units...</div>
                                    ) : expandedUnits.length === 0 ? (
                                      <div className="empty-state">No available units.</div>
                                    ) : (
                                      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", padding: "10px 0" }}>
                                        {expandedUnits.map((unit) => (
                                          <div key={unit.id} className="inv-card" style={{ width: "220px", cursor: "default" }}>
                                            <div className="inv-card__header">
                                              <span className="inv-card__code">{unit.asset_code}</span>
                                              <span className="inv-card__chip inv-card__chip--available">Available</span>
                                            </div>
                                            <div className="inv-card__name">{unit.serial_number || "No serial"}</div>
                                            <div className="inv-card__meta"><span>{unit.location_name || "—"}</span></div>
                                            {unit.notes && <div className="inv-card__meta" style={{ fontStyle: "italic" }}><span>{unit.notes}</span></div>}
                                            <div className="inv-card__footer">
                                              <span className="inv-card__stats">{unit.condition.replace(/_/g, " ")}</span>
                                              <button className="row-btn row-btn--primary"
                                                onClick={() => {
                                                  const parentItem = allItems.find((i) => i.id === unit.item_id);
                                                  if (parentItem) setSelectedItem(parentItem);
                                                  setPendingCartItem(unit);
                                                }}>
                                                Add to Cart
                                              </button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            </React.Fragment>
                          );
                        })}
                        {listFiltered.length === 0 && <tr><td colSpan={listCategoryFilter === null ? 7 : 6}><div className="empty-state">No items found.</div></td></tr>}
                      </tbody>
                    </table>
                  </div>
                </main>
              </div>
            </div>
          </div>
        </div>
      ) : gridPage === "categories" ? (
        <div className={`panel${gridDir ? ` grid-panel--${gridDir}` : ''}`}>
          <div className='panel-head'>
            <h3>Browse by Category</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {!editMode && (
                <span style={{ color: 'var(--color-muted)', fontSize: '13px' }}>
                  {categoryOrder.filter((id) => !hiddenCategoryIds.includes(id)).length} categories
                </span>
              )}
              <button
                type='button'
                className={`btn ${editMode ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '12px', padding: '4px 12px' }}
                onClick={() => setEditMode(v => !v)}
              >
                {editMode ? 'Done' : 'Edit'}
              </button>
            </div>
          </div>

          <div className='browse-grid'>
            {categoryOrder
              .filter(id => !hiddenCategoryIds.includes(id))
              .map(id => {
                const category = id === null
                  ? UNCATEGORIZED_CATEGORY
                  : categories.find(c => c.id === id);
                if (!category) return null;

                const meta = getCategoryMeta(category);
                const Icon = meta.Icon;
                const count = availableItems.filter(item =>
                  id === null ? item.category_id === null : item.category_id === id
                ).length;
                const visibleIds = categoryOrder.filter(i => !hiddenCategoryIds.includes(i));
                const isFirst = visibleIds[0] === id;
                const isLast = visibleIds.at(-1) === id;

                if (editMode) {
                  return (
                    <div
                      key={String(id)}
                      style={{
                        position: 'relative',
                        borderRadius: 'var(--radius-md)',
                        border: '2px dashed var(--color-border)',
                        background: 'var(--color-surface)',
                        padding: '12px 10px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '6px',
                        minHeight: '100px',
                      }}
                    >
                      <span
                        className='browse-card__icon'
                        style={{ color: meta.color, background: meta.bg, width: '36px', height: '36px', fontSize: '18px' }}
                      >
                        <Icon />
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: 600, textAlign: 'center', color: 'var(--color-text)' }}>
                        {category.name}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>{count} available</span>
                      <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                        <button
                          type='button'
                          className='row-btn'
                          style={{ fontSize: '14px', padding: '2px 7px', opacity: isFirst ? 0.3 : 1 }}
                          disabled={isFirst}
                          onClick={() => moveCategoryUp(id)}
                          title='Move left'
                        >↑</button>
                        <button
                          type='button'
                          className='row-btn'
                          style={{ fontSize: '14px', padding: '2px 7px', opacity: isLast ? 0.3 : 1 }}
                          disabled={isLast}
                          onClick={() => moveCategoryDown(id)}
                          title='Move right'
                        >↓</button>
                        <button
                          type='button'
                          className='row-btn'
                          style={{ fontSize: '14px', padding: '2px 7px', color: '#dc2626' }}
                          onClick={() => hideCategory(id)}
                          title='Hide'
                        >×</button>
                      </div>
                    </div>
                  );
                }

                return (
                  <button
                    key={String(id)}
                    type='button'
                    className='browse-card'
                    onClick={() => {
                      setSelectedCategory(category);
                      setGridDir('forward');
                      setGridPage('items');
                    }}
                  >
                    <span className='browse-card__icon' style={{ color: meta.color, background: meta.bg }}><Icon /></span>
                    <span className='browse-card__label'>{category.name}</span>
                    <span className='browse-card__sub'>{count} available</span>
                    <div className='cat-card-overlay' style={{ background: meta.bg, color: meta.color, justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                      <div className='cat-card-overlay__title'>{category.name}</div>
                      {category.description && <div className='cat-card-overlay__desc'>{category.description}</div>}
                    </div>
                  </button>
                );
              })}
          </div>

          {editMode && hiddenCategoryIds.length > 0 && (
            <div style={{ padding: '12px 14px', borderTop: '1px solid var(--color-border-light)' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '8px' }}>
                Hidden categories
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {hiddenCategoryIds.map(id => {
                  const category = id === null
                    ? UNCATEGORIZED_CATEGORY
                    : categories.find(c => c.id === id);
                  if (!category) return null;
                  return (
                    <button
                      key={String(id)}
                      type='button'
                      className='btn btn-secondary'
                      style={{ fontSize: '12px', padding: '4px 10px' }}
                      onClick={() => restoreCategory(id)}
                    >
                      + {category.name}
                    </button>
                  );
                })}
              </div>
            </div>
            )}
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
                  if (item.available_quantity > 0 && item.condition !== "damaged") {
                    if (item.track_units === false) {
                      setFungibleItem(item);
                      setFungibleQty(1);
                    } else {
                      loadUnitsForItem(item);
                    }
                  }
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
            <div className="inv-grid">
              {itemUnits.map((unit) => (
                <div key={unit.id} className="inv-card" style={{ cursor: "pointer" }} onClick={() => { setPendingCartItem(unit); }}>
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
                    <button className="row-btn row-btn--primary" onClick={(e) => { e.stopPropagation(); setPendingCartItem(unit); }}>Add</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="panel">
        <div className="panel-head" onClick={() => setCartOpen((o) => !o)} style={{ cursor: "pointer", userSelect: "none" }}>
          <h3>Cart — {unitCart.length + bulkCart.length} {unitCart.length + bulkCart.length === 1 ? "unit" : "items"}</h3>
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
                  {unitCart.length === 0 && bulkCart.length === 0 ? (
                    <tr><td colSpan={4}><div className="empty-state">No items added yet.</div></td></tr>
                  ) : (
                    <>
                      {unitCart.map(({ unit }) => (
                        <tr key={`unit-${unit.id}`}>
                          <td><span className="asset-code">{unit.asset_code}</span></td>
                          <td>{itemName(unit.item_id)}</td>
                          <td style={{ color: "var(--color-muted)", fontSize: "13px" }}>{unit.location_name || "—"}</td>
                          <td><button className="row-btn" onClick={() => removeUnitFromCart(unit.id)}>×</button></td>
                        </tr>
                      ))}
                      {bulkCart.map(({ item, quantity }) => (
                        <tr key={`bulk-${item.id}`}>
                          <td><span style={{ fontSize: "11px", color: "var(--color-muted)" }}>bulk</span></td>
                          <td>{item.name}</td>
                          <td style={{ color: "var(--color-muted)", fontSize: "13px" }}>Qty: {quantity}</td>
                          <td><button className="row-btn" onClick={() => removeBulkFromCart(item.id)}>×</button></td>
                        </tr>
                      ))}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {(unitCart.length > 0 || bulkCart.length > 0) && (
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
                    <DatePicker
                      min={new Date().toLocaleDateString("en-CA")}
                      value={form.due_date}
                      onChange={(val) => updateForm("due_date", val)}
                    />
                  </div>
                  <div className="form-group wide">
                    <label className="form-label">Notes</label>
                    <textarea className="form-textarea" value={form.notes} onChange={(e) => updateForm("notes", e.target.value)} rows="3" />
                  </div>
                </div>
              </div>
              <button type="submit" className="btn btn-primary" disabled={submitting || !form.user_id || (unitCart.length === 0 && bulkCart.length === 0)} style={{ marginTop: "12px" }}>
                {submitting ? "Saving..." : `Check Out ${unitCart.length + bulkCart.length} ${unitCart.length + bulkCart.length === 1 ? "Item" : "Items"}`}
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
              {(receipt.transactions || []).map((tx) => (
                <li key={tx.id} style={{ marginBottom: "4px" }}>
                  {tx.unit_asset_code
                    ? <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", marginRight: "6px" }}>{tx.unit_asset_code}</span>
                    : <span style={{ fontSize: "12px", color: "var(--color-muted)", marginRight: "6px" }}>×{tx.quantity}</span>
                  }
                  {itemName(tx.item_id)}
                </li>
              ))}
            </ul>
            <button type="button" className="btn btn-primary" onClick={startNewCart}>Start New Checkout</button>
          </div>
        </div>
      )}

      {fungibleItem && (
        <div className="modal-backdrop" onClick={() => setFungibleItem(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add to Cart</h2>
              <button className="modal-close" onClick={() => setFungibleItem(null)}>×</button>
            </div>
            <p style={{ fontWeight: 600 }}>{fungibleItem.name}</p>
            <p style={{ color: "var(--color-muted)", fontSize: "13px" }}>{fungibleItem.available_quantity} available</p>
            <div className="form-group" style={{ marginTop: "12px" }}>
              <label className="form-label">Quantity</label>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button type="button" className="btn btn-secondary" style={{ padding: "6px 12px", fontWeight: 700 }}
                  onClick={() => setFungibleQty((q) => Math.max(1, q - 1))}>−</button>
                <input className="form-input" type="number" min={1} max={fungibleItem.available_quantity}
                  value={fungibleQty}
                  onChange={(e) => setFungibleQty(Math.max(1, Math.min(fungibleItem.available_quantity, Number(e.target.value))))}
                  style={{ width: "60px", textAlign: "center" }} />
                <button type="button" className="btn btn-secondary" style={{ padding: "6px 12px", fontWeight: 700 }}
                  onClick={() => setFungibleQty((q) => Math.min(fungibleItem.available_quantity, q + 1))}>+</button>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setFungibleItem(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => { addBulkToCart(fungibleItem, fungibleQty); setFungibleItem(null); }}>
                Add {fungibleQty} to Cart
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingCartItem && (
        <div className="modal-backdrop" onClick={() => { setPendingCartItem(null); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add to Cart?</h2>
              <button className="modal-close" onClick={() => { setPendingCartItem(null); }}>×</button>
            </div>
            <div>
              <p style={{ fontWeight: 600 }}>{pendingCartItem.asset_code}</p>
              <p style={{ color: "var(--color-muted)", fontSize: "13px" }}>{selectedItem?.name}</p>
              <p style={{ fontSize: "13px", marginTop: "6px" }}>{pendingCartItem.location_name || "—"}</p>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => { setPendingCartItem(null); }}>Cancel</button>
              <button className="btn btn-primary" onClick={() => { addUnitToCart(pendingCartItem); setPendingCartItem(null); }}>Add to Cart</button>
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
                Checking out {unitCart.length + bulkCart.length} {unitCart.length + bulkCart.length === 1 ? "item" : "items"} for <strong>{users.find((u) => u.id === Number(form.user_id))?.name ?? "—"}</strong>
              </p>
              <ul style={{ margin: "0 0 8px", padding: "0 0 0 18px", fontSize: "13px" }}>
                {unitCart.map(({ unit }) => (
                  <li key={unit.id}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", marginRight: "6px" }}>{unit.asset_code}</span>
                    {itemName(unit.item_id)}
                  </li>
                ))}
                {bulkCart.map(({ item, quantity }) => (
                  <li key={item.id}>
                    <span style={{ fontSize: "12px", color: "var(--color-muted)", marginRight: "6px" }}>×{quantity}</span>
                    {item.name}
                  </li>
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

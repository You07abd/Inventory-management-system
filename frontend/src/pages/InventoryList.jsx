import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { categoriesApi } from "../api/categories";
import { getErrorMessage } from "../api/client";
import { itemsApi } from "../api/items";
import { locationsApi } from "../api/locations";
import { usersApi } from "../api/users";
import CheckinModal from "../components/CheckinModal.jsx";
import CheckoutModal from "../components/CheckoutModal.jsx";
import ItemTable from "../components/ItemTable.jsx";
import { useAuth } from "../context/AuthContext";
import { getCategoryMeta } from "../utils/categoryMeta.jsx";

export default function InventoryList() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const isStudent = role === "student";

  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState("");
  const [conditionFilter, setConditionFilter] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [checkoutItem, setCheckoutItem] = useState(null);
  const [checkinItem, setCheckinItem] = useState(null);
  const [viewMode, setViewMode] = useState("list"); // 'grid' | 'list'
  const [categoryFilter, setCategoryFilter] = useState(null);
  const [locationFilter, setLocationFilter] = useState(null);
  const [statusFilter,   setStatusFilter]   = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [itemData, categoryData, locationData, userData] = await Promise.all([
        itemsApi.list(), categoriesApi.list(), locationsApi.list(), usersApi.list(),
      ]);
      setItems(itemData);
      setCategories(categoryData);
      setLocations(locationData);
      setUsers(userData);
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
        const [itemData, categoryData, locationData, userData] = await Promise.all([
          itemsApi.list(), categoriesApi.list(), locationsApi.list(), usersApi.list(),
        ]);
        if (!active) return;
        setItems(itemData);
        setCategories(categoryData);
        setLocations(locationData);
        setUsers(userData);
      } catch (err) {
        if (active) setError(getErrorMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (conditionFilter && item.condition !== conditionFilter) return false;
      if (categoryFilter !== null && item.category_id !== categoryFilter) return false;
      if (locationFilter !== null && item.location_id !== locationFilter) return false;
      if (statusFilter === "available" && item.available_quantity !== item.quantity) return false;
      if (statusFilter === "partial" && !(item.available_quantity > 0 && item.available_quantity < item.quantity)) return false;
      if (statusFilter === "out" && item.available_quantity !== 0) return false;
      if (!q) return true;
      return [item.asset_code, item.name, item.serial_number, item.condition]
        .filter(Boolean).some((v) => v.toLowerCase().includes(q));
    });
  }, [items, query, conditionFilter, categoryFilter, locationFilter, statusFilter]);

  const statTotalModels = items.length;
  const statTotalUnits  = items.reduce((s, i) => s + i.quantity, 0);
  const statAvailable   = items.reduce((s, i) => s + i.available_quantity, 0);
  const statCheckedOut  = statTotalUnits - statAvailable;

  async function checkout(payload) {
    try {
      await itemsApi.checkout(checkoutItem.id, payload);
      setCheckoutItem(null);
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function checkin(payload) {
    try {
      await itemsApi.checkin(checkinItem.id, payload);
      setCheckinItem(null);
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <span className="topbar-breadcrumb">Inventory</span>
          <span className="topbar-title">Inventory</span>
        </div>
        <div className="topbar-actions">
          <button type="button" className={`btn ${viewMode === "list" ? "btn-primary" : "btn-secondary"}`} onClick={() => setViewMode("list")}>List</button>
          <button type="button" className={`btn ${viewMode === "grid" ? "btn-primary" : "btn-secondary"}`} onClick={() => setViewMode("grid")}>Grid</button>
        </div>
      </div>

      <div className="page-content">
        <div className="page-stack">
          {isStudent && (
            <div className="info-banner">
              You have student access — check in and check out only. Contact a lab engineer for other requests.
            </div>
          )}
          {error && <div className="alert">{error}</div>}

          {/* Stats bar */}
          <div className="metric-grid">
            <div className="metric-card">
              <div className="metric-label">Total Models</div>
              <div className="metric-value metric-value--blue">{statTotalModels}</div>
              <div className="metric-footer">Unique asset types</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Total Units</div>
              <div className="metric-value">{statTotalUnits}</div>
              <div className="metric-footer">Physical items</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Available</div>
              <div className="metric-value metric-value--green">{statAvailable}</div>
              <div className="metric-footer">
                <span className="metric-dot" style={{ background: "#22c55e" }} />
                Ready to check out
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Checked Out</div>
              <div className={`metric-value ${statCheckedOut > 0 ? "metric-value--red" : ""}`}>{statCheckedOut}</div>
              <div className="metric-footer">{statCheckedOut === 0 ? "No active loans" : "Active loans"}</div>
            </div>
          </div>

          {/* Two-column layout */}
          <div className="inv-layout">

            {/* Left filter panel */}
            <aside className="inv-filter-panel">

              {/* Search */}
              <div className="inv-filter-section">
                <input
                  className="table-search"
                  style={{ width: "100%" }}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search asset, name, serial…"
                />
              </div>

              {/* Status */}
              <div className="inv-filter-section">
                <div className="inv-filter-title">Status</div>
                {[
                  { key: "",          label: "All",       count: items.length },
                  { key: "available", label: "Available", count: items.filter(i => i.available_quantity === i.quantity).length },
                  { key: "partial",   label: "Partial",   count: items.filter(i => i.available_quantity > 0 && i.available_quantity < i.quantity).length },
                  { key: "out",       label: "Out",       count: items.filter(i => i.available_quantity === 0).length },
                ].map(({ key, label, count }) => (
                  <button
                    key={key}
                    type="button"
                    className={`inv-filter-btn ${statusFilter === key ? "inv-filter-btn--active" : ""}`}
                    onClick={() => setStatusFilter(key)}
                  >
                    {label}
                    <span className="inv-filter-count">{count}</span>
                  </button>
                ))}
              </div>

              {/* Categories */}
              <div className="inv-filter-section">
                <div className="inv-filter-title">Category</div>
                <button
                  type="button"
                  className={`inv-filter-btn ${categoryFilter === null ? "inv-filter-btn--active" : ""}`}
                  onClick={() => setCategoryFilter(null)}
                >
                  All
                  <span className="inv-filter-count">{items.length}</span>
                </button>
                {categories.map((cat) => {
                  const meta = getCategoryMeta(cat);
                  const count = items.filter(i => i.category_id === cat.id).length;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      className={`inv-filter-btn ${categoryFilter === cat.id ? "inv-filter-btn--active" : ""}`}
                      onClick={() => setCategoryFilter(categoryFilter === cat.id ? null : cat.id)}
                    >
                      <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: meta.color, flexShrink: 0 }} />
                      {cat.name}
                      <span className="inv-filter-count">{count}</span>
                    </button>
                  );
                })}
              </div>

              {/* Locations */}
              <div className="inv-filter-section">
                <div className="inv-filter-title">Location</div>
                <button
                  type="button"
                  className={`inv-filter-btn ${locationFilter === null ? "inv-filter-btn--active" : ""}`}
                  onClick={() => setLocationFilter(null)}
                >
                  All
                  <span className="inv-filter-count">{items.length}</span>
                </button>
                {locations.map((loc) => {
                  const count = items.filter(i => i.location_id === loc.id).length;
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

              {/* Condition */}
              <div className="inv-filter-section">
                <div className="inv-filter-title">Condition</div>
                <select
                  className="table-filter"
                  style={{ width: "100%" }}
                  value={conditionFilter}
                  onChange={(e) => setConditionFilter(e.target.value)}
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

              {/* Quick actions — non-students only */}
              {!isStudent && (
                <div className="inv-filter-section">
                  <Link className="btn btn-primary" to="/inventory/new" style={{ width: "100%", marginBottom: "6px", display: "block", textAlign: "center" }}>
                    + Add Item
                  </Link>
                  <Link className="btn btn-secondary" to="/categories/new" style={{ width: "100%", display: "block", textAlign: "center" }}>
                    + Add Category
                  </Link>
                </div>
              )}

            </aside>

            {/* Right content */}
            <main>
              {loading ? (
                <div className="loading">Loading inventory…</div>
              ) : viewMode === "list" ? (
                <div className="table-wrap">
                  <div className="table-toolbar">
                    <span style={{ fontSize: 12, color: "var(--color-muted)", fontWeight: 500 }}>
                      {filteredItems.length} item{filteredItems.length !== 1 ? "s" : ""}
                      {filteredItems.length !== items.length ? ` of ${items.length}` : ""}
                    </span>
                  </div>
                  <ItemTable
                    items={filteredItems}
                    categories={categories}
                    locations={locations}
                    onCheckout={setCheckoutItem}
                    onCheckin={setCheckinItem}
                  />
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="empty-state">No items match your filters.</div>
              ) : (
                <div className="inv-grid">
                  {filteredItems.map((item) => {
                    const categoryName = categories.find((c) => c.id === item.category_id)?.name ?? "—";
                    const canCheckout = item.available_quantity > 0 && item.condition !== "damaged";
                    const canCheckin = item.available_quantity < item.quantity;
                    const fullyOut = item.available_quantity === 0;
                    const partial = !fullyOut && item.available_quantity < item.quantity;
                    const statusKey = fullyOut ? "out" : partial ? "partial" : "available";
                    const chipLabel = fullyOut ? "Out" : partial ? "Partial" : "Available";
                    return (
                      <div key={item.id} className="inv-card" onClick={() => navigate(`/items/${item.id}`)}>
                        <div className="inv-card__header">
                          <span className="inv-card__code">{item.asset_code}</span>
                          <span className={`inv-card__chip inv-card__chip--${statusKey}`}>{chipLabel}</span>
                        </div>
                        <div className="inv-card__name">{item.name}</div>
                        <div className="inv-card__meta">
                          <span>{categoryName}</span>
                          <span className="inv-card__sep"> · </span>
                          <span>{item.location_name || "—"}</span>
                        </div>
                        <div className="inv-card__footer">
                          <span className="inv-card__stats">
                            {item.available_quantity}/{item.quantity}
                            <span className="inv-card__sep"> · </span>
                            {item.condition.replace(/_/g, " ")}
                          </span>
                          {!isStudent && (
                            <div className="inv-card__actions">
                              {canCheckout && (
                                <button className="row-btn row-btn--primary" onClick={(e) => { e.stopPropagation(); setCheckoutItem(item); }}>Out</button>
                              )}
                              {canCheckin && (
                                <button className="row-btn" onClick={(e) => { e.stopPropagation(); setCheckinItem(item); }}>In</button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </main>

          </div>
        </div>
      </div>

      {checkoutItem && <CheckoutModal item={checkoutItem} users={users} onClose={() => setCheckoutItem(null)} onSubmit={checkout} />}
      {checkinItem && <CheckinModal item={checkinItem} users={users} onClose={() => setCheckinItem(null)} onSubmit={checkin} />}
    </>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { categoriesApi } from "../api/categories";
import { getErrorMessage } from "../api/client";
import { itemsApi } from "../api/items";
import { locationsApi } from "../api/locations";
import { usersApi } from "../api/users";
import CheckinModal from "../components/CheckinModal.jsx";
import CheckoutModal from "../components/CheckoutModal.jsx";
import ItemTable from "../components/ItemTable.jsx";
import { useAuth } from "../context/AuthContext";

export default function InventoryList() {
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
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'list'

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

  useEffect(() => { load(); }, []);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (conditionFilter && item.condition !== conditionFilter) return false;
      if (!q) return true;
      return [item.asset_code, item.name, item.serial_number, item.condition]
        .filter(Boolean).some((v) => v.toLowerCase().includes(q));
    });
  }, [items, query, conditionFilter]);

  async function checkout(payload) {
    await itemsApi.checkout(checkoutItem.id, payload);
    setCheckoutItem(null);
    await load();
  }

  async function checkin(payload) {
    await itemsApi.checkin(checkinItem.id, payload);
    setCheckinItem(null);
    await load();
  }

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <span className="topbar-breadcrumb">Assets</span>
          <span className="topbar-title">Inventory</span>
        </div>
        <div className="topbar-actions">
          <button
            type="button"
            className={`btn ${viewMode === "grid" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setViewMode("grid")}
          >
            Grid
          </button>
          <button
            type="button"
            className={`btn ${viewMode === "list" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setViewMode("list")}
          >
            List
          </button>
          {!isStudent && (
            <Link className="btn btn-primary" to="/inventory/new">Add Item</Link>
          )}
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
          {viewMode === "list" ? (
            <div className="table-wrap">
              <div className="table-toolbar">
                <input
                  className="table-search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search asset, name, serial, condition…"
                />
                <select className="table-filter" value={conditionFilter} onChange={(e) => setConditionFilter(e.target.value)}>
                  <option value="">All conditions</option>
                  <option value="excellent">Excellent</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                  <option value="poor">Poor</option>
                </select>
              </div>
              {loading ? (
                <div className="loading" style={{ borderRadius: 0, border: "none", borderTop: "1px solid var(--color-border-light)" }}>
                  Loading inventory...
                </div>
              ) : (
                <ItemTable
                  items={filteredItems}
                  categories={categories}
                  locations={locations}
                  onCheckout={setCheckoutItem}
                  onCheckin={setCheckinItem}
                />
              )}
            </div>
          ) : (
            <>
              <div className="panel">
                <div className="panel-body" style={{ display: "flex", gap: "10px" }}>
                  <input
                    className="form-input"
                    style={{ flex: 1 }}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search asset, name, serial, condition…"
                  />
                  <select
                    className="form-select"
                    value={conditionFilter}
                    onChange={(e) => setConditionFilter(e.target.value)}
                  >
                    <option value="">All conditions</option>
                    <option value="excellent">Excellent</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                    <option value="poor">Poor</option>
                  </select>
                </div>
              </div>
              {loading ? (
                <div className="loading">Loading inventory...</div>
              ) : filteredItems.length === 0 ? (
                <div className="empty-state">No items match your search.</div>
              ) : (
                <div
                  className="browse-grid"
                  style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}
                >
                  {filteredItems.map((item) => {
                    const categoryName = categories.find((c) => c.id === item.category_id)?.name ?? "—";
                    const canCheckout = item.available_quantity > 0 && item.condition !== "damaged";
                    const canCheckin = item.available_quantity < item.quantity;
                    const fullyOut = item.available_quantity === 0;
                    return (
                      <div
                        key={item.id}
                        className={`browse-card ${fullyOut ? "browse-card--disabled" : ""}`}
                        style={{ alignItems: "flex-start", textAlign: "left", padding: "16px", gap: "6px" }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                          <Link
                            to={`/items/${item.id}`}
                            className="browse-card__code"
                            onClick={(e) => e.stopPropagation()}
                            style={{ textDecoration: "none" }}
                          >
                            {item.asset_code}
                          </Link>
                          <span className={`badge ${fullyOut ? "badge--checked-out" : "badge--available"}`}>
                            {item.status.replace(/_/g, " ")}
                          </span>
                        </div>
                        <span className="browse-card__label" style={{ textAlign: "left" }}>{item.name}</span>
                        <span className="browse-card__sub">{categoryName}</span>
                        {item.location_name && (
                          <span className="browse-card__sub">{item.location_name}</span>
                        )}
                        <span className="browse-card__sub">
                          {item.available_quantity} / {item.quantity} available
                        </span>
                        <span className={`badge badge--${item.condition}`}>
                          {item.condition}
                        </span>
                        {!isStudent && (
                          <div style={{ display: "flex", gap: "6px", marginTop: "4px", width: "100%" }}>
                            {canCheckout && (
                              <button
                                className="row-btn row-btn--primary"
                                style={{ flex: 1 }}
                                onClick={() => setCheckoutItem(item)}
                              >
                                Check Out
                              </button>
                            )}
                            {canCheckin && (
                              <button
                                className="row-btn"
                                style={{ flex: 1 }}
                                onClick={() => setCheckinItem(item)}
                              >
                                Check In
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {checkoutItem && <CheckoutModal item={checkoutItem} users={users} onClose={() => setCheckoutItem(null)} onSubmit={checkout} />}
      {checkinItem && <CheckinModal item={checkinItem} users={users} onClose={() => setCheckinItem(null)} onSubmit={checkin} />}
    </>
  );
}

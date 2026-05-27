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
      if (!q) return true;
      return [item.asset_code, item.name, item.serial_number, item.condition]
        .filter(Boolean).some((v) => v.toLowerCase().includes(q));
    });
  }, [items, query, conditionFilter]);

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
                  <option value="needs_inspection">Needs Inspection</option>
                  <option value="damaged">Damaged</option>
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
                    <option value="needs_inspection">Needs Inspection</option>
                    <option value="damaged">Damaged</option>
                  </select>
                </div>
              </div>
              {loading ? (
                <div className="loading">Loading inventory...</div>
              ) : filteredItems.length === 0 ? (
                <div className="empty-state">No items match your search.</div>
              ) : (
                <div className="inv-grid">
                  {filteredItems.map((item) => {
                    const categoryName = categories.find((c) => c.id === item.category_id)?.name ?? "—";
                    const canCheckout = item.available_quantity > 0 && item.condition !== "damaged";
                    const canCheckin = item.available_quantity < item.quantity;
                    const fullyOut = item.available_quantity === 0;
                    const partial = !fullyOut && item.available_quantity < item.quantity;
                    const statusKey = fullyOut ? "out" : partial ? "partial" : "available";
                    return (
                      <div
                        key={item.id}
                        className="inv-card"
                        onClick={() => navigate(`/items/${item.id}`)}
                      >
                        <div className="inv-card__header">
                          <span className="inv-card__code">{item.asset_code}</span>
                          <span className="inv-card__avail">{item.available_quantity}/{item.quantity}</span>
                        </div>
                        <div className="inv-card__name">{item.name}</div>
                        <div className="inv-card__meta">
                          <span>{categoryName}</span>
                          <span className="inv-card__sep"> · </span>
                          <span>{item.location_name || "—"}</span>
                        </div>
                        <div className="inv-card__footer">
                          <span className="inv-card__condition">
                            {item.condition.replace(/_/g, " ")} · {fullyOut ? "out" : partial ? "partial" : "available"}
                          </span>
                          {!isStudent && (
                            <div className="inv-card__actions">
                              {canCheckout && (
                                <button
                                  className="row-btn row-btn--primary"
                                  onClick={(e) => { e.stopPropagation(); setCheckoutItem(item); }}
                                >Out</button>
                              )}
                              {canCheckin && (
                                <button
                                  className="row-btn"
                                  onClick={(e) => { e.stopPropagation(); setCheckinItem(item); }}
                                >In</button>
                              )}
                            </div>
                          )}
                        </div>
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

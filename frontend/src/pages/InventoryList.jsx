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
        </div>
      </div>

      <CheckoutModal item={checkoutItem} users={users} onClose={() => setCheckoutItem(null)} onSubmit={checkout} />
      <CheckinModal item={checkinItem} users={users} onClose={() => setCheckinItem(null)} onSubmit={checkin} />
    </>
  );
}

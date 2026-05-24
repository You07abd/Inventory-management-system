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

export default function InventoryList() {
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
        itemsApi.list(),
        categoriesApi.list(),
        locationsApi.list(),
        usersApi.list()
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
    load();
  }, []);

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return items.filter((item) => {
      if (conditionFilter && item.condition !== conditionFilter) {
        return false;
      }
      if (!normalized) {
        return true;
      }
      return [item.asset_code, item.name, item.serial_number, item.condition]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalized));
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
    <section className="page-stack">
      <div className="page-header">
        <div>
          <span className="label">Inventory</span>
          <h1>Drone Lab Assets</h1>
        </div>
        <Link className="button-link" to="/inventory/new">
          Add Item
        </Link>
      </div>

      <div className="toolbar">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search asset, name, serial, condition" />
        <select value={conditionFilter} onChange={(event) => setConditionFilter(event.target.value)}>
          <option value="">All conditions</option>
          <option value="excellent">Excellent</option>
          <option value="good">Good</option>
          <option value="fair">Fair</option>
          <option value="poor">Poor</option>
        </select>
      </div>

      {error && <div className="alert">{error}</div>}
      {loading ? <div className="loading">Loading inventory...</div> : null}
      <ItemTable items={filteredItems} categories={categories} locations={locations} onCheckout={setCheckoutItem} onCheckin={setCheckinItem} />

      <CheckoutModal item={checkoutItem} users={users} onClose={() => setCheckoutItem(null)} onSubmit={checkout} />
      <CheckinModal item={checkinItem} users={users} onClose={() => setCheckinItem(null)} onSubmit={checkin} />
    </section>
  );
}

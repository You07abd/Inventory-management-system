import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { categoriesApi } from "../api/categories";
import { getErrorMessage } from "../api/client";
import { itemsApi } from "../api/items";
import { locationsApi } from "../api/locations";
import { transactionsApi } from "../api/transactions";
import { usersApi } from "../api/users";
import CheckinModal from "../components/CheckinModal.jsx";
import CheckoutModal from "../components/CheckoutModal.jsx";
import QRCodeDisplay from "../components/QRCodeDisplay.jsx";

function findName(collection, id) {
  return collection.find((entry) => entry.id === id)?.name || "Unassigned";
}

export default function ItemDetail() {
  const { itemId } = useParams();
  const [item, setItem] = useState(null);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [users, setUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [itemData, categoryData, locationData, userData, transactionData] = await Promise.all([
        itemsApi.get(itemId),
        categoriesApi.list(),
        locationsApi.list(),
        usersApi.list(),
        transactionsApi.list({ item_id: itemId })
      ]);
      setItem(itemData);
      setCategories(categoryData);
      setLocations(locationData);
      setUsers(userData);
      setTransactions(transactionData);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [itemId]);

  const checkedOut = useMemo(() => {
    if (!item) {
      return 0;
    }
    return item.quantity - item.available_quantity;
  }, [item]);

  const availabilityStatus = checkedOut > 0 ? "checked_out" : "available";

  async function checkout(payload) {
    await itemsApi.checkout(item.id, payload);
    setCheckoutOpen(false);
    await load();
  }

  async function checkin(payload) {
    await itemsApi.checkin(item.id, payload);
    setCheckinOpen(false);
    await load();
  }

  if (loading) {
    return <div className="loading">Loading item...</div>;
  }

  if (error) {
    return <div className="alert">{error}</div>;
  }

  if (!item) {
    return <div className="empty-state">Item not found.</div>;
  }

  return (
    <section className="page-stack">
      <div className="page-header">
        <div>
          <span className="label">{item.asset_code}</span>
          <h1>{item.name}</h1>
        </div>
        <Link className="secondary button-link" to="/inventory">
          Back
        </Link>
      </div>

      <div className="detail-layout">
        <section className="panel">
          <div className="panel-header">
            <h2>Asset Details</h2>
            <span className={`status ${availabilityStatus}`}>{availabilityStatus.replaceAll("_", " ")}</span>
          </div>
          <dl className="detail-list">
            <div>
              <dt>Description</dt>
              <dd>{item.description || "No description"}</dd>
            </div>
            <div>
              <dt>Serial Number</dt>
              <dd>{item.serial_number || "Not recorded"}</dd>
            </div>
            <div>
              <dt>Category</dt>
              <dd>{findName(categories, item.category_id)}</dd>
            </div>
            <div>
              <dt>Location</dt>
              <dd>{findName(locations, item.location_id)}</dd>
            </div>
            <div>
              <dt>Condition</dt>
              <dd>{item.condition}</dd>
            </div>
            <div>
              <dt>Availability</dt>
              <dd>
                {item.available_quantity} available · {checkedOut} checked out · {item.quantity} total
              </dd>
            </div>
          </dl>
          <div className="row-actions strong-actions">
            <button type="button" onClick={() => setCheckoutOpen(true)} disabled={item.available_quantity < 1}>
              Check out
            </button>
            <button type="button" className="secondary" onClick={() => setCheckinOpen(true)} disabled={checkedOut < 1}>
              Check in
            </button>
          </div>
        </section>

        <QRCodeDisplay item={item} />
      </div>

      <section className="panel">
        <div className="panel-header">
          <h2>Transaction History</h2>
          <span>{transactions.length} records</span>
        </div>
        <div className="activity-list">
          {transactions.map((transaction) => (
            <div key={transaction.id} className="activity-row">
              <span className={`status ${transaction.type}`}>{transaction.type}</span>
              <div>
                <strong>
                  Qty {transaction.quantity} · User #{transaction.user_id}
                </strong>
                <small>{new Date(transaction.created_at).toLocaleString()}</small>
              </div>
            </div>
          ))}
          {transactions.length === 0 && <div className="empty-state">No transactions for this item.</div>}
        </div>
      </section>

      <CheckoutModal item={checkoutOpen ? item : null} users={users} onClose={() => setCheckoutOpen(false)} onSubmit={checkout} />
      <CheckinModal item={checkinOpen ? item : null} users={users} onClose={() => setCheckinOpen(false)} onSubmit={checkin} />
    </section>
  );
}

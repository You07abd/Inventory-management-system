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

function conditionBadgeClass(condition) {
  const map = { excellent: "badge--excellent", good: "badge--good", fair: "badge--fair", poor: "badge--poor" };
  return map[condition] || "badge--good";
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
        transactionsApi.list({ item_id: itemId }),
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

  useEffect(() => { load(); }, [itemId]);

  const checkedOut = useMemo(() => (!item ? 0 : item.quantity - item.available_quantity), [item]);

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

  if (loading) return <div className="loading" style={{ margin: "24px" }}>Loading item...</div>;
  if (error) return <div className="alert" style={{ margin: "24px" }}>{error}</div>;
  if (!item) return <div className="empty-state" style={{ margin: "24px" }}>Item not found.</div>;

  const isAvailable = checkedOut === 0;

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <span className="topbar-breadcrumb">Inventory / {item.asset_code}</span>
          <span className="topbar-title">{item.name}</span>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-secondary" onClick={() => setCheckinOpen(true)} disabled={checkedOut < 1}>Check In</button>
          <button className="btn btn-primary" onClick={() => setCheckoutOpen(true)} disabled={item.available_quantity < 1}>Check Out</button>
        </div>
      </div>

      <div className="page-content">
        <div className="page-stack">
          <div className="detail-layout">
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="panel">
                <div className="panel-head">
                  <h3>Asset Information</h3>
                  <span className={`badge ${isAvailable ? "badge--available" : "badge--checked-out"}`}>
                    {isAvailable ? "Available" : "Checked Out"}
                  </span>
                </div>
                <div className="panel-body">
                  <div className="detail-grid">
                    <div className="detail-field">
                      <div className="detail-field-label">Asset Code</div>
                      <div className="detail-field-value" style={{ fontFamily: "var(--font-mono)", color: "var(--color-primary)", fontWeight: 600 }}>{item.asset_code}</div>
                    </div>
                    <div className="detail-field">
                      <div className="detail-field-label">Serial Number</div>
                      <div className="detail-field-value">{item.serial_number || "—"}</div>
                    </div>
                    <div className="detail-field">
                      <div className="detail-field-label">Condition</div>
                      <div className="detail-field-value">
                        <span className={`badge ${conditionBadgeClass(item.condition)}`}>{item.condition}</span>
                      </div>
                    </div>
                    <div className="detail-field">
                      <div className="detail-field-label">Category</div>
                      <div className="detail-field-value">{findName(categories, item.category_id)}</div>
                    </div>
                    <div className="detail-field">
                      <div className="detail-field-label">Location</div>
                      <div className="detail-field-value">{findName(locations, item.location_id)}</div>
                    </div>
                    <div className="detail-field">
                      <div className="detail-field-label">Availability</div>
                      <div className="detail-field-value">{item.available_quantity} / {item.quantity} units</div>
                    </div>
                    {item.description && (
                      <div className="detail-field detail-field--wide">
                        <div className="detail-field-label">Description</div>
                        <div className="detail-field-value">{item.description}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="panel">
                <div className="panel-head">
                  <h3>Transaction History</h3>
                  <span>{transactions.length} records</span>
                </div>
                <div className="panel-body">
                  {transactions.length === 0 && <div style={{ color: "var(--color-muted)", fontSize: "12px" }}>No transactions for this item.</div>}
                  {transactions.map((tx) => (
                    <div key={tx.id} className="activity-row">
                      <div className={`activity-dot activity-dot--${tx.type === "checkout" ? "out" : "in"}`} />
                      <div>
                        <div className="activity-text">
                          <strong>{tx.type === "checkout" ? "Check Out" : "Check In"}</strong>
                          {" — "}Qty {tx.quantity} · User #{tx.user_id}
                        </div>
                        <div className="activity-time">{new Date(tx.created_at).toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="panel">
                <div className="panel-head"><h3>QR Code</h3></div>
                <QRCodeDisplay item={item} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {checkoutOpen && <CheckoutModal item={checkoutOpen ? item : null} users={users} onClose={() => setCheckoutOpen(false)} onSubmit={checkout} />}
      {checkinOpen && <CheckinModal item={checkinOpen ? item : null} users={users} onClose={() => setCheckinOpen(false)} onSubmit={checkin} />}
    </>
  );
}

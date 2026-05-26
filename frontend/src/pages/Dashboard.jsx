import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { categoriesApi } from "../api/categories";
import { getErrorMessage } from "../api/client";
import { itemsApi } from "../api/items";
import { transactionsApi } from "../api/transactions";
import { usersApi } from "../api/users";

export default function Dashboard() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [itemData, catData, txData, userData] = await Promise.all([
          itemsApi.list(),
          categoriesApi.list(),
          transactionsApi.list({ limit: 8 }),
          usersApi.list(),
        ]);
        setItems(itemData);
        setCategories(catData);
        setTransactions(txData);
        setUsers(userData);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const totalUnits = items.reduce((s, i) => s + i.quantity, 0);
  const availableUnits = items.reduce((s, i) => s + i.available_quantity, 0);
  const checkedOut = totalUnits - availableUnits;

  const catCounts = categories.map((c) => ({
    name: c.name,
    count: items.filter((i) => i.category_id === c.id).length,
  })).filter((c) => c.count > 0);
  const maxCount = Math.max(...catCounts.map((c) => c.count), 1);

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <span className="topbar-breadcrumb">Overview</span>
          <span className="topbar-title">Dashboard</span>
        </div>
        <div className="topbar-actions">
          <Link className="btn btn-primary" to="/inventory/new">Add Item</Link>
        </div>
      </div>

      <div className="page-content">
        {error && <div className="alert">{error}</div>}
        {loading ? (
          <div className="loading">Loading dashboard...</div>
        ) : (
          <div className="page-stack">
            <div className="metric-grid">
              <div className="metric-card">
                <div className="metric-label">Total Physical Units</div>
                <div className="metric-value metric-value--blue">{totalUnits}</div>
                <div className="metric-footer">Across {items.length} item types</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Available Units</div>
                <div className="metric-value metric-value--green">{availableUnits}</div>
                <div className="metric-footer">
                  <span className="metric-dot" style={{ background: "#22c55e" }} />
                  {totalUnits > 0 ? Math.round((availableUnits / totalUnits) * 100) : 0}% availability
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Checked Out Units</div>
                <div className="metric-value">{checkedOut}</div>
                <div className="metric-footer">{checkedOut === 0 ? "No active loans" : "Active loans"}</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Item Types</div>
                <div className="metric-value">{items.length}</div>
                <div className="metric-footer">Across {categories.length} categories</div>
              </div>
            </div>

            <div className="panel-row">
              <div className="panel">
                <div className="panel-head">
                  <h3>Inventory by Category</h3>
                  <span>{catCounts.length} categories</span>
                </div>
                <div className="panel-body">
                  {catCounts.map((c) => (
                    <div key={c.name} className="cat-row">
                      <span className="cat-name">{c.name}</span>
                      <div className="cat-bar-wrap">
                        <div className="cat-bar" style={{ width: `${(c.count / maxCount) * 100}%` }} />
                      </div>
                      <span className="cat-count">{c.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel">
                <div className="panel-head">
                  <h3>Recent Activity</h3>
                  <span>Last {transactions.length} events</span>
                </div>
                <div className="panel-body">
                  {transactions.length === 0 && <p className="empty-state" style={{ padding: "12px 0", border: "none", textAlign: "left" }}>No transactions yet.</p>}
                  {transactions.map((tx) => (
                    <div key={tx.id} className="activity-row">
                      <div className={`activity-dot activity-dot--${tx.type === "checkout" ? "out" : "in"}`} />
                      <div>
                        <div className="activity-text">
                          <strong>{tx.type === "checkout" ? "Check Out" : "Check In"}</strong>
                          {" — "}{tx.item_id && `Item #${tx.item_id}`}
                          {tx.quantity > 1 && ` ×${tx.quantity}`}
                        </div>
                        <div className="activity-time">{new Date(tx.created_at).toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

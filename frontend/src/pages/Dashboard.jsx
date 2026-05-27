import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { categoriesApi } from "../api/categories";
import { getErrorMessage } from "../api/client";
import { itemsApi } from "../api/items";
import { transactionsApi } from "../api/transactions";
import { usersApi } from "../api/users";
import { CATEGORY_META, DEFAULT_META } from "../utils/categoryMeta.jsx";

export default function Dashboard() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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
    id: c.id,
    name: c.name,
    description: c.description,
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

      {/* Full-height content area — no outer scroll */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        padding: "16px 14px",
        gap: "12px",
      }}>
        {error && <div className="alert" style={{ flexShrink: 0 }}>{error}</div>}

        {loading ? (
          <div className="loading">Loading dashboard...</div>
        ) : (
          <>
            {/* Metric row — fixed height, never grows */}
            <div className="metric-grid" style={{ flexShrink: 0 }}>
              <div className="metric-card" style={{ padding: "14px 18px" }}>
                <div className="metric-label">Total Physical Units</div>
                <div className="metric-value metric-value--blue" style={{ fontSize: "26px" }}>{totalUnits}</div>
                <div className="metric-footer">Across {items.length} item types</div>
              </div>
              <div className="metric-card" style={{ padding: "14px 18px" }}>
                <div className="metric-label">Available Units</div>
                <div className="metric-value metric-value--green" style={{ fontSize: "26px" }}>{availableUnits}</div>
                <div className="metric-footer">
                  <span className="metric-dot" style={{ background: "#22c55e" }} />
                  {totalUnits > 0 ? Math.round((availableUnits / totalUnits) * 100) : 0}% availability
                </div>
              </div>
              <div className="metric-card" style={{ padding: "14px 18px" }}>
                <div className="metric-label">Checked Out Units</div>
                <div className="metric-value" style={{ fontSize: "26px" }}>{checkedOut}</div>
                <div className="metric-footer">{checkedOut === 0 ? "No active loans" : "Active loans"}</div>
              </div>
              <div className="metric-card" style={{ padding: "14px 18px" }}>
                <div className="metric-label">Item Types</div>
                <div className="metric-value" style={{ fontSize: "26px" }}>{items.length}</div>
                <div className="metric-footer">Across {categories.length} categories</div>
              </div>
            </div>

            {/* Panel row — fills the remaining height */}
            <div className="panel-row" style={{ flex: 1, minHeight: 0 }}>

              {/* Inventory by Category */}
              <div className="panel" style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <div className="panel-head" style={{ flexShrink: 0 }}>
                  <h3>Inventory by Category</h3>
                  <span style={{ color: "var(--color-muted)", fontSize: "13px", marginRight: "4px" }}>
                    {catCounts.length} categories
                  </span>
                </div>
                <div className="panel-body" style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                  <div className="browse-grid" style={{ flex: 1, minHeight: 0, gridTemplateColumns: "repeat(3, 1fr)", gridAutoRows: "1fr", padding: "8px", gap: "10px" }}>
                    {catCounts.map((c) => {
                      const meta = CATEGORY_META[c.name] ?? DEFAULT_META;
                      const Icon = meta.Icon;
                      return (
                        <div
                          key={c.name}
                          className="browse-card"
                          onClick={() => navigate("/inventory")}
                        >
                          <div className="browse-card__icon" style={{ background: meta.bg, color: meta.color }}>
                            <Icon />
                          </div>
                          <span className="browse-card__label">{c.name}</span>

                          {/* Slide-up overlay */}
                          <div
                            className="cat-card-overlay"
                            style={{ background: meta.bg, color: meta.color, justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}
                          >
                            <div className="cat-card-overlay__title">{c.name}</div>
                            {c.description && (
                              <div className="cat-card-overlay__desc">{c.description}</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="panel" style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <div className="panel-head" style={{ flexShrink: 0 }}>
                  <h3>Recent Activity</h3>
                  <span>Last {transactions.length} events</span>
                </div>
                <div className="panel-body" style={{ flex: 1, overflowY: "auto" }}>
                  {transactions.length === 0 && (
                    <p className="empty-state" style={{ padding: "12px 0", border: "none", textAlign: "left" }}>
                      No transactions yet.
                    </p>
                  )}
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
          </>
        )}
      </div>
    </>
  );
}

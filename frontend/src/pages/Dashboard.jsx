import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { categoriesApi } from "../api/categories";
import { getErrorMessage } from "../api/client";
import { itemsApi } from "../api/items";
import { transactionsApi } from "../api/transactions";
import { getCategoryMeta, UNCATEGORIZED_CATEGORY } from "../utils/categoryMeta.jsx";
import { formatMoney, inventoryValue, isLowStock } from "../utils/stock";

export default function Dashboard() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [itemData, catData, txData] = await Promise.all([
          itemsApi.list(),
          categoriesApi.list(),
          transactionsApi.list({ limit: 8 }),
        ]);
        if (!active) return;
        setItems(itemData);
        setCategories(catData);
        setTransactions(txData);
      } catch (err) {
        if (active) setError(getErrorMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const totalUnits = items.reduce((s, i) => s + i.quantity, 0);
  const availableUnits = items.reduce((s, i) => s + i.available_quantity, 0);
  const checkedOut = totalUnits - availableUnits;
  const lowStockItems = items.filter(isLowStock);
  const totalValue = inventoryValue(items);

  const uncategorizedCount = items.filter((i) => i.category_id == null).length;
  const catCounts = [
    ...categories.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    count: items.filter((i) => i.category_id === c.id).length,
    category: c,
  })),
    ...(uncategorizedCount > 0 ? [{
      id: UNCATEGORIZED_CATEGORY.id,
      name: UNCATEGORIZED_CATEGORY.name,
      description: UNCATEGORIZED_CATEGORY.description,
      count: uncategorizedCount,
      category: UNCATEGORIZED_CATEGORY,
    }] : []),
  ];
  const maxCount = Math.max(...catCounts.map((c) => c.count), 1);
  const itemMap = Object.fromEntries(items.map((i) => [i.id, i.name]));

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <span className="topbar-breadcrumb">Overview</span>
          <span className="topbar-title">Dashboard</span>
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
                <div className="metric-value metric-value--red" style={{ fontSize: "26px" }}>{checkedOut}</div>
                <div className="metric-footer">{checkedOut === 0 ? "No active loans" : "Active loans"}</div>
              </div>
              <div className="metric-card" style={{ padding: "14px 18px" }}>
                <div className="metric-label">Inventory Value</div>
                <div className="metric-value" style={{ fontSize: "26px" }}>{formatMoney(totalValue)}</div>
                <div className="metric-footer">{items.length} item types · {catCounts.length} categories</div>
              </div>
            </div>

            {/* Low-stock alert strip */}
            {lowStockItems.length > 0 && (
              <div style={{
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                gap: "10px",
                flexWrap: "wrap",
                padding: "10px 14px",
                background: "#fffbeb",
                border: "1px solid #fde68a",
                borderRadius: "var(--radius-md)",
              }}>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#92400e", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  ⚠ {lowStockItems.length} item{lowStockItems.length !== 1 ? "s" : ""} at or below reorder point
                </span>
                {lowStockItems.slice(0, 5).map((i) => (
                  <button
                    key={i.id}
                    type="button"
                    onClick={() => navigate(`/items/${i.id}`)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "3px 10px",
                      borderRadius: "999px",
                      border: "1px solid #fde68a",
                      background: "var(--color-surface)",
                      color: "#92400e",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {i.name}
                    <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                      {i.available_quantity}/{i.min_quantity}
                    </span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => navigate("/inventory?low_stock=1")}
                  style={{ background: "none", border: "none", color: "var(--color-primary)", fontSize: "12px", fontWeight: 600, cursor: "pointer", marginLeft: "auto" }}
                >
                  View all →
                </button>
              </div>
            )}

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
                  <div className="browse-grid" style={{ flex: 1, minHeight: 0, overflowY: "auto", gridTemplateColumns: "repeat(3, 1fr)", gridAutoRows: "minmax(min-content, 1fr)", padding: "8px", gap: "10px" }}>
                    {catCounts.map((c) => {
                      const meta = getCategoryMeta(c.category);
                      const Icon = meta.Icon;
                      return (
                        <div
                          key={c.name}
                          className="browse-card"
                          onClick={() => navigate("/inventory")}
                        >
                          <div
                            className="browse-card__icon"
                            style={{
                              background: meta.bg,
                              color: meta.color,
                              ...(c.count === 0 ? { opacity: 0.5, filter: "grayscale(0.6)" } : {}),
                            }}
                          >
                            <Icon />
                          </div>
                          <span className="browse-card__label">{c.name}</span>
                          {c.count === 0 && <span className="browse-card__sub">0 items</span>}

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
                      <div
                        className={`activity-dot activity-dot--${tx.type === "checkout" ? "out" : "in"}`}
                        style={tx.type === "adjust" ? { background: "#94a3b8" } : undefined}
                      />
                      <div>
                        <div className="activity-text">
                          <strong>{tx.user_name || "Unknown"}</strong>
                          {" "}
                          {tx.type === "checkout" ? "checked out" : tx.type === "adjust" ? "adjusted stock of" : "returned"}
                          {" "}
                          <strong>{itemMap[tx.item_id] || `Item #${tx.item_id}`}</strong>
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

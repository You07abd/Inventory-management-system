import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { getErrorMessage } from "../api/client";
import { categoriesApi } from "../api/categories";
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
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [itemData, categoryData, transactionData, userData] = await Promise.all([
          itemsApi.list(),
          categoriesApi.list(),
          transactionsApi.list({ limit: 8 }),
          usersApi.list()
        ]);
        setItems(itemData);
        setCategories(categoryData);
        setTransactions(transactionData);
        setUsers(userData);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const stats = useMemo(() => {
    const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);
    const availableUnits = items.reduce((sum, item) => sum + item.available_quantity, 0);
    const checkedOutUnits = totalUnits - availableUnits;
    const needsInspection = items.filter((item) => item.condition === "needs_inspection" || item.condition === "damaged").length;
    return { totalUnits, availableUnits, checkedOutUnits, needsInspection };
  }, [items]);

  return (
    <section className="page-stack">
      <div className="page-header">
        <div>
          <span className="label">Live Inventory</span>
          <h1>Drone Lab Dashboard</h1>
        </div>
        <Link className="button-link" to="/inventory/new">
          Add Item
        </Link>
      </div>

      {error && <div className="alert">{error}</div>}
      {loading ? <div className="loading">Loading dashboard...</div> : null}

      <div className="metric-grid">
        <article className="metric">
          <span>Total Units</span>
          <strong>{stats.totalUnits}</strong>
        </article>
        <article className="metric">
          <span>Available</span>
          <strong>{stats.availableUnits}</strong>
        </article>
        <article className="metric">
          <span>Checked Out</span>
          <strong>{stats.checkedOutUnits}</strong>
        </article>
        <article className="metric">
          <span>Needs Review</span>
          <strong>{stats.needsInspection}</strong>
        </article>
      </div>

      <div className="split-grid">
        <section className="panel">
          <div className="panel-header">
            <h2>Inventory Mix</h2>
            <span>{categories.length} categories</span>
          </div>
          <div className="category-list">
            {categories.map((category) => {
              const count = items.filter((item) => item.category_id === category.id).length;
              return (
                <div key={category.id} className="category-row">
                  <span>{category.name}</span>
                  <strong>{count}</strong>
                </div>
              );
            })}
            {categories.length === 0 && <div className="empty-state">No categories yet.</div>}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Recent Transactions</h2>
            <Link to="/transactions">View all</Link>
          </div>
          <div className="activity-list">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="activity-row">
                <span className={`status ${transaction.type}`}>{transaction.type}</span>
                <div>
                  <strong>Item #{transaction.item_id}</strong>
                  <small>
                    User #{transaction.user_id} · Qty {transaction.quantity}
                  </small>
                </div>
              </div>
            ))}
            {transactions.length === 0 && <div className="empty-state">No transactions yet.</div>}
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panel-header">
          <h2>Lab Users</h2>
          <span>{users.length} registered</span>
        </div>
        <div className="user-pills">
          {users.map((user) => (
            <span key={user.id}>
              {user.name} · {user.role}
            </span>
          ))}
          {users.length === 0 && <div className="empty-state">No users yet.</div>}
        </div>
      </section>
    </section>
  );
}

import { useEffect, useState } from "react";

import { getErrorMessage } from "../api/client";
import { itemsApi } from "../api/items";
import { transactionsApi } from "../api/transactions";

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const params = selectedItemId ? { item_id: Number(selectedItemId) } : {};
      const [transactionData, itemData] = await Promise.all([transactionsApi.list(params), itemsApi.list()]);
      setTransactions(transactionData);
      setItems(itemData);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [selectedItemId]);

  function itemLabel(id) {
    const item = items.find((entry) => entry.id === id);
    return item ? `${item.asset_code} · ${item.name}` : `Item #${id}`;
  }

  return (
    <section className="page-stack">
      <div className="page-header">
        <div>
          <span className="label">Audit Trail</span>
          <h1>Transactions</h1>
        </div>
      </div>

      <div className="toolbar">
        <select value={selectedItemId} onChange={(event) => setSelectedItemId(event.target.value)}>
          <option value="">All items</option>
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.asset_code} · {item.name}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="alert">{error}</div>}
      {loading ? <div className="loading">Loading transactions...</div> : null}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Item</th>
              <th>User</th>
              <th>Quantity</th>
              <th>Due</th>
              <th>Returned</th>
              <th>Created</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction) => (
              <tr key={transaction.id}>
                <td>
                  <span className={`status ${transaction.type}`}>{transaction.type}</span>
                </td>
                <td>{itemLabel(transaction.item_id)}</td>
                <td>User #{transaction.user_id}</td>
                <td>{transaction.quantity}</td>
                <td>{transaction.due_date ? new Date(transaction.due_date).toLocaleString() : "-"}</td>
                <td>{transaction.returned_at ? new Date(transaction.returned_at).toLocaleString() : "-"}</td>
                <td>{new Date(transaction.created_at).toLocaleString()}</td>
                <td>{transaction.notes || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {transactions.length === 0 && <div className="empty-state">No transactions found.</div>}
      </div>
    </section>
  );
}

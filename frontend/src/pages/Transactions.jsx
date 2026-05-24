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
      const [transactionData, itemData] = await Promise.all([
        transactionsApi.list(params),
        itemsApi.list(),
      ]);
      setTransactions(transactionData);
      setItems(itemData);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [selectedItemId]);

  function itemLabel(id) {
    const item = items.find((entry) => entry.id === id);
    return item ? `${item.asset_code} · ${item.name}` : `Item #${id}`;
  }

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <span className="topbar-breadcrumb">Records</span>
          <span className="topbar-title">Transactions</span>
        </div>
      </div>

      <div className="page-content">
        {error && <div className="alert" style={{ marginBottom: "12px" }}>{error}</div>}
        <div className="table-wrap">
          <div className="table-toolbar">
            <select className="table-filter" value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)}>
              <option value="">All items</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>{item.asset_code} · {item.name}</option>
              ))}
            </select>
          </div>
          {loading ? (
            <div className="loading" style={{ borderRadius: 0, border: "none", borderTop: "1px solid var(--color-border-light)" }}>
              Loading transactions...
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th><div style={{ padding: "9px 14px" }}>Type</div></th>
                  <th><div style={{ padding: "9px 14px" }}>Item</div></th>
                  <th><div style={{ padding: "9px 14px" }}>User</div></th>
                  <th><div style={{ padding: "9px 14px" }}>Qty</div></th>
                  <th><div style={{ padding: "9px 14px" }}>Due</div></th>
                  <th><div style={{ padding: "9px 14px" }}>Returned</div></th>
                  <th><div style={{ padding: "9px 14px" }}>Created</div></th>
                  <th><div style={{ padding: "9px 14px" }}>Notes</div></th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td>
                      <span className={`badge ${tx.type === "checkout" ? "badge--checked-out" : "badge--available"}`}>
                        {tx.type === "checkout" ? "Check Out" : "Check In"}
                      </span>
                    </td>
                    <td>{itemLabel(tx.item_id)}</td>
                    <td>User #{tx.user_id}</td>
                    <td>{tx.quantity}</td>
                    <td>{tx.due_date ? new Date(tx.due_date).toLocaleString() : "—"}</td>
                    <td>{tx.returned_at ? new Date(tx.returned_at).toLocaleString() : "—"}</td>
                    <td>{new Date(tx.created_at).toLocaleString()}</td>
                    <td>{tx.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!loading && transactions.length === 0 && (
            <div className="empty-state">No transactions found.</div>
          )}
        </div>
      </div>
    </>
  );
}

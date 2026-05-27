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

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await itemsApi.list();
        if (active) setItems(data);
      } catch (err) {
        if (active) setError(getErrorMessage(err));
      }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      try {
        const data = await transactionsApi.list(selectedItemId ? { item_id: selectedItemId } : {});
        if (active) setTransactions(data);
      } catch (err) {
        if (active) setError(getErrorMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [selectedItemId]);

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
                  <th><div style={{ padding: '9px 14px' }}>Unit</div></th>
                  <th><div style={{ padding: "9px 14px" }}>User</div></th>
                  <th><div style={{ padding: "9px 14px" }}>Qty</div></th>
                  <th><div style={{ padding: "9px 14px" }}>Due</div></th>
                  <th><div style={{ padding: "9px 14px" }}>Returned</div></th>
                  <th><div style={{ padding: "9px 14px" }}>Created</div></th>
                  <th><div style={{ padding: "9px 14px" }}>Notes</div></th>
                  <th><div style={{ padding: "9px 14px" }}>Session</div></th>
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
                    <td>
                      {tx.unit_asset_code
                        ? <span className='asset-code'>{tx.unit_asset_code}</span>
                        : <span style={{ color: 'var(--color-muted)', fontSize: '13px' }}>—</span>}
                    </td>
                    <td>User #{tx.user_id}</td>
                    <td>{tx.quantity}</td>
                    <td>{tx.due_date ? new Date(tx.due_date).toLocaleString() : "—"}</td>
                    <td>{tx.returned_at ? new Date(tx.returned_at).toLocaleString() : "—"}</td>
                    <td>{new Date(tx.created_at).toLocaleString()}</td>
                    <td>{tx.notes || "—"}</td>
                    <td>
                      {tx.session_id ? (
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: "11px",
                            background: "#ede9fe",
                            color: "#5b21b6",
                            borderRadius: "4px",
                            padding: "2px 6px",
                            whiteSpace: "nowrap",
                          }}
                          title={tx.session_id}
                        >
                          {tx.session_id.slice(0, 8)}
                        </span>
                      ) : "—"}
                    </td>
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

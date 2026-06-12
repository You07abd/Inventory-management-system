import { useEffect, useState, useMemo } from "react";
import { downloadFile, getErrorMessage } from "../api/client";
import { itemsApi } from "../api/items";
import { usersApi } from "../api/users";
import { transactionsApi } from "../api/transactions";
import { useAuth } from "../context/AuthContext";

const STATUS_TABS = [
  { key: "",         label: "All" },
  { key: "active",   label: "Active" },
  { key: "overdue",  label: "Overdue" },
  { key: "returned", label: "Returned" },
];

const parseUTC = (s) => s ? new Date(s.endsWith("Z") ? s : s + "Z") : null;

const OVERDUE_ROW_STYLE = { borderLeft: "3px solid #ef4444", background: "#fff5f5" };
const OVERDUE_TEXT_STYLE = { color: "#ef4444", fontWeight: 600 };
const OVERDUE_BADGE_STYLE = { fontSize: "10px", fontWeight: 700, color: "#ef4444", textTransform: "uppercase", letterSpacing: "0.04em" };

function typeBadge(type) {
  if (type === "checkout") return { className: "badge--checked-out", label: "Check Out" };
  if (type === "adjust") return { className: "badge--not-in-lab", label: "Adjustment" };
  return { className: "badge--available", label: "Check In" };
}

export default function Transactions() {
  const { role } = useAuth();
  const isStudent = role === "student";
  const [transactions, setTransactions] = useState([]);
  const [items, setItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  async function exportCsv() {
    setExporting(true);
    setError("");
    try {
      await downloadFile("/transactions/export", "transactions.csv");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setExporting(false);
    }
  }

  useEffect(() => {
    let active = true;
    setError("");
    Promise.all([itemsApi.list(), usersApi.list()])
      .then(([itemData, userData]) => {
        if (active) {
          setItems(itemData);
          setUsers(userData);
        }
      })
      .catch((err) => { if (active) setError(getErrorMessage(err)); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    setError("");
    setLoading(true);
    const params = {};
    if (selectedItemId) params.item_id = selectedItemId;
    if (selectedUserId) params.user_id = selectedUserId;
    if (status) params.status = status;
    transactionsApi.list(params)
      .then((data) => { if (active) setTransactions(data); })
      .catch((err) => { if (active) setError(getErrorMessage(err)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [selectedItemId, selectedUserId, status]);

  const itemLabel = useMemo(() => {
    const map = Object.fromEntries(items.map((i) => [i.id, `${i.asset_code} · ${i.name}`]));
    return (id) => map[id] ?? `Item #${id}`;
  }, [items]);

  function isOverdue(tx) {
    return (
      tx.type === "checkout" &&
      !tx.returned_at &&
      tx.due_date &&
      parseUTC(tx.due_date) < new Date()
    );
  }

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <span className="topbar-breadcrumb">Records</span>
          <span className="topbar-title">Transactions</span>
        </div>
        {!isStudent && (
          <div className="topbar-actions">
            <button type="button" className="btn btn-secondary" onClick={exportCsv} disabled={exporting}>
              {exporting ? "Exporting…" : "Export CSV"}
            </button>
          </div>
        )}
      </div>

      <div className="page-content">
        {error && <div className="alert" style={{ marginBottom: "12px" }}>{error}</div>}

        <div className="table-wrap">
          {/* Status tabs */}
          <div style={{ display: "flex", gap: "2px", padding: "10px 14px", borderBottom: "1px solid var(--color-border-light)" }}>
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatus(tab.key)}
                style={{
                  padding: "4px 14px",
                  borderRadius: "6px",
                  border: "1px solid transparent",
                  cursor: "pointer",
                  fontSize: "12.5px",
                  fontWeight: status === tab.key ? 600 : 400,
                  background: status === tab.key ? "var(--color-primary)" : "transparent",
                  color: status === tab.key ? "#fff" : "var(--color-text-2)",
                  transition: "all 0.12s",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Filters row */}
          <div className="table-toolbar">
            <select
              className="table-filter"
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
            >
              <option value="">All items</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>{item.asset_code} · {item.name}</option>
              ))}
            </select>
            <select
              className="table-filter"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
            >
              <option value="">All users</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
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
                  <th><div style={{ padding: "9px 14px" }}>Unit</div></th>
                  <th><div style={{ padding: "9px 14px" }}>User</div></th>
                  <th><div style={{ padding: "9px 14px" }}>Due</div></th>
                  <th><div style={{ padding: "9px 14px" }}>Returned</div></th>
                  <th><div style={{ padding: "9px 14px" }}>Created</div></th>
                  <th><div style={{ padding: "9px 14px" }}>Notes</div></th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => {
                  const overdue = isOverdue(tx);
                  return (
                    <tr
                      key={tx.id}
                      style={overdue ? OVERDUE_ROW_STYLE : undefined}
                    >
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "3px" }}>
                          <span className={`badge ${typeBadge(tx.type).className}`}>
                            {typeBadge(tx.type).label}
                          </span>
                          {overdue && (
                            <span style={OVERDUE_BADGE_STYLE}>
                              Overdue
                            </span>
                          )}
                        </div>
                      </td>
                      <td>{itemLabel(tx.item_id)}</td>
                      <td>
                        {tx.unit_asset_code
                          ? <span className="asset-code">{tx.unit_asset_code}</span>
                          : <span style={{ color: "var(--color-muted)", fontSize: "13px" }}>—</span>}
                      </td>
                      <td>{tx.user_name ?? `User #${tx.user_id}`}</td>
                      <td style={overdue ? OVERDUE_TEXT_STYLE : undefined}>
                        {tx.due_date ? parseUTC(tx.due_date)?.toLocaleDateString() : "—"}
                      </td>
                      <td>{tx.returned_at ? parseUTC(tx.returned_at)?.toLocaleDateString() : "—"}</td>
                      <td style={{ color: "var(--color-muted)", fontSize: "12px" }}>{parseUTC(tx.created_at)?.toLocaleDateString()}</td>
                      <td>{tx.notes || "—"}</td>
                    </tr>
                  );
                })}
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

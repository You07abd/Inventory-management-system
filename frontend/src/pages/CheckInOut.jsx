import { useState, useEffect, useRef, useCallback } from "react";
import { getErrorMessage } from "../api/client";
import { itemsApi } from "../api/items";
import { transactionsApi } from "../api/transactions";
import { usersApi } from "../api/users";

const emptyCheckoutForm = {
  user_id: "",
  quantity: 1,
  notes: "",
  destination: "",
  due_date: ""
};

const emptyCheckinForm = {
  user_id: "",
  quantity: 1,
  condition_on_return: "good",
  notes: ""
};

function statusBadgeStyle(status) {
  const styles = {
    available: { background: "#d1fae5", color: "#065f46" },
    partially_available: { background: "#fef3c7", color: "#92400e" },
    checked_out: { background: "#fee2e2", color: "#991b1b" }
  };
  return styles[status] || { background: "#f3f4f6", color: "#374151" };
}

function transactionTypeBadgeStyle(type) {
  if (type === "checkout") return { background: "#dbeafe", color: "#1e40af" };
  if (type === "checkin") return { background: "#d1fae5", color: "#065f46" };
  return { background: "#f3f4f6", color: "#374151" };
}

function badgeLabel(value) {
  return String(value || "").replace(/_/g, " ");
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : "—";
}

export default function CheckInOut() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [users, setUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [tab, setTab] = useState("checkout");
  const [checkoutForm, setCheckoutForm] = useState(emptyCheckoutForm);
  const [checkinForm, setCheckinForm] = useState(emptyCheckinForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);

  const searchTimerRef = useRef(null);
  const successTimerRef = useRef(null);

  const userName = useCallback((id) => {
    return users.find((user) => user.id === id)?.name || (id ? `User #${id}` : "—");
  }, [users]);

  const loadTransactions = useCallback(async (itemId) => {
    const data = await transactionsApi.list({ item_id: itemId, limit: 5 });
    setTransactions(data);
  }, []);

  const showSuccess = useCallback((message) => {
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    setSuccess(message);
    successTimerRef.current = setTimeout(() => setSuccess(null), 3000);
  }, []);

  const resetForms = useCallback((item = null) => {
    setCheckoutForm(emptyCheckoutForm);
    setCheckinForm({
      ...emptyCheckinForm,
      user_id: item?.current_holder_id || ""
    });
  }, []);

  const deselectItem = useCallback(() => {
    setSelectedItem(null);
    setQuery("");
    setResults([]);
    setTransactions([]);
    setShowDropdown(false);
    setError(null);
    resetForms();
    setTab("checkout");
  }, [resetForms]);

  useEffect(() => {
    async function loadUsers() {
      setError(null);
      try {
        const data = await usersApi.list();
        setUsers(data);
      } catch (err) {
        setError(getErrorMessage(err));
      }
    }

    loadUsers();
  }, []);

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setShowDropdown(false);
      return undefined;
    }

    let active = true;
    searchTimerRef.current = setTimeout(async () => {
      setError(null);
      try {
        const data = await itemsApi.list({ search: trimmed, limit: 8 });
        if (!active) return;
        setResults(data);
        setShowDropdown(true);
      } catch (err) {
        if (!active) return;
        setError(getErrorMessage(err));
        setResults([]);
        setShowDropdown(false);
      }
    }, 300);

    return () => {
      active = false;
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [query]);

  async function selectItem(item) {
    setSelectedItem(item);
    setQuery("");
    setResults([]);
    setShowDropdown(false);
    setError(null);
    resetForms(item);
    setTab(item.available_quantity > 0 ? "checkout" : "checkin");
    try {
      await loadTransactions(item.id);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  function updateCheckout(field, value) {
    setCheckoutForm((current) => ({ ...current, [field]: value }));
  }

  function updateCheckin(field, value) {
    setCheckinForm((current) => ({ ...current, [field]: value }));
  }

  async function handleCheckoutSubmit(event) {
    event.preventDefault();
    if (!selectedItem) return;

    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        user_id: Number(checkoutForm.user_id),
        quantity: Number(checkoutForm.quantity),
        notes: checkoutForm.notes || null,
        destination: checkoutForm.destination || null,
        due_date: checkoutForm.due_date ? new Date(checkoutForm.due_date).toISOString() : null
      };

      await itemsApi.checkout(selectedItem.id, payload);
      const updated = await itemsApi.get(selectedItem.id);
      setSelectedItem(updated);
      await loadTransactions(selectedItem.id);
      showSuccess("Checked out successfully");
      setCheckoutForm(emptyCheckoutForm);
      setCheckinForm((current) => ({
        ...current,
        user_id: updated.current_holder_id || current.user_id || ""
      }));
      if (updated.available_quantity === 0) setTab("checkin");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCheckinSubmit(event) {
    event.preventDefault();
    if (!selectedItem) return;

    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        user_id: Number(checkinForm.user_id),
        quantity: Number(checkinForm.quantity),
        condition_on_return: checkinForm.condition_on_return || null,
        notes: checkinForm.notes || null
      };

      await itemsApi.checkin(selectedItem.id, payload);
      const updated = await itemsApi.get(selectedItem.id);
      setSelectedItem(updated);
      await loadTransactions(selectedItem.id);
      showSuccess("Checked in successfully");
      setCheckinForm({
        ...emptyCheckinForm,
        user_id: updated.current_holder_id || ""
      });
      if (updated.available_quantity === updated.quantity) setTab("checkout");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const availableQuantity = selectedItem?.available_quantity || 0;
  const totalQuantity = selectedItem?.quantity || 0;
  const checkedOutQuantity = Math.max(totalQuantity - availableQuantity, 0);
  const canCheckout = availableQuantity > 0;
  const canCheckin = checkedOutQuantity > 0;
  const showTabs = selectedItem && availableQuantity > 0 && availableQuantity < totalQuantity;
  const activeForm = showTabs ? tab : availableQuantity === 0 ? "checkin" : "checkout";

  return (
    <div className="page">
      <div className="page-header">
        <h1>Check In / Out</h1>
        <p>Fast asset checkout and return</p>
      </div>

      <div style={{ position: "relative", marginBottom: "20px" }}>
        <input
          className="form-input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => {
            if (results.length > 0) setShowDropdown(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setQuery("");
              setResults([]);
              setShowDropdown(false);
            }
          }}
          placeholder="Search by asset code, item name, or serial number…"
          style={{ fontSize: "18px", padding: "14px 16px", width: "100%" }}
        />
        {showDropdown && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              left: 0,
              right: 0,
              zIndex: 20,
              background: "#fff",
              border: "1px solid var(--color-border-light)",
              borderRadius: "8px",
              boxShadow: "0 16px 36px rgba(15, 23, 42, 0.12)",
              overflow: "hidden"
            }}
          >
            {results.length === 0 ? (
              <div style={{ padding: "14px 16px", color: "var(--color-muted)", fontSize: "13px" }}>No assets found.</div>
            ) : (
              results.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectItem(item)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                    padding: "12px 16px",
                    border: "none",
                    borderBottom: "1px solid var(--color-border-light)",
                    background: "#fff",
                    cursor: "pointer",
                    textAlign: "left"
                  }}
                >
                  <span>
                    <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, marginRight: "10px" }}>{item.asset_code}</span>
                    <span>{item.name}</span>
                  </span>
                  <span className="badge" style={statusBadgeStyle(item.status)}>{badgeLabel(item.status)}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {selectedItem && (
        <>
          <div style={{ background: "#fff", border: "1px solid var(--color-border-light)", borderRadius: "8px", padding: "20px", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "24px", fontWeight: 800, color: "var(--color-primary)" }}>{selectedItem.asset_code}</span>
                <span className="badge" style={statusBadgeStyle(selectedItem.status)}>{badgeLabel(selectedItem.status)}</span>
              </div>
              <button type="button" className="btn btn-secondary" onClick={deselectItem} aria-label="Deselect item">×</button>
            </div>
            <div style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>{selectedItem.name}</div>
            {selectedItem.serial_number && (
              <div style={{ color: "var(--color-muted)", fontSize: "13px", marginBottom: "8px" }}>Serial number: {selectedItem.serial_number}</div>
            )}
            <div style={{ fontSize: "14px", marginBottom: "6px" }}>{availableQuantity} of {totalQuantity} available</div>
            <div style={{ color: "var(--color-muted)", fontSize: "13px" }}>Current holder: {userName(selectedItem.current_holder_id)}</div>
          </div>

          <div style={{ background: "#fff", border: "1px solid var(--color-border-light)", borderRadius: "8px", padding: "20px", marginBottom: "16px" }}>
            {success && (
              <div style={{ background: "#d1fae5", color: "#065f46", borderRadius: "6px", padding: "10px 12px", marginBottom: "14px", fontWeight: 600 }}>
                {success}
              </div>
            )}
            {error && <div style={{ color: "#991b1b", marginBottom: "14px", fontSize: "13px", fontWeight: 600 }}>{error}</div>}

            {showTabs && (
              <div style={{ display: "inline-flex", border: "1px solid var(--color-border-light)", borderRadius: "8px", overflow: "hidden", marginBottom: "16px" }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setTab("checkout")}
                  style={{ borderRadius: 0, background: tab === "checkout" ? "var(--color-primary)" : "#fff", color: tab === "checkout" ? "#fff" : "var(--color-text)" }}
                >
                  Check Out
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setTab("checkin")}
                  style={{ borderRadius: 0, background: tab === "checkin" ? "var(--color-primary)" : "#fff", color: tab === "checkin" ? "#fff" : "var(--color-text)" }}
                >
                  Check In
                </button>
              </div>
            )}

            {activeForm === "checkout" && (
              <form onSubmit={handleCheckoutSubmit}>
                <div className="form-group">
                  <label className="form-label">User</label>
                  <select className="form-select" value={checkoutForm.user_id} onChange={(event) => updateCheckout("user_id", event.target.value)} required>
                    <option value="" disabled>Select user</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>{user.name} ({user.role})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Quantity</label>
                  <input className="form-input" type="number" min="1" max={availableQuantity} value={checkoutForm.quantity} onChange={(event) => updateCheckout("quantity", event.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Purpose / Notes</label>
                  <textarea className="form-textarea" value={checkoutForm.notes} onChange={(event) => updateCheckout("notes", event.target.value)} rows="3" />
                </div>
                <div className="form-group">
                  <label className="form-label">Destination</label>
                  <input className="form-input" value={checkoutForm.destination} onChange={(event) => updateCheckout("destination", event.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Expected Return Date</label>
                  <input className="form-input" type="datetime-local" value={checkoutForm.due_date} onChange={(event) => updateCheckout("due_date", event.target.value)} />
                </div>
                <button className="btn btn-primary" type="submit" disabled={submitting || !canCheckout || users.length === 0}>
                  {submitting ? "Saving…" : "Check Out"}
                </button>
              </form>
            )}

            {activeForm === "checkin" && (
              <form onSubmit={handleCheckinSubmit}>
                <div className="form-group">
                  <label className="form-label">User</label>
                  <select className="form-select" value={checkinForm.user_id} onChange={(event) => updateCheckin("user_id", event.target.value)} required>
                    <option value="" disabled>Select user</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>{user.name} ({user.role})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Quantity</label>
                  <input className="form-input" type="number" min="1" max={checkedOutQuantity} value={checkinForm.quantity} onChange={(event) => updateCheckin("quantity", event.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Return Condition</label>
                  <select className="form-select" value={checkinForm.condition_on_return} onChange={(event) => updateCheckin("condition_on_return", event.target.value)}>
                    <option value="excellent">Excellent</option>
                    <option value="good">Good</option>
                    <option value="needs_inspection">Needs inspection</option>
                    <option value="damaged">Damaged</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea className="form-textarea" value={checkinForm.notes} onChange={(event) => updateCheckin("notes", event.target.value)} rows="3" />
                </div>
                <button className="btn btn-primary" type="submit" disabled={submitting || !canCheckin || users.length === 0} style={{ background: "#059669", borderColor: "#059669" }}>
                  {submitting ? "Saving…" : "Check In"}
                </button>
              </form>
            )}
          </div>

          <div style={{ background: "#fff", border: "1px solid var(--color-border-light)", borderRadius: "8px", padding: "20px" }}>
            <h2 style={{ fontSize: "18px", margin: "0 0 14px" }}>Recent Transactions</h2>
            {transactions.length === 0 ? (
              <div className="empty-state">No transactions for this item.</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th><div style={{ padding: "9px 14px" }}>Type</div></th>
                    <th><div style={{ padding: "9px 14px" }}>User</div></th>
                    <th><div style={{ padding: "9px 14px" }}>Qty</div></th>
                    <th><div style={{ padding: "9px 14px" }}>Due</div></th>
                    <th><div style={{ padding: "9px 14px" }}>Returned</div></th>
                    <th><div style={{ padding: "9px 14px" }}>Created</div></th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td>
                        <span className="badge" style={transactionTypeBadgeStyle(tx.type)}>
                          {tx.type === "checkout" ? "Check Out" : "Check In"}
                        </span>
                      </td>
                      <td>{userName(tx.user_id)}</td>
                      <td>{tx.quantity}</td>
                      <td>{formatDate(tx.due_date)}</td>
                      <td>{formatDate(tx.returned_at)}</td>
                      <td>{formatDate(tx.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

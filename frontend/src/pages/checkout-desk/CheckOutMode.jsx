import { useState, useEffect, useRef } from "react";
import { getErrorMessage } from "../../api/client";
import { itemsApi } from "../../api/items";
import { usersApi } from "../../api/users";

const emptyForm = { user_id: "", due_date: "", notes: "" };

function badgeLabel(value) {
  return String(value || "").replace(/_/g, " ");
}

function pluralize(count, word) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function disabledReason(item, cartItemIds) {
  if (cartItemIds.has(item.id)) return "Already added";
  if (item.available_quantity <= 0) return "Unavailable";
  return null;
}

export default function CheckOutMode() {
  const [cart, setCart] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [receipt, setReceipt] = useState(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const searchTimerRef = useRef(null);

  useEffect(() => {
    usersApi.list().then(setUsers).catch((err) => setError(getErrorMessage(err)));
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setShowDropdown(false);
      return undefined;
    }
    let active = true;
    searchTimerRef.current = setTimeout(async () => {
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

  function addToCart(item) {
    setCart((prev) => [...prev, { item, quantity: 1 }]);
    setQuery("");
    setResults([]);
    setShowDropdown(false);
  }

  function removeFromCart(itemId) {
    setCart((prev) => prev.filter(({ item }) => item.id !== itemId));
  }

  function updateQuantity(itemId, rawValue) {
    const quantity = Math.max(1, parseInt(rawValue, 10) || 1);
    setCart((prev) =>
      prev.map((entry) =>
        entry.item.id === itemId ? { ...entry, quantity } : entry
      )
    );
  }

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        items: cart.map(({ item, quantity }) => ({ item_id: item.id, quantity: Number(quantity) })),
        user_id: Number(form.user_id),
        notes: form.notes || null,
        due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
      };
      const result = await itemsApi.cartCheckout(payload);
      setReceipt({ ...result, cartItems: cart });
      setCart([]);
      setForm(emptyForm);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  function startNewCart() {
    setReceipt(null);
    setError(null);
  }

  const cartItemIds = new Set(cart.map(({ item }) => item.id));

  if (receipt) {
    return (
      <div className="panel">
        <div className="panel-head" style={{ background: "var(--color-primary-light)", borderColor: "var(--color-primary-border)" }}>
          <h3 style={{ color: "var(--color-primary)" }}>Checked out successfully</h3>
        </div>
        <div className="panel-body">
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "13px", marginBottom: "12px" }}>
            Session ID: {receipt.session_id}
          </p>
          <ul>
            {receipt.cartItems.map(({ item, quantity }) => (
              <li key={item.id}>
                <span className="asset-code">{item.asset_code}</span>
                {" "}
                {item.name}{quantity > 1 ? ` × ${quantity}` : ""}
              </li>
            ))}
          </ul>
          <button type="button" className="btn btn-primary" onClick={startNewCart}>
            Start New Checkout
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {error && <div className="alert">{error}</div>}

      {/* Search */}
      <div style={{ position: "relative", marginBottom: "20px" }}>
        <div className="panel">
          <div className="panel-body">
            <input
              className="form-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => { if (results.length > 0) setShowDropdown(true); }}
              onKeyDown={(e) => { if (e.key === "Escape") { setQuery(""); setResults([]); setShowDropdown(false); } }}
              placeholder="Search by asset code, name, or serial number"
            />
          </div>
        </div>
        {showDropdown && (
          <div style={{
            position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 20,
            background: "#fff", border: "1px solid var(--color-border-light)", borderRadius: "8px",
            boxShadow: "0 16px 36px rgba(15,23,42,0.12)", overflow: "hidden"
          }}>
            {results.length === 0 ? (
              <div style={{ padding: "14px 16px", color: "var(--color-muted)", fontSize: "13px" }}>No assets found.</div>
            ) : results.map((item) => {
              const label = disabledReason(item, cartItemIds);
              return (
                <div key={item.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  gap: "12px", padding: "12px 16px", borderBottom: "1px solid var(--color-border-light)"
                }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span className="asset-code">{item.asset_code}</span>
                    <span>{item.name}</span>
                    {item.location_name && (
                      <span style={{ color: "var(--color-muted)", fontSize: "12px" }}>— {item.location_name}</span>
                    )}
                    <span className={"badge badge--" + item.status.replace(/_/g, "-")}>
                      {badgeLabel(item.status)}
                    </span>
                  </span>
                  {label ? (
                    <button type="button" className="row-btn" disabled>{label}</button>
                  ) : (
                    <button type="button" className="row-btn row-btn--primary" onClick={() => addToCart(item)}>Add</button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cart */}
      {cart.length > 0 && (
        <div className="panel">
          <div className="panel-head">
            <h3>Cart — {pluralize(cart.length, "item")}</h3>
          </div>
          <div className="panel-body">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Location</th>
                    <th>Qty</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map(({ item, quantity }) => (
                    <tr key={item.id}>
                      <td><span className="asset-code">{item.asset_code}</span></td>
                      <td>{item.name}</td>
                      <td>{item.location_name || "—"}</td>
                      <td>
                        <input type="number" className="form-input" min="1" max={item.available_quantity}
                          value={quantity} onChange={(e) => updateQuantity(item.id, e.target.value)}
                          style={{ width: "70px" }} />
                      </td>
                      <td>
                        <button type="button" className="row-btn" onClick={() => removeFromCart(item.id)}>×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      {cart.length > 0 && (
        <div className="panel">
          <div className="panel-head">
            <h3>Checkout Details</h3>
          </div>
          <div className="panel-body">
            <form onSubmit={handleSubmit}>
              <div className="form-card">
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">User *</label>
                    <select className="form-select" value={form.user_id} onChange={(e) => updateForm("user_id", e.target.value)} required>
                      <option value="" disabled>Select user</option>
                      {users.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Expected Return Date</label>
                    <input className="form-input" type="datetime-local" value={form.due_date} onChange={(e) => updateForm("due_date", e.target.value)} />
                  </div>
                  <div className="form-group wide">
                    <label className="form-label">Notes</label>
                    <textarea className="form-textarea" value={form.notes} onChange={(e) => updateForm("notes", e.target.value)} rows="3" />
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
                  <button type="submit" className="btn btn-primary" disabled={submitting || !form.user_id || cart.length === 0}>
                    {submitting ? "Saving…" : `Check Out ${pluralize(cart.length, "Item")}`}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

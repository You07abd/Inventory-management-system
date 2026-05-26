import { useState, useEffect, useRef } from "react";
import { getErrorMessage } from "../api/client";
import { itemsApi } from "../api/items";
import { usersApi } from "../api/users";

const emptyForm = { user_id: "", due_date: "", notes: "", destination: "" };

function statusBadgeStyle(status) {
  const styles = {
    available: { background: "#d1fae5", color: "#065f46" },
    partially_available: { background: "#fef3c7", color: "#92400e" },
    checked_out: { background: "#fee2e2", color: "#991b1b" },
  };
  return styles[status] || { background: "#f3f4f6", color: "#374151" };
}

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

export default function CartCheckout() {
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
    async function loadUsers() {
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
        destination: form.destination || null,
        due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
      };
      const result = await itemsApi.cartCheckout(payload);
      // Capture cart snapshot before clearing so the receipt can display item names/codes
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

  return (
    <div className="page">
      <div className="page-header">
        <h1>Cart Checkout</h1>
        <p>Check out multiple items to one person in a single step</p>
      </div>

      <div className="page-content">
        {error && (
          <div style={{ color: "#991b1b", marginBottom: "14px", fontSize: "13px", fontWeight: 600 }}>
            {error}
          </div>
        )}
        {receipt ? (
          <div
            style={{
              background: "#d1fae5",
              color: "#065f46",
              borderRadius: "8px",
              padding: "20px",
              marginBottom: "16px",
            }}
          >
            <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "10px" }}>
              ✓ Checked out successfully
            </div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "13px",
                marginBottom: "14px",
              }}
            >
              Session: {receipt.session_id}
            </div>
            <ul style={{ margin: "0 0 16px", padding: "0 0 0 18px" }}>
              {receipt.cartItems.map(({ item, quantity }) => (
                <li key={item.id} style={{ marginBottom: "4px" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, marginRight: "8px" }}>
                    {item.asset_code}
                  </span>
                  {item.name}
                  {quantity > 1 ? ` × ${quantity}` : ""}
                </li>
              ))}
            </ul>
            <button type="button" className="btn btn-primary" onClick={startNewCart}>
              Start New Cart
            </button>
          </div>
        ) : (
          <>
            {/* Search bar */}
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
                    overflow: "hidden",
                  }}
                >
                  {results.length === 0 ? (
                    <div style={{ padding: "14px 16px", color: "var(--color-muted)", fontSize: "13px" }}>
                      No assets found.
                    </div>
                  ) : (
                    results.map((item) => {
                      const disabledLabel = disabledReason(item, cartItemIds);
                      return (
                        <div
                          key={item.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "12px",
                            padding: "12px 16px",
                            borderBottom: "1px solid var(--color-border-light)",
                          }}
                        >
                          <span>
                            <span
                              style={{
                                fontFamily: "var(--font-mono)",
                                fontWeight: 700,
                                marginRight: "10px",
                              }}
                            >
                              {item.asset_code}
                            </span>
                            <span>{item.name}</span>
                            <span
                              className="badge"
                              style={{ ...statusBadgeStyle(item.status), marginLeft: "10px" }}
                            >
                              {badgeLabel(item.status)}
                            </span>
                          </span>
                          {disabledLabel ? (
                            <button
                              type="button"
                              className="btn btn-secondary"
                              disabled
                              style={{ opacity: 0.5, cursor: "not-allowed", minWidth: "100px" }}
                            >
                              {disabledLabel}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-primary"
                              onClick={() => addToCart(item)}
                              style={{ minWidth: "100px" }}
                            >
                              Add
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Cart table */}
            {cart.length > 0 && (
              <div
                style={{
                  background: "#fff",
                  border: "1px solid var(--color-border-light)",
                  borderRadius: "8px",
                  padding: "20px",
                  marginBottom: "16px",
                }}
              >
                <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "14px" }}>
                  Cart ({pluralize(cart.length, "item")})
                </div>
                <table>
                  <thead>
                    <tr>
                      <th><div style={{ padding: "9px 14px" }}>Asset Code</div></th>
                      <th><div style={{ padding: "9px 14px" }}>Name</div></th>
                      <th><div style={{ padding: "9px 14px" }}>Available</div></th>
                      <th><div style={{ padding: "9px 14px" }}>Qty</div></th>
                      <th><div style={{ padding: "9px 14px" }}>Remove</div></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map(({ item, quantity }) => (
                      <tr key={item.id}>
                        <td>
                          <span
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontWeight: 700,
                              color: "var(--color-primary)",
                            }}
                          >
                            {item.asset_code}
                          </span>
                        </td>
                        <td>{item.name}</td>
                        <td>{item.available_quantity}</td>
                        <td>
                          <input
                            type="number"
                            className="form-input"
                            min="1"
                            max={item.available_quantity}
                            value={quantity}
                            onChange={(event) => updateQuantity(item.id, event.target.value)}
                            style={{ width: "70px", padding: "6px 8px" }}
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => removeFromCart(item.id)}
                            style={{ padding: "4px 10px" }}
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Shared form */}
            {cart.length > 0 && (
              <div
                style={{
                  background: "#fff",
                  border: "1px solid var(--color-border-light)",
                  borderRadius: "8px",
                  padding: "20px",
                  marginBottom: "16px",
                }}
              >
                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label className="form-label">User *</label>
                    <select
                      className="form-select"
                      value={form.user_id}
                      onChange={(event) => updateForm("user_id", event.target.value)}
                      required
                    >
                      <option value="" disabled>Select user</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name} ({user.role})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Due Date</label>
                    <input
                      className="form-input"
                      type="datetime-local"
                      value={form.due_date}
                      onChange={(event) => updateForm("due_date", event.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Notes</label>
                    <textarea
                      className="form-textarea"
                      value={form.notes}
                      onChange={(event) => updateForm("notes", event.target.value)}
                      rows="3"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Destination</label>
                    <input
                      className="form-input"
                      value={form.destination}
                      onChange={(event) => updateForm("destination", event.target.value)}
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submitting || !form.user_id || cart.length === 0}
                  >
                    {submitting ? "Saving…" : `Check Out All (${pluralize(cart.length, "item")})`}
                  </button>
                </form>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

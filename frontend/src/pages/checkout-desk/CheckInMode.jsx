import { useState } from "react";
import { getErrorMessage } from "../../api/client";
import { itemsApi } from "../../api/items";
import { transactionsApi } from "../../api/transactions";

const CONDITIONS = [
  { value: "excellent", label: "Excellent" },
  { value: "good", label: "Good" },
  { value: "needs_inspection", label: "Needs Inspection" },
  { value: "damaged", label: "Damaged" },
];

export default function CheckInMode() {
  const [sessionInput, setSessionInput] = useState("");
  const [lookupError, setLookupError] = useState(null);
  const [looking, setLooking] = useState(false);

  // rows: { txn, item, checked, condition }
  const [rows, setRows] = useState([]);
  const [sessionMeta, setSessionMeta] = useState(null); // { session_id, user_id }

  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [receipt, setReceipt] = useState(null); // { returned, failed }

  async function handleLookup(e) {
    e.preventDefault();
    const sid = sessionInput.trim();
    if (!sid) return;

    setLooking(true);
    setLookupError(null);
    setRows([]);
    setSessionMeta(null);
    setReceipt(null);
    setSubmitError(null);

    try {
      const txns = await transactionsApi.list({ session_id: sid });
      const active = txns.filter((t) => !t.returned_at && t.type === "checkout");

      if (txns.length === 0) {
        setLookupError("Session ID not found.");
        return;
      }
      if (active.length === 0) {
        setLookupError("All items in this session have already been returned.");
        return;
      }

      // Fetch item details in parallel
      const items = await Promise.all(active.map((t) => itemsApi.get(t.item_id)));

      setRows(
        active.map((txn, i) => ({
          txn,
          item: items[i],
          checked: true,
          condition: "good",
        }))
      );
      setSessionMeta({ session_id: sid, user_id: active[0].user_id });
    } catch (err) {
      setLookupError(getErrorMessage(err));
    } finally {
      setLooking(false);
    }
  }

  function toggleRow(itemId) {
    setRows((prev) => prev.map((r) => r.item.id === itemId ? { ...r, checked: !r.checked } : r));
  }

  function setCondition(itemId, value) {
    setRows((prev) => prev.map((r) => r.item.id === itemId ? { ...r, condition: value } : r));
  }

  function selectAll() { setRows((prev) => prev.map((r) => ({ ...r, checked: true }))); }
  function deselectAll() { setRows((prev) => prev.map((r) => ({ ...r, checked: false }))); }

  async function handleSubmit(e) {
    e.preventDefault();
    const selected = rows.filter((r) => r.checked);
    if (selected.length === 0) return;

    setSubmitting(true);
    setSubmitError(null);

    const returned = [];
    const failed = [];

    for (const row of selected) {
      try {
        await itemsApi.checkin(row.item.id, {
          user_id: row.txn.user_id,
          quantity: row.txn.quantity,
          condition_on_return: row.condition,
          notes: notes || null,
        });
        returned.push(row.item);
      } catch (err) {
        failed.push({ item: row.item, error: getErrorMessage(err) });
      }
    }

    // Remove returned items from rows; keep failed ones checked for retry
    setRows((prev) => prev.filter((r) => failed.some((f) => f.item.id === r.item.id)));
    setNotes("");
    setReceipt({ returned, failed });
    setSubmitting(false);
  }

  function resetSession() {
    setSessionInput("");
    setRows([]);
    setSessionMeta(null);
    setReceipt(null);
    setLookupError(null);
    setSubmitError(null);
  }

  const selectedCount = rows.filter((r) => r.checked).length;

  return (
    <>
      {/* Session lookup */}
      <div style={{ background: "#fff", border: "1px solid var(--color-border-light)", borderRadius: "8px", padding: "20px", marginBottom: "16px" }}>
        <form onSubmit={handleLookup} style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label className="form-label">Session ID</label>
            <input
              className="form-input"
              value={sessionInput}
              onChange={(e) => setSessionInput(e.target.value)}
              placeholder="Enter session ID from checkout receipt"
              style={{ fontFamily: "var(--font-mono)" }}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={looking || !sessionInput.trim()}>
            {looking ? "Looking up…" : "Look Up"}
          </button>
          {sessionMeta && (
            <button type="button" className="btn btn-secondary" onClick={resetSession}>Clear</button>
          )}
        </form>
        {lookupError && (
          <div style={{ color: "#991b1b", marginTop: "10px", fontSize: "13px", fontWeight: 600 }}>{lookupError}</div>
        )}
      </div>

      {/* Receipt after submit */}
      {receipt && (
        <div style={{ borderRadius: "8px", marginBottom: "16px", overflow: "hidden" }}>
          {receipt.returned.length > 0 && (
            <div style={{ background: "#d1fae5", color: "#065f46", padding: "16px 20px" }}>
              <div style={{ fontWeight: 700, marginBottom: "8px" }}>
                {receipt.returned.length === 1 ? "1 item returned" : `${receipt.returned.length} items returned`}
              </div>
              <ul style={{ margin: 0, padding: "0 0 0 18px" }}>
                {receipt.returned.map((item) => (
                  <li key={item.id}>
                    <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, marginRight: "8px" }}>{item.asset_code}</span>
                    {item.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {receipt.failed.length > 0 && (
            <div style={{ background: "#fee2e2", color: "#991b1b", padding: "16px 20px" }}>
              <div style={{ fontWeight: 700, marginBottom: "8px" }}>Failed — still checked out:</div>
              <ul style={{ margin: 0, padding: "0 0 0 18px" }}>
                {receipt.failed.map(({ item, error }) => (
                  <li key={item.id}>
                    <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, marginRight: "8px" }}>{item.asset_code}</span>
                    {item.name} — {error}
                  </li>
                ))}
              </ul>
              <div style={{ marginTop: "10px", fontSize: "13px" }}>Failed items remain below — fix and retry.</div>
            </div>
          )}
        </div>
      )}

      {/* Item list */}
      {rows.length > 0 && (
        <div style={{ background: "#fff", border: "1px solid var(--color-border-light)", borderRadius: "8px", padding: "20px", marginBottom: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <div style={{ fontSize: "16px", fontWeight: 700 }}>
              Session items — {rows.length} active
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
              <button type="button" className="btn btn-secondary" style={{ padding: "4px 12px", fontSize: "13px" }} onClick={selectAll}>Select all</button>
              <button type="button" className="btn btn-secondary" style={{ padding: "4px 12px", fontSize: "13px" }} onClick={deselectAll}>Deselect all</button>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th><div style={{ padding: "9px 8px" }}></div></th>
                <th><div style={{ padding: "9px 14px" }}>Code</div></th>
                <th><div style={{ padding: "9px 14px" }}>Name</div></th>
                <th><div style={{ padding: "9px 14px" }}>Qty</div></th>
                <th><div style={{ padding: "9px 14px" }}>Condition</div></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.item.id} style={{ opacity: row.checked ? 1 : 0.45 }}>
                  <td style={{ paddingLeft: "14px" }}>
                    <input type="checkbox" checked={row.checked} onChange={() => toggleRow(row.item.id)} style={{ accentColor: "#059669" }} />
                  </td>
                  <td><span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#059669" }}>{row.item.asset_code}</span></td>
                  <td>{row.item.name}</td>
                  <td>{row.txn.quantity}</td>
                  <td>
                    <select
                      className="form-select"
                      value={row.condition}
                      onChange={(e) => setCondition(row.item.id, e.target.value)}
                      style={{ padding: "5px 8px", fontSize: "13px" }}
                    >
                      {CONDITIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Submit */}
      {rows.length > 0 && (
        <div style={{ background: "#fff", border: "1px solid var(--color-border-light)", borderRadius: "8px", padding: "20px" }}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Notes (optional)</label>
              <textarea className="form-textarea" value={notes} onChange={(e) => setNotes(e.target.value)} rows="2" />
            </div>
            {submitError && (
              <div style={{ color: "#991b1b", marginBottom: "12px", fontSize: "13px", fontWeight: 600 }}>{submitError}</div>
            )}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || selectedCount === 0}
              style={{ background: "#059669", borderColor: "#059669" }}
            >
              {submitting ? "Returning…" : `Return ${selectedCount === 1 ? "1 Item" : `${selectedCount} Items`}`}
            </button>
          </form>
        </div>
      )}
    </>
  );
}

import { useState } from "react";
import { Link } from "react-router-dom";
import { getErrorMessage } from "../api/client";
import { itemsApi } from "../api/items";
import QRCodeDisplay from "../components/QRCodeDisplay.jsx";

function conditionBadgeClass(condition) {
  const map = { excellent: "badge--excellent", good: "badge--good", fair: "badge--fair", poor: "badge--poor" };
  return map[condition] || "badge--good";
}

export default function QRLookup() {
  const [assetCode, setAssetCode] = useState("");
  const [item, setItem] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setItem(null);
    try {
      const result = await itemsApi.getByAssetCode(assetCode.trim());
      setItem(result);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  const isAvailable = item && item.available_quantity >= item.quantity;

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <span className="topbar-breadcrumb">Tools</span>
          <span className="topbar-title">QR Lookup</span>
        </div>
      </div>

      <div className="page-content">
        <div className="page-stack">
          <div className="panel">
            <div className="panel-head"><h3>Find Asset by Code</h3></div>
            <div className="panel-body">
              <form className="lookup-form" onSubmit={submit}>
                <input
                  className="form-input"
                  value={assetCode}
                  onChange={(e) => setAssetCode(e.target.value)}
                  placeholder="SAFCSP-DRONE-0001"
                  autoFocus
                  required
                />
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? "Searching…" : "Lookup"}
                </button>
              </form>
            </div>
          </div>

          {error && <div className="alert">{error}</div>}

          {item && (
            <div className="panel">
              <div className="panel-head">
                <h3>{item.name}</h3>
                <span className={`badge ${isAvailable ? "badge--available" : "badge--checked-out"}`}>
                  {isAvailable ? "Available" : "Checked Out"}
                </span>
              </div>
              <div className="panel-body">
                <div style={{ display: "flex", gap: "24px", alignItems: "flex-start" }}>
                  <QRCodeDisplay item={item} />
                  <div className="detail-grid" style={{ flex: 1 }}>
                    <div className="detail-field">
                      <div className="detail-field-label">Asset Code</div>
                      <div className="detail-field-value" style={{ fontFamily: "var(--font-mono)", color: "var(--color-primary)", fontWeight: 600 }}>{item.asset_code}</div>
                    </div>
                    <div className="detail-field">
                      <div className="detail-field-label">Serial Number</div>
                      <div className="detail-field-value">{item.serial_number || "—"}</div>
                    </div>
                    <div className="detail-field">
                      <div className="detail-field-label">Condition</div>
                      <div className="detail-field-value">
                        <span className={`badge ${conditionBadgeClass(item.condition)}`}>{item.condition}</span>
                      </div>
                    </div>
                    <div className="detail-field">
                      <div className="detail-field-label">Availability</div>
                      <div className="detail-field-value">{item.available_quantity} / {item.quantity} units</div>
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: "14px" }}>
                  <Link className="btn btn-primary" to={`/items/${item.id}`}>Open Item</Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

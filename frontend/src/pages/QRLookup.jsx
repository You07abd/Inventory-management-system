import { useState } from "react";
import { Link } from "react-router-dom";

import { getErrorMessage } from "../api/client";
import { itemsApi } from "../api/items";
import QRCodeDisplay from "../components/QRCodeDisplay.jsx";

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

  return (
    <section className="page-stack narrow">
      <div className="page-header">
        <div>
          <span className="label">QR Lookup</span>
          <h1>Find Asset by Code</h1>
        </div>
      </div>
      <form className="lookup-form" onSubmit={submit}>
        <input
          value={assetCode}
          onChange={(event) => setAssetCode(event.target.value)}
          placeholder="SAFCSP-DRONE-0001"
          autoFocus
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? "Searching" : "Lookup"}
        </button>
      </form>
      {error && <div className="alert">{error}</div>}
      {item && (
        <section className="panel result-panel">
          <div className="panel-header">
            <div>
              <h2>{item.name}</h2>
              <span>{item.serial_number || "No serial number"}</span>
            </div>
            <span className={`status ${item.status}`}>{item.status.replaceAll("_", " ")}</span>
          </div>
          <QRCodeDisplay item={item} />
          <dl className="detail-list compact">
            <div>
              <dt>Available</dt>
              <dd>
                {item.available_quantity} / {item.quantity}
              </dd>
            </div>
            <div>
              <dt>Condition</dt>
              <dd>{item.condition}</dd>
            </div>
          </dl>
          <Link className="button-link" to={`/items/${item.id}`}>
            Open Item
          </Link>
        </section>
      )}
    </section>
  );
}

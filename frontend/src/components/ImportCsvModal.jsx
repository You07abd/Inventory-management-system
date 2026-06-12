import { useState } from "react";
import { getErrorMessage } from "../api/client";
import { itemsApi } from "../api/items";

const TEMPLATE_COLUMNS = [
  "name", "asset_code", "description", "serial_number", "barcode",
  "quantity", "condition", "category", "location",
  "min_quantity", "unit_cost", "supplier",
];

function downloadTemplate() {
  const blob = new Blob([TEMPLATE_COLUMNS.join(",") + "\n"], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "items-import-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function downloadErrorReport(errors) {
  const lines = ["row,message", ...errors.map((e) => `${e.row},"${String(e.message).replace(/"/g, '""')}"`)];
  const blob = new Blob([lines.join("\n") + "\n"], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "import-errors.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function ImportCsvModal({ onClose, onImported }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    if (!file) return;
    setUploading(true);
    setError("");
    setResult(null);
    try {
      const data = await itemsApi.importCsv(file);
      setResult(data);
      if ((data.created ?? 0) + (data.updated ?? 0) > 0) onImported?.();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <form className="modal" onSubmit={submit}>
        <div className="modal-header">
          <div>
            <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "3px" }}>Bulk Import</div>
            <h2>Import Items from CSV</h2>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        {!result && (
          <>
            <p style={{ color: "var(--color-muted)", fontSize: "12px", margin: "0 0 12px", lineHeight: 1.5 }}>
              Upload a UTF-8 CSV with a header row. Only <strong>name</strong> is required —
              rows with a matching <span style={{ fontFamily: "var(--font-mono)" }}>asset_code</span> update
              the existing item, others create new items. Unknown categories and locations are created automatically.
              {" "}
              <button
                type="button"
                onClick={downloadTemplate}
                style={{ background: "none", border: "none", padding: 0, color: "var(--color-primary)", cursor: "pointer", fontSize: "12px" }}
              >
                Download template
              </button>
            </p>

            <div className="form-group">
              <label className="form-label">CSV File</label>
              <input
                className="form-input"
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                required
              />
            </div>

            {error && <div className="alert">{error}</div>}

            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={!file || uploading}>
                {uploading ? "Importing…" : "Import"}
              </button>
            </div>
          </>
        )}

        {result && (
          <>
            <div style={{ display: "flex", gap: "10px", margin: "4px 0 12px" }}>
              <span className="badge badge--available">{result.created ?? 0} created</span>
              <span className="badge badge--partial">{result.updated ?? 0} updated</span>
              <span className={`badge ${result.errors?.length ? "badge--checked-out" : "badge--not-in-lab"}`}>
                {result.errors?.length ?? 0} errors
              </span>
            </div>

            {result.errors?.length > 0 && (
              <div style={{ maxHeight: "180px", overflowY: "auto", border: "1px solid var(--color-border)", borderRadius: "var(--radius)", padding: "8px 10px", marginBottom: "12px" }}>
                {result.errors.map((e, i) => (
                  <div key={i} style={{ fontSize: "12px", color: "#991b1b", padding: "3px 0", borderBottom: i < result.errors.length - 1 ? "1px solid var(--color-border-light)" : "none" }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>Row {e.row}:</span> {e.message}
                  </div>
                ))}
              </div>
            )}

            <div className="modal-actions">
              {result.errors?.length > 0 && (
                <button type="button" className="btn btn-secondary" onClick={() => downloadErrorReport(result.errors)}>
                  Download Error Report
                </button>
              )}
              <button type="button" className="btn btn-primary" onClick={onClose}>Done</button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}

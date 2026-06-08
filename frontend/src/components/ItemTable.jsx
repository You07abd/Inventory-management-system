import { useState } from "react";
import { Link } from "react-router-dom";

function nameById(collection, id, fallback = "—") {
  if (id == null) return fallback;
  return collection.find((e) => e.id === id)?.name || fallback;
}

function getItemStatus(item) {
  if (item.quantity === 0) return { key: "not-in-lab", label: "Not in Lab" };
  if (item.available_quantity === 0) return { key: "out", label: "Checked Out" };
  if (item.available_quantity > 0 && item.available_quantity < item.quantity) return { key: "partial", label: "Partial" };
  return { key: "available", label: "Available" };
}

const COLUMNS = [
  { key: "asset_code", label: "Asset" },
  { key: "name", label: "Name" },
  { key: "category", label: "Category" },
  { key: "location", label: "Location" },
  { key: "available", label: "Available" },
  { key: "condition", label: "Condition" },
  { key: "status", label: "Status" },
];

function SortIcon({ direction }) {
  if (direction === "asc") return (
    <svg className="sort-icon active" viewBox="0 0 10 12" fill="currentColor"><path d="M5 1l4 5H1z"/></svg>
  );
  if (direction === "desc") return (
    <svg className="sort-icon active" viewBox="0 0 10 12" fill="currentColor"><path d="M5 11L1 6h8z"/></svg>
  );
  return (
    <svg className="sort-icon" viewBox="0 0 10 14" fill="currentColor"><path d="M5 1l4 5H1zM5 13L1 8h8z"/></svg>
  );
}

export default function ItemTable({ items, categories = [], locations = [], onCheckout, onCheckin }) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("none");

  function handleSort(key) {
    if (sortKey !== key) { setSortKey(key); setSortDir("asc"); return; }
    if (sortDir === "asc") { setSortDir("desc"); return; }
    setSortDir("none"); setSortKey(null);
  }

  function getValue(item, key) {
    if (key === "category") return nameById(categories, item.category_id, "Uncategorized");
    if (key === "location") return nameById(locations, item.location_id);
    if (key === "available") return item.available_quantity;
    if (key === "status") return getItemStatus(item).label;
    return item[key] ?? "";
  }

  const sorted = [...items].sort((a, b) => {
    if (!sortKey || sortDir === "none") return 0;
    const av = getValue(a, sortKey), bv = getValue(b, sortKey);
    const cmp = typeof av === "number" ? av - bv : String(av).localeCompare(String(bv));
    return sortDir === "asc" ? cmp : -cmp;
  });

  if (items.length === 0) {
    return <div className="empty-state">No items match the current filters.</div>;
  }

  return (
    <table className="inv-table">
      <thead>
        <tr>
          <th style={{ width: "4px", padding: 0 }} />
          {COLUMNS.map((col) => (
            <th key={col.key}>
              <button className="sort-btn" onClick={() => handleSort(col.key)}>
                {col.label}
                <SortIcon direction={sortKey === col.key ? sortDir : "none"} />
              </button>
            </th>
          ))}
          <th><div style={{ padding: "9px 14px" }}>Actions</div></th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((item) => {
          const checkedOut = item.quantity - item.available_quantity;
          const status = getItemStatus(item);
          return (
            <tr key={item.id} data-status={status.key} style={{ opacity: item.quantity === 0 ? 0.5 : 1 }}>
              <td className="inv-table__accent" />
              <td>
                <Link className="asset-code" to={`/items/${item.id}`}>{item.asset_code}</Link>
              </td>
              <td>
                <div className="item-name">{item.name}</div>
                {item.serial_number && <div className="item-sub">SN: {item.serial_number}</div>}
              </td>
              <td>{nameById(categories, item.category_id, "Uncategorized")}</td>
              <td>{nameById(locations, item.location_id)}</td>
              <td style={{ fontVariantNumeric: "tabular-nums" }}>
                {item.available_quantity} / {item.quantity}
              </td>
              <td>
                {item.condition !== "good" && (
                  <span style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "2px 8px",
                    borderRadius: "999px",
                    fontSize: "11px",
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    background: item.condition === "damaged" ? "#fee2e2" : "#fef3c7",
                    color: item.condition === "damaged" ? "#b91c1c" : "#92400e",
                    border: `1px solid ${item.condition === "damaged" ? "#fca5a5" : "#fcd34d"}`,
                  }}>
                    ⚠ {item.condition === "damaged" ? "Damaged" : "Needs Repair"}
                  </span>
                )}
              </td>
              <td>
                <span className={`inv-table__status inv-table__status--${status.key}`}>
                  <span className="inv-table__dot" />
                  {status.label}
                </span>
              </td>
              <td>
                <div className="row-actions">
                  <button
                    className="row-btn row-btn--primary"
                    onClick={() => onCheckout(item)}
                    disabled={item.available_quantity < 1}
                  >Out</button>
                  <button
                    className="row-btn"
                    onClick={() => onCheckin(item)}
                    disabled={checkedOut < 1}
                  >In</button>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

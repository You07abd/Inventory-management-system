import { useState } from "react";
import { Link } from "react-router-dom";

function nameById(collection, id) {
  return collection.find((entry) => entry.id === id)?.name || "Unassigned";
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
    <svg className="sort-icon active" viewBox="0 0 10 12" fill="currentColor">
      <path d="M5 1l4 5H1z"/>
    </svg>
  );
  if (direction === "desc") return (
    <svg className="sort-icon active" viewBox="0 0 10 12" fill="currentColor">
      <path d="M5 11L1 6h8z"/>
    </svg>
  );
  return (
    <svg className="sort-icon" viewBox="0 0 10 14" fill="currentColor">
      <path d="M5 1l4 5H1zM5 13L1 8h8z"/>
    </svg>
  );
}

export default function ItemTable({ items, categories = [], locations = [], onCheckout, onCheckin }) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("none");

  function handleSort(key) {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("asc");
    } else {
      setSortDir((prev) => (prev === "asc" ? "desc" : prev === "desc" ? "none" : "asc"));
      if (sortDir === "desc") setSortKey(null);
    }
  }

  function getValue(item, key) {
    if (key === "category") return nameById(categories, item.category_id);
    if (key === "location") return nameById(locations, item.location_id);
    if (key === "available") return item.available_quantity;
    if (key === "status") return item.available_quantity < item.quantity ? "checked out" : "available";
    return item[key] ?? "";
  }

  const sorted = [...items].sort((a, b) => {
    if (!sortKey || sortDir === "none") return 0;
    const av = getValue(a, sortKey);
    const bv = getValue(b, sortKey);
    const cmp = typeof av === "number" ? av - bv : String(av).localeCompare(String(bv));
    return sortDir === "asc" ? cmp : -cmp;
  });

  if (items.length === 0) {
    return <div className="empty-state">No inventory items match the current view.</div>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {COLUMNS.map((col) => (
              <th key={col.key}>
                <button className="sort-btn" onClick={() => handleSort(col.key)}>
                  {col.label}
                  <SortIcon direction={sortKey === col.key ? sortDir : "none"} />
                </button>
              </th>
            ))}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((item) => {
            const checkedOut = item.quantity - item.available_quantity;
            const availabilityStatus = checkedOut > 0 ? "checked_out" : "available";
            return (
              <tr key={item.id}>
                <td>
                  <Link className="asset-link" to={`/items/${item.id}`}>
                    {item.asset_code}
                  </Link>
                </td>
                <td>{item.name}</td>
                <td>{nameById(categories, item.category_id)}</td>
                <td>{nameById(locations, item.location_id)}</td>
                <td>
                  {item.available_quantity} / {item.quantity}
                </td>
                <td>{item.condition}</td>
                <td>
                  <span className={`status ${availabilityStatus}`}>{availabilityStatus.replaceAll("_", " ")}</span>
                </td>
                <td>
                  <div className="row-actions">
                    <button type="button" onClick={() => onCheckout(item)} disabled={item.available_quantity < 1}>
                      Check out
                    </button>
                    <button type="button" className="secondary" onClick={() => onCheckin(item)} disabled={checkedOut < 1}>
                      Check in
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

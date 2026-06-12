// Shared stock/value helpers. `low_stock` comes from the API, but compute a
// fallback locally so the UI stays correct if the field is missing.
export function isLowStock(item) {
  if (typeof item.low_stock === "boolean") return item.low_stock;
  return item.min_quantity != null && item.available_quantity <= item.min_quantity;
}

const moneyFormat = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function formatMoney(value) {
  const n = Number(value);
  if (value == null || Number.isNaN(n)) return "—";
  return moneyFormat.format(n);
}

export function inventoryValue(items) {
  return items.reduce((sum, i) => sum + (i.unit_cost != null ? Number(i.unit_cost) * i.quantity : 0), 0);
}

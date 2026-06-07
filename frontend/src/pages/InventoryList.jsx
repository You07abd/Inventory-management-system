import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { categoriesApi } from "../api/categories";
import { getErrorMessage } from "../api/client";
import { itemsApi } from "../api/items";
import { locationsApi } from "../api/locations";
import { usersApi } from "../api/users";
import CheckinModal from "../components/CheckinModal.jsx";
import CheckoutModal from "../components/CheckoutModal.jsx";
import ItemTable from "../components/ItemTable.jsx";
import { useAuth } from "../context/AuthContext";
import { getCategoryMeta, UNCATEGORIZED_CATEGORY } from "../utils/categoryMeta.jsx";
import { barcodeApi } from "../api/barcode";
import BarcodeScanner from "../components/BarcodeScanner.jsx";

const emptyItemForm = {
  name: "",
  description: "",
  serial_number: "",
  barcode: "",
  quantity: 1,
  condition: "good",
  category_id: "",
  location_id: "",
  track_units: true,
};

export default function InventoryList({ initialMode = "browse" }) {
  const navigate = useNavigate();
  const { role } = useAuth();
  const isStudent = role === "student";

  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState("");
  const [conditionFilter, setConditionFilter] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingItem, setSavingItem] = useState(false);
  const [checkoutItem, setCheckoutItem] = useState(null);
  const [checkinItem, setCheckinItem] = useState(null);
  const [viewMode, setViewMode] = useState("list"); // 'grid' | 'list'
  const [pageMode, setPageMode] = useState(initialMode === "create" ? "create" : "browse");
  const [itemForm, setItemForm] = useState(emptyItemForm);
  const [trackingOverridden, setTrackingOverridden] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState(null);
  const [locationFilter, setLocationFilter] = useState(null);
  const [statusFilter,   setStatusFilter]   = useState("");
  const [scannerMode, setScannerMode] = useState(null); // 'prefill' | 'serial' | null
  const [scanStatus, setScanStatus] = useState(null);   // { found: bool, message: string } | null
  const [scanLoading, setScanLoading] = useState(false);
  const [barcodeExistingCount, setBarcodeExistingCount] = useState(0);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [itemData, categoryData, locationData, userData] = await Promise.all([
        itemsApi.list(), categoriesApi.list(), locationsApi.list(), usersApi.list(),
      ]);
      setItems(itemData);
      setCategories(categoryData);
      setLocations(locationData);
      setUsers(userData);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    (async () => {
      try {
        const [itemData, categoryData, locationData, userData] = await Promise.all([
          itemsApi.list(), categoriesApi.list(), locationsApi.list(), usersApi.list(),
        ]);
        if (!active) return;
        setItems(itemData);
        setCategories(categoryData);
        setLocations(locationData);
        setUsers(userData);
      } catch (err) {
        if (active) setError(getErrorMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    setPageMode(initialMode === "create" ? "create" : "browse");
  }, [initialMode]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (conditionFilter && item.condition !== conditionFilter) return false;
      if (categoryFilter === "uncategorized" && item.category_id != null) return false;
      if (categoryFilter !== null && categoryFilter !== "uncategorized" && item.category_id !== categoryFilter) return false;
      if (locationFilter !== null && item.location_id !== locationFilter) return false;
      if (statusFilter === "available" && item.available_quantity !== item.quantity) return false;
      if (statusFilter === "partial" && !(item.available_quantity > 0 && item.available_quantity < item.quantity)) return false;
      if (statusFilter === "out" && item.available_quantity !== 0) return false;
      if (!q) return true;
      return [item.asset_code, item.name, item.serial_number, item.condition]
        .filter(Boolean).some((v) => v.toLowerCase().includes(q));
    });
  }, [items, query, conditionFilter, categoryFilter, locationFilter, statusFilter]);

  const statTotalModels = items.length;
  const statTotalUnits  = items.reduce((s, i) => s + i.quantity, 0);
  const statAvailable   = items.reduce((s, i) => s + i.available_quantity, 0);
  const statCheckedOut  = statTotalUnits - statAvailable;
  const uncategorizedCount = items.filter((item) => item.category_id == null).length;
  const uncategorizedMeta = getCategoryMeta(UNCATEGORIZED_CATEGORY);

  async function checkout(payload) {
    try {
      await itemsApi.checkout(checkoutItem.id, payload);
      setCheckoutItem(null);
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function checkin(payload) {
    try {
      await itemsApi.checkin(checkinItem.id, payload);
      setCheckinItem(null);
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  function updateItemForm(field, value) {
    setItemForm((current) => ({ ...current, [field]: value }));
  }

  function openCreateItem() {
    setItemForm(emptyItemForm);
    setTrackingOverridden(false);
    setScanStatus(null);
    setBarcodeExistingCount(0);
    setError("");
    setNotice("");
    setPageMode("create");
  }

  function closeCreateItem() {
    setItemForm(emptyItemForm);
    setTrackingOverridden(false);
    setScanStatus(null);
    setBarcodeExistingCount(0);
    setPageMode("browse");
    navigate("/inventory", { replace: true });
  }

  async function handleScan(result) {
    setScannerMode(null);

    if (scannerMode === "serial") {
      updateItemForm("serial_number", result.serial || result.raw);
      return;
    }

    // prefill mode
    setScanLoading(true);
    setScanStatus(null);
    try {
      const barcodeValue = result.gtin || result.raw;
      updateItemForm("barcode", barcodeValue);
      if (result.serial) updateItemForm("serial_number", result.serial);

      const [existing, lookupData] = await Promise.all([
        itemsApi.list({ barcode: barcodeValue }),
        result.gtin
          ? barcodeApi.lookup(result.gtin)
          : Promise.resolve({ name: null, brand: null, description: null }),
      ]);

      setBarcodeExistingCount(existing.length);

      if (lookupData.name) {
        updateItemForm("name", lookupData.name);
        if (lookupData.description) updateItemForm("description", lookupData.description);
        setScanStatus({ found: true, message: `${lookupData.name} found — fields prefilled` });
      } else {
        setScanStatus({ found: false, message: "Product not found in database — fill in manually" });
      }
    } catch {
      setScanStatus({ found: false, message: "Lookup failed — fill in manually" });
    } finally {
      setScanLoading(false);
    }
  }

  async function createItem(event) {
    event.preventDefault();
    setSavingItem(true);
    setError("");
    setNotice("");
    try {
      await itemsApi.create({
        name: itemForm.name,
        description: itemForm.description || null,
        serial_number: itemForm.track_units ? (itemForm.serial_number || null) : null,
        barcode: itemForm.barcode || null,
        quantity: Number(itemForm.quantity),
        condition: itemForm.condition,
        category_id: itemForm.category_id ? Number(itemForm.category_id) : null,
        location_id: itemForm.location_id ? Number(itemForm.location_id) : null,
        track_units: itemForm.track_units,
      });
      setItemForm(emptyItemForm);
      setPageMode("browse");
      setNotice("Item created.");
      navigate("/inventory", { replace: true });
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSavingItem(false);
    }
  }

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <span className="topbar-breadcrumb">Inventory</span>
          <span className="topbar-title">{pageMode === "create" ? "Add Item" : "Inventory"}</span>
        </div>
        <div className="topbar-actions">
          {pageMode === "create" ? (
            <button type="button" className="btn btn-secondary" onClick={closeCreateItem}>Back to Inventory</button>
          ) : (
            <>
              {!isStudent && <button type="button" className="btn btn-primary" onClick={openCreateItem}>Add Item</button>}
              <button type="button" className={`btn ${viewMode === "list" ? "btn-primary" : "btn-secondary"}`} onClick={() => setViewMode("list")}>List</button>
              <button type="button" className={`btn ${viewMode === "grid" ? "btn-primary" : "btn-secondary"}`} onClick={() => setViewMode("grid")}>Grid</button>
            </>
          )}
        </div>
      </div>

      <div className="page-content">
        <div className="page-stack">
          {isStudent && (
            <div className="info-banner">
              You have student access — check in and check out only. Contact a lab engineer for other requests.
            </div>
          )}
          {error && <div className="alert">{error}</div>}
          {notice && <div className="notice">{notice}</div>}

          {pageMode === "create" && !isStudent ? (
            <form className="form-card" onSubmit={createItem}>
              {/* Scan to prefill */}
              <div style={{ marginBottom: "16px" }}>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setScannerMode("prefill")}
                    disabled={scanLoading}
                  >
                    {scanLoading ? "Looking up…" : "Scan Barcode to Prefill"}
                  </button>
                  {itemForm.barcode && (
                    <span style={{ fontSize: "12px", color: "var(--color-muted)", fontFamily: "monospace" }}>
                      {itemForm.barcode}
                      <button
                        type="button"
                        onClick={() => { updateItemForm("barcode", ""); setScanStatus(null); setBarcodeExistingCount(0); }}
                        style={{ marginLeft: "6px", background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)" }}
                        aria-label="Clear barcode"
                      >
                        ×
                      </button>
                    </span>
                  )}
                </div>
                {scanStatus && (
                  <p style={{ marginTop: "6px", fontSize: "12px", color: scanStatus.found ? "var(--color-primary)" : "var(--color-muted)" }}>
                    {scanStatus.message}
                  </p>
                )}
                {barcodeExistingCount > 0 && (
                  <p style={{ marginTop: "4px", fontSize: "12px", color: "var(--color-muted)" }}>
                    {barcodeExistingCount} item{barcodeExistingCount !== 1 ? "s" : ""} with this product already in inventory
                  </p>
                )}
              </div>
              <div className="form-grid">
                <div className="form-group wide">
                  <label className="form-label">Tracking Mode</label>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <button
                      type="button"
                      className={`btn ${itemForm.track_units ? "btn-primary" : "btn-secondary"}`}
                      onClick={() => { updateItemForm("track_units", true); setTrackingOverridden(true); }}
                    >
                      Unit Tracked
                    </button>
                    <button
                      type="button"
                      className={`btn ${!itemForm.track_units ? "btn-primary" : "btn-secondary"}`}
                      onClick={() => { updateItemForm("track_units", false); setTrackingOverridden(true); }}
                    >
                      Bulk / Pool
                    </button>
                    {itemForm.category_id && !trackingOverridden && (
                      <span style={{ fontSize: "12px", color: "var(--color-muted)" }}>
                        inherited from category
                      </span>
                    )}
                  </div>
                </div>
                <div className="form-group wide">
                  <label className="form-label">Name</label>
                  <input className="form-input" value={itemForm.name} onChange={(e) => updateItemForm("name", e.target.value)} required />
                </div>
                <div className="form-group wide">
                  <label className="form-label">Description</label>
                  <textarea className="form-textarea" value={itemForm.description} onChange={(e) => updateItemForm("description", e.target.value)} rows="3" />
                </div>
                {itemForm.track_units && (
                  <div className="form-group">
                    <label className="form-label">Serial Number</label>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <input
                        className="form-input"
                        value={itemForm.serial_number}
                        onChange={(e) => updateItemForm("serial_number", e.target.value)}
                        style={{ flex: 1 }}
                      />
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setScannerMode("serial")}
                        title="Scan serial number barcode"
                        style={{ padding: "0 10px", fontSize: "16px" }}
                      >
                        📷
                      </button>
                    </div>
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Quantity</label>
                  <input className="form-input" type="number" min="1" value={itemForm.quantity} onChange={(e) => updateItemForm("quantity", e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Condition</label>
                  <select className="form-select" value={itemForm.condition} onChange={(e) => updateItemForm("condition", e.target.value)}>
                    <option value="good">Good</option>
                    <option value="needs_repair">Needs Repair</option>
                    <option value="damaged">Damaged</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    className="form-select"
                    value={itemForm.category_id}
                    onChange={(e) => {
                      const catId = e.target.value;
                      updateItemForm("category_id", catId);
                      if (!trackingOverridden) {
                        if (catId) {
                          const cat = categories.find((c) => String(c.id) === catId);
                          if (cat) updateItemForm("track_units", cat.default_tracking !== "bulk");
                        } else {
                          updateItemForm("track_units", true);
                        }
                      }
                    }}
                  >
                    <option value="">Uncategorized</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Location</label>
                  <select className="form-select" value={itemForm.location_id} onChange={(e) => updateItemForm("location_id", e.target.value)}>
                    <option value="">Unassigned</option>
                    {locations.map((location) => (
                      <option key={location.id} value={location.id}>{location.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={closeCreateItem}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={savingItem}>{savingItem ? "Saving..." : "Create Item"}</button>
              </div>
            </form>
          ) : (
          <>
            {/* Stats bar */}
            <div className="metric-grid">
            <div className="metric-card">
              <div className="metric-label">Total Models</div>
              <div className="metric-value metric-value--blue">{statTotalModels}</div>
              <div className="metric-footer">Unique asset types</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Total Units</div>
              <div className="metric-value">{statTotalUnits}</div>
              <div className="metric-footer">Physical items</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Available</div>
              <div className="metric-value metric-value--green">{statAvailable}</div>
              <div className="metric-footer">
                <span className="metric-dot" style={{ background: "#22c55e" }} />
                Ready to check out
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Checked Out</div>
              <div className={`metric-value ${statCheckedOut > 0 ? "metric-value--red" : ""}`}>{statCheckedOut}</div>
              <div className="metric-footer">{statCheckedOut === 0 ? "No active loans" : "Active loans"}</div>
            </div>
          </div>

          {/* Two-column layout */}
          <div className="inv-layout">

            {/* Left filter panel */}
            <aside className="inv-filter-panel">

              {/* Search */}
              <div className="inv-filter-section">
                <input
                  className="table-search"
                  style={{ width: "100%" }}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search asset, name, serial…"
                />
              </div>

              {/* Status */}
              <div className="inv-filter-section">
                <div className="inv-filter-title">Status</div>
                {[
                  { key: "",          label: "All",       count: items.length },
                  { key: "available", label: "Available", count: items.filter(i => i.available_quantity === i.quantity).length },
                  { key: "partial",   label: "Partial",   count: items.filter(i => i.available_quantity > 0 && i.available_quantity < i.quantity).length },
                  { key: "out",       label: "Out",       count: items.filter(i => i.available_quantity === 0).length },
                ].map(({ key, label, count }) => (
                  <button
                    key={key}
                    type="button"
                    className={`inv-filter-btn ${statusFilter === key ? "inv-filter-btn--active" : ""}`}
                    onClick={() => setStatusFilter(key)}
                  >
                    {label}
                    <span className="inv-filter-count">{count}</span>
                  </button>
                ))}
              </div>

              {/* Categories */}
              <div className="inv-filter-section">
                <div className="inv-filter-title">Category</div>
                <button
                  type="button"
                  className={`inv-filter-btn ${categoryFilter === null ? "inv-filter-btn--active" : ""}`}
                  onClick={() => setCategoryFilter(null)}
                >
                  All
                  <span className="inv-filter-count">{items.length}</span>
                </button>
                {uncategorizedCount > 0 && (
                  <button
                    type="button"
                    className={`inv-filter-btn ${categoryFilter === "uncategorized" ? "inv-filter-btn--active" : ""}`}
                    onClick={() => setCategoryFilter(categoryFilter === "uncategorized" ? null : "uncategorized")}
                  >
                    <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: uncategorizedMeta.color, flexShrink: 0 }} />
                    Uncategorized
                    <span className="inv-filter-count">{uncategorizedCount}</span>
                  </button>
                )}
                {categories.map((cat) => {
                  const meta = getCategoryMeta(cat);
                  const count = items.filter(i => i.category_id === cat.id).length;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      className={`inv-filter-btn ${categoryFilter === cat.id ? "inv-filter-btn--active" : ""}`}
                      onClick={() => setCategoryFilter(categoryFilter === cat.id ? null : cat.id)}
                    >
                      <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: meta.color, flexShrink: 0 }} />
                      {cat.name}
                      <span className="inv-filter-count">{count}</span>
                    </button>
                  );
                })}
              </div>

              {/* Locations */}
              <div className="inv-filter-section">
                <div className="inv-filter-title">Location</div>
                <button
                  type="button"
                  className={`inv-filter-btn ${locationFilter === null ? "inv-filter-btn--active" : ""}`}
                  onClick={() => setLocationFilter(null)}
                >
                  All
                  <span className="inv-filter-count">{items.length}</span>
                </button>
                {locations.map((loc) => {
                  const count = items.filter(i => i.location_id === loc.id).length;
                  return (
                    <button
                      key={loc.id}
                      type="button"
                      className={`inv-filter-btn ${locationFilter === loc.id ? "inv-filter-btn--active" : ""}`}
                      onClick={() => setLocationFilter(locationFilter === loc.id ? null : loc.id)}
                    >
                      {loc.name}
                      <span className="inv-filter-count">{count}</span>
                    </button>
                  );
                })}
              </div>

              {/* Condition */}
              <div className="inv-filter-section">
                <div className="inv-filter-title">Condition</div>
                <select
                  className="table-filter"
                  style={{ width: "100%" }}
                  value={conditionFilter}
                  onChange={(e) => setConditionFilter(e.target.value)}
                >
                  <option value="">All conditions</option>
                  <option value="good">Good</option>
                  <option value="needs_repair">Needs Repair</option>
                  <option value="damaged">Damaged</option>
                </select>
              </div>

              {/* Quick actions — non-students only */}
              {!isStudent && (
                <div className="inv-filter-section">
                  <button type="button" className="btn btn-primary" onClick={openCreateItem} style={{ width: "100%", marginBottom: "6px", display: "block", textAlign: "center" }}>
                    + Add Item
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => navigate("/categories/new")} style={{ width: "100%", display: "block", textAlign: "center" }}>
                    + Add Category
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => navigate("/categories")} style={{ width: "100%", display: "block", textAlign: "center", marginTop: "6px" }}>
                    Manage Categories
                  </button>
                </div>
              )}

            </aside>

            {/* Right content */}
            <main>
              {loading ? (
                <div className="loading">Loading inventory…</div>
              ) : viewMode === "list" ? (
                <div className="table-wrap">
                  <div className="table-toolbar">
                    <span style={{ fontSize: 12, color: "var(--color-muted)", fontWeight: 500 }}>
                      {filteredItems.length} item{filteredItems.length !== 1 ? "s" : ""}
                      {filteredItems.length !== items.length ? ` of ${items.length}` : ""}
                    </span>
                  </div>
                  <ItemTable
                    items={filteredItems}
                    categories={categories}
                    locations={locations}
                    onCheckout={setCheckoutItem}
                    onCheckin={setCheckinItem}
                  />
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="empty-state">No items match your filters.</div>
              ) : (
                <div className="inv-grid">
                  {filteredItems.map((item) => {
                    const categoryName = item.category_id == null ? "Uncategorized" : categories.find((c) => c.id === item.category_id)?.name ?? "—";
                    const canCheckout = item.available_quantity > 0 && item.condition === "good";
                    const canCheckin = item.available_quantity < item.quantity;
                    const fullyOut = item.available_quantity === 0;
                    const partial = !fullyOut && item.available_quantity < item.quantity;
                    const statusKey = fullyOut ? "out" : partial ? "partial" : "available";
                    const chipLabel = fullyOut ? "Out" : partial ? "Partial" : "Available";
                    return (
                      <div key={item.id} className="inv-card" onClick={() => navigate(`/items/${item.id}`)}>
                        <div className="inv-card__header">
                          <span className="inv-card__code">{item.asset_code}</span>
                          <span className={`inv-card__chip inv-card__chip--${statusKey}`}>{chipLabel}</span>
                        </div>
                        <div className="inv-card__name">{item.name}</div>
                        <div className="inv-card__meta">
                          <span>{categoryName}</span>
                          <span className="inv-card__sep"> · </span>
                          <span>{item.location_name || "—"}</span>
                        </div>
                        <div className="inv-card__footer">
                          <span className="inv-card__stats">
                            {item.available_quantity}/{item.quantity}
                            <span className="inv-card__sep"> · </span>
                            {item.condition.replace(/_/g, " ")}
                          </span>
                          {!isStudent && (
                            <div className="inv-card__actions">
                              {canCheckout && (
                                <button className="row-btn row-btn--primary" onClick={(e) => { e.stopPropagation(); setCheckoutItem(item); }}>Out</button>
                              )}
                              {canCheckin && (
                                <button className="row-btn" onClick={(e) => { e.stopPropagation(); setCheckinItem(item); }}>In</button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </main>

          </div>
          </>
          )}
        </div>
      </div>

      {checkoutItem && <CheckoutModal item={checkoutItem} users={users} onClose={() => setCheckoutItem(null)} onSubmit={checkout} />}
      {checkinItem && <CheckinModal item={checkinItem} users={users} onClose={() => setCheckinItem(null)} onSubmit={checkin} />}
      {scannerMode && (
        <BarcodeScanner
          onScan={handleScan}
          onClose={() => setScannerMode(null)}
        />
      )}
    </>
  );
}

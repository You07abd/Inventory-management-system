import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { categoriesApi } from "../api/categories";
import { getErrorMessage } from "../api/client";
import { itemsApi } from "../api/items";
import { getCategoryIconKey, getCategoryMeta, ICON_MAP, isUncategorizedCategory, UNCATEGORIZED_CATEGORY } from "../utils/categoryMeta.jsx";

function buildForm(category) {
  const meta = getCategoryMeta(category);
  return {
    name: category?.name ?? "",
    description: category?.description ?? "",
    icon: getCategoryIconKey(category),
    color: category ? meta.color : "#2563eb",
  };
}

export default function Categories({ initialMode = "manage" }) {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(buildForm());
  const [createForm, setCreateForm] = useState(buildForm());
  const [pageMode, setPageMode] = useState(initialMode === "create" ? "create" : "manage");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [catData, itemData] = await Promise.all([categoriesApi.list(), itemsApi.list()]);
        if (!active) return;
        setCategories(catData);
        setItems(itemData);
        setSelectedId(UNCATEGORIZED_CATEGORY.id);
        setForm(buildForm(UNCATEGORIZED_CATEGORY));
      } catch (err) {
        if (active) setError(getErrorMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    setPageMode(initialMode === "create" ? "create" : "manage");
  }, [initialMode]);

  const itemCounts = useMemo(() => {
    return items.reduce((counts, item) => {
      if (item.category_id != null) counts[item.category_id] = (counts[item.category_id] || 0) + 1;
      return counts;
    }, {});
  }, [items]);

  const uncategorizedItems = useMemo(() => items.filter((item) => item.category_id == null), [items]);
  const categoryRows = useMemo(() => [UNCATEGORIZED_CATEGORY, ...categories], [categories]);
  const selectedCategory = selectedId == null ? UNCATEGORIZED_CATEGORY : categories.find((category) => category.id === selectedId) ?? null;
  const selectedIsUncategorized = isUncategorizedCategory(selectedCategory);
  const selectedItemCount = selectedIsUncategorized
    ? uncategorizedItems.length
    : selectedCategory ? itemCounts[selectedCategory.id] || 0 : 0;

  function selectCategory(category) {
    setSelectedId(category.id);
    if (!isUncategorizedCategory(category)) setForm(buildForm(category));
    setError("");
    setNotice("");
  }

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateCreateForm(field, value) {
    setCreateForm((current) => ({ ...current, [field]: value }));
  }

  function openCreateCategory() {
    setCreateForm(buildForm());
    setError("");
    setNotice("");
    setPageMode("create");
  }

  function closeCreateCategory() {
    setCreateForm(buildForm());
    setPageMode("manage");
    navigate("/categories", { replace: true });
  }

  async function createCategory(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const created = await categoriesApi.create({
        name: createForm.name,
        description: createForm.description || null,
        icon: createForm.icon || null,
        color: createForm.color,
      });
      const nextCategories = [...categories, created].sort((a, b) => a.name.localeCompare(b.name));
      setCategories(nextCategories);
      setSelectedId(created.id);
      setForm(buildForm(created));
      setCreateForm(buildForm());
      setPageMode("manage");
      setNotice("Category created.");
      navigate("/categories", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function submit(event) {
    event.preventDefault();
    if (!selectedCategory) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const updated = await categoriesApi.update(selectedCategory.id, {
        name: form.name,
        description: form.description || null,
        icon: form.icon || null,
        color: form.color,
      });
      setCategories((current) => current.map((category) => category.id === updated.id ? updated : category));
      setForm(buildForm(updated));
      setNotice("Category updated.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function deleteCategory() {
    if (!selectedCategory) return;
    const message = selectedItemCount > 0
      ? `Delete "${selectedCategory.name}"?\n\n${selectedItemCount} item${selectedItemCount === 1 ? "" : "s"} will not be deleted. They will be moved to Uncategorized.`
      : `Delete "${selectedCategory.name}"?`;

    if (!window.confirm(message)) return;

    setSaving(true);
    setError("");
    setNotice("");
    try {
      await categoriesApi.remove(selectedCategory.id);
      const remaining = categories.filter((category) => category.id !== selectedCategory.id);
      setCategories(remaining);
      setItems((current) => current.map((item) => item.category_id === selectedCategory.id ? { ...item, category_id: null } : item));
      setSelectedId(UNCATEGORIZED_CATEGORY.id);
      setForm(buildForm(UNCATEGORIZED_CATEGORY));
      setNotice(selectedItemCount > 0
        ? `Deleted "${selectedCategory.name}". ${selectedItemCount} item${selectedItemCount === 1 ? "" : "s"} moved to Uncategorized.`
        : `Deleted "${selectedCategory.name}".`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <span className="topbar-breadcrumb">Inventory</span>
          <span className="topbar-title">{pageMode === "create" ? "Add Category" : "Categories"}</span>
        </div>
        <div className="topbar-actions">
          {pageMode === "create" ? (
            <button type="button" className="btn btn-secondary" onClick={closeCreateCategory}>Back to Categories</button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={openCreateCategory}>Add Category</button>
          )}
        </div>
      </div>

      <div className="page-content">
        {error && <div className="alert" style={{ marginBottom: "16px" }}>{error}</div>}
        {notice && <div className="notice" style={{ marginBottom: "16px" }}>{notice}</div>}

        {pageMode === "create" ? (
          <form className="form-card" onSubmit={createCategory}>
            <div className="form-grid">
              <div className="form-group wide">
                <label className="form-label">Name</label>
                <input className="form-input" value={createForm.name} onChange={(e) => updateCreateForm("name", e.target.value)} required />
              </div>
              <div className="form-group wide">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" value={createForm.description} onChange={(e) => updateCreateForm("description", e.target.value)} rows="3" />
              </div>
              <div className="form-group wide">
                <label className="form-label">Icon</label>
                <div className="icon-picker">
                  {Object.entries(ICON_MAP).map(([name, Icon]) => {
                    const selected = createForm.icon === name;
                    return (
                      <button
                        key={name}
                        type="button"
                        className={`btn btn-secondary icon-picker__button${selected ? " icon-picker__button--selected" : ""}`}
                        onClick={() => updateCreateForm("icon", selected ? "" : name)}
                        aria-pressed={selected}
                        title={name.replaceAll("_", " ")}
                      >
                        <Icon />
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Color</label>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <input className="form-input" type="color" value={createForm.color} onChange={(e) => updateCreateForm("color", e.target.value)} style={{ width: "56px", padding: "3px" }} />
                  <span style={{ fontSize: "12.5px", color: "var(--color-text-2)" }}>{createForm.color}</span>
                </div>
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={closeCreateCategory}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving..." : "Create Category"}</button>
            </div>
          </form>
        ) : loading ? (
          <div className="loading">Loading categories...</div>
        ) : (
          <div className="category-manager">
            <aside className="category-manager__list">
              {categoryRows.map((category) => {
                const meta = getCategoryMeta(category);
                const Icon = meta.Icon;
                const selected = category.id === selectedId;
                const count = isUncategorizedCategory(category) ? uncategorizedItems.length : itemCounts[category.id] || 0;
                return (
                  <button
                    key={category.id ?? "uncategorized"}
                    type="button"
                    className={`category-row-btn${selected ? " category-row-btn--active" : ""}`}
                    onClick={() => selectCategory(category)}
                  >
                    <span className="category-row-btn__icon" style={{ color: meta.color, background: meta.bg }}><Icon /></span>
                    <span className="category-row-btn__body">
                      <span className="category-row-btn__name">{category.name}</span>
                      <span className="category-row-btn__meta">{count} item{count === 1 ? "" : "s"}</span>
                    </span>
                  </button>
                );
              })}
            </aside>

            {selectedIsUncategorized ? (
              <section className="form-card category-manager__editor">
                <div className="system-category-head">
                  <div>
                    <div className="form-label">System Category</div>
                    <h2 className="system-category-title">Uncategorized</h2>
                  </div>
                  <span className="badge badge--good">{uncategorizedItems.length} item{uncategorizedItems.length === 1 ? "" : "s"}</span>
                </div>
                <p className="system-category-desc">
                  Items appear here when they are created without a category or when their category is deleted.
                </p>
                {uncategorizedItems.length === 0 ? (
                  <div className="empty-state" style={{ marginTop: "14px" }}>No uncategorized items.</div>
                ) : (
                  <div className="table-wrap" style={{ marginTop: "14px" }}>
                    <table>
                      <thead>
                        <tr>
                          <th><div style={{ padding: "9px 14px" }}>Asset</div></th>
                          <th><div style={{ padding: "9px 14px" }}>Name</div></th>
                          <th><div style={{ padding: "9px 14px" }}>Available</div></th>
                          <th><div style={{ padding: "9px 14px" }}>Condition</div></th>
                        </tr>
                      </thead>
                      <tbody>
                        {uncategorizedItems.map((item) => (
                          <tr key={item.id}>
                            <td><span className="asset-code">{item.asset_code}</span></td>
                            <td><span className="item-name">{item.name}</span></td>
                            <td>{item.available_quantity} / {item.quantity}</td>
                            <td>{item.condition?.replace(/_/g, " ")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            ) : (
            <form className="form-card category-manager__editor" onSubmit={submit}>
              <div className="form-grid">
                <div className="form-group wide">
                  <label className="form-label">Name</label>
                  <input className="form-input" value={form.name} onChange={(e) => update("name", e.target.value)} required />
                </div>
                <div className="form-group wide">
                  <label className="form-label">Description</label>
                  <textarea className="form-textarea" value={form.description} onChange={(e) => update("description", e.target.value)} rows="3" />
                </div>
                <div className="form-group wide">
                  <label className="form-label">Icon</label>
                  <div className="icon-picker">
                    {Object.entries(ICON_MAP).map(([name, Icon]) => {
                      const selected = form.icon === name;
                      return (
                        <button
                          key={name}
                          type="button"
                          className={`btn btn-secondary icon-picker__button${selected ? " icon-picker__button--selected" : ""}`}
                          onClick={() => update("icon", selected ? "" : name)}
                          aria-pressed={selected}
                          title={name.replaceAll("_", " ")}
                        >
                          <Icon />
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Color</label>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <input className="form-input" type="color" value={form.color} onChange={(e) => update("color", e.target.value)} style={{ width: "56px", padding: "3px" }} />
                    <span style={{ fontSize: "12.5px", color: "var(--color-text-2)" }}>{form.color}</span>
                  </div>
                </div>
              </div>
              <div className="form-actions category-manager__actions">
                <button type="button" className="btn btn-danger" onClick={deleteCategory} disabled={saving}>Delete Category</button>
                <div className="form-actions__right">
                  <span className="delete-help">{selectedItemCount > 0 ? `${selectedItemCount} item${selectedItemCount === 1 ? "" : "s"} will move to Uncategorized if deleted.` : "No items are assigned to this category."}</span>
                  <button type="button" className="btn btn-secondary" onClick={() => selectedCategory && setForm(buildForm(selectedCategory))} disabled={saving}>Reset</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</button>
                </div>
              </div>
            </form>
            )}
          </div>
        )}
      </div>
    </>
  );
}

# Design System — Drone Lab Inventory

> The single source of truth for how this app looks and feels. **Before adding any
> feature, read this and reuse the existing tokens and component classes.** Do not
> invent new colors, spacing, or fonts — if something is missing here, add a token
> first, then use it.
>
> All values below are the real ones defined in `frontend/src/index.css`. When you
> change a token there, update this file too.

---

## 0. Golden rules

1. **Use CSS variables, never raw hex** in new code. `var(--color-primary)`, not `#2563eb`.
2. **Reuse component classes** (`.btn`, `.panel`, `.badge`, `.inv-card`, …) before writing new CSS.
3. **Match the density.** This is a compact, information-dense enterprise tool. Base font is
   **13px**, not 16px. Padding is tight. Don't introduce airy, marketing-style spacing inside the app.
4. **One accent color.** Blue (`--color-primary`) is the only brand/action color. Status colors
   (green/amber/red/slate) are reserved for *meaning*, not decoration.
5. **Borders over shadows.** The UI is defined by 1px borders on white surfaces. Shadows are used
   sparingly (cards on hover, modals, dropdowns) — never as the primary separator.
6. **Fail closed on color meaning.** Green = available/good, red = out/damaged, amber = partial/fair,
   slate = not-in-lab/neutral. Never reuse these hues for unrelated UI.

---

## 1. Color tokens

Defined in `:root` in `index.css`. **Always reference the variable.**

### Brand / action
| Token | Hex | Use |
|---|---|---|
| `--color-primary` | `#2563eb` | Primary buttons, links, active states, accent, asset codes |
| `--color-primary-hover` | `#1d4ed8` | Hover for primary actions |
| `--color-primary-light` | `#eff6ff` | Tinted backgrounds (active filter, selected card, info banner) |
| `--color-primary-border` | `#bfdbfe` | Borders on primary-tinted surfaces |

### Sidebar (dark)
| Token | Hex | Use |
|---|---|---|
| `--color-sidebar` | `#0f172a` | Sidebar + login left panel background |
| `--color-sidebar-hover` | `#1e293b` | Nav item hover |
| `--color-sidebar-active` | `#1e3a5f` | Active nav item background |
| `--color-sidebar-border` | `#1e293b` | Dividers inside sidebar |

### Surfaces & text
| Token | Hex | Use |
|---|---|---|
| `--color-bg` | `#f1f5f9` | App background (behind panels) |
| `--color-surface` | `#ffffff` | Cards, panels, tables, inputs |
| `--color-border` | `#e2e8f0` | Default 1px borders |
| `--color-border-light` | `#f1f5f9` | Subtle inner dividers (rows, panel heads) |
| `--color-text` | `#0f172a` | Primary text / headings |
| `--color-text-2` | `#334155` | Body text in tables/cells |
| `--color-muted` | `#64748b` | Secondary labels, captions |
| `--color-muted-2` | `#94a3b8` | Tertiary / metadata / placeholders |

### Semantic / status (NOT tokenized — use these exact hex, consistently)
These recur as literal hex across badges, chips, dots, and accents. When you add a status UI,
copy the matching set so meaning stays consistent.

| Meaning | Text | Background | Border | Dot/Accent |
|---|---|---|---|---|
| Available / Good | `#15803d` / `#16a34a` | `#f0fdf4` | `#bbf7d0` | `#22c55e` |
| Out / Checked-out / Damaged | `#dc2626` / `#991b1b` | `#fef2f2` | `#fecaca` | `#ef4444` |
| Partial / Fair | `#92400e` / `#a16207` | `#fffbeb` / `#fefce8` | `#fde68a` | `#f59e0b` |
| Not-in-lab / Neutral | `#475569` | `#f1f5f9` | `#cbd5e1` | `#94a3b8` |
| Info / Excellent | `#1d4ed8` | `#eff6ff` | `#bfdbfe` | `#2563eb` |

> **If you add a new status,** add it to this table and to the `.badge--*` / `.inv-card__chip--*` /
> `.inv-table__status--*` families together, so the three representations stay in sync.

---

## 2. Typography

| Token | Stack |
|---|---|
| `--font-body` | `'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif` |
| `--font-mono` | `'IBM Plex Mono', ui-monospace, monospace` |

- **Mono is reserved for codes** — asset codes, QR labels, unit codes. Always pair mono codes with
  `--color-primary` and slight letter-spacing (see `.asset-code`, `.qr-code-label`, `.inv-card__code`).
- Base body size is **13px** (`body { font-size: 13px }`), line-height **1.5**.
- Note: `html { zoom: 1.18 }` is applied globally — all px values are pre-zoom. Keep using the same
  scale; don't compensate for zoom in new components.

### Type scale (observed, reuse these sizes)
| Role | Size / weight | Example class |
|---|---|---|
| Page title | 18px / 700 | `.topbar-title`, `.system-category-title` |
| Big metric | 32px / 700 | `.metric-value` |
| Modal / heading | 15px / 700 | `.modal-header h2` |
| Section heading | 13px / 600 | `.panel-head h2` |
| Body / cell | 12.5–13.5px / 500–600 | `tbody td`, `.inv-card__name` |
| Label (caps) | 10–11.5px / 600, `letter-spacing: 0.5–0.7px`, `uppercase` | `.metric-label`, `.form-label`, `.detail-field-label` |
| Metadata | 10–11px / 400–500 | `.item-sub`, `.inv-card__meta`, `.user-role` |
| Micro tag | 9–10px / 600 | `.nav-restricted`, `.nav-group-label` |

**Uppercase + letter-spacing** is the signature treatment for labels and column headers. Use it for
any new field label or table header.

---

## 3. Spacing, radius, layout

### Radius tokens
| Token | Value | Use |
|---|---|---|
| `--radius-sm` | 4px | Badges, chips, small buttons, close button |
| `--radius` | 6px | Buttons, inputs, most controls |
| `--radius-md` | 8px | Panels, cards, modals, form cards |
| `--radius-lg` | 10px | Largest containers (rarely) |

### Spacing rhythm (no token — follow the cadence)
- Page content padding: `26px 14px` (`.page-content`).
- Vertical gap between stacked panels: **16px** (`.page-stack`).
- Grid gaps between cards/metrics: **12–14px**.
- Panel head padding: `13px 18px`; panel body: `14px 18px`.
- Card padding: `14–20px`.
- Form field gap: **16px** (`.form-grid`), label↔input gap **5px**.

### Key layout primitives
| Class | Purpose |
|---|---|
| `.app-shell` | Flex row: sidebar + main, full height, no page scroll (panels scroll internally) |
| `.sidebar` (200px, collapses to 62px) | Dark left nav |
| `.topbar` (62px) | Breadcrumb + title + actions |
| `.page-content` / `.page-stack` | Scrollable content column with 16px stack gap |
| `.panel` + `.panel-head` + `.panel-body` | Standard white bordered container |
| `.metric-grid` (4 cols → 2 → 1) | Dashboard KPI row |
| `.inv-layout` (220px filters + 1fr) | Inventory two-column |
| `.item-detail-grid` (1fr + 240px) | Detail page main + sidebar |
| `.detail-grid` (3 cols → 2 → 1) | Field grids |

### Breakpoints
- **900px:** multi-column grids collapse (metrics → 2, panel-row/detail/form → 1), sidebar login panel hides.
- **600px:** everything → single column, tighter page padding, stacked action rows.

When adding a layout, **reuse one of the grid primitives above** and respect these two breakpoints.

---

## 4. Components — what to reuse

### Buttons — `.btn`
Min height 36px, 8×16 padding, 13px/600, radius 6px.
| Variant | Class | When |
|---|---|---|
| Primary | `.btn .btn-primary` | The main action on a screen (one per context) |
| Secondary | `.btn .btn-secondary` | Cancel, neutral actions |
| Danger | `.btn .btn-danger` | Delete / destructive (always pair with a confirm modal) |
| Row action | `.row-btn`, `.row-btn--primary` | Compact in-table/in-card actions (28px min) |

Disabled: `opacity: 0.45; cursor: not-allowed` (built into `.btn:disabled`).

### Panels & cards
- `.panel` / `.panel-head` / `.panel-body` — default container for any grouped content.
- `.metric-card` — KPI tile (`.metric-label`, `.metric-value` + `--blue/--green/--red`, `.metric-footer`).
- `.inv-card` — inventory grid item (header with code + chip, name, meta, footer with stats + actions).
  Hover lifts via shadow, not transform.
- `.browse-card` — category/browse tile (centered icon + label, hover tints primary, lifts `-2px`).
  Has an optional slide-up `.cat-card-overlay`.
- `.form-card` — white container for forms.

### Tables
Two table styles exist — **pick the right one:**
- **`table` / `.table-wrap` / `.table-toolbar`** — classic data table with search + filter toolbar,
  uppercase `thead`, sortable headers (`.sort-btn`, `.sort-icon.active`).
- **`.inv-table`** — "enterprise" table with a left status accent stripe
  (`tr[data-status="…"] .inv-table__accent`) and inline status dot (`.inv-table__status--*`).
  Use this when rows have a clear status.

### Badges, chips, status dots
- `.badge--*` — pill with bg+border (lists, detail).
- `.inv-card__chip--*` — compact uppercase chip (inside cards).
- `.inv-table__status--*` + `.inv-table__dot` — dot + colored text (inside the enterprise table).
- `.unit-row__accent--*` — 4px status bar on unit rows.

Keep all four families in sync when you add a status (see §1 note).

### Forms — `.form-*`
`.form-grid` (2-col, `.wide` spans full), `.form-group`, `.form-label`,
`.form-input` / `.form-select` / `.form-textarea` (focus → primary border),
`.form-actions` (right-aligned), `.notice` (success), `.alert` (error).

### Modal — `.modal-*`
`.modal-backdrop` (`rgba(15,23,42,0.45)`, z-index 50) → centered `.modal` (max 480px,
shadow `0 20px 60px rgba(15,23,42,0.25)`), `.modal-header` + `.modal-close`, `.modal-actions` (right).
**All destructive actions go through a modal confirm.**

### Feedback states (always provide all three)
| State | Class |
|---|---|
| Loading | `.loading` |
| Error | `.alert` |
| Empty | `.empty-state` |
| Inline info | `.info-banner` (blue) / `.notice` (green) |
| Transient (scanner) | `.live-scan__toast--success/--error` |

Every list/data view **must** handle loading, error, and empty — there are dedicated classes, use them.

### Dropdown menu — `.unit-kebab__*`
Kebab button → absolute menu (white, border, shadow `0 4px 12px rgba(0,0,0,.1)`, z-index 50),
`--danger` item variant for destructive options. Reuse this pattern for any row overflow menu.

---

## 5. Motion

Keep it subtle and fast. Reuse these exact curves/durations:
| Use | Value |
|---|---|
| Hover/color transitions | `0.1–0.15s` linear/ease |
| Sidebar collapse | `width 0.22s ease` |
| Card hover lift | `transform/border 140–150ms ease` |
| Panel slide (forward/back) | `slideFromRight/Left 220ms cubic-bezier(0.16,1,0.3,1)` |
| Overlay slide-up | `transform 480ms cubic-bezier(0.16,1,0.3,1)` |
| Toast in | `0.15s ease` (translateY -6px → 0) |

`cubic-bezier(0.16, 1, 0.3, 1)` is the house easing for "enter" animations. Use it for new transitions.

---

## 6. Iconography & avatars

- Nav/action icons sit in **28px** boxes (`.nav-icon`), category/browse icons in **44px** boxes.
- Category icons + colors come from `frontend/src/utils/categoryMeta.jsx` — **pull category visuals
  from there**, don't hardcode per-feature.
- Avatars: circle, role-tinted bg + matching text color, bold initials
  (`.sidebar-avatar`, `.user-avatar`, login `.role-icon`). Sizes 28–34px.
- Role accent colors (from `Login.jsx`): Admin `#2563eb`, Staff `#7c3aed`, Engineer `#16a34a`,
  Student `#ea580c`. Reuse these if you surface roles anywhere new.

---

## 7. Checklist — adding a new feature/page

Before you write CSS or a component, confirm:

- [ ] Page uses `.app-shell` → `.page-content` → `.page-stack` and wraps content in `.panel`s.
- [ ] Title/breadcrumb follows the `.topbar` pattern (18px/700 title, uppercase breadcrumb).
- [ ] All colors are `var(--color-*)` or a documented semantic hex — **zero new arbitrary hex**.
- [ ] Buttons use `.btn` variants; one primary action per context; destructive → `.btn-danger` + modal.
- [ ] Tables use `.inv-table` (status rows) or the classic `table`/`.table-wrap` (toolbar + sort).
- [ ] Any status reuses the green/red/amber/slate semantics and is added to all badge/chip/dot families.
- [ ] Labels are uppercase, 10–11.5px, 600, letter-spaced.
- [ ] Codes use `--font-mono` + `--color-primary`.
- [ ] Loading, error, and empty states are all handled with the dedicated classes.
- [ ] Radius from tokens (`--radius*`); spacing matches the 12–18px rhythm; density stays compact (13px base).
- [ ] Responsive: collapses correctly at 900px and 600px using the existing grid primitives.
- [ ] Motion reuses the documented durations/easing; nothing slower than ~480ms.
- [ ] New tokens (if truly needed) are added to `:root` in `index.css` **and** to this file.

---

## 8. What NOT to do

- ❌ Don't add a second accent color or gradients — the brand is one blue + neutrals.
- ❌ Don't use raw hex in components; don't bypass the token system.
- ❌ Don't introduce a new font or larger base size; keep the dense 13px enterprise feel.
- ❌ Don't lean on drop shadows as separators — use 1px borders.
- ❌ Don't reuse status hues (green/red/amber) for non-status decoration.
- ❌ Don't ship a list view without loading/empty/error states.
- ❌ Don't hardcode category icons/colors — use `categoryMeta.jsx`.
- ❌ Don't put destructive actions one click away — always confirm via `.modal`.

---

*Tokens live in `frontend/src/index.css` (`:root`). Category visuals live in
`frontend/src/utils/categoryMeta.jsx`. Keep this document in lockstep with both.*

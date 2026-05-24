# Frontend Redesign — Design Spec
**Date:** 2026-05-24
**Status:** Approved

---

## Context

The existing frontend uses a top navbar, a single flat `index.css`, and a teal colour palette. The goal is a full visual redesign to a professional enterprise look suitable for a drone lab presentation, plus a role-based login system with student access restrictions. No backend auth changes — the session is stored client-side only for now.

---

## Design Decisions

| Decision | Choice |
|---|---|
| Visual direction | Clean & modern (white content, dark sidebar) |
| Font | IBM Plex Sans (body) + IBM Plex Mono (asset codes) |
| Accent colour | Blue — `#2563eb` |
| Navigation | Collapsible dark sidebar — expanded by default, collapses to icon-only |
| Icons | SVG only — no emojis |
| Auth | Role-selection screen — click to pick role, no password |

---

## Architecture

### Auth (client-side only)

- A `AuthContext` (React context) holds `{ role }` — one of `admin | staff | engineer | student | null`
- On app load, read role from `sessionStorage`. If none, redirect to `/login`
- Login page sets role in context + sessionStorage, then redirects to `/`
- Sign out clears sessionStorage and redirects to `/login`
- No backend changes required

### Role definitions

| Role | Access |
|---|---|
| Admin | All pages |
| Staff | All pages |
| Lab Engineer | All pages |
| Student | Inventory only (check in / check out actions) — all other nav items visible but disabled |

Student restrictions (frontend only):
- Cannot navigate to Dashboard, Add Item, Transactions, QR Lookup
- `Add Item` button hidden from topbar
- Restricted nav items shown with "Restricted" label, non-clickable
- Info banner shown on Inventory page: *"You have student access — check in and check out only."*

---

## Layout

### Shell

```
┌─────────────────────────────────────────────────────┐
│  Sidebar (220px expanded / 56px collapsed)          │
│  ┌──────────────┐  ┌───────────────────────────────┐│
│  │ Logo / brand │  │ Topbar (54px)                 ││
│  │              │  │ breadcrumb + title | buttons   ││
│  │ Nav items    │  ├───────────────────────────────┤│
│  │ (SVG icons + │  │                               ││
│  │  labels)     │  │  Page content                 ││
│  │              │  │                               ││
│  │ ─────────── │  │                               ││
│  │ Account info │  │                               ││
│  │ Sign out     │  │                               ││
│  └──────────────┘  └───────────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

### Sidebar behaviour
- Default: expanded (220px), shows logo + brand name + nav labels + account name
- Collapsed (56px): icon-only, brand text hidden, nav labels hidden, user name hidden
- Toggle button: arrow icon at sidebar footer, flips between states
- Transition: `width 0.22s ease`

### Sidebar sections
1. **Logo** — `DL` mark + "Drone Lab" / "Inventory System" subtitle
2. **Nav group: Main** — Dashboard, Inventory, Add Item
3. **Nav group: Records** — Transactions, QR Lookup
4. **Account footer** — avatar initials, name, role label, Sign out link

### Topbar (per page)
- Left: breadcrumb (small uppercase) + page title (bold)
- Right: secondary button (Export where relevant) + primary button (Add Item where permitted)

---

## Login Page

Two-column layout:
- **Left panel** (dark, `#0f172a`, 340px): logo, tagline, description
- **Right panel** (white, flex): heading "Who are you?", 2×2 role grid, Continue button

Role cards:
- Border + icon + name + one-line description
- Hover/selected: blue border + blue tint background
- Continue button disabled until a role is selected
- On continue: set role in sessionStorage + context, navigate to `/`

---

## CSS / Styling

Replace `index.css` entirely with a new design-system stylesheet.

Key tokens:
```css
--color-primary:   #2563eb
--color-primary-hover: #1d4ed8
--color-sidebar:   #0f172a
--color-sidebar-hover: #1e293b
--color-sidebar-active: #1e3a5f
--color-border:    #e2e8f0
--color-surface:   #ffffff
--color-bg:        #f1f5f9
--color-text:      #0f172a
--color-muted:     #64748b
--font-body:       'IBM Plex Sans', system-ui, sans-serif
--font-mono:       'IBM Plex Mono', monospace
```

Badges (replace pill style with bordered rectangular):
- Available: green tint + green border
- Checked out: red tint + red border
- Excellent: blue tint + blue border
- Good: green tint + green border
- Condition badges use `border-radius: 4px` (not 999px)

Table:
- Header: `#f8fafc` background, `10.5px` uppercase, `#64748b`
- Row hover: `#fafbfc`
- Borders: `#f1f5f9` (row), `#e2e8f0` (header bottom)
- Asset codes: `IBM Plex Mono`, blue, bold

---

## Files to Create / Modify

| File | Change |
|---|---|
| `src/index.css` | Full rewrite with new design system |
| `src/App.jsx` | Add `AuthContext`, wrap routes, add `/login` route, protect routes |
| `src/context/AuthContext.jsx` | New — provides `role`, `login()`, `logout()` |
| `src/pages/Login.jsx` | New — role selection page |
| `src/components/Navbar.jsx` | Full rewrite → collapsible sidebar |
| `src/components/ItemTable.jsx` | Update badge styles, table styles |
| `src/pages/Dashboard.jsx` | Update metric cards, layout |
| `src/pages/InventoryList.jsx` | Add student banner, hide Add Item for students |
| `src/pages/ItemDetail.jsx` | Update layout to match new design |
| `src/pages/AddItem.jsx` | Update form styles |
| `src/pages/Transactions.jsx` | Update table styles |
| `src/pages/QRLookup.jsx` | Update layout |

---

## Google Fonts

Add to `index.html`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@600&display=swap" rel="stylesheet">
```

---

## Verification

1. Run `npm run dev` in `frontend/`
2. App redirects to `/login` on first load
3. Select each role and confirm Continue navigates to correct page
4. Student: only Inventory accessible, restricted items show "Restricted" label, banner visible
5. Admin/Staff/Engineer: all pages accessible, Add Item button visible
6. Sidebar toggle collapses/expands correctly
7. Sign out clears session and returns to `/login`
8. All existing features (checkout modal, checkin modal, QR, sort) still work

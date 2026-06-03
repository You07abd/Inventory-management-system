# Drone Lab Inventory System — User Guide

## Overview

This system tracks all lab equipment: who has what, what's available, and what's been damaged. It replaces the old spreadsheet with live checkout tracking, QR-code scanning, and a full transaction history.

---

## Roles

| Role | Access |
|---|---|
| **Admin / Staff** | Everything — dashboard, inventory management, categories, transactions, QR lookup, checkout desk |
| **Student** | Inventory (browse only) + Checkout Desk |

Log in by selecting your role on the login screen. No password is required — the system uses role-based access, not individual accounts. Students are identified by name when checking out equipment.

---

## Key Concepts

**Item** — a model of equipment, e.g. "DJI Mini 3 Pro". Holds the general info: total quantity, location, category, condition.

**Unit** — a specific physical instance of an item, identified by an asset code (e.g. `SAFCSP-DRONE-0001`) and optionally a serial number. Each unit can be checked out independently and has its own QR code.

**Tracking Mode** — how an item is tracked:
- **Unit Tracked** — each physical piece is tracked individually. Use this for drones, laptops, cameras. You check out a specific unit.
- **Bulk / Pool** — the quantity is tracked as a pool. Use this for consumables like screw sets, cables, or batteries where individual pieces are interchangeable. You check out a quantity, not a specific unit.

**Condition** — three states:
- **Good** — available and working
- **Needs Repair** — pulled from circulation, awaiting a fix
- **Damaged** — broken, not usable

Items in **Needs Repair** or **Damaged** condition are automatically blocked from checkout.

---

## For Lab Staff & Admin

### Dashboard

The dashboard shows:
- Total items, units, and active checkouts at a glance
- Recent activity — who checked what out or returned it, and when

### Categories

Categories group items and set a default tracking mode for new items added to them.

**To create a category:**
1. Go to **Categories** in the sidebar
2. Click **New Category**
3. Pick a name, icon, color, and — importantly — set the **Default Tracking Mode**:
   - Choose **Unit Tracked** for equipment that needs individual tracking
   - Choose **Bulk / Pool** for consumables
4. Save

Any item added to this category will automatically inherit the tracking mode. You can override it per item if needed.

### Managing Inventory

#### Adding an Item

1. Go to **Inventory**
2. Click **+ New Item**
3. Set the **Tracking Mode** first (it auto-fills from the category if you set one)
4. Fill in name, quantity, location, and condition
5. For unit-tracked items, the **Serial Number** field appears — fill it in if available
6. Save

For **bulk items**, quantity is all you need — no individual units are created.

For **unit-tracked items**, after creating the item, open it and add individual units from the item detail page.

#### Adding Units to a Unit-Tracked Item

1. Click on any item in the Inventory list to open its detail page
2. Scroll to **Physical Units**
3. Click **Add Unit**
4. Enter the serial number, condition, and location
5. Save — an asset code is auto-generated (e.g. `SAFCSP-DRONE-0001`)

Each unit gets a QR code you can print from the unit detail page.

#### Editing an Item

Click any item in the Inventory list to open its detail page. From there you can:
- Edit the item's name, quantity, location, category, and condition
- Switch tracking mode (unit ↔ bulk) — existing unit records are preserved when switching back
- Edit or delete individual units

#### Switching Tracking Mode

Open the item detail page and click **Switch** next to the Tracking Mode field. This does not delete any existing unit records — switching back restores the full unit history.

### Checkout Desk

The Checkout Desk has two tabs: **Check Out** and **Check In**.

#### Checking Out Equipment

**Grid view** (recommended for in-person sessions):
1. Go to **Checkout Desk → Check Out**
2. Browse by category → item → unit
3. For **unit-tracked** items: tap a unit card to add it to cart
4. For **bulk** items: a quantity modal appears — use +/− to set how many
5. Repeat for all equipment being taken
6. Select the **user** in the cart panel
7. Click **Check Out** — a receipt is shown

**List view** (better for filtering/searching):
1. Switch to List view
2. Use the filter sidebar (Category, Location, Status, Condition) or the search bar
3. For unit-tracked items: click **+** next to an item to expand its units, then add individual units
4. For bulk items: use the +/− stepper inline to set the quantity, then click **Add**
5. Complete checkout the same way as grid view

**Live Scan** (fastest for QR-code workflows):
1. Switch to Live Scan mode inside the Checkout Desk
2. Scan each unit's QR code with a camera — units are added to cart automatically
3. Complete checkout normally

#### Checking In (Returning Equipment)

**Grid view:**
1. Go to **Checkout Desk → Check In**
2. Browse to the item and click the unit that is being returned
3. The unit is added to the return cart

**List view:**
1. Switch to List view — all checked-out units are shown
2. Click **Return** next to the unit
3. For **bulk items**, a separate "Bulk Items" section appears — click **Return**, select the user and quantity

**Completing the return:**
1. Review the return cart
2. Add optional notes
3. Click **Return Units**

**After the return**, the receipt shows each returned item with two buttons: **Needs Repair** and **Damaged**. Click one only if something came back with an issue — this immediately updates the unit's condition and pulls it from circulation. If everything is fine, ignore the buttons.

### Reporting Damage (without a return)

If you notice a unit is damaged while it's still in the lab:

1. Open **Inventory** → click the item → find the unit in the Physical Units table
2. Click **Edit** on the unit row
3. Change the condition to **Needs Repair** or **Damaged**
4. Save

### QR Lookup

Use this to quickly find any unit by asset code or QR scan.

1. Go to **QR Lookup**
2. Type or scan the asset code (e.g. `SAFCSP-DRONE-0001`)
3. The unit's full status is shown — who has it, condition, location
4. From here you can **Check Out** or **Check In** the unit directly
5. When checking in, a **Flag Condition Issue** dropdown lets you mark it as Needs Repair or Damaged if something's wrong

### Transaction History

Go to **Transactions** for a full log of every checkout and return across all items and users. You can filter by date, user, or item.

Individual item history is also visible inside each item's detail page, with richer context (who, when, notes, condition flags).

---

## For Students

### Browsing Inventory

Go to **Inventory** to see all available equipment. You can:
- Search by name or asset code
- Filter by Category, Location, Status, or Condition using the sidebar panel
- Click any item to see its details and which specific units are available

Items showing **Needs Repair** or **Damaged** cannot be checked out.

### Using the Checkout Desk

You can use the Checkout Desk to browse and select items to check out.

1. Go to **Checkout Desk**
2. Browse by category in Grid view, or use List view to search
3. Add items to your cart:
   - For regular equipment: select the specific unit you're taking
   - For bulk items (cables, screws, etc.): set the quantity with +/−
4. Make sure your name is selected in the cart
5. Click **Check Out** and keep your receipt — it shows the asset codes of what you took

### Returning Equipment

1. Go to **Checkout Desk → Check In**
2. Find the unit you're returning (search by name or asset code in List view, or browse by category in Grid view)
3. Click **Return**
4. A staff member should complete the return and inspect the equipment

> If you notice any damage to equipment you're returning, let a staff member know so they can flag it in the system.

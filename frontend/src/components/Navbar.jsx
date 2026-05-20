import { NavLink } from "react-router-dom";

export default function Navbar() {
  return (
    <header className="navbar">
      <NavLink to="/" className="brand">
        <span className="brand-mark">S</span>
        <span>
          <strong>SAFCSP</strong>
          <small>Drone Lab Inventory</small>
        </span>
      </NavLink>
      <nav>
        <NavLink to="/">Dashboard</NavLink>
        <NavLink to="/inventory">Inventory</NavLink>
        <NavLink to="/inventory/new">Add Item</NavLink>
        <NavLink to="/qr-lookup">QR Lookup</NavLink>
        <NavLink to="/transactions">Transactions</NavLink>
      </nav>
    </header>
  );
}

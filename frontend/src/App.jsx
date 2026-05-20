import { Navigate, Route, Routes } from "react-router-dom";

import Navbar from "./components/Navbar.jsx";
import AddItem from "./pages/AddItem.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import InventoryList from "./pages/InventoryList.jsx";
import ItemDetail from "./pages/ItemDetail.jsx";
import QRLookup from "./pages/QRLookup.jsx";
import Transactions from "./pages/Transactions.jsx";

export default function App() {
  return (
    <div className="app-shell">
      <Navbar />
      <main className="page-shell">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/inventory" element={<InventoryList />} />
          <Route path="/inventory/new" element={<AddItem />} />
          <Route path="/items/:itemId" element={<ItemDetail />} />
          <Route path="/qr-lookup" element={<QRLookup />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

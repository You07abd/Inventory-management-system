import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import Sidebar from "./components/Sidebar.jsx";
import AddItem from "./pages/AddItem.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import InventoryList from "./pages/InventoryList.jsx";
import ItemDetail from "./pages/ItemDetail.jsx";
import Login from "./pages/Login.jsx";
import QRLookup from "./pages/QRLookup.jsx";
import Transactions from "./pages/Transactions.jsx";

function ProtectedRoute({ children, allowStudent = true }) {
  const { role } = useAuth();
  if (!role) return <Navigate to="/login" replace />;
  if (role === "student" && !allowStudent) return <Navigate to="/inventory" replace />;
  return children;
}

function AppShell() {
  const { role } = useAuth();
  const location = useLocation();
  const isLogin = location.pathname === "/login";

  if (isLogin) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-area">
        <Routes>
          <Route path="/" element={<ProtectedRoute allowStudent={false}><Dashboard /></ProtectedRoute>} />
          <Route path="/inventory" element={<ProtectedRoute><InventoryList /></ProtectedRoute>} />
          <Route path="/inventory/new" element={<ProtectedRoute allowStudent={false}><AddItem /></ProtectedRoute>} />
          <Route path="/items/:itemId" element={<ProtectedRoute><ItemDetail /></ProtectedRoute>} />
          <Route path="/qr-lookup" element={<ProtectedRoute allowStudent={false}><QRLookup /></ProtectedRoute>} />
          <Route path="/transactions" element={<ProtectedRoute allowStudent={false}><Transactions /></ProtectedRoute>} />
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to={role === "student" ? "/inventory" : "/"} replace />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}

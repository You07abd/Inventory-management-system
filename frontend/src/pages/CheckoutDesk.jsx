import { useState } from "react";
import CheckOutMode from "./checkout-desk/CheckOutMode";
import CheckInMode from "./checkout-desk/CheckInMode";

export default function CheckoutDesk() {
  const [mode, setMode] = useState("checkout");

  return (
    <div className="page">
      <div className="page-header">
        <h1>Checkout Desk</h1>
        <p>Check equipment in and out</p>
      </div>

      {/* Mode toggle */}
      <div style={{
        display: "inline-flex",
        border: "1px solid var(--color-border-light)",
        borderRadius: "8px",
        overflow: "hidden",
        marginBottom: "24px",
      }}>
        <button
          type="button"
          className="btn"
          onClick={() => setMode("checkout")}
          style={{
            borderRadius: 0,
            background: mode === "checkout" ? "var(--color-primary)" : "#fff",
            color: mode === "checkout" ? "#fff" : "var(--color-text)",
            borderRight: "1px solid var(--color-border-light)",
            minWidth: "130px",
            letterSpacing: "0.04em",
          }}
        >
          Check Out
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => setMode("checkin")}
          style={{
            borderRadius: 0,
            background: mode === "checkin" ? "#059669" : "#fff",
            color: mode === "checkin" ? "#fff" : "var(--color-text)",
            minWidth: "130px",
            letterSpacing: "0.04em",
          }}
        >
          Check In
        </button>
      </div>

      <div className="page-content">
        {mode === "checkout" ? <CheckOutMode /> : <CheckInMode />}
      </div>
    </div>
  );
}

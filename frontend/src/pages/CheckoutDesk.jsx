import { useState } from "react";
import CheckOutMode from "./checkout-desk/CheckOutMode";
import CheckInMode from "./checkout-desk/CheckInMode";

export default function CheckoutDesk() {
  const [mode, setMode] = useState("checkout");

  return (
    <>
      <div className="topbar">
        <div className="topbar-left">
          <span className="topbar-breadcrumb">Checkout Desk</span>
          <span className="topbar-title">Checkout Desk</span>
        </div>
        <div className="topbar-actions">
          {/* Mode toggle */}
          <button
            type="button"
            className={mode === "checkout" ? "btn btn-primary" : "btn btn-secondary"}
            onClick={() => setMode("checkout")}
          >
            Check Out
          </button>
          <button
            type="button"
            className={mode === "checkin" ? "btn btn-primary" : "btn btn-secondary"}
            onClick={() => setMode("checkin")}
          >
            Check In
          </button>
        </div>
      </div>

      <div className="page-content">
        <div className="page-stack">
          {mode === "checkout" ? <CheckOutMode /> : <CheckInMode />}
        </div>
      </div>
    </>
  );
}

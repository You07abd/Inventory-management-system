import { useState, useEffect, useRef } from "react";

function toYMD(date) {
  return date.toLocaleDateString("en-CA");
}

function startOfMonth(year, month) {
  return new Date(year, month, 1);
}

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const DAY_NAMES = ["Su","Mo","Tu","We","Th","Fr","Sa"];

export default function DatePicker({ value, onChange, min, className = "" }) {
  const today = toYMD(new Date());
  const minDate = min || today;

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => {
    if (value) return parseInt(value.slice(0, 4));
    return new Date().getFullYear();
  });
  const [viewMonth, setViewMonth] = useState(() => {
    if (value) return parseInt(value.slice(5, 7)) - 1;
    return new Date().getMonth();
  });
  const [hoveredDay, setHoveredDay] = useState(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  useEffect(() => {
    if (value && !open) {
      setViewYear(parseInt(value.slice(0, 4)));
      setViewMonth(parseInt(value.slice(5, 7)) - 1);
    }
  }, [value]);

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  function selectDay(dayStr) {
    onChange(dayStr);
    setOpen(false);
  }

  function buildDays() {
    const firstDow = startOfMonth(viewYear, viewMonth).getDay();
    const count = daysInMonth(viewYear, viewMonth);
    const cells = [];
    for (let i = 0; i < firstDow; i++) cells.push(null);
    for (let d = 1; d <= count; d++) {
      const pad = String(d).padStart(2, "0");
      const monPad = String(viewMonth + 1).padStart(2, "0");
      cells.push(`${viewYear}-${monPad}-${pad}`);
    }
    return cells;
  }

  const days = buildDays();

  const displayValue = value
    ? new Date(value + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "";

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block", width: "100%" }}>
      <input
        readOnly
        className={`form-input ${className}`}
        style={{ cursor: "pointer", width: "100%", boxSizing: "border-box" }}
        value={displayValue}
        placeholder="Select date"
        onClick={() => {
          if (!open && ref.current) {
            const rect = ref.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const dropdownH = 300;
            const top = spaceBelow < dropdownH && rect.top > dropdownH
              ? rect.top - dropdownH - 4
              : rect.bottom + 4;
            setDropdownPos({ top, left: rect.left });
          }
          setOpen(o => !o);
        }}
      />
      {open && (
        <div style={{
          position: "fixed", top: dropdownPos.top, left: dropdownPos.left, zIndex: 1000,
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "8px",
          boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
          padding: "12px",
          width: "256px",
        }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <button
              type="button"
              onClick={prevMonth}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-primary)", fontSize: "1.1rem", padding: "2px 6px", borderRadius: "4px" }}
            >‹</button>
            <span style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--color-text)" }}>
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-primary)", fontSize: "1.1rem", padding: "2px 6px", borderRadius: "4px" }}
            >›</button>
          </div>

          {/* Day names */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: "2px", marginBottom: "4px" }}>
            {DAY_NAMES.map(d => (
              <div key={d} style={{ textAlign: "center", fontSize: "0.68rem", color: "var(--color-muted)", fontWeight: 600, textTransform: "uppercase", padding: "2px 0" }}>{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: "2px" }}>
            {days.map((dayStr, i) => {
              if (!dayStr) return <div key={`empty-${viewYear}-${viewMonth}-${i}`} />;

              const isPast = dayStr < minDate;
              const isToday = dayStr === today;
              const isSelected = dayStr === value;

              let cellStyle = {
                textAlign: "center",
                padding: "5px 2px",
                borderRadius: "6px",
                fontSize: "0.8rem",
                userSelect: "none",
              };

              if (isSelected) {
                cellStyle = { ...cellStyle, background: "var(--color-primary)", color: "#fff", fontWeight: 600, cursor: "pointer" };
              } else if (isPast) {
                cellStyle = { ...cellStyle, background: "#f1f5f9", color: "#94a3b8", cursor: "not-allowed" };
              } else if (isToday) {
                cellStyle = { ...cellStyle, color: "var(--color-primary)", fontWeight: 700, outline: "1px solid var(--color-primary)", outlineOffset: "-1px", cursor: "pointer" };
              } else {
                const isHovered = hoveredDay === dayStr;
                cellStyle = { ...cellStyle, color: "var(--color-text)", cursor: "pointer", background: isHovered ? "var(--color-bg)" : "" };
              }

              return (
                <div
                  key={dayStr}
                  style={cellStyle}
                  onClick={isPast ? undefined : () => selectDay(dayStr)}
                  onMouseEnter={isPast ? undefined : () => setHoveredDay(dayStr)}
                  onMouseLeave={isPast ? undefined : () => setHoveredDay(null)}
                >
                  {parseInt(dayStr.slice(8))}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

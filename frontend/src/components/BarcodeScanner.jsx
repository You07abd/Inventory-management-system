import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";

function classifyBarcode(raw) {
  // GS1-128 with parenthesized AIs: "(01)12345678901234(21)SN123"
  const gs1Gtin = raw.match(/\(01\)(\d{13,14})/);
  const gs1Serial = raw.match(/\(21\)([^(\x1D\)]+)/);
  if (gs1Gtin) {
    return {
      raw,
      type: "gs1",
      gtin: gs1Gtin[1],
      serial: gs1Serial ? gs1Serial[1].trim() : null,
    };
  }
  // GS1-128 with FNC1 group separator (0x1D)
  if (raw.includes("\x1D")) {
    const parts = raw.split("\x1D").filter(Boolean);
    let gtin = null;
    let serial = null;
    for (const part of parts) {
      if (part.startsWith("01") && part.length >= 15) gtin = part.slice(2);
      if (part.startsWith("21")) serial = part.slice(2);
    }
    if (gtin) return { raw, type: "gs1", gtin, serial };
  }
  // UPC-A: 12 digits
  if (/^\d{12}$/.test(raw)) return { raw, type: "upc", gtin: raw, serial: null };
  // EAN-13: 13 digits
  if (/^\d{13}$/.test(raw)) return { raw, type: "ean", gtin: raw, serial: null };
  // EAN-8: 8 digits
  if (/^\d{8}$/.test(raw)) return { raw, type: "ean", gtin: raw, serial: null };
  return { raw, type: "unknown", gtin: null, serial: null };
}

export default function BarcodeScanner({ onScan, onClose }) {
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const firedRef = useRef(false);
  const [cameraError, setCameraError] = useState(null);

  useEffect(() => {
    let mounted = true;
    const codeReader = new BrowserMultiFormatReader();

    codeReader
      .decodeFromVideoDevice(undefined, videoRef.current, (result, err) => {
        if (!mounted || firedRef.current || !result) return;
        firedRef.current = true;
        controlsRef.current?.stop();
        onScan(classifyBarcode(result.getText()));
      })
      .then((controls) => {
        controlsRef.current = controls;
        if (!mounted || firedRef.current) controls.stop();
      })
      .catch(() => {
        if (mounted) setCameraError("Could not access camera — check permissions.");
      });

    return () => {
      mounted = false;
      controlsRef.current?.stop();
    };
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "16px",
      }}
    >
      {cameraError ? (
        <div style={{ color: "#fff", fontSize: "14px" }}>{cameraError}</div>
      ) : (
        <div style={{ position: "relative", width: "min(400px, 90vw)" }}>
          <video
            ref={videoRef}
            muted
            playsInline
            style={{
              width: "100%",
              borderRadius: "8px",
              display: "block",
              transform: "scaleX(-1)",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: "20%",
              border: "2px solid rgba(255,255,255,0.6)",
              borderRadius: "4px",
              pointerEvents: "none",
            }}
          />
        </div>
      )}
      <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "13px", margin: 0 }}>
        Point camera at a barcode or QR code
      </p>
      <button
        type="button"
        className="btn btn-secondary"
        onClick={onClose}
      >
        Cancel
      </button>
    </div>
  );
}

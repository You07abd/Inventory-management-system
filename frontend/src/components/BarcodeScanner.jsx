import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import {
  BarcodeFormat,
  BinaryBitmap,
  DecodeHintType,
  HybridBinarizer,
  MultiFormatReader,
  RGBLuminanceSource,
} from "@zxing/library";

function classifyBarcode(raw) {
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
  if (/^\d{12}$/.test(raw)) return { raw, type: "upc", gtin: raw, serial: null };
  if (/^\d{13}$/.test(raw)) return { raw, type: "ean", gtin: raw, serial: null };
  if (/^\d{8}$/.test(raw)) return { raw, type: "ean", gtin: raw, serial: null };
  return { raw, type: "unknown", gtin: null, serial: null };
}

export default function BarcodeScanner({ isOpen = true, onClose, onScan }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const streamRef = useRef(null);
  const firedRef = useRef(false);
  const isScanningRef = useRef(false);
  const readerRef = useRef(null);
  const resetTimerRef = useRef(null);
  const [cameraError, setCameraError] = useState(null);
  const [qrBox, setQrBox] = useState(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    if (!videoRef.current || !canvasRef.current) {
      setCameraError("Camera unavailable — please reload.");
      return undefined;
    }

    let mounted = true;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let barcodeDetector = null;

    if (typeof window !== "undefined" && "BarcodeDetector" in window) {
      try {
        barcodeDetector = new window.BarcodeDetector({
          formats: ["upc_a", "upc_e", "ean_13", "ean_8", "code_128", "qr_code"],
        });
      } catch {
        try {
          barcodeDetector = new window.BarcodeDetector();
        } catch {
          barcodeDetector = null;
        }
      }
    }

    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.CODE_128,
      BarcodeFormat.QR_CODE,
    ]);
    hints.set(DecodeHintType.TRY_HARDER, true);
    hints.set(DecodeHintType.ASSUME_GS1, true);

    readerRef.current = new MultiFormatReader();
    readerRef.current.setHints(hints);

    function showQrBox(location) {
      const corners = [
        location.topLeftCorner,
        location.topRightCorner,
        location.bottomLeftCorner,
        location.bottomRightCorner,
      ];
      const flippedCorners = corners.map((corner) => ({
        x: canvas.width - corner.x,
        y: corner.y,
      }));
      const minX = Math.min(...flippedCorners.map((corner) => corner.x));
      const maxX = Math.max(...flippedCorners.map((corner) => corner.x));
      const minY = Math.min(...flippedCorners.map((corner) => corner.y));
      const maxY = Math.max(...flippedCorners.map((corner) => corner.y));
      const padX = (maxX - minX) * 0.1;
      const padY = (maxY - minY) * 0.1;
      const rawLeft = ((minX - padX) / canvas.width) * 100;
      const rawTop = ((minY - padY) / canvas.height) * 100;
      const rawWidth = ((maxX - minX + 2 * padX) / canvas.width) * 100;
      const rawHeight = ((maxY - minY + 2 * padY) / canvas.height) * 100;
      const left = Math.max(0, rawLeft);
      const top = Math.max(0, rawTop);
      const width = Math.min(rawWidth, 100 - left);
      const height = Math.min(rawHeight, 100 - top);

      setQrBox({ left, top, width, height });
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = setTimeout(() => setQrBox(null), 700);
    }

    function handleScan(raw) {
      if (!mounted || firedRef.current) return;
      firedRef.current = true;
      onScan(classifyBarcode(raw));
      onClose();
    }

    async function scanFrame() {
      if (!mounted || firedRef.current) return;
      if (isScanningRef.current) {
        rafRef.current = requestAnimationFrame(scanFrame);
        return;
      }

      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        isScanningRef.current = true;
        try {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          if (canvas.width > 0 && canvas.height > 0) {
            ctx.drawImage(video, 0, 0);

            if (barcodeDetector) {
              try {
                const barcodes = await barcodeDetector.detect(canvas);
                const detected = barcodes.find((barcode) => barcode.rawValue);
                if (detected?.rawValue) {
                  handleScan(detected.rawValue);
                  return;
                }
              } catch {
                // Native detection may reject on unsupported frames; continue to fallbacks.
              }
            }

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, canvas.width, canvas.height, {
              inversionAttempts: "dontInvert",
            });
            if (code?.data) {
              if (code.location) showQrBox(code.location);
              handleScan(code.data);
              return;
            }

            try {
              const luminance = new RGBLuminanceSource(imageData.data, canvas.width, canvas.height);
              const bitmap = new BinaryBitmap(new HybridBinarizer(luminance));
              const result = readerRef.current.decodeWithState(bitmap);
              if (result?.getText()) handleScan(result.getText());
            } catch {
              // NotFoundException on most frames — normal
            }
          }
        } finally {
          isScanningRef.current = false;
        }
      }

      if (mounted && !firedRef.current) {
        rafRef.current = requestAnimationFrame(scanFrame);
      }
    }

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        video.srcObject = stream;
        await video.play();
        if (!mounted) return;
        scanFrame();
      } catch (err) {
        if (!mounted) return;
        const denied = err.name === "NotAllowedError" || err.name === "PermissionDeniedError";
        setCameraError(
          denied
            ? "Camera access denied — check browser permissions"
            : "Could not start camera — please reload."
        );
      }
    }

    start();

    return () => {
      mounted = false;
      cancelAnimationFrame(rafRef.current);
      clearTimeout(resetTimerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (video.srcObject) video.srcObject = null;
      readerRef.current?.reset();
      firedRef.current = false;
      isScanningRef.current = false;
    };
  }, [isOpen, onClose, onScan]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
        zIndex: 1000,
        display: "grid",
        placeItems: "center",
        padding: "24px",
      }}
    >
      <div className="panel" style={{ width: "min(960px, 100%)", margin: 0 }}>
        <div className="panel-head">
          <h3>Live Scan</h3>
          <span style={{ color: "var(--color-muted)", fontSize: "13px" }}>
            Hold barcodes or QR codes in front of the camera
          </span>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
        </div>

        {cameraError ? (
          <div className="live-scan__camera-error">{cameraError}</div>
        ) : (
          <div
            className="live-scan__container"
            style={{ height: "min(68vh, 560px)", minHeight: "320px" }}
          >
            <video
              ref={videoRef}
              className="live-scan__video"
              muted
              playsInline
              style={{ height: "100%", maxHeight: "none", transform: "scaleX(-1)" }}
            />
            <canvas ref={canvasRef} style={{ display: "none" }} />
            <div
              className="live-scan__viewfinder"
              style={
                qrBox
                  ? {
                      left: `${qrBox.left}%`,
                      top: `${qrBox.top}%`,
                      width: `${qrBox.width}%`,
                      height: `${qrBox.height}%`,
                      transform: "none",
                      transition:
                        "left 0.1s ease, top 0.1s ease, width 0.1s ease, height 0.1s ease",
                    }
                  : {
                      transition:
                        "left 0.1s ease, top 0.1s ease, width 0.1s ease, height 0.1s ease",
                    }
              }
            />
            <div className="live-scan__hint">Scan anywhere — camera detects the full frame</div>
          </div>
        )}
      </div>
    </div>
  );
}

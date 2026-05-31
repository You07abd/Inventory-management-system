import { useEffect, useRef, useState } from "react";
import { BrowserQRCodeReader } from "@zxing/browser";
import { unitsApi } from "../../api/units";

export default function LiveScanMode({ cart, onAddUnit, onClose }) {
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const cooldownRef = useRef(new Map()); // Map<assetCode, timestamp>
  const cartRef = useRef(cart);
  const onAddUnitRef = useRef(onAddUnit);
  const [toasts, setToasts] = useState([]);
  const [cameraError, setCameraError] = useState(null);

  useEffect(() => { cartRef.current = cart; }, [cart]);
  useEffect(() => { onAddUnitRef.current = onAddUnit; }, [onAddUnit]);

  function addToast(message, type) {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  }

  useEffect(() => {
    if (!videoRef.current) {
      setCameraError("Camera unavailable — please reload.");
      return;
    }

    let mounted = true;
    const codeReader = new BrowserQRCodeReader();

    async function handleResult(result) {
      if (!result || !mounted) return;
      const assetCode = result.getText();

      // 3-second cooldown per code
      const now = Date.now();
      const last = cooldownRef.current.get(assetCode);
      if (last && now - last < 3000) return;
      cooldownRef.current.set(assetCode, now);
      setTimeout(() => cooldownRef.current.delete(assetCode), 3000);

      // Duplicate check against live cart
      const inCart = cartRef.current.some((c) => c.unit.asset_code === assetCode);
      if (inCart) {
        addToast(`${assetCode} already in cart`, "error");
        return;
      }

      // Unit lookup
      try {
        const unit = await unitsApi.getByAssetCode(assetCode);
        if (!mounted) return;

        if (unit.status !== "available") {
          addToast(`${assetCode} is already checked out`, "error");
          return;
        }

        onAddUnitRef.current(unit);
        addToast(`${assetCode} added`, "success");
      } catch (err) {
        if (!mounted) return;
        if (err.response?.status === 404) {
          addToast("Unknown QR code", "error");
        } else {
          addToast("Scan error — try again", "error");
        }
      }
    }

    codeReader
      .decodeFromVideoDevice(undefined, videoRef.current, (result) => {
        if (result) handleResult(result);
      })
      .then((controls) => {
        if (mounted) controlsRef.current = controls;
        else controls.stop();
      })
      .catch(() => {
        if (mounted) setCameraError("Camera access denied — check browser permissions");
      });

    return () => {
      mounted = false;
      controlsRef.current?.stop();
    };
  }, []); // camera starts once on mount, stops on unmount

  return (
    <div className="panel">
      <div className="panel-head">
        <h3>Live Scan</h3>
        <span style={{ color: "var(--color-muted)", fontSize: "13px" }}>
          Hold unit QR codes in front of the camera
        </span>
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Done Scanning
        </button>
      </div>

      {cameraError ? (
        <div className="live-scan__camera-error">{cameraError}</div>
      ) : (
        <div className="live-scan__container">
          <video ref={videoRef} className="live-scan__video" autoPlay muted playsInline />
          <div className="live-scan__viewfinder" />
          <div className="live-scan__hint">Aim at a unit QR code</div>
          <div className="live-scan__toasts">
            {toasts.map((t) => (
              <div key={t.id} className={`live-scan__toast live-scan__toast--${t.type}`}>
                {t.message}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

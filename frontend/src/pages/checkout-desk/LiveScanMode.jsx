import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { unitsApi } from "../../api/units";

export default function LiveScanMode({ cart, onAddUnit, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const streamRef = useRef(null);
  const cooldownRef = useRef(new Map());
  const cartRef = useRef(cart);
  const onAddUnitRef = useRef(onAddUnit);
  const [toasts, setToasts] = useState([]);
  const [cameraError, setCameraError] = useState(null);
  const [qrBox, setQrBox] = useState(null);
  const resetTimerRef = useRef(null);

  useEffect(() => { cartRef.current = cart; }, [cart]);
  useEffect(() => { onAddUnitRef.current = onAddUnit; }, [onAddUnit]);

  function addToast(message, type) {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  }

  useEffect(() => {
    if (!videoRef.current || !canvasRef.current) {
      setCameraError("Camera unavailable — please reload.");
      return;
    }

    let mounted = true;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    async function handleCode(assetCode) {
      if (!mounted) return;

      const now = Date.now();
      const last = cooldownRef.current.get(assetCode);
      if (last && now - last < 3000) return;
      cooldownRef.current.set(assetCode, now);
      setTimeout(() => cooldownRef.current.delete(assetCode), 3000);

      const inCart = cartRef.current.some((c) => c.unit.asset_code === assetCode);
      if (inCart) {
        addToast(`${assetCode} already in cart`, "error");
        return;
      }

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

    function scanFrame() {
      if (!mounted) return;
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, canvas.width, canvas.height, {
          inversionAttempts: "dontInvert",
        });
        if (code?.data) {
          if (code.location) {
            const corners = [
              code.location.topLeftCorner,
              code.location.topRightCorner,
              code.location.bottomLeftCorner,
              code.location.bottomRightCorner,
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
          handleCode(code.data);
        }
      }
      rafRef.current = requestAnimationFrame(scanFrame);
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
      if (video.srcObject) {
        video.srcObject = null;
      }
    };
  }, []);

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
          <video ref={videoRef} className="live-scan__video" muted playsInline style={{ transform: 'scaleX(-1)' }} />
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
                    transform: 'none',
                    transition: 'left 0.1s ease, top 0.1s ease, width 0.1s ease, height 0.1s ease',
                  }
                : {
                    transition: 'left 0.1s ease, top 0.1s ease, width 0.1s ease, height 0.1s ease',
                  }
            }
          />
          <div className="live-scan__hint">Scan anywhere — camera detects the full frame</div>
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

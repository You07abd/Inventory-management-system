export default function QRCodeDisplay({ item }) {
  if (!item) {
    return null;
  }

  return (
    <div className="qr-panel">
      {item.qr_code ? <img src={item.qr_code} alt={`QR code for ${item.asset_code}`} /> : <div className="qr-empty">No QR</div>}
      <div>
        <span className="label">Asset Code</span>
        <strong>{item.asset_code}</strong>
      </div>
    </div>
  );
}

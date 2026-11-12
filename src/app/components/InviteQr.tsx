"use client";

import { useState } from "react";

export default function InviteQr({ token, candidateName }: { token: string; candidateName: string }) {
  const [qr, setQr] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadQr() {
    if (qr || loading) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/interviews/${encodeURIComponent(token)}/invite`);
      if (!response.ok) throw new Error("Could not load the QR code. Please try again.");
      const data: { qr: string } = await response.json();
      setQr(data.qr);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the QR code. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <details className="invite-qr" onToggle={(e) => { if (e.currentTarget.open) void loadQr(); }}>
      <summary>QR code</summary>
      {loading && <p role="status">Loading QR code...</p>}
      {error && <p className="error" role="alert">{error} <button type="button" onClick={() => void loadQr()}>Retry</button></p>}
      {qr && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="qr" src={qr} alt={`Interview invite QR code for ${candidateName}`} width={160} height={160} />
      )}
    </details>
  );
}

import React, { useEffect, useRef } from "react";
import { CloseIcon } from "./Icons";
import { createGoogleQRCode } from "../utils/googleQr";

function QRCard({ open, url, title, description, ariaLabel }) {
  const qrMount = useRef(null);

  useEffect(() => {
    if (!open || !qrMount.current) return undefined;
    return createGoogleQRCode(qrMount.current, url, { size: 720 });
  }, [open, url]);

  return (
    <article className="join-us-qr-card">
      <div className="join-us-qr-mount" ref={qrMount} aria-label={ariaLabel} />
      <div className="join-us-qr-copy"><h3>{title}</h3><p>{description}</p></div>
    </article>
  );
}

export default function JoinUsDialog({ open, joinUrl, socialUrl, onClose }) {

  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-scrim join-us-scrim" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="join-us-dialog" role="dialog" aria-modal="true" aria-labelledby="join-us-title">
        <button className="icon-button join-us-close" type="button" onClick={onClose} aria-label="Close join dialog">
          <CloseIcon />
        </button>
        <div className="brand-dots join-us-dots" aria-hidden="true"><i /><i /><i /><i /></div>
        <h2 id="join-us-title">Connect with GDG KAU</h2>
        <p>Scan a QR code to join our community or explore all of our online channels.</p>
        <div className="join-us-qr-grid">
          <QRCard open={open} url={joinUrl} title="Join us" description="Become part of the GDG KAU community." ariaLabel="QR code for the GDG KAU join form" />
          <QRCard open={open} url={socialUrl} title="Follow us" description="Website, X, TikTok & more." ariaLabel="QR code for GDG KAU social links" />
        </div>
      </section>
    </div>
  );
}

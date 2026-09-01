import React from "react";

export default function ConfirmDialog({ open, title, message, confirmLabel = "Delete", onCancel, onConfirm }) {
  if (!open) return null;
  return <div className="modal-scrim" role="dialog" aria-modal="true"><div className="confirm-dialog"><div className="danger-mark">!</div><h3>{title}</h3><p>{message}</p><div className="button-row"><button className="secondary-button" onClick={onCancel}>Cancel</button><button className="danger-button" onClick={onConfirm}>{confirmLabel}</button></div></div></div>;
}

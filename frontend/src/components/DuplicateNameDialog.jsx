import React, { useEffect, useRef } from "react";

export default function DuplicateNameDialog({ participant, onConfirm, onRename }) {
  const confirmButton = useRef(null);

  useEffect(() => {
    if (!participant) return undefined;
    confirmButton.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape") onRename();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [participant, onRename]);

  if (!participant) return null;

  return (
    <div className="modal-scrim" role="presentation">
      <section className="duplicate-name-dialog" role="alertdialog" aria-modal="true" aria-labelledby="duplicate-name-title" aria-describedby="duplicate-name-message">
        <div className="duplicate-name-mark">?</div>
        <span className="eyebrow">Participant found</span>
        <h2 id="duplicate-name-title">This name already exists</h2>
        <p id="duplicate-name-message">
          <strong>{participant.displayName}</strong> already has a leaderboard record. Do you want this challenge's points added to the same participant?
        </p>
        <div className="duplicate-name-summary">
          <span><strong>{participant.existingScore || 0}</strong><small>current points</small></span>
          <span><strong>{participant.sessionCount || 0}</strong><small>previous attempt{participant.sessionCount === 1 ? "" : "s"}</small></span>
        </div>
        <div className="duplicate-name-actions">
          <button type="button" className="secondary-button" onClick={onRename}>Write another name</button>
          <button ref={confirmButton} type="button" className="primary-button" onClick={onConfirm}>Yes, use this participant</button>
        </div>
      </section>
    </div>
  );
}

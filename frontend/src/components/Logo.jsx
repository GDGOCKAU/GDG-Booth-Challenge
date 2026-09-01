import gdgLogo from "../assets/gdg-logo.png";

export default function Logo({ compact = false }) {
  return (
    <div className={`logo-lockup ${compact ? "is-compact" : ""}`}>
      <span className="logo-mark" aria-hidden="true">
        <img src={gdgLogo} alt="" />
      </span>
      <span className="logo-copy">
        <strong>GDG KAU</strong>
        {!compact && <small>Booth Challenges</small>}
      </span>
    </div>
  );
}

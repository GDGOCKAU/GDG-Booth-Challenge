import gdgLogo from "../../dist/assets/gdg-logo.png";

export default function Logo({ compact = false }) {
  return (
    <div className="logo-lockup">
      <img src={gdgLogo} alt="GDG Logo" />
      <strong>GDG Booth Challenges</strong>
    </div>
  );
}
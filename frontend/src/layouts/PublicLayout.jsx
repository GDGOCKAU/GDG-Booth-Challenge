import React, { useContext, useState } from "react";
import { Link, Outlet } from "react-router-dom";
import { ThemeContext } from "../App";
import { JOIN_US_URL, SOCIAL_LINKS_URL } from "../config";
import GoogleBar from "../components/GoogleBar";
import GoogleBackdrop from "../components/GoogleBackdrop";
import JoinUsDialog from "../components/JoinUsDialog";
import Logo from "../components/Logo";
import ThemeToggle from "../components/ThemeToggle";

export default function PublicLayout() {
  const { darkMode, toggleTheme, savingTheme } = useContext(ThemeContext);
  const [joinOpen, setJoinOpen] = useState(false);

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/" className="logo-link"><Logo /></Link>
        <nav aria-label="Primary navigation">
          <Link to="/">Leaderboard</Link>
          <button className="join-us-nav" type="button" onClick={() => setJoinOpen(true)}>QR</button>
        </nav>
        <ThemeToggle darkMode={darkMode} onToggle={toggleTheme} disabled={savingTheme} />
      </header>
      <main className="public-main">
        <GoogleBackdrop />
        <div className="public-content"><Outlet /></div>
      </main>
      <GoogleBar />
      <JoinUsDialog open={joinOpen} joinUrl={JOIN_US_URL} socialUrl={SOCIAL_LINKS_URL} onClose={() => setJoinOpen(false)} />
    </div>
  );
}

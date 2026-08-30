import React, { useContext } from "react";
import { Link, Outlet } from "react-router-dom";
import { ThemeContext } from "../App";
import GoogleBar from "../components/GoogleBar";
import GoogleBackdrop from "../components/GoogleBackdrop";
import Logo from "../components/Logo";
import ThemeToggle from "../components/ThemeToggle";

export default function PublicLayout() {
  const { darkMode, toggleTheme, savingTheme } = useContext(ThemeContext);
  return <div className="app-shell"><header className="topbar"><Link to="/" className="logo-link"><Logo /></Link><nav><Link to="/">Leaderboard</Link><Link to="/admin">Admin</Link></nav><ThemeToggle darkMode={darkMode} onToggle={toggleTheme} disabled={savingTheme} /></header><main className="public-main"><GoogleBackdrop /><div className="public-content"><Outlet /></div></main><GoogleBar /></div>;
}

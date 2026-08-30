import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { MotionConfig } from "motion/react";
import { Navigate, Route, Routes } from "react-router-dom";
import { api } from "./api";
import PublicLayout from "./layouts/PublicLayout";
import HomePage from "./pages/HomePage";
import ChallengePage from "./pages/ChallengePage";
import AdminPage from "./pages/AdminPage";

export const ThemeContext = createContext(null);

export default function App() {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("gdg_theme") === "dark");
  const [savingTheme, setSavingTheme] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api("/api/preferences").then((data) => {
      if (cancelled) return;
      const next = data.theme === "Dark";
      setDarkMode(next);
      localStorage.setItem("gdg_theme", next ? "dark" : "light");
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);
  useEffect(() => { document.documentElement.classList.toggle("dark", darkMode); }, [darkMode]);

  const toggleTheme = useCallback(async () => {
    if (savingTheme) return;
    const previous = darkMode;
    const next = !previous;
    setDarkMode(next);
    localStorage.setItem("gdg_theme", next ? "dark" : "light");
    setSavingTheme(true);
    try { await api("/api/preferences", { method: "PATCH", body: JSON.stringify({ theme: next ? "Dark" : "Light" }) }); }
    catch { setDarkMode(previous); localStorage.setItem("gdg_theme", previous ? "dark" : "light"); }
    finally { setSavingTheme(false); }
  }, [darkMode, savingTheme]);

  const value = useMemo(() => ({ darkMode, toggleTheme, savingTheme }), [darkMode, toggleTheme, savingTheme]);
  return <ThemeContext.Provider value={value}><MotionConfig reducedMotion="user"><Routes><Route element={<PublicLayout />}><Route path="/" element={<HomePage />} /><Route path="/challenge/:challengeId" element={<ChallengePage />} /></Route><Route path="/admin" element={<AdminPage />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes></MotionConfig></ThemeContext.Provider>;
}

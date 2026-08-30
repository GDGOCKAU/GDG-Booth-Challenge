import React from "react";
import { MoonIcon, SunIcon } from "./Icons";

export default function ThemeToggle({ darkMode, onToggle, disabled }) {
  return <button className="icon-button theme-toggle" onClick={onToggle} disabled={disabled} aria-label={darkMode ? "Use light mode" : "Use dark mode"}>{darkMode ? <SunIcon /> : <MoonIcon />}</button>;
}

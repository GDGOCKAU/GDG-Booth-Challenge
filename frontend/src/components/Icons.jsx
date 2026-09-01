import React from "react";

const base = { width: 18, height: 18, viewBox: "0 0 18 18", fill: "none" };
export function MoonIcon() { return <svg {...base}><path d="M15 11.5A7 7 0 0 1 6.5 3a6 6 0 1 0 8.5 8.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>; }
export function SunIcon() { return <svg {...base}><circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M9 1.5v2M9 14.5v2M1.5 9h2M14.5 9h2M3.7 3.7l1.4 1.4M12.9 12.9l1.4 1.4M14.3 3.7l-1.4 1.4M5.1 12.9l-1.4 1.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>; }
export function ArrowIcon() { return <svg {...base}><path d="M3 9h12M10.5 4.5 15 9l-4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
export function ClockIcon() { return <svg {...base}><circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.5"/><path d="M9 5.4V9l2.5 1.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
export function DownloadIcon() { return <svg {...base}><path d="M9 2.5v8M5.8 7.6 9 10.8l3.2-3.2M3 14.5h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
export function TrophyIcon() { return <svg {...base}><path d="M5 2.5h8v3.2A4 4 0 0 1 9 9.8a4 4 0 0 1-4-4.1V2.5ZM9 10v3M6.5 15.5h5M5 4H2.5v1.2A3 3 0 0 0 5.2 8M13 4h2.5v1.2A3 3 0 0 1 12.8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
export function CheckIcon() { return <svg {...base}><path d="m3 9 4 4 8-8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
export function CloseIcon() { return <svg {...base}><path d="m4 4 10 10M14 4 4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>; }
export function MenuIcon() { return <svg {...base}><path d="M3 5h12M3 9h12M3 13h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>; }

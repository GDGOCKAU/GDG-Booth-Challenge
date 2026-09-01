// In development, point API requests at the backend port configured in frontend/.env.
// Production stays same-origin by default so the deployed proxy can handle /api.
const apiPort = String(import.meta.env.VITE_API_PORT || "4000").trim();
const developmentApiUrl = `${window.location.protocol}//${window.location.hostname}:${apiPort}`;

export const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "" : developmentApiUrl);
export const JOIN_US_URL = import.meta.env.VITE_JOIN_US_URL || "https://gdgkau.com/join";
export const SOCIAL_LINKS_URL = import.meta.env.VITE_SOCIAL_LINKS_URL || "https://t.co/RH4WnH9mYt";

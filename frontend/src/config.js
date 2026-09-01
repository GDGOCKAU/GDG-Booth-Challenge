// Keep production same-origin by default (rocks.quest can proxy /api to the backend).
export const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "" : "http://localhost:4001");
export const JOIN_US_URL = import.meta.env.VITE_JOIN_US_URL || "https://gdgkau.com/join";
export const SOCIAL_LINKS_URL = import.meta.env.VITE_SOCIAL_LINKS_URL || "https://t.co/RH4WnH9mYt";

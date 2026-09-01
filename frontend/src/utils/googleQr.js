import QRCodeStyling from "qr-code-styling";
import gdgLogo from "../assets/gdg-logo.png";

const GOOGLE_QR_LAYERS = [
  { color: "#FBBC04", clipPath: "inset(0 50% 50% 0)" },
  { color: "#4285F4", clipPath: "inset(0 0 50% 50%)" },
  { color: "#34A853", clipPath: "inset(50% 50% 0 0)" },
  { color: "#EA4335", clipPath: "inset(50% 0 0 50%)" },
];

function createLayer(url, size, color) {
  return new QRCodeStyling({
    width: size,
    height: size,
    type: "canvas",
    data: url,
    margin: 12,
    qrOptions: { errorCorrectionLevel: "H" },
    dotsOptions: { color, type: "rounded" },
    cornersSquareOptions: { color, type: "extra-rounded" },
    cornersDotOptions: { color: "#202124", type: "dot" },
    backgroundOptions: { color: "transparent" },
  });
}

export function createGoogleQRCode(container, url, { size = 720, logoUrl = gdgLogo } = {}) {
  if (!container) throw new Error("A QR code container is required.");
  if (!url?.trim()) throw new Error("A URL is required to create a QR code.");

  container.replaceChildren();

  const wrapper = document.createElement("div");
  wrapper.className = "google-qr-code";
  wrapper.style.setProperty("--qr-size", `${size}px`);

  GOOGLE_QR_LAYERS.forEach(({ color, clipPath }) => {
    const layer = document.createElement("div");
    layer.className = "google-qr-layer";
    layer.style.clipPath = clipPath;
    wrapper.appendChild(layer);
    createLayer(url, size, color).append(layer);
  });

  const logo = document.createElement("div");
  logo.className = "google-qr-logo";
  const image = document.createElement("img");
  image.src = logoUrl;
  image.alt = "";
  logo.appendChild(image);
  wrapper.appendChild(logo);
  container.appendChild(wrapper);

  return () => container.replaceChildren();
}

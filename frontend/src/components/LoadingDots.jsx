import React from "react";

export default function LoadingDots({ label = "", size = 8 }) {
  return <div className="loading-dots-wrap" role="status"><div className="loading-dots" style={{ "--dot-size": `${size}px` }}>{["#4285F4", "#EA4335", "#FBBC04", "#34A853"].map((color, index) => <i key={color} style={{ background: color, animationDelay: `${index * .15}s` }} />)}</div>{label && <span>{label}</span>}</div>;
}

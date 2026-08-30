import React from "react";
import GoogleBar from "./GoogleBar";
import LoadingDots from "./LoadingDots";

export default function LoadingScreen({ title = "Getting things ready" }) {
  return <div className="loading-screen"><div className="decor decor-one" /><div className="decor decor-two" /><LoadingDots size={14} /><h1>{title}</h1><div className="powered"><span className="brand-dots"><i /><i /><i /><i /></span>Powered by GDG KAU</div><GoogleBar /></div>;
}

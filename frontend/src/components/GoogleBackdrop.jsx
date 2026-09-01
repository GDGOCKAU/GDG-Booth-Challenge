import React from "react";
import { motion, useReducedMotion } from "motion/react";

export default function GoogleBackdrop() {
  const reduceMotion = useReducedMotion();
  const slowTurn = reduceMotion ? undefined : { rotate: 360 };
  const slowDrift = reduceMotion ? undefined : { y: [0, -12, 0], x: [0, 7, 0] };

  return (
    <div className="google-backdrop" aria-hidden="true">
      <motion.svg
        className="google-rings rings-top"
        viewBox="0 0 430 430"
        animate={slowTurn}
        transition={{ duration: 70, repeat: Infinity, ease: "linear" }}
      >
        <circle cx="275" cy="170" r="150" stroke="#4285F4" />
        <circle cx="275" cy="170" r="108" stroke="#EA4335" />
        <circle cx="218" cy="212" r="150" stroke="#FBBC04" />
        <circle cx="218" cy="212" r="82" stroke="#34A853" />
      </motion.svg>
      <motion.svg
        className="google-rings rings-bottom"
        viewBox="0 0 360 360"
        animate={reduceMotion ? undefined : { rotate: -360 }}
        transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
      >
        <circle cx="142" cy="210" r="130" stroke="#34A853" />
        <circle cx="142" cy="210" r="92" stroke="#FBBC04" />
        <circle cx="202" cy="150" r="130" stroke="#EA4335" />
        <circle cx="202" cy="150" r="70" stroke="#4285F4" />
      </motion.svg>
      <motion.span className="google-shape shape-blue" animate={slowDrift} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }} />
      <motion.span className="google-shape shape-red" animate={slowDrift} transition={{ duration: 8, delay: 1, repeat: Infinity, ease: "easeInOut" }} />
      <motion.span className="google-shape shape-yellow" animate={slowDrift} transition={{ duration: 6, delay: 0.5, repeat: Infinity, ease: "easeInOut" }} />
      <motion.span className="google-shape shape-green" animate={slowDrift} transition={{ duration: 9, delay: 1.5, repeat: Infinity, ease: "easeInOut" }} />
    </div>
  );
}

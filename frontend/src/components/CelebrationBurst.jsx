import React from "react";
import { motion, useReducedMotion } from "motion/react";
import { GOOGLE } from "../theme";

const colors = [GOOGLE.blue, GOOGLE.red, GOOGLE.yellow, GOOGLE.green];
const pieces = Array.from({ length: 32 }, (_, index) => {
  const angle = (Math.PI * 2 * index) / 32;
  const distance = 150 + (index % 5) * 23;
  return {
    id: index,
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance - 45,
    rotate: 180 + index * 47,
    color: colors[index % colors.length],
    round: index % 4 === 0,
  };
});

export default function CelebrationBurst({ active }) {
  const reduceMotion = useReducedMotion();
  if (!active || reduceMotion) return null;

  return (
    <div className="celebration-burst" aria-hidden="true">
      {pieces.map((piece) => (
        <motion.i
          key={piece.id}
          className={piece.round ? "round" : ""}
          style={{ background: piece.color }}
          initial={{ x: 0, y: 0, rotate: 0, scale: 0.35, opacity: 0 }}
          animate={{
            x: piece.x,
            y: [0, piece.y - 22, piece.y],
            rotate: piece.rotate,
            scale: [0.35, 1.15, 0.85],
            opacity: [0, 1, 1, 0],
          }}
          transition={{ duration: 2.1, delay: 0.04 + (piece.id % 6) * 0.035, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

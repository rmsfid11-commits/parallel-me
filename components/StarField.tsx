"use client";

import { useMemo } from "react";

/* ═══════════════════════════════════════════
   CSS-Based StarField (GPU Accelerated)
   500+ stars on desktop, 300 on mobile
   ═══════════════════════════════════════════ */

interface Star {
  x: number; // % position
  y: number;
  size: number;
  type: "small" | "medium" | "large";
  color: string;
  opacityFrom: number;
  opacityTo: number;
  duration: number;
  delay: number;
  isPurple?: boolean;
}

function generateStars(isMobile: boolean): Star[] {
  const stars: Star[] = [];
  const smallCount = isMobile ? 220 : 400;
  const mediumCount = isMobile ? 60 : 80;
  const largeCount = isMobile ? 12 : 20;

  // Small stars (1-2px, white, varied opacity)
  for (let i = 0; i < smallCount; i++) {
    stars.push({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 1 + Math.random(),
      type: "small",
      color: `rgba(255, 255, 255, ${0.4 + Math.random() * 0.6})`,
      opacityFrom: 0.15 + Math.random() * 0.25,
      opacityTo: 0.6 + Math.random() * 0.4,
      duration: 1 + Math.random() * 3,
      delay: Math.random() * 4,
    });
  }

  // Medium stars (3px, white/light gold, brighter twinkle)
  for (let i = 0; i < mediumCount; i++) {
    const isGold = Math.random() < 0.3;
    stars.push({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 2.5 + Math.random() * 0.5,
      type: "medium",
      color: isGold
        ? `rgba(212, 190, 140, ${0.6 + Math.random() * 0.4})`
        : `rgba(220, 225, 255, ${0.6 + Math.random() * 0.4})`,
      opacityFrom: 0.3 + Math.random() * 0.2,
      opacityTo: 0.8 + Math.random() * 0.2,
      duration: 1.5 + Math.random() * 2.5,
      delay: Math.random() * 4,
    });
  }

  // Large stars (4-5px, gold/purple, cross glow)
  for (let i = 0; i < largeCount; i++) {
    const isPurple = Math.random() < 0.4;
    stars.push({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 3.5 + Math.random() * 1.5,
      type: "large",
      color: isPurple
        ? "rgba(179, 136, 255, 0.9)"
        : "rgba(212, 185, 120, 0.95)",
      opacityFrom: 0.5,
      opacityTo: 1,
      duration: 2.5 + Math.random() * 1.5,
      delay: Math.random() * 3,
      isPurple,
    });
  }

  return stars;
}

export default function StarField() {
  const stars = useMemo(() => {
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    return generateStars(isMobile);
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {/* Stars */}
      {stars.map((star, i) => (
        <div
          key={i}
          className={
            star.type === "large"
              ? star.isPurple
                ? "star-large-purple"
                : "star-large"
              : star.type === "medium"
                ? "star-medium"
                : "star-small"
          }
          style={{
            position: "absolute",
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            borderRadius: "50%",
            background: star.color,
            "--tw-from": star.opacityFrom,
            "--tw-to": star.opacityTo,
            "--tw-dur": `${star.duration}s`,
            "--tw-delay": `${star.delay}s`,
          } as React.CSSProperties}
        />
      ))}

      {/* Milky way diagonal gradient overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(135deg, transparent 20%, rgba(180, 185, 255, 0.08) 40%, rgba(200, 200, 255, 0.12) 50%, rgba(180, 185, 255, 0.08) 60%, transparent 80%)",
          pointerEvents: "none",
        }}
      />

      {/* Nebula 1: top-left corner */}
      <div
        className="animate-nebulaBreathe"
        style={{
          position: "absolute",
          top: "5%",
          left: "5%",
          width: "300px",
          height: "300px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(50, 30, 90, 0.08) 0%, rgba(30, 20, 60, 0.04) 50%, transparent 70%)",
          filter: "blur(40px)",
          pointerEvents: "none",
        }}
      />

      {/* Nebula 2: bottom-right corner */}
      <div
        className="animate-nebulaBreathe"
        style={{
          position: "absolute",
          bottom: "10%",
          right: "8%",
          width: "250px",
          height: "250px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(40, 25, 75, 0.06) 0%, rgba(25, 15, 55, 0.03) 50%, transparent 70%)",
          filter: "blur(40px)",
          pointerEvents: "none",
          animationDelay: "4s",
        }}
      />
    </div>
  );
}

"use client";

import { useEffect, useState, useRef } from "react";

interface ForkEffectProps {
  active: boolean;
  x?: number;
  y?: number;
  onComplete: () => void;
}

interface Particle {
  id: number;
  tx: number;
  ty: number;
  delay: number;
}

export default function ForkEffect({ active, x, y, onComplete }: ForkEffectProps) {
  const [visible, setVisible] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    if (!active) return;

    setVisible(true);

    // Generate 8 sparkle particles with random directions
    const newParticles: Particle[] = [];
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const dist = 60 + Math.random() * 80;
      newParticles.push({
        id: i,
        tx: Math.cos(angle) * dist,
        ty: Math.sin(angle) * dist,
        delay: Math.random() * 0.15,
      });
    }
    setParticles(newParticles);

    timerRef.current = setTimeout(() => {
      setVisible(false);
      setParticles([]);
      onComplete();
    }, 1200);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [active, onComplete]);

  if (!visible) return null;

  const cx = x ?? (typeof window !== "undefined" ? window.innerWidth / 2 : 200);
  const cy = y ?? (typeof window !== "undefined" ? window.innerHeight / 2 : 400);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 45,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {/* Central burst - gold to purple gradient */}
      <div
        className="animate-forkBurst"
        style={{
          position: "absolute",
          left: cx - 30,
          top: cy - 30,
          width: 60,
          height: 60,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(212,168,83,0.8), rgba(179,136,255,0.6), transparent)",
        }}
      />

      {/* Ring 1 */}
      <div
        className="animate-forkRing"
        style={{
          position: "absolute",
          left: cx - 40,
          top: cy - 40,
          width: 80,
          height: 80,
          borderRadius: "50%",
          border: "2px solid rgba(212,168,83,0.5)",
          background: "transparent",
        }}
      />

      {/* Ring 2 (delayed) */}
      <div
        className="animate-forkRing"
        style={{
          position: "absolute",
          left: cx - 40,
          top: cy - 40,
          width: 80,
          height: 80,
          borderRadius: "50%",
          border: "2px solid rgba(179,136,255,0.4)",
          background: "transparent",
          animationDelay: "0.15s",
        }}
      />

      {/* Sparkle particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="animate-branchSparkle"
          style={{
            position: "absolute",
            left: cx - 3,
            top: cy - 3,
            width: 6,
            height: 6,
            borderRadius: "50%",
            background:
              p.id % 2 === 0
                ? "rgba(212,168,83,0.9)"
                : "rgba(179,136,255,0.9)",
            boxShadow:
              p.id % 2 === 0
                ? "0 0 8px rgba(212,168,83,0.6)"
                : "0 0 8px rgba(179,136,255,0.6)",
            "--tx": `${p.tx}px`,
            "--ty": `${p.ty}px`,
            animationDelay: `${p.delay}s`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";

interface Star {
  x: number; y: number;
  size: number;
  glowSize: number;
  speed: number;
  phase: number;
  r: number; g: number; b: number;
  hasFlare: boolean;
}

interface Mote {
  x: number; y: number;
  vx: number; vy: number;
  size: number;
  opacity: number;
  phase: number;
  isGold: boolean;
}

function createStars(): Star[] {
  const stars: Star[] = [];

  // Tiny dust
  for (let i = 0; i < 160; i++) {
    stars.push({
      x: Math.random(), y: Math.random(),
      size: Math.random() * 0.7 + 0.3,
      glowSize: 0,
      speed: 0.3 + Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2,
      r: 200 + Math.random() * 55,
      g: 200 + Math.random() * 55,
      b: 215 + Math.random() * 40,
      hasFlare: false,
    });
  }

  // Medium stars with glow halo
  for (let i = 0; i < 35; i++) {
    stars.push({
      x: Math.random(), y: Math.random(),
      size: Math.random() * 1 + 0.8,
      glowSize: 4 + Math.random() * 4,
      speed: 0.2 + Math.random() * 0.4,
      phase: Math.random() * Math.PI * 2,
      r: 230 + Math.random() * 25,
      g: 225 + Math.random() * 30,
      b: 235 + Math.random() * 20,
      hasFlare: false,
    });
  }

  // Bright accent stars with cross flare
  for (let i = 0; i < 8; i++) {
    const isGold = Math.random() > 0.4;
    stars.push({
      x: Math.random(), y: Math.random(),
      size: Math.random() * 1.2 + 1.3,
      glowSize: 8 + Math.random() * 6,
      speed: 0.15 + Math.random() * 0.25,
      phase: Math.random() * Math.PI * 2,
      r: isGold ? 212 : 190,
      g: isGold ? 168 : 170,
      b: isGold ? 83 : 255,
      hasFlare: true,
    });
  }

  return stars;
}

function createMotes(count: number): Mote[] {
  const motes: Mote[] = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.05 + Math.random() * 0.15;
    motes.push({
      x: Math.random(),
      y: Math.random(),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 1 + Math.random() * 2,
      opacity: 0.15 + Math.random() * 0.4,
      phase: Math.random() * Math.PI * 2,
      isGold: Math.random() > 0.3,
    });
  }
  return motes;
}

export default function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>(createStars());
  const motesRef = useRef<Mote[]>(createMotes(40));
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const stars = starsRef.current;
    const motes = motesRef.current;

    const draw = (time: number) => {
      const t = time * 0.001;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.clearRect(0, 0, w, h);

      // ── Stars ──
      for (const s of stars) {
        const twinkle = Math.sin(t * s.speed * 2 + s.phase) * 0.35 + 0.65;
        const alpha = twinkle;
        const sx = s.x * w;
        const sy = s.y * h;

        // Glow halo
        if (s.glowSize > 0) {
          const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, s.glowSize);
          glow.addColorStop(0, `rgba(${s.r}, ${s.g}, ${s.b}, ${alpha * 0.12})`);
          glow.addColorStop(1, "transparent");
          ctx.fillStyle = glow;
          ctx.fillRect(sx - s.glowSize, sy - s.glowSize, s.glowSize * 2, s.glowSize * 2);
        }

        // Cross flare
        if (s.hasFlare) {
          const flareLen = s.size * 5 * twinkle;
          ctx.strokeStyle = `rgba(${s.r}, ${s.g}, ${s.b}, ${alpha * 0.2})`;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(sx - flareLen, sy);
          ctx.lineTo(sx + flareLen, sy);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(sx, sy - flareLen);
          ctx.lineTo(sx, sy + flareLen);
          ctx.stroke();
        }

        // Star dot
        ctx.beginPath();
        ctx.arc(sx, sy, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${s.r}, ${s.g}, ${s.b}, ${alpha})`;
        ctx.fill();
      }

      // ── Floating motes (light particles drifting) ──
      ctx.globalCompositeOperation = "lighter";

      for (const m of motes) {
        // Drift
        m.x += m.vx / w;
        m.y += m.vy / h;

        // Wrap around
        if (m.x < -0.02) m.x = 1.02;
        if (m.x > 1.02) m.x = -0.02;
        if (m.y < -0.02) m.y = 1.02;
        if (m.y > 1.02) m.y = -0.02;

        const mx = m.x * w;
        const my = m.y * h;
        const breathe = Math.sin(t * 0.5 + m.phase) * 0.3 + 0.7;
        const alpha = m.opacity * breathe;

        const r = m.isGold ? 255 : 200;
        const g = m.isGold ? 220 : 170;
        const b = m.isGold ? 150 : 255;

        // Soft glow
        const glowR = m.size * 5;
        const glow = ctx.createRadialGradient(mx, my, 0, mx, my, glowR);
        glow.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha * 0.25})`);
        glow.addColorStop(1, "transparent");
        ctx.fillStyle = glow;
        ctx.fillRect(mx - glowR, my - glowR, glowR * 2, glowR * 2);

        // Dot
        ctx.beginPath();
        ctx.arc(mx, my, m.size * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.7})`;
        ctx.fill();
      }

      ctx.globalCompositeOperation = "source-over";

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        background: "#08061a",
      }}
    />
  );
}

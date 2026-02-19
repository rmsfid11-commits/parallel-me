"use client";

import { useEffect, useRef } from "react";

/* ═══════════════════════════════════════════
   H-R Diagram Star Color Temperatures
   ═══════════════════════════════════════════ */
const STAR_COLORS = {
  OB: { r: 155, g: 176, b: 255 },  // O/B type: blue-white (9000K+)
  A:  { r: 202, g: 215, b: 255 },  // A type: white (7500K)
  F:  { r: 248, g: 247, b: 255 },  // F type: pale yellow (6000K)
  G:  { r: 255, g: 244, b: 234 },  // G type: yellow (5500K)
  K:  { r: 255, g: 210, b: 161 },  // K type: orange (4000K)
  M:  { r: 255, g: 187, b: 123 },  // M type: red (3000K)
};

type StarType = "tiny" | "small" | "medium" | "bright";

interface Star {
  x: number; y: number;
  size: number;
  glowSize: number;
  r: number; g: number; b: number;
  hasFlare: boolean;
  type: StarType;
  // Scintillation params
  fastFreq: number;
  slowFreq: number;
  phase1: number;
  phase2: number;
  phase3: number;  // for bright stars extra micro-twinkle
}

interface NebulaCloud {
  x: number; y: number;
  radius: number;
  r: number; g: number; b: number;
  opacity: number;
  driftX: number; driftY: number;
  phase: number;
  breatheSpeed: number;
}

/* ── Pick color by type distribution ── */
function pickColor(type: StarType): { r: number; g: number; b: number } {
  const rand = Math.random();
  if (type === "tiny" || type === "small") {
    // 70% A/F
    if (rand < 0.35) return STAR_COLORS.A;
    if (rand < 0.70) return STAR_COLORS.F;
    if (rand < 0.85) return STAR_COLORS.G;
    return STAR_COLORS.K;
  } else if (type === "medium") {
    // 60% G/K
    if (rand < 0.30) return STAR_COLORS.G;
    if (rand < 0.60) return STAR_COLORS.K;
    if (rand < 0.80) return STAR_COLORS.A;
    return STAR_COLORS.F;
  } else {
    // bright: 40% O/B, 30% M, 30% gold/purple accent
    if (rand < 0.40) return STAR_COLORS.OB;
    if (rand < 0.70) return STAR_COLORS.M;
    if (rand < 0.85) return { r: 212, g: 168, b: 83 }; // gold accent
    return { r: 190, g: 170, b: 255 }; // purple accent
  }
}

/* ── Milky Way band density check ── */
function isInMilkyWay(x: number, y: number): boolean {
  // Diagonal band from bottom-left to top-right
  // Band equation: y = -x + 1 (center line), width ~0.3
  const dist = Math.abs(y - (-x + 1)) / Math.SQRT2;
  return dist < 0.18;
}

function createStars(): Star[] {
  const stars: Star[] = [];

  const addStar = (type: StarType) => {
    let x = Math.random();
    let y = Math.random();

    // Milky Way density boost: 50% chance to re-roll into the band
    if (Math.random() < 0.35 && !isInMilkyWay(x, y)) {
      // Place in milky way band region
      const t = Math.random();
      const centerX = t;
      const centerY = -t + 1;
      const offset = (Math.random() - 0.5) * 0.3;
      x = centerX + offset * 0.7;
      y = centerY + offset * 0.7;
      x = Math.max(0, Math.min(1, x));
      y = Math.max(0, Math.min(1, y));
    }

    const color = pickColor(type);
    let size: number, glowSize: number, hasFlare: boolean;

    switch (type) {
      case "tiny":
        size = 0.2 + Math.random() * 0.6;
        glowSize = 0;
        hasFlare = false;
        break;
      case "small":
        size = 0.8 + Math.random() * 0.7;
        glowSize = 1 + Math.random() * 2;
        hasFlare = false;
        break;
      case "medium":
        size = 1.5 + Math.random() * 1.0;
        glowSize = 4 + Math.random() * 4;
        hasFlare = false;
        break;
      case "bright":
        size = 2 + Math.random() * 2;
        glowSize = 8 + Math.random() * 10;
        hasFlare = true;
        break;
    }

    stars.push({
      x, y, size, glowSize,
      r: color.r, g: color.g, b: color.b,
      hasFlare, type,
      fastFreq: 1.5 + Math.random() * 2.5,
      slowFreq: 0.2 + Math.random() * 0.4,
      phase1: Math.random() * Math.PI * 2,
      phase2: Math.random() * Math.PI * 2,
      phase3: Math.random() * Math.PI * 2,
    });
  };

  // Tiny dust: 1000
  for (let i = 0; i < 1000; i++) addStar("tiny");
  // Small: 300
  for (let i = 0; i < 300; i++) addStar("small");
  // Medium: 150
  for (let i = 0; i < 150; i++) addStar("medium");
  // Bright: 50
  for (let i = 0; i < 50; i++) addStar("bright");

  return stars;
}

function createNebulaClouds(): NebulaCloud[] {
  const clouds: NebulaCloud[] = [];
  const palette = [
    { r: 30, g: 20, b: 80 },
    { r: 60, g: 30, b: 100 },
    { r: 20, g: 15, b: 60 },
    { r: 80, g: 50, b: 30 },
    { r: 40, g: 20, b: 70 },
    { r: 15, g: 25, b: 55 },
  ];

  for (let i = 0; i < 6; i++) {
    const color = palette[i % palette.length];
    const angle = Math.random() * Math.PI * 2;
    const driftSpeed = 0.002 + Math.random() * 0.004;
    clouds.push({
      x: 0.1 + Math.random() * 0.8,
      y: 0.1 + Math.random() * 0.8,
      radius: 0.15 + Math.random() * 0.2,
      r: color.r, g: color.g, b: color.b,
      opacity: 0.06 + Math.random() * 0.08,
      driftX: Math.cos(angle) * driftSpeed,
      driftY: Math.sin(angle) * driftSpeed,
      phase: Math.random() * Math.PI * 2,
      breatheSpeed: 0.15 + Math.random() * 0.15,
    });
  }
  return clouds;
}

/* ═══════════════════════════════════════════
   StarField Component
   ═══════════════════════════════════════════ */
export default function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>(createStars());
  const nebulaRef = useRef<NebulaCloud[]>(createNebulaClouds());
  const rafRef = useRef<number>(0);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenDirtyRef = useRef(true);
  const lastOffscreenTimeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0, h = 0;

    // Create offscreen canvas for static stars
    const offscreen = document.createElement("canvas");
    offscreenRef.current = offscreen;
    const offCtx = offscreen.getContext("2d")!;

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      offscreen.width = w * dpr;
      offscreen.height = h * dpr;
      offCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      offscreenDirtyRef.current = true;
    };
    resize();
    window.addEventListener("resize", resize);

    const stars = starsRef.current;
    const nebulae = nebulaRef.current;

    // Separate stars by render tier
    const staticStars = stars.filter(s => s.type === "tiny" || s.type === "small");
    const dynamicStars = stars.filter(s => s.type === "medium" || s.type === "bright");

    /* ── Draw static stars onto offscreen canvas ── */
    const renderOffscreen = (t: number) => {
      offCtx.clearRect(0, 0, w, h);

      // Milky Way diffuse glow band
      const grad = offCtx.createLinearGradient(0, h, w, 0);
      grad.addColorStop(0, "transparent");
      grad.addColorStop(0.3, "rgba(180, 190, 255, 0.025)");
      grad.addColorStop(0.45, "rgba(200, 200, 255, 0.045)");
      grad.addColorStop(0.55, "rgba(200, 200, 255, 0.045)");
      grad.addColorStop(0.7, "rgba(180, 190, 255, 0.025)");
      grad.addColorStop(1, "transparent");
      offCtx.fillStyle = grad;
      offCtx.fillRect(0, 0, w, h);

      // Second, narrower milky way core
      const grad2 = offCtx.createLinearGradient(0, h, w, 0);
      grad2.addColorStop(0, "transparent");
      grad2.addColorStop(0.4, "rgba(220, 210, 255, 0.015)");
      grad2.addColorStop(0.48, "rgba(240, 230, 255, 0.035)");
      grad2.addColorStop(0.52, "rgba(240, 230, 255, 0.035)");
      grad2.addColorStop(0.6, "rgba(220, 210, 255, 0.015)");
      grad2.addColorStop(1, "transparent");
      offCtx.fillStyle = grad2;
      offCtx.fillRect(0, 0, w, h);

      for (const s of staticStars) {
        // Slow scintillation for static layer (updated every ~1s)
        const twinkle = Math.sin(t * s.slowFreq + s.phase2) * 0.25 + 0.75;
        const alpha = twinkle;
        const sx = s.x * w;
        const sy = s.y * h;

        // Small glow for "small" type
        if (s.glowSize > 0) {
          const gRad = s.glowSize;
          const glow = offCtx.createRadialGradient(sx, sy, 0, sx, sy, gRad);
          glow.addColorStop(0, `rgba(${s.r},${s.g},${s.b},${alpha * 0.12})`);
          glow.addColorStop(1, "transparent");
          offCtx.fillStyle = glow;
          offCtx.fillRect(sx - gRad, sy - gRad, gRad * 2, gRad * 2);
        }

        // Star dot
        offCtx.beginPath();
        offCtx.arc(sx, sy, s.size, 0, Math.PI * 2);
        offCtx.fillStyle = `rgba(${s.r},${s.g},${s.b},${alpha})`;
        offCtx.fill();
      }
    };

    /* ── Main render loop ── */
    const draw = (time: number) => {
      const t = time * 0.001;

      ctx.clearRect(0, 0, w, h);

      // ── Nebula clouds (behind everything) ──
      for (const cloud of nebulae) {
        cloud.x += cloud.driftX / w;
        cloud.y += cloud.driftY / h;
        if (cloud.x < -0.3) cloud.x = 1.3;
        if (cloud.x > 1.3) cloud.x = -0.3;
        if (cloud.y < -0.3) cloud.y = 1.3;
        if (cloud.y > 1.3) cloud.y = -0.3;

        const breathe = Math.sin(t * cloud.breatheSpeed + cloud.phase) * 0.3 + 0.7;
        const alpha = cloud.opacity * breathe;
        const cx = cloud.x * w;
        const cy = cloud.y * h;
        const r = cloud.radius * Math.max(w, h);

        const colorShift = Math.sin(t * 0.05 + cloud.phase) * 0.5 + 0.5;
        const nr = cloud.r + colorShift * 15;
        const ng = cloud.g + colorShift * 10;
        const nb = cloud.b + colorShift * 20;

        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        grad.addColorStop(0, `rgba(${nr},${ng},${nb},${alpha})`);
        grad.addColorStop(0.4, `rgba(${nr},${ng},${nb},${alpha * 0.5})`);
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      }

      // ── Offscreen static layer (re-render every ~1.5s) ──
      if (offscreenDirtyRef.current || t - lastOffscreenTimeRef.current > 1.5) {
        renderOffscreen(t);
        lastOffscreenTimeRef.current = t;
        offscreenDirtyRef.current = false;
      }
      ctx.drawImage(offscreen, 0, 0, w * dpr, h * dpr, 0, 0, w, h);

      // ── Dynamic stars (medium + bright) — real-time render ──
      for (const s of dynamicStars) {
        // Dual-frequency scintillation
        const fast = Math.sin(t * s.fastFreq + s.phase1) * 0.15;
        const slow = Math.sin(t * s.slowFreq + s.phase2) * 0.25;
        let twinkle = fast + slow + 0.6;

        // Bright stars: extra micro-twinkle
        if (s.type === "bright") {
          twinkle += Math.sin(t * 6 + s.phase3) * 0.08;
        }
        twinkle = Math.max(0.15, Math.min(1, twinkle));

        const sx = s.x * w;
        const sy = s.y * h;

        // Glow halo
        if (s.glowSize > 0) {
          const gs = s.glowSize * (0.8 + twinkle * 0.2);
          const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, gs);
          glow.addColorStop(0, `rgba(${s.r},${s.g},${s.b},${twinkle * 0.15})`);
          glow.addColorStop(0.5, `rgba(${s.r},${s.g},${s.b},${twinkle * 0.05})`);
          glow.addColorStop(1, "transparent");
          ctx.fillStyle = glow;
          ctx.fillRect(sx - gs, sy - gs, gs * 2, gs * 2);
        }

        // Cross flare for bright stars
        if (s.hasFlare) {
          const flareLen = s.size * 6 * twinkle;
          ctx.strokeStyle = `rgba(${s.r},${s.g},${s.b},${twinkle * 0.18})`;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(sx - flareLen, sy);
          ctx.lineTo(sx + flareLen, sy);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(sx, sy - flareLen);
          ctx.lineTo(sx, sy + flareLen);
          ctx.stroke();

          // Diagonal flares
          const diagLen = flareLen * 0.5;
          ctx.strokeStyle = `rgba(${s.r},${s.g},${s.b},${twinkle * 0.08})`;
          ctx.beginPath();
          ctx.moveTo(sx - diagLen, sy - diagLen);
          ctx.lineTo(sx + diagLen, sy + diagLen);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(sx + diagLen, sy - diagLen);
          ctx.lineTo(sx - diagLen, sy + diagLen);
          ctx.stroke();
        }

        // Star dot
        ctx.beginPath();
        ctx.arc(sx, sy, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${s.r},${s.g},${s.b},${twinkle})`;
        ctx.fill();
      }

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
        background: "#020208",
      }}
    />
  );
}

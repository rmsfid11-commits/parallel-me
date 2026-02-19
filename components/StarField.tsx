"use client";

import { useEffect, useRef } from "react";

/* ═══════════════════════════════════════════
   Ultra-Realistic StarField
   6500+ stars, pixel-level dust rendering,
   photorealistic milky way band
   ═══════════════════════════════════════════ */

const COLORS: [number, number, number][] = [
  [155, 176, 255],  // O/B blue-white
  [170, 191, 255],  // B blue
  [202, 215, 255],  // A white
  [248, 247, 255],  // F pale
  [255, 244, 234],  // G yellow
  [255, 224, 188],  // K orange-yellow
  [255, 210, 161],  // K orange
  [255, 187, 123],  // M red
];

function gaussRand(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function pickDustColor(): [number, number, number] {
  const r = Math.random();
  if (r < 0.30) return COLORS[2];
  if (r < 0.55) return COLORS[3];
  if (r < 0.70) return COLORS[4];
  if (r < 0.82) return COLORS[1];
  if (r < 0.92) return COLORS[5];
  return COLORS[0];
}

function pickBrightColor(): [number, number, number] {
  const r = Math.random();
  if (r < 0.25) return COLORS[0];
  if (r < 0.45) return COLORS[7];
  if (r < 0.60) return [212, 168, 83];
  if (r < 0.75) return [190, 170, 255];
  if (r < 0.88) return COLORS[2];
  return COLORS[6];
}

interface DustStar {
  px: number; py: number;
  nx: number; ny: number;
  brightness: number;
  r: number; g: number; b: number;
  twinkleSpeed: number;
  twinklePhase: number;
}

interface GlowStar {
  nx: number; ny: number;
  size: number;
  glowRadius: number;
  r: number; g: number; b: number;
  hasFlare: boolean;
  fastFreq: number; slowFreq: number;
  phase1: number; phase2: number; phase3: number;
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

function createDustStars(): DustStar[] {
  const stars: DustStar[] = [];

  // Uniform scatter (background) — 2500
  for (let i = 0; i < 2500; i++) {
    const nx = Math.random();
    const ny = Math.random();
    const [r, g, b] = pickDustColor();
    // Milky way density boost
    const dist = Math.abs(ny - (-nx + 1.05)) / Math.SQRT2;
    const mwBoost = Math.exp(-dist * dist / 0.04) * 0.2;
    stars.push({
      px: 0, py: 0, nx, ny,
      brightness: 0.15 + Math.random() * 0.4 + mwBoost,
      r, g, b,
      twinkleSpeed: 0.3 + Math.random() * 1.2,
      twinklePhase: Math.random() * Math.PI * 2,
    });
  }

  // Milky way concentrated — 3000
  for (let i = 0; i < 3000; i++) {
    const t = Math.random();
    const perpOffset = gaussRand() * 0.09;
    const nx = Math.max(0, Math.min(1, t + perpOffset * 0.707));
    const ny = Math.max(0, Math.min(1, -t + 1.05 + perpOffset * 0.707));
    const [r, g, b] = pickDustColor();
    const depthBright = Math.exp(-Math.abs(perpOffset) * 8) * 0.25;
    stars.push({
      px: 0, py: 0, nx, ny,
      brightness: 0.08 + Math.random() * 0.3 + depthBright,
      r, g, b,
      twinkleSpeed: 0.2 + Math.random() * 0.8,
      twinklePhase: Math.random() * Math.PI * 2,
    });
  }

  // Star clusters — 5 × 200
  for (let c = 0; c < 5; c++) {
    const ct = 0.15 + Math.random() * 0.7;
    const cx = ct;
    const cy = -ct + 1.05 + (Math.random() - 0.5) * 0.06;
    for (let i = 0; i < 200; i++) {
      const nx = Math.max(0, Math.min(1, cx + gaussRand() * 0.025));
      const ny = Math.max(0, Math.min(1, cy + gaussRand() * 0.025));
      const [r, g, b] = pickDustColor();
      stars.push({
        px: 0, py: 0, nx, ny,
        brightness: 0.1 + Math.random() * 0.45,
        r, g, b,
        twinkleSpeed: 0.3 + Math.random() * 1.0,
        twinklePhase: Math.random() * Math.PI * 2,
      });
    }
  }
  return stars;
}

function createGlowStars(): GlowStar[] {
  const stars: GlowStar[] = [];
  // Medium: 60
  for (let i = 0; i < 60; i++) {
    let nx = Math.random(), ny = Math.random();
    if (Math.random() < 0.4) {
      const t = Math.random();
      nx = Math.max(0, Math.min(1, t + gaussRand() * 0.12));
      ny = Math.max(0, Math.min(1, -t + 1.05 + gaussRand() * 0.12));
    }
    const [r, g, b] = pickDustColor();
    stars.push({
      nx, ny, size: 0.6 + Math.random() * 0.6,
      glowRadius: 2 + Math.random() * 3,
      r, g, b, hasFlare: false,
      fastFreq: 1.5 + Math.random() * 2.5,
      slowFreq: 0.2 + Math.random() * 0.4,
      phase1: Math.random() * Math.PI * 2,
      phase2: Math.random() * Math.PI * 2,
      phase3: Math.random() * Math.PI * 2,
    });
  }
  // Bright: 25
  for (let i = 0; i < 25; i++) {
    const [r, g, b] = pickBrightColor();
    stars.push({
      nx: Math.random(), ny: Math.random(),
      size: 1.0 + Math.random() * 1.2,
      glowRadius: 5 + Math.random() * 7,
      r, g, b, hasFlare: true,
      fastFreq: 1.5 + Math.random() * 2.5,
      slowFreq: 0.15 + Math.random() * 0.3,
      phase1: Math.random() * Math.PI * 2,
      phase2: Math.random() * Math.PI * 2,
      phase3: Math.random() * Math.PI * 2,
    });
  }
  return stars;
}

function createNebulae(): NebulaCloud[] {
  const clouds: NebulaCloud[] = [];
  const palette = [
    { r: 35, g: 25, b: 80 }, { r: 55, g: 30, b: 90 },
    { r: 25, g: 20, b: 65 }, { r: 70, g: 40, b: 35 },
    { r: 40, g: 25, b: 75 }, { r: 20, g: 30, b: 60 },
    { r: 50, g: 20, b: 60 }, { r: 30, g: 35, b: 70 },
  ];
  for (let i = 0; i < 8; i++) {
    const color = palette[i];
    const t = 0.1 + (i / 8) * 0.8;
    const angle = Math.random() * Math.PI * 2;
    const ds = 0.001 + Math.random() * 0.003;
    clouds.push({
      x: t + (Math.random() - 0.5) * 0.15,
      y: -t + 1.05 + (Math.random() - 0.5) * 0.15,
      radius: 0.08 + Math.random() * 0.14,
      r: color.r, g: color.g, b: color.b,
      opacity: 0.04 + Math.random() * 0.06,
      driftX: Math.cos(angle) * ds, driftY: Math.sin(angle) * ds,
      phase: Math.random() * Math.PI * 2,
      breatheSpeed: 0.1 + Math.random() * 0.15,
    });
  }
  return clouds;
}

/* ═══════════════════════════════════════════ */
export default function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const dustRef = useRef<DustStar[]>(createDustStars());
  const glowRef = useRef<GlowStar[]>(createGlowStars());
  const nebulaRef = useRef<NebulaCloud[]>(createNebulae());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let pw = 0, ph = 0;
    let lw = 0, lh = 0;

    // Offscreen 1: milky way glow gradients
    const glowCanvas = document.createElement("canvas");
    const glowCtx = glowCanvas.getContext("2d", { alpha: true })!;

    // Offscreen 2: dust star pixels (putImageData here, drawImage to main)
    const dustCanvas = document.createElement("canvas");
    const dustCtx = dustCanvas.getContext("2d", { alpha: true })!;

    let needsRebuild = true;
    let lastDustT = -999;

    const dust = dustRef.current;
    const glow = glowRef.current;
    const nebulae = nebulaRef.current;

    const resize = () => {
      lw = window.innerWidth;
      lh = window.innerHeight;
      pw = Math.round(lw * dpr);
      ph = Math.round(lh * dpr);

      canvas.width = pw;
      canvas.height = ph;
      canvas.style.width = `${lw}px`;
      canvas.style.height = `${lh}px`;

      glowCanvas.width = pw;
      glowCanvas.height = ph;
      dustCanvas.width = pw;
      dustCanvas.height = ph;

      for (const s of dust) {
        s.px = Math.round(s.nx * pw);
        s.py = Math.round(s.ny * ph);
      }
      needsRebuild = true;
    };
    resize();
    window.addEventListener("resize", resize);

    /* ── Render milky way glow to offscreen ── */
    const renderGlow = () => {
      glowCtx.clearRect(0, 0, pw, ph);

      const g1 = glowCtx.createLinearGradient(0, ph, pw, 0);
      g1.addColorStop(0, "transparent");
      g1.addColorStop(0.25, "rgba(160,170,255,0.015)");
      g1.addColorStop(0.38, "rgba(180,185,255,0.035)");
      g1.addColorStop(0.48, "rgba(200,200,255,0.055)");
      g1.addColorStop(0.52, "rgba(200,200,255,0.055)");
      g1.addColorStop(0.62, "rgba(180,185,255,0.035)");
      g1.addColorStop(0.75, "rgba(160,170,255,0.015)");
      g1.addColorStop(1, "transparent");
      glowCtx.fillStyle = g1;
      glowCtx.fillRect(0, 0, pw, ph);

      const g2 = glowCtx.createLinearGradient(0, ph, pw, 0);
      g2.addColorStop(0, "transparent");
      g2.addColorStop(0.42, "rgba(220,215,255,0.008)");
      g2.addColorStop(0.47, "rgba(235,230,255,0.03)");
      g2.addColorStop(0.50, "rgba(245,240,255,0.045)");
      g2.addColorStop(0.53, "rgba(235,230,255,0.03)");
      g2.addColorStop(0.58, "rgba(220,215,255,0.008)");
      g2.addColorStop(1, "transparent");
      glowCtx.fillStyle = g2;
      glowCtx.fillRect(0, 0, pw, ph);
    };

    /* ── Render dust stars to offscreen via ImageData ── */
    const renderDust = (t: number) => {
      const imgData = dustCtx.createImageData(pw, ph);
      const d = imgData.data;

      for (const s of dust) {
        const twinkle = Math.sin(t * s.twinkleSpeed + s.twinklePhase) * 0.2 + 0.8;
        const alpha = Math.round(s.brightness * twinkle * 255);
        if (alpha < 3) continue;

        const x = s.px;
        const y = s.py;
        if (x < 0 || x >= pw || y < 0 || y >= ph) continue;

        const idx = (y * pw + x) * 4;
        d[idx]     = Math.min(255, d[idx] + Math.round(s.r * alpha / 255));
        d[idx + 1] = Math.min(255, d[idx + 1] + Math.round(s.g * alpha / 255));
        d[idx + 2] = Math.min(255, d[idx + 2] + Math.round(s.b * alpha / 255));
        d[idx + 3] = Math.min(255, d[idx + 3] + alpha);

        if (s.brightness > 0.4) {
          const dx = x + 1 < pw ? x + 1 : x - 1;
          const idx2 = (y * pw + dx) * 4;
          const a2 = Math.round(alpha * 0.3);
          d[idx2]     = Math.min(255, d[idx2] + Math.round(s.r * a2 / 255));
          d[idx2 + 1] = Math.min(255, d[idx2 + 1] + Math.round(s.g * a2 / 255));
          d[idx2 + 2] = Math.min(255, d[idx2 + 2] + Math.round(s.b * a2 / 255));
          d[idx2 + 3] = Math.min(255, d[idx2 + 3] + a2);
        }
      }

      // putImageData onto the DUST offscreen canvas (not main!)
      dustCtx.putImageData(imgData, 0, 0);
    };

    /* ── Main frame ── */
    const draw = (time: number) => {
      const t = time * 0.001;

      // 1. Black background
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = "#020208";
      ctx.fillRect(0, 0, pw, ph);

      // 2. Nebula clouds
      for (const cloud of nebulae) {
        cloud.x += cloud.driftX / lw;
        cloud.y += cloud.driftY / lh;
        if (cloud.x < -0.3) cloud.x = 1.3;
        if (cloud.x > 1.3) cloud.x = -0.3;
        if (cloud.y < -0.3) cloud.y = 1.3;
        if (cloud.y > 1.3) cloud.y = -0.3;

        const breathe = Math.sin(t * cloud.breatheSpeed + cloud.phase) * 0.3 + 0.7;
        const a = cloud.opacity * breathe;
        const cx = cloud.x * pw;
        const cy = cloud.y * ph;
        const cr = cloud.radius * Math.max(pw, ph);

        const shift = Math.sin(t * 0.05 + cloud.phase) * 0.5 + 0.5;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr);
        grad.addColorStop(0, `rgba(${cloud.r + shift * 12},${cloud.g + shift * 8},${cloud.b + shift * 15},${a})`);
        grad.addColorStop(0.3, `rgba(${cloud.r},${cloud.g},${cloud.b},${a * 0.5})`);
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.fillRect(cx - cr, cy - cr, cr * 2, cr * 2);
      }

      // 3. Milky way glow (rebuild on resize)
      if (needsRebuild) {
        renderGlow();
        needsRebuild = false;
      }
      ctx.globalCompositeOperation = "lighter";
      ctx.drawImage(glowCanvas, 0, 0);

      // 4. Dust stars — render to offscreen every ~2s, drawImage to main
      if (t - lastDustT > 2) {
        renderDust(t);
        lastDustT = t;
      }
      // drawImage respects alpha compositing (unlike putImageData)
      ctx.drawImage(dustCanvas, 0, 0);
      ctx.globalCompositeOperation = "source-over";

      // 5. Glow stars (arc-rendered, real-time twinkle)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      for (const s of glow) {
        const fast = Math.sin(t * s.fastFreq + s.phase1) * 0.15;
        const slow = Math.sin(t * s.slowFreq + s.phase2) * 0.25;
        let tw = fast + slow + 0.6;
        if (s.hasFlare) tw += Math.sin(t * 6 + s.phase3) * 0.08;
        tw = Math.max(0.15, Math.min(1, tw));

        const sx = s.nx * lw;
        const sy = s.ny * lh;

        // Glow halo
        if (s.glowRadius > 0) {
          const gs = s.glowRadius * (0.85 + tw * 0.15);
          const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, gs);
          grad.addColorStop(0, `rgba(${s.r},${s.g},${s.b},${tw * 0.12})`);
          grad.addColorStop(0.5, `rgba(${s.r},${s.g},${s.b},${tw * 0.03})`);
          grad.addColorStop(1, "transparent");
          ctx.fillStyle = grad;
          ctx.fillRect(sx - gs, sy - gs, gs * 2, gs * 2);
        }

        // Cross flare
        if (s.hasFlare) {
          const fl = s.size * 5 * tw;
          ctx.strokeStyle = `rgba(${s.r},${s.g},${s.b},${tw * 0.15})`;
          ctx.lineWidth = 0.4;
          ctx.beginPath(); ctx.moveTo(sx - fl, sy); ctx.lineTo(sx + fl, sy); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(sx, sy - fl); ctx.lineTo(sx, sy + fl); ctx.stroke();
          const dl = fl * 0.4;
          ctx.strokeStyle = `rgba(${s.r},${s.g},${s.b},${tw * 0.06})`;
          ctx.beginPath(); ctx.moveTo(sx - dl, sy - dl); ctx.lineTo(sx + dl, sy + dl); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(sx + dl, sy - dl); ctx.lineTo(sx - dl, sy + dl); ctx.stroke();
        }

        // Star dot
        ctx.beginPath();
        ctx.arc(sx, sy, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${s.r},${s.g},${s.b},${tw})`;
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    // Pause when tab hidden (battery saving)
    const handleVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(rafRef.current);
      } else {
        rafRef.current = requestAnimationFrame(draw);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", handleVisibility);
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
      }}
    />
  );
}

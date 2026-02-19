"use client";

import { useEffect, useRef } from "react";

/* ═══════════════════════════════════════════
   Ultra-Realistic StarField
   5000+ stars, pixel-level rendering,
   photorealistic milky way band
   ═══════════════════════════════════════════ */

// H-R color temperatures
const COLORS = [
  [155, 176, 255],  // O/B blue-white
  [170, 191, 255],  // B blue
  [202, 215, 255],  // A white
  [248, 247, 255],  // F pale
  [255, 244, 234],  // G yellow
  [255, 224, 188],  // K orange-yellow
  [255, 210, 161],  // K orange
  [255, 187, 123],  // M red
];

// Gaussian random (Box-Muller)
function gaussRand(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// Distance from milky way center line (diagonal bottom-left → top-right)
// Returns 0 at center, 1 at edge of band
function milkyWayDist(nx: number, ny: number): number {
  // Center line: y = -x + 1.05 (slight offset for visual)
  // Perpendicular distance / band half-width
  const dist = Math.abs(ny - (-nx + 1.05)) / Math.SQRT2;
  return dist / 0.22; // 0.22 = band half-width in normalized coords
}

// Milky way density multiplier at position
function milkyWayDensity(nx: number, ny: number): number {
  const d = milkyWayDist(nx, ny);
  if (d > 1.5) return 0;
  // Gaussian falloff + extra core density
  const outer = Math.exp(-d * d * 2.5);
  const core = Math.exp(-d * d * 12) * 0.8;
  return outer + core;
}

interface DustStar {
  px: number; py: number; // pixel coords (set at resize)
  nx: number; ny: number; // normalized 0-1
  brightness: number;     // 0-1 base brightness
  r: number; g: number; b: number;
  twinkleSpeed: number;
  twinklePhase: number;
}

interface GlowStar {
  nx: number; ny: number;
  size: number;         // radius in px
  glowRadius: number;
  r: number; g: number; b: number;
  hasFlare: boolean;
  fastFreq: number;
  slowFreq: number;
  phase1: number;
  phase2: number;
  phase3: number;
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

function pickDustColor(): [number, number, number] {
  const r = Math.random();
  // Mostly white-blue (A/F), some yellow
  if (r < 0.30) return COLORS[2] as [number, number, number]; // A
  if (r < 0.55) return COLORS[3] as [number, number, number]; // F
  if (r < 0.70) return COLORS[4] as [number, number, number]; // G
  if (r < 0.82) return COLORS[1] as [number, number, number]; // B
  if (r < 0.92) return COLORS[5] as [number, number, number]; // K
  return COLORS[0] as [number, number, number]; // O/B
}

function pickBrightColor(): [number, number, number] {
  const r = Math.random();
  if (r < 0.25) return COLORS[0] as [number, number, number]; // O/B
  if (r < 0.45) return COLORS[7] as [number, number, number]; // M red
  if (r < 0.60) return [212, 168, 83];  // gold accent
  if (r < 0.75) return [190, 170, 255]; // purple accent
  if (r < 0.88) return COLORS[2] as [number, number, number]; // A white
  return COLORS[6] as [number, number, number]; // K orange
}

/* ── Create dust stars (pixel-rendered, thousands) ── */
function createDustStars(): DustStar[] {
  const stars: DustStar[] = [];

  // Pass 1: uniform scatter (background) — 2500 stars
  for (let i = 0; i < 2500; i++) {
    const nx = Math.random();
    const ny = Math.random();
    const mwd = milkyWayDensity(nx, ny);
    const [r, g, b] = pickDustColor();
    stars.push({
      px: 0, py: 0, nx, ny,
      brightness: 0.15 + Math.random() * 0.45 + mwd * 0.25,
      r, g, b,
      twinkleSpeed: 0.3 + Math.random() * 1.2,
      twinklePhase: Math.random() * Math.PI * 2,
    });
  }

  // Pass 2: milky way concentrated — 3000 stars along the band
  for (let i = 0; i < 3000; i++) {
    // Place along the band center line with gaussian spread
    const t = Math.random(); // position along the band 0-1
    const centerX = t;
    const centerY = -t + 1.05;
    // Gaussian perpendicular offset (narrow)
    const perpOffset = gaussRand() * 0.09;
    const nx = Math.max(0, Math.min(1, centerX + perpOffset * 0.707));
    const ny = Math.max(0, Math.min(1, centerY + perpOffset * 0.707));

    const [r, g, b] = pickDustColor();
    // Stars deeper in the band are slightly brighter
    const depthBright = Math.exp(-Math.abs(perpOffset) * 8) * 0.3;
    stars.push({
      px: 0, py: 0, nx, ny,
      brightness: 0.08 + Math.random() * 0.35 + depthBright,
      r, g, b,
      twinkleSpeed: 0.2 + Math.random() * 0.8,
      twinklePhase: Math.random() * Math.PI * 2,
    });
  }

  // Pass 3: star clusters (dense knots within milky way) — 5 clusters × 200 stars
  for (let c = 0; c < 5; c++) {
    const ct = 0.15 + Math.random() * 0.7;
    const clusterX = ct;
    const clusterY = -ct + 1.05 + (Math.random() - 0.5) * 0.06;
    for (let i = 0; i < 200; i++) {
      const ox = gaussRand() * 0.025;
      const oy = gaussRand() * 0.025;
      const nx = Math.max(0, Math.min(1, clusterX + ox));
      const ny = Math.max(0, Math.min(1, clusterY + oy));
      const [r, g, b] = pickDustColor();
      stars.push({
        px: 0, py: 0, nx, ny,
        brightness: 0.12 + Math.random() * 0.5,
        r, g, b,
        twinkleSpeed: 0.3 + Math.random() * 1.0,
        twinklePhase: Math.random() * Math.PI * 2,
      });
    }
  }

  return stars; // ~6500 total
}

/* ── Create glow stars (canvas arc-rendered, ~120) ── */
function createGlowStars(): GlowStar[] {
  const stars: GlowStar[] = [];

  // Medium stars: 80
  for (let i = 0; i < 80; i++) {
    let nx = Math.random(), ny = Math.random();
    // 40% biased toward milky way
    if (Math.random() < 0.4) {
      const t = Math.random();
      nx = Math.max(0, Math.min(1, t + gaussRand() * 0.12));
      ny = Math.max(0, Math.min(1, -t + 1.05 + gaussRand() * 0.12));
    }
    const [r, g, b] = pickDustColor();
    stars.push({
      nx, ny,
      size: 0.8 + Math.random() * 1.0,
      glowRadius: 3 + Math.random() * 5,
      r, g, b,
      hasFlare: false,
      fastFreq: 1.5 + Math.random() * 2.5,
      slowFreq: 0.2 + Math.random() * 0.4,
      phase1: Math.random() * Math.PI * 2,
      phase2: Math.random() * Math.PI * 2,
      phase3: Math.random() * Math.PI * 2,
    });
  }

  // Bright accent stars: 35
  for (let i = 0; i < 35; i++) {
    const nx = Math.random();
    const ny = Math.random();
    const [r, g, b] = pickBrightColor();
    stars.push({
      nx, ny,
      size: 1.5 + Math.random() * 1.8,
      glowRadius: 8 + Math.random() * 12,
      r, g, b,
      hasFlare: true,
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

  // Milky way nebula patches (along the band)
  const mwPalette = [
    { r: 35, g: 25, b: 80 },
    { r: 55, g: 30, b: 90 },
    { r: 25, g: 20, b: 65 },
    { r: 70, g: 40, b: 35 },
    { r: 40, g: 25, b: 75 },
    { r: 20, g: 30, b: 60 },
    { r: 50, g: 20, b: 60 },
    { r: 30, g: 35, b: 70 },
  ];

  for (let i = 0; i < 8; i++) {
    const color = mwPalette[i];
    const t = 0.1 + (i / 8) * 0.8;
    const angle = Math.random() * Math.PI * 2;
    const driftSpeed = 0.001 + Math.random() * 0.003;
    clouds.push({
      x: t + (Math.random() - 0.5) * 0.15,
      y: -t + 1.05 + (Math.random() - 0.5) * 0.15,
      radius: 0.08 + Math.random() * 0.14,
      r: color.r, g: color.g, b: color.b,
      opacity: 0.04 + Math.random() * 0.06,
      driftX: Math.cos(angle) * driftSpeed,
      driftY: Math.sin(angle) * driftSpeed,
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

  // Pre-generate all data once
  const dustRef = useRef<DustStar[]>(createDustStars());
  const glowRef = useRef<GlowStar[]>(createGlowStars());
  const nebulaRef = useRef<NebulaCloud[]>(createNebulae());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let pw = 0, ph = 0; // pixel dimensions (canvas actual)
    let lw = 0, lh = 0; // logical dimensions (CSS)

    // Offscreen for static milky way base (rendered once per resize + slow refresh)
    const offscreen = document.createElement("canvas");
    const offCtx = offscreen.getContext("2d", { alpha: true })!;
    let milkyImageData: ImageData | null = null;
    let needsOffscreenRebuild = true;
    let lastOffscreenT = 0;

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

      offscreen.width = pw;
      offscreen.height = ph;

      // Update pixel positions for dust stars
      for (const s of dust) {
        s.px = Math.round(s.nx * pw);
        s.py = Math.round(s.ny * ph);
      }
      needsOffscreenRebuild = true;
    };
    resize();
    window.addEventListener("resize", resize);

    /* ── Render dust stars via ImageData (ultra fast, pixel-level) ── */
    const renderDustLayer = (t: number): ImageData => {
      const imgData = offCtx.createImageData(pw, ph);
      const data = imgData.data;

      for (const s of dust) {
        const twinkle = Math.sin(t * s.twinkleSpeed + s.twinklePhase) * 0.2 + 0.8;
        const alpha = Math.round(s.brightness * twinkle * 255);
        if (alpha < 3) continue;

        const x = s.px;
        const y = s.py;
        if (x < 0 || x >= pw || y < 0 || y >= ph) continue;

        const idx = (y * pw + x) * 4;
        // Additive blend (brighter where stars overlap)
        data[idx]     = Math.min(255, data[idx] + Math.round(s.r * alpha / 255));
        data[idx + 1] = Math.min(255, data[idx + 1] + Math.round(s.g * alpha / 255));
        data[idx + 2] = Math.min(255, data[idx + 2] + Math.round(s.b * alpha / 255));
        data[idx + 3] = Math.min(255, data[idx + 3] + alpha);

        // Slightly brighter stars get a 2nd pixel (sub-pixel spread)
        if (s.brightness > 0.35) {
          const dx = x + 1 < pw ? x + 1 : x - 1;
          const idx2 = (y * pw + dx) * 4;
          const a2 = Math.round(alpha * 0.35);
          data[idx2]     = Math.min(255, data[idx2] + Math.round(s.r * a2 / 255));
          data[idx2 + 1] = Math.min(255, data[idx2 + 1] + Math.round(s.g * a2 / 255));
          data[idx2 + 2] = Math.min(255, data[idx2 + 2] + Math.round(s.b * a2 / 255));
          data[idx2 + 3] = Math.min(255, data[idx2 + 3] + a2);
        }
      }

      return imgData;
    };

    /* ── Milky Way diffuse glow (gradient bands on offscreen) ── */
    const renderMilkyWayGlow = () => {
      offCtx.clearRect(0, 0, pw, ph);

      // We work in pixel coords
      // Wide outer glow
      const g1 = offCtx.createLinearGradient(0, ph, pw, 0);
      g1.addColorStop(0, "transparent");
      g1.addColorStop(0.25, "rgba(160, 170, 255, 0.018)");
      g1.addColorStop(0.38, "rgba(180, 185, 255, 0.04)");
      g1.addColorStop(0.48, "rgba(200, 200, 255, 0.065)");
      g1.addColorStop(0.52, "rgba(200, 200, 255, 0.065)");
      g1.addColorStop(0.62, "rgba(180, 185, 255, 0.04)");
      g1.addColorStop(0.75, "rgba(160, 170, 255, 0.018)");
      g1.addColorStop(1, "transparent");
      offCtx.fillStyle = g1;
      offCtx.fillRect(0, 0, pw, ph);

      // Narrow bright core
      const g2 = offCtx.createLinearGradient(0, ph, pw, 0);
      g2.addColorStop(0, "transparent");
      g2.addColorStop(0.40, "rgba(220, 215, 255, 0.01)");
      g2.addColorStop(0.46, "rgba(235, 230, 255, 0.04)");
      g2.addColorStop(0.50, "rgba(245, 240, 255, 0.06)");
      g2.addColorStop(0.54, "rgba(235, 230, 255, 0.04)");
      g2.addColorStop(0.60, "rgba(220, 215, 255, 0.01)");
      g2.addColorStop(1, "transparent");
      offCtx.fillStyle = g2;
      offCtx.fillRect(0, 0, pw, ph);

      // Ultra-narrow hot core
      const g3 = offCtx.createLinearGradient(0, ph, pw, 0);
      g3.addColorStop(0, "transparent");
      g3.addColorStop(0.46, "transparent");
      g3.addColorStop(0.49, "rgba(255, 250, 255, 0.03)");
      g3.addColorStop(0.51, "rgba(255, 250, 255, 0.03)");
      g3.addColorStop(0.54, "transparent");
      g3.addColorStop(1, "transparent");
      offCtx.fillStyle = g3;
      offCtx.fillRect(0, 0, pw, ph);
    };

    /* ── Main frame ── */
    const draw = (time: number) => {
      const t = time * 0.001;

      // Fill black background
      ctx.fillStyle = "#020208";
      ctx.fillRect(0, 0, pw, ph);

      // Reset transform for pixel-level ops
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      // ── Nebula clouds ──
      for (const cloud of nebulae) {
        cloud.x += cloud.driftX / lw;
        cloud.y += cloud.driftY / lh;
        if (cloud.x < -0.3) cloud.x = 1.3;
        if (cloud.x > 1.3) cloud.x = -0.3;
        if (cloud.y < -0.3) cloud.y = 1.3;
        if (cloud.y > 1.3) cloud.y = -0.3;

        const breathe = Math.sin(t * cloud.breatheSpeed + cloud.phase) * 0.3 + 0.7;
        const alpha = cloud.opacity * breathe;
        const cx = cloud.x * pw;
        const cy = cloud.y * ph;
        const r = cloud.radius * Math.max(pw, ph);

        const shift = Math.sin(t * 0.05 + cloud.phase) * 0.5 + 0.5;
        const cr = cloud.r + shift * 12;
        const cg = cloud.g + shift * 8;
        const cb = cloud.b + shift * 15;

        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        grad.addColorStop(0, `rgba(${cr},${cg},${cb},${alpha})`);
        grad.addColorStop(0.3, `rgba(${cr},${cg},${cb},${alpha * 0.6})`);
        grad.addColorStop(0.7, `rgba(${cr},${cg},${cb},${alpha * 0.15})`);
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      }

      // ── Milky way glow (rebuild on resize or every 3s for subtle shift) ──
      if (needsOffscreenRebuild || t - lastOffscreenT > 3) {
        renderMilkyWayGlow();
        milkyImageData = null;
        lastOffscreenT = t;
        needsOffscreenRebuild = false;
      }
      ctx.globalCompositeOperation = "lighter";
      ctx.drawImage(offscreen, 0, 0);
      ctx.globalCompositeOperation = "source-over";

      // ── Dust stars (pixel ImageData — rebuilt every ~2s for twinkle) ──
      // Use a secondary cycle: only update the dust image every 2 seconds
      if (!milkyImageData || t - lastOffscreenT < 0.05) {
        milkyImageData = renderDustLayer(t);
      }
      // Draw dust layer with additive blend
      ctx.globalCompositeOperation = "lighter";
      ctx.putImageData(milkyImageData, 0, 0);
      ctx.globalCompositeOperation = "source-over";

      // ── Glow stars (arc-rendered, ~115 stars, real-time twinkle) ──
      // Switch to logical coords for glow rendering
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
          grad.addColorStop(0, `rgba(${s.r},${s.g},${s.b},${tw * 0.15})`);
          grad.addColorStop(0.4, `rgba(${s.r},${s.g},${s.b},${tw * 0.05})`);
          grad.addColorStop(1, "transparent");
          ctx.fillStyle = grad;
          ctx.fillRect(sx - gs, sy - gs, gs * 2, gs * 2);
        }

        // Cross flare
        if (s.hasFlare) {
          const fl = s.size * 7 * tw;
          ctx.strokeStyle = `rgba(${s.r},${s.g},${s.b},${tw * 0.2})`;
          ctx.lineWidth = 0.5;
          ctx.beginPath(); ctx.moveTo(sx - fl, sy); ctx.lineTo(sx + fl, sy); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(sx, sy - fl); ctx.lineTo(sx, sy + fl); ctx.stroke();
          // Diagonal
          const dl = fl * 0.45;
          ctx.strokeStyle = `rgba(${s.r},${s.g},${s.b},${tw * 0.08})`;
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
      }}
    />
  );
}

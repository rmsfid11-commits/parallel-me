"use client";

import { useEffect, useRef } from "react";

interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
  speed: number;
  phase: number;
}

interface Particle {
  progress: number;
  speed: number;
  branchIndex: number;
}

interface Branch {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  cp1x: number;
  cp1y: number;
  cp2x: number;
  cp2y: number;
  thickness: number;
  depth: number;
  hue: number;
  phase: number;
}

interface JunctionNode {
  x: number;
  y: number;
  size: number;
  depth: number;
  phase: number;
}

export default function CosmicCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const handleMouse = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX / width, y: e.clientY / height };
    };
    window.addEventListener("mousemove", handleMouse);

    // Stars
    const starCount = Math.min(300, Math.floor((width * height) / 4000));
    const stars: Star[] = Array.from({ length: starCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 1.8 + 0.3,
      opacity: Math.random() * 0.6 + 0.15,
      speed: Math.random() * 0.5 + 0.2,
      phase: Math.random() * Math.PI * 2,
    }));

    // Branches — neural network style
    const branches: Branch[] = [];
    const junctions: JunctionNode[] = [];
    const isMobile = width < 768;
    const maxDepth = isMobile ? 5 : 6;

    function generateBranches(
      sx: number, sy: number,
      angle: number, length: number,
      thickness: number, depth: number,
      hue: number
    ) {
      if (depth > maxDepth || length < 10) return;

      const endX = sx + Math.cos(angle) * length;
      const endY = sy + Math.sin(angle) * length;

      const spread = length * 0.35;
      const cp1x = sx + Math.cos(angle) * length * 0.3 + (Math.random() - 0.5) * spread;
      const cp1y = sy + Math.sin(angle) * length * 0.3 + (Math.random() - 0.5) * spread;
      const cp2x = sx + Math.cos(angle) * length * 0.7 + (Math.random() - 0.5) * spread;
      const cp2y = sy + Math.sin(angle) * length * 0.7 + (Math.random() - 0.5) * spread;

      branches.push({
        startX: sx, startY: sy,
        endX, endY,
        cp1x, cp1y, cp2x, cp2y,
        thickness,
        depth,
        hue,
        phase: Math.random() * Math.PI * 2,
      });

      // Add glowing junction node at branch endpoint
      if (depth <= maxDepth) {
        junctions.push({
          x: endX, y: endY,
          size: Math.max(1.5, thickness * 0.8),
          depth,
          phase: Math.random() * Math.PI * 2,
        });
      }

      const childCount = depth < 2 ? 3 : depth < 4 ? 2 + (Math.random() > 0.5 ? 1 : 0) : 2;
      const angleSpread = depth < 2 ? 0.7 + Math.random() * 0.4 : 0.5 + Math.random() * 0.5;

      for (let i = 0; i < childCount; i++) {
        const childAngle = angle + (i - (childCount - 1) / 2) * angleSpread + (Math.random() - 0.5) * 0.25;
        const childLen = length * (0.58 + Math.random() * 0.18);
        const childThick = thickness * (depth < 1 ? 0.7 : 0.55);
        const childHue = hue + (Math.random() - 0.5) * 15;
        generateBranches(endX, endY, childAngle, childLen, childThick, depth + 1, childHue);
      }
    }

    const cx = width / 2;
    const cy = height / 2;
    const baseLength = Math.min(width, height) * (isMobile ? 0.22 : 0.3);
    const baseThickness = isMobile ? 6 : 8;

    // Add center junction
    junctions.push({ x: cx, y: cy, size: 10, depth: -1, phase: 0 });

    // 10 directions radiating from center
    const rootCount = isMobile ? 8 : 10;
    for (let i = 0; i < rootCount; i++) {
      const angle = (Math.PI * 2 * i) / rootCount + (Math.random() - 0.5) * 0.3;
      const hue = 28 + i * 5;
      const len = baseLength * (0.85 + Math.random() * 0.3);
      generateBranches(cx, cy, angle, len, baseThickness, 0, hue);
    }

    // Particles
    const particles: Particle[] = Array.from({ length: 120 }, () => ({
      progress: Math.random(),
      speed: 0.0015 + Math.random() * 0.004,
      branchIndex: Math.floor(Math.random() * branches.length),
    }));

    let time = 0;

    function draw() {
      time += 0.006;
      ctx.clearRect(0, 0, width, height);

      // Background
      const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height) * 0.75);
      bgGrad.addColorStop(0, "#0c0828");
      bgGrad.addColorStop(0.3, "#070520");
      bgGrad.addColorStop(0.7, "#030315");
      bgGrad.addColorStop(1, "#010110");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Stars
      for (const s of stars) {
        const twinkle = Math.sin(time * s.speed + s.phase) * 0.3 + 0.7;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${s.opacity * twinkle})`;
        ctx.fill();
      }

      const mx = (mouseRef.current.x - 0.5) * 6;
      const my = (mouseRef.current.y - 0.5) * 6;
      const pulse = Math.sin(time * 0.35) * 0.12 + 1;

      // ── Center glow (4 layers) ──
      // Layer 1: Ultra-wide cosmic halo
      const ultraSize = Math.min(width, height) * 0.5 * pulse;
      const ultra = ctx.createRadialGradient(cx, cy, 0, cx, cy, ultraSize);
      ultra.addColorStop(0, "rgba(212, 168, 83, 0.08)");
      ultra.addColorStop(0.3, "rgba(179, 136, 255, 0.03)");
      ultra.addColorStop(1, "transparent");
      ctx.fillStyle = ultra;
      ctx.fillRect(0, 0, width, height);

      // Layer 2: Warm glow
      const warmSize = 180 * pulse;
      const warm = ctx.createRadialGradient(cx, cy, 0, cx, cy, warmSize);
      warm.addColorStop(0, "rgba(255, 220, 140, 0.5)");
      warm.addColorStop(0.2, "rgba(212, 168, 83, 0.3)");
      warm.addColorStop(0.5, "rgba(212, 168, 83, 0.08)");
      warm.addColorStop(1, "transparent");
      ctx.fillStyle = warm;
      ctx.fillRect(cx - warmSize, cy - warmSize, warmSize * 2, warmSize * 2);

      // Layer 3: Hot core
      const hotSize = 50 + Math.sin(time * 0.5) * 10;
      const hot = ctx.createRadialGradient(cx, cy, 0, cx, cy, hotSize);
      hot.addColorStop(0, "rgba(255, 250, 235, 1)");
      hot.addColorStop(0.1, "rgba(255, 240, 200, 0.95)");
      hot.addColorStop(0.3, "rgba(255, 210, 130, 0.6)");
      hot.addColorStop(0.6, "rgba(212, 168, 83, 0.2)");
      hot.addColorStop(1, "transparent");
      ctx.fillStyle = hot;
      ctx.fillRect(cx - hotSize, cy - hotSize, hotSize * 2, hotSize * 2);

      // Layer 4: White-hot pinpoint
      const pinSize = 12 + Math.sin(time * 0.8) * 3;
      const pin = ctx.createRadialGradient(cx, cy, 0, cx, cy, pinSize);
      pin.addColorStop(0, "rgba(255, 255, 255, 1)");
      pin.addColorStop(0.4, "rgba(255, 245, 220, 0.8)");
      pin.addColorStop(1, "transparent");
      ctx.fillStyle = pin;
      ctx.fillRect(cx - pinSize, cy - pinSize, pinSize * 2, pinSize * 2);

      // ── Draw branches (neural network lines) ──
      ctx.globalCompositeOperation = "lighter";

      for (const b of branches) {
        const breathe = Math.sin(time * 0.25 + b.phase) * 0.12 + 0.88;
        const depthFade = 1 - b.depth / (maxDepth + 1);
        const alpha = depthFade * 0.8 * breathe;

        const offsetX = mx * (b.depth * 0.4);
        const offsetY = my * (b.depth * 0.4);

        const sx = b.startX + offsetX;
        const sy = b.startY + offsetY;
        const ex = b.endX + offsetX;
        const ey = b.endY + offsetY;
        const c1x = b.cp1x + offsetX;
        const c1y = b.cp1y + offsetY;
        const c2x = b.cp2x + offsetX;
        const c2y = b.cp2y + offsetY;

        // Pass 1: Wide soft glow (neural glow)
        if (b.depth < 3) {
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.bezierCurveTo(c1x, c1y, c2x, c2y, ex, ey);
          ctx.strokeStyle = `hsla(${b.hue}, 65%, 60%, ${alpha * 0.15})`;
          ctx.lineWidth = b.thickness * breathe * 6;
          ctx.lineCap = "round";
          ctx.stroke();
        }

        // Pass 2: Medium glow
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.bezierCurveTo(c1x, c1y, c2x, c2y, ex, ey);
        ctx.strokeStyle = `hsla(${b.hue}, 70%, 60%, ${alpha * 0.35})`;
        ctx.lineWidth = b.thickness * breathe * 2.5;
        ctx.lineCap = "round";
        ctx.stroke();

        // Pass 3: Bright core line
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.bezierCurveTo(c1x, c1y, c2x, c2y, ex, ey);
        const grad = ctx.createLinearGradient(sx, sy, ex, ey);
        grad.addColorStop(0, `hsla(${b.hue}, 75%, 72%, ${alpha})`);
        grad.addColorStop(1, `hsla(${b.hue + 20}, 65%, 62%, ${alpha * 0.7})`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = b.thickness * breathe;
        ctx.lineCap = "round";
        ctx.stroke();
      }

      // ── Junction nodes (synaptic glow) ──
      for (const j of junctions) {
        const offsetX = mx * (Math.max(0, j.depth) * 0.4);
        const offsetY = my * (Math.max(0, j.depth) * 0.4);
        const jx = j.x + offsetX;
        const jy = j.y + offsetY;
        const depthFade = 1 - Math.max(0, j.depth) / (maxDepth + 1);
        const jPulse = Math.sin(time * 0.4 + j.phase) * 0.2 + 0.8;
        const jAlpha = depthFade * 0.6 * jPulse;

        if (j.depth < 3) {
          // Outer glow
          const glowR = j.size * 5;
          const glow = ctx.createRadialGradient(jx, jy, 0, jx, jy, glowR);
          glow.addColorStop(0, `rgba(255, 220, 150, ${jAlpha * 0.4})`);
          glow.addColorStop(0.4, `rgba(212, 168, 83, ${jAlpha * 0.12})`);
          glow.addColorStop(1, "transparent");
          ctx.fillStyle = glow;
          ctx.fillRect(jx - glowR, jy - glowR, glowR * 2, glowR * 2);
        }

        // Bright dot
        ctx.beginPath();
        ctx.arc(jx, jy, j.size * jPulse, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 240, 200, ${jAlpha})`;
        ctx.fill();
      }

      // ── Particles (energy flowing through network) ──
      for (const p of particles) {
        p.progress += p.speed;
        if (p.progress > 1) {
          p.progress = 0;
          p.branchIndex = Math.floor(Math.random() * branches.length);
        }

        const b = branches[p.branchIndex];
        if (!b) continue;

        const t = p.progress;
        const mt = 1 - t;
        const offsetX = mx * (b.depth * 0.4);
        const offsetY = my * (b.depth * 0.4);

        const px = mt * mt * mt * b.startX + 3 * mt * mt * t * b.cp1x + 3 * mt * t * t * b.cp2x + t * t * t * b.endX + offsetX;
        const py = mt * mt * mt * b.startY + 3 * mt * mt * t * b.cp1y + 3 * mt * t * t * b.cp2y + t * t * t * b.endY + offsetY;

        const depthFade = 1 - b.depth / (maxDepth + 1);
        const size = (2.5 + (1 - t) * 2) * depthFade;
        const pAlpha = (1 - t * 0.4) * depthFade;

        // Particle glow
        const glowR = size * 4;
        const pg = ctx.createRadialGradient(px, py, 0, px, py, glowR);
        pg.addColorStop(0, `rgba(255, 235, 190, ${0.7 * pAlpha})`);
        pg.addColorStop(0.4, `rgba(212, 168, 83, ${0.25 * pAlpha})`);
        pg.addColorStop(1, "transparent");
        ctx.fillStyle = pg;
        ctx.fillRect(px - glowR, py - glowR, glowR * 2, glowR * 2);

        // Bright core
        ctx.beginPath();
        ctx.arc(px, py, size * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 248, 220, ${0.95 * pAlpha})`;
        ctx.fill();
      }

      ctx.globalCompositeOperation = "source-over";
      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouse);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full"
      style={{ zIndex: 0 }}
    />
  );
}

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
  depth: number;
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

    // Generate stars
    const starCount = Math.min(250, Math.floor((width * height) / 5000));
    const stars: Star[] = Array.from({ length: starCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 1.5 + 0.5,
      opacity: Math.random() * 0.6 + 0.2,
      speed: Math.random() * 0.5 + 0.3,
      phase: Math.random() * Math.PI * 2,
    }));

    // Generate branches (recursive tree)
    const branches: Branch[] = [];
    const maxDepth = width < 768 ? 4 : 5;

    function generateBranches(
      sx: number, sy: number,
      angle: number, length: number,
      thickness: number, depth: number,
      hue: number
    ) {
      if (depth > maxDepth || length < 15) return;

      const endX = sx + Math.cos(angle) * length;
      const endY = sy + Math.sin(angle) * length;

      // Bezier control points for organic curves
      const spread = length * 0.3;
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

      const childCount = depth < 2 ? 3 : 2;
      const angleSpread = 0.6 + Math.random() * 0.4;

      for (let i = 0; i < childCount; i++) {
        const childAngle = angle + (i - (childCount - 1) / 2) * angleSpread + (Math.random() - 0.5) * 0.3;
        const childLen = length * (0.55 + Math.random() * 0.2);
        const childThick = thickness * 0.6;
        const childHue = hue + (Math.random() - 0.5) * 20;
        generateBranches(endX, endY, childAngle, childLen, childThick, depth + 1, childHue);
      }
    }

    const cx = width / 2;
    const cy = height / 2;
    const baseLength = Math.min(width, height) * 0.28;

    // Generate tree from center outward — 8 directions for full coverage
    const rootAngles = [
      -Math.PI / 2,
      -Math.PI / 2 - 0.7, -Math.PI / 2 + 0.7,
      -Math.PI / 2 - 1.4, -Math.PI / 2 + 1.4,
      Math.PI / 2,
      Math.PI / 2 - 0.6, Math.PI / 2 + 0.6,
    ];
    rootAngles.forEach((angle, i) => {
      const hue = 30 + i * 6; // gold range
      generateBranches(cx, cy, angle, baseLength, 4.5, 0, hue);
    });

    // Particles flowing along branches
    const particles: Particle[] = Array.from({ length: 90 }, () => ({
      progress: Math.random(),
      speed: 0.001 + Math.random() * 0.003,
      branchIndex: Math.floor(Math.random() * branches.length),
      depth: 0,
    }));

    let time = 0;

    function draw() {
      time += 0.008;
      ctx.clearRect(0, 0, width, height);

      // Background gradient
      const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height) * 0.7);
      bgGrad.addColorStop(0, "#0a0825");
      bgGrad.addColorStop(0.5, "#060518");
      bgGrad.addColorStop(1, "#020210");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Stars
      stars.forEach((s) => {
        const twinkle = Math.sin(time * s.speed + s.phase) * 0.3 + 0.7;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${s.opacity * twinkle})`;
        ctx.fill();
      });

      // Mouse influence
      const mx = (mouseRef.current.x - 0.5) * 8;
      const my = (mouseRef.current.y - 0.5) * 8;

      // Center glow — 3 layered radial gradients for depth
      const pulse = Math.sin(time * 0.4) * 0.15 + 1;

      // Layer 1: Wide ambient halo
      const haloSize = Math.min(width, height) * 0.35 * pulse;
      const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, haloSize);
      halo.addColorStop(0, "rgba(212, 168, 83, 0.12)");
      halo.addColorStop(0.4, "rgba(179, 136, 255, 0.05)");
      halo.addColorStop(1, "transparent");
      ctx.fillStyle = halo;
      ctx.fillRect(cx - haloSize, cy - haloSize, haloSize * 2, haloSize * 2);

      // Layer 2: Medium warm glow
      const midSize = 120 * pulse;
      const midGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, midSize);
      midGlow.addColorStop(0, "rgba(255, 220, 150, 0.6)");
      midGlow.addColorStop(0.25, "rgba(212, 168, 83, 0.35)");
      midGlow.addColorStop(0.5, "rgba(212, 168, 83, 0.12)");
      midGlow.addColorStop(0.8, "rgba(179, 136, 255, 0.04)");
      midGlow.addColorStop(1, "transparent");
      ctx.fillStyle = midGlow;
      ctx.fillRect(cx - midSize, cy - midSize, midSize * 2, midSize * 2);

      // Layer 3: Bright core
      const coreSize = 35 + Math.sin(time * 0.6) * 8;
      const coreGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreSize);
      coreGlow.addColorStop(0, "rgba(255, 245, 220, 1)");
      coreGlow.addColorStop(0.15, "rgba(255, 230, 180, 0.9)");
      coreGlow.addColorStop(0.4, "rgba(212, 168, 83, 0.5)");
      coreGlow.addColorStop(0.7, "rgba(212, 168, 83, 0.15)");
      coreGlow.addColorStop(1, "transparent");
      ctx.fillStyle = coreGlow;
      ctx.fillRect(cx - coreSize, cy - coreSize, coreSize * 2, coreSize * 2);

      // Draw branches
      ctx.globalCompositeOperation = "lighter";

      branches.forEach((b) => {
        const breathe = Math.sin(time * 0.3 + b.phase) * 0.15 + 0.85;
        const depthFade = 1 - b.depth / (maxDepth + 1);
        const alpha = depthFade * 0.7 * breathe;

        // Slight mouse offset
        const offsetX = mx * (b.depth * 0.5);
        const offsetY = my * (b.depth * 0.5);

        ctx.beginPath();
        ctx.moveTo(b.startX + offsetX, b.startY + offsetY);
        ctx.bezierCurveTo(
          b.cp1x + offsetX, b.cp1y + offsetY,
          b.cp2x + offsetX, b.cp2y + offsetY,
          b.endX + offsetX, b.endY + offsetY
        );

        const grad = ctx.createLinearGradient(
          b.startX + offsetX, b.startY + offsetY,
          b.endX + offsetX, b.endY + offsetY
        );
        grad.addColorStop(0, `hsla(${b.hue}, 70%, 65%, ${alpha})`);
        grad.addColorStop(1, `hsla(${b.hue + 30}, 60%, 55%, ${alpha * 0.6})`);

        // Outer glow for main branches
        if (b.depth < 2) {
          ctx.strokeStyle = `hsla(${b.hue}, 60%, 60%, ${alpha * 0.2})`;
          ctx.lineWidth = b.thickness * breathe * 4;
          ctx.lineCap = "round";
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.moveTo(b.startX + offsetX, b.startY + offsetY);
        ctx.bezierCurveTo(
          b.cp1x + offsetX, b.cp1y + offsetY,
          b.cp2x + offsetX, b.cp2y + offsetY,
          b.endX + offsetX, b.endY + offsetY
        );
        ctx.strokeStyle = grad;
        ctx.lineWidth = b.thickness * breathe;
        ctx.lineCap = "round";
        ctx.stroke();
      });

      // Draw particles
      particles.forEach((p) => {
        p.progress += p.speed;
        if (p.progress > 1) {
          p.progress = 0;
          p.branchIndex = Math.floor(Math.random() * branches.length);
        }

        const b = branches[p.branchIndex];
        if (!b) return;

        const t = p.progress;
        const mt = 1 - t;
        const offsetX = mx * (b.depth * 0.5);
        const offsetY = my * (b.depth * 0.5);

        // Cubic bezier position
        const px = mt * mt * mt * b.startX + 3 * mt * mt * t * b.cp1x + 3 * mt * t * t * b.cp2x + t * t * t * b.endX + offsetX;
        const py = mt * mt * mt * b.startY + 3 * mt * mt * t * b.cp1y + 3 * mt * t * t * b.cp2y + t * t * t * b.endY + offsetY;

        const size = 2 + (1 - t) * 1.5;
        const particleGlow = ctx.createRadialGradient(px, py, 0, px, py, size * 3);
        particleGlow.addColorStop(0, `rgba(255, 230, 180, ${0.8 * (1 - t * 0.5)})`);
        particleGlow.addColorStop(0.5, `rgba(212, 168, 83, ${0.3 * (1 - t * 0.5)})`);
        particleGlow.addColorStop(1, "transparent");

        ctx.fillStyle = particleGlow;
        ctx.fillRect(px - size * 3, py - size * 3, size * 6, size * 6);

        ctx.beginPath();
        ctx.arc(px, py, size * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 240, 200, ${0.9 * (1 - t * 0.3)})`;
        ctx.fill();
      });

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

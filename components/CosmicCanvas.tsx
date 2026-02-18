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

interface Tendril {
  angle: number;       // base angle from center
  length: number;      // how far it reaches
  thickness: number;   // base thickness
  waveFreq: number;    // sine wave frequency for organic curve
  waveAmp: number;     // sine wave amplitude
  phase: number;       // animation phase offset
  hue: number;
  segments: number;    // resolution
}

interface SubTendril {
  parentIdx: number;
  startT: number;      // where on parent it branches (0-1)
  angle: number;       // offset angle
  length: number;
  thickness: number;
  waveFreq: number;
  waveAmp: number;
  phase: number;
  hue: number;
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

    const handleMouse = (e: MouseEvent | TouchEvent) => {
      const pt = "touches" in e ? e.touches[0] : e;
      if (pt) mouseRef.current = { x: pt.clientX / width, y: pt.clientY / height };
    };
    window.addEventListener("mousemove", handleMouse as EventListener);
    window.addEventListener("touchmove", handleMouse as EventListener, { passive: true });

    // Stars
    const starCount = Math.min(300, Math.floor((width * height) / 4000));
    const stars: Star[] = Array.from({ length: starCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 1.8 + 0.3,
      opacity: Math.random() * 0.5 + 0.15,
      speed: Math.random() * 0.4 + 0.2,
      phase: Math.random() * Math.PI * 2,
    }));

    const cx = width / 2;
    const cy = height / 2;
    const isMobile = width < 768;
    const reach = Math.min(width, height) * (isMobile ? 0.42 : 0.48);

    // ── Main tendrils: smooth flowing cosmic veins ──
    const tendrilCount = isMobile ? 7 : 9;
    const tendrils: Tendril[] = [];
    for (let i = 0; i < tendrilCount; i++) {
      const baseAngle = (Math.PI * 2 * i) / tendrilCount;
      tendrils.push({
        angle: baseAngle + (Math.random() - 0.5) * 0.15,
        length: reach * (0.8 + Math.random() * 0.4),
        thickness: isMobile ? 5 + Math.random() * 3 : 7 + Math.random() * 5,
        waveFreq: 1.5 + Math.random() * 1.5,
        waveAmp: 20 + Math.random() * 30,
        phase: Math.random() * Math.PI * 2,
        hue: 28 + Math.random() * 20,
        segments: 80,
      });
    }

    // ── Sub-tendrils branching off main ones ──
    const subTendrils: SubTendril[] = [];
    tendrils.forEach((_, pi) => {
      const subCount = 2 + Math.floor(Math.random() * 3);
      for (let j = 0; j < subCount; j++) {
        subTendrils.push({
          parentIdx: pi,
          startT: 0.25 + Math.random() * 0.5,
          angle: (Math.random() > 0.5 ? 1 : -1) * (0.3 + Math.random() * 0.6),
          length: reach * (0.15 + Math.random() * 0.25),
          thickness: 2 + Math.random() * 2.5,
          waveFreq: 2 + Math.random() * 2,
          waveAmp: 8 + Math.random() * 15,
          phase: Math.random() * Math.PI * 2,
          hue: 28 + Math.random() * 25,
        });
      }
    });

    // Helper: get point on tendril at t (0→1)
    function getTendrilPoint(
      td: Tendril, t: number, time: number,
      offsetX: number, offsetY: number
    ) {
      const dist = t * td.length;
      const wave = Math.sin(t * td.waveFreq * Math.PI + time * 0.3 + td.phase) * td.waveAmp * t;
      const perpAngle = td.angle + Math.PI / 2;
      const x = cx + Math.cos(td.angle) * dist + Math.cos(perpAngle) * wave + offsetX * t;
      const y = cy + Math.sin(td.angle) * dist + Math.sin(perpAngle) * wave + offsetY * t;
      return { x, y };
    }

    // Energy pulses
    interface Pulse {
      tendrilIdx: number;
      progress: number;
      speed: number;
      brightness: number;
    }
    const pulses: Pulse[] = [];
    for (let i = 0; i < (isMobile ? 25 : 40); i++) {
      pulses.push({
        tendrilIdx: Math.floor(Math.random() * tendrils.length),
        progress: Math.random(),
        speed: 0.002 + Math.random() * 0.005,
        brightness: 0.5 + Math.random() * 0.5,
      });
    }

    let time = 0;

    function draw() {
      time += 0.005;
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
        const twinkle = Math.sin(time * s.speed * 2 + s.phase) * 0.3 + 0.7;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${s.opacity * twinkle})`;
        ctx.fill();
      }

      const mx = (mouseRef.current.x - 0.5) * 20;
      const my = (mouseRef.current.y - 0.5) * 20;
      const pulse = Math.sin(time * 0.35) * 0.1 + 1;

      // ── Center glow ──
      // Ultra-wide halo
      const haloR = Math.min(width, height) * 0.45 * pulse;
      const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, haloR);
      halo.addColorStop(0, "rgba(212, 168, 83, 0.06)");
      halo.addColorStop(0.4, "rgba(120, 90, 200, 0.02)");
      halo.addColorStop(1, "transparent");
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, width, height);

      ctx.globalCompositeOperation = "lighter";

      // ── Draw tendrils ──
      for (const td of tendrils) {
        const breathe = Math.sin(time * 0.2 + td.phase) * 0.08 + 0.92;

        // Build path points
        const points: { x: number; y: number }[] = [];
        for (let i = 0; i <= td.segments; i++) {
          const t = i / td.segments;
          points.push(getTendrilPoint(td, t, time, mx, my));
        }

        // Pass 1: Ultra-wide soft glow
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.strokeStyle = `hsla(${td.hue}, 60%, 55%, 0.06)`;
        ctx.lineWidth = td.thickness * breathe * 12;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();

        // Pass 2: Wide glow
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.strokeStyle = `hsla(${td.hue}, 65%, 58%, 0.12)`;
        ctx.lineWidth = td.thickness * breathe * 5;
        ctx.stroke();

        // Pass 3: Medium glow
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.strokeStyle = `hsla(${td.hue}, 70%, 62%, 0.3)`;
        ctx.lineWidth = td.thickness * breathe * 2.2;
        ctx.stroke();

        // Pass 4: Bright core with taper
        for (let i = 0; i < points.length - 1; i++) {
          const t = i / points.length;
          const taper = 1 - t * 0.7; // thicker near center
          const segAlpha = (1 - t * 0.5) * breathe;

          ctx.beginPath();
          ctx.moveTo(points[i].x, points[i].y);
          ctx.lineTo(points[i + 1].x, points[i + 1].y);
          ctx.strokeStyle = `hsla(${td.hue}, 80%, 75%, ${segAlpha * 0.85})`;
          ctx.lineWidth = td.thickness * taper * breathe;
          ctx.lineCap = "round";
          ctx.stroke();
        }

        // Pass 5: White-hot center line (inner 40%)
        for (let i = 0; i < Math.floor(points.length * 0.4); i++) {
          const t = i / points.length;
          const segAlpha = (1 - t * 2) * breathe;
          if (segAlpha <= 0) break;

          ctx.beginPath();
          ctx.moveTo(points[i].x, points[i].y);
          ctx.lineTo(points[i + 1].x, points[i + 1].y);
          ctx.strokeStyle = `rgba(255, 248, 230, ${segAlpha * 0.5})`;
          ctx.lineWidth = td.thickness * 0.4 * (1 - t);
          ctx.lineCap = "round";
          ctx.stroke();
        }
      }

      // ── Draw sub-tendrils ──
      for (const st of subTendrils) {
        const parent = tendrils[st.parentIdx];
        const branchPt = getTendrilPoint(parent, st.startT, time, mx, my);
        const branchAngle = parent.angle + st.angle;
        const breathe = Math.sin(time * 0.25 + st.phase) * 0.1 + 0.9;

        const subPoints: { x: number; y: number }[] = [];
        const subSegs = 40;
        for (let i = 0; i <= subSegs; i++) {
          const t = i / subSegs;
          const dist = t * st.length;
          const wave = Math.sin(t * st.waveFreq * Math.PI + time * 0.4 + st.phase) * st.waveAmp * t;
          const perpAngle = branchAngle + Math.PI / 2;
          subPoints.push({
            x: branchPt.x + Math.cos(branchAngle) * dist + Math.cos(perpAngle) * wave,
            y: branchPt.y + Math.sin(branchAngle) * dist + Math.sin(perpAngle) * wave,
          });
        }

        // Soft glow
        ctx.beginPath();
        ctx.moveTo(subPoints[0].x, subPoints[0].y);
        for (let i = 1; i < subPoints.length; i++) ctx.lineTo(subPoints[i].x, subPoints[i].y);
        ctx.strokeStyle = `hsla(${st.hue}, 60%, 55%, 0.08)`;
        ctx.lineWidth = st.thickness * breathe * 4;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();

        // Core
        for (let i = 0; i < subPoints.length - 1; i++) {
          const t = i / subPoints.length;
          const taper = 1 - t * 0.8;
          const segAlpha = (1 - t * 0.6) * breathe * 0.6;
          ctx.beginPath();
          ctx.moveTo(subPoints[i].x, subPoints[i].y);
          ctx.lineTo(subPoints[i + 1].x, subPoints[i + 1].y);
          ctx.strokeStyle = `hsla(${st.hue}, 75%, 70%, ${segAlpha})`;
          ctx.lineWidth = st.thickness * taper * breathe;
          ctx.lineCap = "round";
          ctx.stroke();
        }
      }

      // ── Energy pulses ──
      for (const p of pulses) {
        p.progress += p.speed;
        if (p.progress > 1) {
          p.progress = 0;
          p.tendrilIdx = Math.floor(Math.random() * tendrils.length);
          p.brightness = 0.5 + Math.random() * 0.5;
        }

        const td = tendrils[p.tendrilIdx];
        const pt = getTendrilPoint(td, p.progress, time, mx, my);
        const fadeIn = Math.min(1, p.progress * 5);
        const fadeOut = 1 - p.progress * 0.3;
        const alpha = fadeIn * fadeOut * p.brightness;
        const size = (3 + (1 - p.progress) * 3) * (td.thickness / 8);

        // Glow
        const glowR = size * 6;
        const pg = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, glowR);
        pg.addColorStop(0, `rgba(255, 235, 190, ${0.5 * alpha})`);
        pg.addColorStop(0.3, `rgba(212, 168, 83, ${0.15 * alpha})`);
        pg.addColorStop(1, "transparent");
        ctx.fillStyle = pg;
        ctx.fillRect(pt.x - glowR, pt.y - glowR, glowR * 2, glowR * 2);

        // Bright dot
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, size * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 250, 235, ${0.9 * alpha})`;
        ctx.fill();
      }

      ctx.globalCompositeOperation = "source-over";

      // ── Center blazing core (drawn last, on top) ──
      // Warm glow
      const warmR = 160 * pulse;
      const warmG = ctx.createRadialGradient(cx, cy, 0, cx, cy, warmR);
      warmG.addColorStop(0, "rgba(255, 220, 140, 0.45)");
      warmG.addColorStop(0.15, "rgba(212, 168, 83, 0.25)");
      warmG.addColorStop(0.4, "rgba(212, 168, 83, 0.06)");
      warmG.addColorStop(1, "transparent");
      ctx.fillStyle = warmG;
      ctx.fillRect(cx - warmR, cy - warmR, warmR * 2, warmR * 2);

      // Hot core
      const hotR = 55 + Math.sin(time * 0.5) * 8;
      const hotG = ctx.createRadialGradient(cx, cy, 0, cx, cy, hotR);
      hotG.addColorStop(0, "rgba(255, 250, 240, 1)");
      hotG.addColorStop(0.1, "rgba(255, 240, 210, 0.9)");
      hotG.addColorStop(0.35, "rgba(255, 200, 120, 0.4)");
      hotG.addColorStop(0.7, "rgba(212, 168, 83, 0.08)");
      hotG.addColorStop(1, "transparent");
      ctx.fillStyle = hotG;
      ctx.fillRect(cx - hotR, cy - hotR, hotR * 2, hotR * 2);

      // Blazing white center
      const whiteR = 15 + Math.sin(time * 0.7) * 4;
      const whiteG = ctx.createRadialGradient(cx, cy, 0, cx, cy, whiteR);
      whiteG.addColorStop(0, "rgba(255, 255, 255, 1)");
      whiteG.addColorStop(0.5, "rgba(255, 250, 230, 0.7)");
      whiteG.addColorStop(1, "transparent");
      ctx.fillStyle = whiteG;
      ctx.fillRect(cx - whiteR, cy - whiteR, whiteR * 2, whiteR * 2);

      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouse as EventListener);
      window.removeEventListener("touchmove", handleMouse as EventListener);
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

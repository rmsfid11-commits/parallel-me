"use client";

import { useEffect, useRef } from "react";

export default function CosmicCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
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

    const cx = width / 2;
    const cy = height / 2;

    // ── Premium stars with glow ──
    interface Star {
      x: number; y: number;
      size: number;
      glowSize: number;
      speed: number; phase: number;
      r: number; g: number; b: number;
      hasFlare: boolean;
    }

    const stars: Star[] = [];
    // Tiny dim dust (lots)
    for (let i = 0; i < 180; i++) {
      stars.push({
        x: Math.random() * width, y: Math.random() * height,
        size: Math.random() * 0.8 + 0.3,
        glowSize: 0,
        speed: 0.3 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
        r: 200 + Math.random() * 55, g: 200 + Math.random() * 55, b: 220 + Math.random() * 35,
        hasFlare: false,
      });
    }
    // Medium stars with subtle glow
    for (let i = 0; i < 40; i++) {
      stars.push({
        x: Math.random() * width, y: Math.random() * height,
        size: Math.random() * 1.2 + 0.8,
        glowSize: 4 + Math.random() * 4,
        speed: 0.2 + Math.random() * 0.4,
        phase: Math.random() * Math.PI * 2,
        r: 230 + Math.random() * 25, g: 225 + Math.random() * 30, b: 240,
        hasFlare: false,
      });
    }
    // Bright stars with cross flare
    for (let i = 0; i < 12; i++) {
      const isGold = Math.random() > 0.5;
      stars.push({
        x: Math.random() * width, y: Math.random() * height,
        size: Math.random() * 1.5 + 1.5,
        glowSize: 10 + Math.random() * 8,
        speed: 0.15 + Math.random() * 0.3,
        phase: Math.random() * Math.PI * 2,
        r: isGold ? 212 : 200, g: isGold ? 168 : 190, b: isGold ? 83 : 255,
        hasFlare: true,
      });
    }

    // ── Particles emanating from center ──
    interface Particle {
      angle: number;
      dist: number;
      speed: number;
      maxDist: number;
      size: number;
      opacity: number;
      hue: number; // 0 = gold, 1 = purple
    }

    const maxParticleDist = Math.max(width, height) * 0.55;
    const particleCount = width < 768 ? 50 : 80;
    const particles: Particle[] = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        angle: Math.random() * Math.PI * 2,
        dist: Math.random() * maxParticleDist,
        speed: 0.15 + Math.random() * 0.4,
        maxDist: maxParticleDist * (0.7 + Math.random() * 0.3),
        size: 1 + Math.random() * 2,
        opacity: 0.3 + Math.random() * 0.7,
        hue: Math.random() > 0.3 ? 0 : 1,
      });
    }

    let time = 0;

    function draw() {
      time += 0.006;
      ctx.clearRect(0, 0, width, height);

      // Background — subtle radial gradient
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height) * 0.7);
      bg.addColorStop(0, "#0c081e");
      bg.addColorStop(0.4, "#000000");
      bg.addColorStop(1, "#06041a");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      // ── Stars ──
      for (const s of stars) {
        const twinkle = Math.sin(time * s.speed * 2 + s.phase) * 0.35 + 0.65;
        const alpha = twinkle;

        // Soft glow halo
        if (s.glowSize > 0) {
          const glow = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.glowSize);
          glow.addColorStop(0, `rgba(${s.r}, ${s.g}, ${s.b}, ${alpha * 0.15})`);
          glow.addColorStop(1, "transparent");
          ctx.fillStyle = glow;
          ctx.fillRect(s.x - s.glowSize, s.y - s.glowSize, s.glowSize * 2, s.glowSize * 2);
        }

        // Cross flare for bright stars
        if (s.hasFlare) {
          const flareLen = s.size * 6 * twinkle;
          const flareAlpha = alpha * 0.25;
          ctx.strokeStyle = `rgba(${s.r}, ${s.g}, ${s.b}, ${flareAlpha})`;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(s.x - flareLen, s.y);
          ctx.lineTo(s.x + flareLen, s.y);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(s.x, s.y - flareLen);
          ctx.lineTo(s.x, s.y + flareLen);
          ctx.stroke();
        }

        // Star dot
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${s.r}, ${s.g}, ${s.b}, ${alpha})`;
        ctx.fill();
      }

      // ── Center glow ──
      const pulse = Math.sin(time * 0.35) * 0.1 + 1;

      // Wide halo
      const haloR = Math.min(width, height) * 0.4 * pulse;
      const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, haloR);
      halo.addColorStop(0, "rgba(212, 168, 83, 0.07)");
      halo.addColorStop(0.3, "rgba(140, 100, 200, 0.02)");
      halo.addColorStop(1, "transparent");
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, width, height);

      // Warm mid glow
      const midR = 130 * pulse;
      const mid = ctx.createRadialGradient(cx, cy, 0, cx, cy, midR);
      mid.addColorStop(0, "rgba(255, 220, 140, 0.4)");
      mid.addColorStop(0.2, "rgba(212, 168, 83, 0.2)");
      mid.addColorStop(0.5, "rgba(212, 168, 83, 0.05)");
      mid.addColorStop(1, "transparent");
      ctx.fillStyle = mid;
      ctx.fillRect(cx - midR, cy - midR, midR * 2, midR * 2);

      // Hot core
      const hotR = 40 + Math.sin(time * 0.5) * 6;
      const hot = ctx.createRadialGradient(cx, cy, 0, cx, cy, hotR);
      hot.addColorStop(0, "rgba(255, 250, 240, 1)");
      hot.addColorStop(0.12, "rgba(255, 240, 210, 0.85)");
      hot.addColorStop(0.35, "rgba(255, 200, 120, 0.35)");
      hot.addColorStop(0.7, "rgba(212, 168, 83, 0.06)");
      hot.addColorStop(1, "transparent");
      ctx.fillStyle = hot;
      ctx.fillRect(cx - hotR, cy - hotR, hotR * 2, hotR * 2);

      // White pinpoint
      const pinR = 10 + Math.sin(time * 0.7) * 2;
      const pin = ctx.createRadialGradient(cx, cy, 0, cx, cy, pinR);
      pin.addColorStop(0, "rgba(255, 255, 255, 1)");
      pin.addColorStop(0.5, "rgba(255, 248, 230, 0.6)");
      pin.addColorStop(1, "transparent");
      ctx.fillStyle = pin;
      ctx.fillRect(cx - pinR, cy - pinR, pinR * 2, pinR * 2);

      // ── Particles radiating outward ──
      ctx.globalCompositeOperation = "lighter";

      for (const p of particles) {
        p.dist += p.speed;
        if (p.dist > p.maxDist) {
          p.dist = 0;
          p.angle = Math.random() * Math.PI * 2;
          p.opacity = 0.3 + Math.random() * 0.7;
        }

        const px = cx + Math.cos(p.angle) * p.dist;
        const py = cy + Math.sin(p.angle) * p.dist;

        // Fade: bright near center, fade out at edges
        const lifeT = p.dist / p.maxDist;
        const fadeIn = Math.min(1, lifeT * 8);
        const fadeOut = 1 - lifeT;
        const alpha = fadeIn * fadeOut * fadeOut * p.opacity;

        if (alpha < 0.01) continue;

        const isGold = p.hue === 0;
        const r = isGold ? 255 : 200;
        const g = isGold ? 220 : 170;
        const b = isGold ? 150 : 255;

        // Soft glow
        const glowR = p.size * 5;
        const glow = ctx.createRadialGradient(px, py, 0, px, py, glowR);
        glow.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha * 0.3})`);
        glow.addColorStop(1, "transparent");
        ctx.fillStyle = glow;
        ctx.fillRect(px - glowR, py - glowR, glowR * 2, glowR * 2);

        // Dot
        ctx.beginPath();
        ctx.arc(px, py, p.size * (0.3 + fadeOut * 0.7), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.9})`;
        ctx.fill();
      }

      ctx.globalCompositeOperation = "source-over";

      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
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

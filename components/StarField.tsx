"use client";

import { useEffect, useRef } from "react";

/* ═══════════════════════════════════════════
   StarField — 실사 은하수
   성운 + 소형/중형/대형 별 3단계
   ═══════════════════════════════════════════ */

interface SmallStar {
  x: number; y: number;
  size: number;
  opacity: number;
  twinkleSpeed: number;
  twinklePhase: number;
}

interface MediumStar {
  x: number; y: number;
  size: number;
  glowRadius: number;
  r: number; g: number; b: number;
  twinkleSpeed: number;
  twinklePhase: number;
}

interface LargeStar {
  x: number; y: number;
  size: number;
  glowRadius: number;
  flareLength: number;
  r: number; g: number; b: number;
  fastFreq: number;
  slowFreq: number;
  phase1: number;
  phase2: number;
}

interface Nebula {
  x: number; y: number;
  radius: number;
  r: number; g: number; b: number;
  opacity: number;
  breatheSpeed: number;
  breathePhase: number;
}

function createSmallStars(count: number): SmallStar[] {
  const stars: SmallStar[] = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random(),
      y: Math.random(),
      size: 0.5 + Math.random() * 0.5,
      opacity: 0.08 + Math.random() * 0.25,
      twinkleSpeed: 0.3 + Math.random() * 0.8,
      twinklePhase: Math.random() * Math.PI * 2,
    });
  }
  return stars;
}

function createMediumStars(count: number): MediumStar[] {
  const palette: [number, number, number][] = [
    [200, 210, 255], [220, 220, 255], [255, 245, 235],
    [190, 170, 255], [170, 190, 255], [255, 230, 210],
  ];
  const stars: MediumStar[] = [];
  for (let i = 0; i < count; i++) {
    const [r, g, b] = palette[Math.floor(Math.random() * palette.length)];
    stars.push({
      x: Math.random(),
      y: Math.random(),
      size: 1.5 + Math.random() * 0.5,
      glowRadius: 4 + Math.random() * 4,
      r, g, b,
      twinkleSpeed: 0.4 + Math.random() * 1.0,
      twinklePhase: Math.random() * Math.PI * 2,
    });
  }
  return stars;
}

function createLargeStars(count: number): LargeStar[] {
  const palette: [number, number, number][] = [
    [212, 168, 83],   // gold
    [255, 250, 240],  // warm white
    [240, 235, 255],  // cool white
    [212, 168, 83],   // gold
    [255, 240, 220],  // pale gold
  ];
  const stars: LargeStar[] = [];
  for (let i = 0; i < count; i++) {
    const [r, g, b] = palette[Math.floor(Math.random() * palette.length)];
    stars.push({
      x: Math.random(),
      y: Math.random(),
      size: 3 + Math.random() * 1,
      glowRadius: 10 + Math.random() * 10,
      flareLength: 8 + Math.random() * 12,
      r, g, b,
      fastFreq: 2 + Math.random() * 3,
      slowFreq: 0.15 + Math.random() * 0.25,
      phase1: Math.random() * Math.PI * 2,
      phase2: Math.random() * Math.PI * 2,
    });
  }
  return stars;
}

function createNebulae(): Nebula[] {
  // 중앙에서 번지는 성운 레이어
  const colors: [number, number, number, number][] = [
    // [r, g, b, opacity]
    [179, 136, 255, 0.06],   // #b388ff 중심
    [156, 39, 176, 0.04],    // #9c27b0
    [233, 30, 99, 0.025],    // #e91e63
    [179, 136, 255, 0.035],  // #b388ff 외곽
    [100, 60, 180, 0.03],    // deep purple
    [200, 80, 140, 0.02],    // pink
    [120, 80, 200, 0.025],   // violet
    [80, 50, 150, 0.02],     // dark violet 외곽
  ];

  return colors.map(([r, g, b, opacity], i) => {
    // 중심 근처에서 퍼져나가는 배치
    const angle = (i / colors.length) * Math.PI * 2 + Math.random() * 0.5;
    const dist = 0.05 + (i / colors.length) * 0.2 + Math.random() * 0.1;
    return {
      x: 0.5 + Math.cos(angle) * dist,
      y: 0.5 + Math.sin(angle) * dist,
      radius: 0.15 + Math.random() * 0.25,
      r, g, b,
      opacity,
      breatheSpeed: 0.08 + Math.random() * 0.1,
      breathePhase: Math.random() * Math.PI * 2,
    };
  });
}

export default function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  const smallRef = useRef(createSmallStars(500));
  const mediumRef = useRef(createMediumStars(80));
  const largeRef = useRef(createLargeStars(15));
  const nebulaeRef = useRef(createNebulae());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0, h = 0;

    const small = smallRef.current;
    const medium = mediumRef.current;
    const large = largeRef.current;
    const nebulae = nebulaeRef.current;

    // 성운 오프스크린 (리사이즈 시만 다시 그림)
    const nebulaCanvas = document.createElement("canvas");
    const nebulaCtx = nebulaCanvas.getContext("2d")!;
    let nebulaStale = true;

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      const pw = Math.round(w * dpr);
      const ph = Math.round(h * dpr);
      canvas.width = pw;
      canvas.height = ph;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      nebulaCanvas.width = pw;
      nebulaCanvas.height = ph;
      nebulaStale = true;
    };
    resize();
    window.addEventListener("resize", resize);

    const renderNebula = (t: number) => {
      const pw = nebulaCanvas.width;
      const ph = nebulaCanvas.height;
      nebulaCtx.clearRect(0, 0, pw, ph);

      for (const n of nebulae) {
        const breathe = Math.sin(t * n.breatheSpeed + n.breathePhase) * 0.25 + 0.75;
        const cx = n.x * pw;
        const cy = n.y * ph;
        const r = n.radius * Math.max(pw, ph) * breathe;
        const a = n.opacity * breathe;

        const grad = nebulaCtx.createRadialGradient(cx, cy, 0, cx, cy, r);
        grad.addColorStop(0, `rgba(${n.r},${n.g},${n.b},${a})`);
        grad.addColorStop(0.4, `rgba(${n.r},${n.g},${n.b},${a * 0.5})`);
        grad.addColorStop(0.7, `rgba(${n.r},${n.g},${n.b},${a * 0.15})`);
        grad.addColorStop(1, "transparent");
        nebulaCtx.fillStyle = grad;
        nebulaCtx.fillRect(cx - r, cy - r, r * 2, r * 2);
      }
    };

    let lastNebulaT = -999;

    const draw = (time: number) => {
      const t = time * 0.001;
      const pw = canvas.width;
      const ph = canvas.height;

      // 1. 배경
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, pw, ph);

      // 2. 성운 레이어 (3초마다 갱신 — breathe 반영)
      if (nebulaStale || t - lastNebulaT > 3) {
        renderNebula(t);
        nebulaStale = false;
        lastNebulaT = t;
      }
      ctx.globalCompositeOperation = "lighter";
      ctx.drawImage(nebulaCanvas, 0, 0);
      ctx.globalCompositeOperation = "source-over";

      // 스케일 전환
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // 3. 소형별 — 수백 개, 낮은 opacity
      for (const s of small) {
        const twinkle = Math.sin(t * s.twinkleSpeed + s.twinklePhase) * 0.3 + 0.7;
        const a = s.opacity * twinkle;
        if (a < 0.03) continue;

        ctx.globalAlpha = a;
        ctx.fillStyle = "rgba(200,210,235,1)";
        ctx.fillRect(s.x * w, s.y * h, s.size, s.size);
      }
      ctx.globalAlpha = 1;

      // 4. 중형별 — 은은한 글로우
      for (const s of medium) {
        const twinkle = Math.sin(t * s.twinkleSpeed + s.twinklePhase) * 0.2 + 0.8;
        const sx = s.x * w;
        const sy = s.y * h;

        // 글로우
        const gr = s.glowRadius * twinkle;
        const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, gr);
        grad.addColorStop(0, `rgba(${s.r},${s.g},${s.b},${0.1 * twinkle})`);
        grad.addColorStop(0.5, `rgba(${s.r},${s.g},${s.b},${0.03 * twinkle})`);
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.fillRect(sx - gr, sy - gr, gr * 2, gr * 2);

        // 점
        ctx.beginPath();
        ctx.arc(sx, sy, s.size * twinkle, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${s.r},${s.g},${s.b},${0.7 * twinkle})`;
        ctx.fill();
      }

      // 5. 대형별 — 골드/화이트, 십자 빛갈라짐
      for (const s of large) {
        const fast = Math.sin(t * s.fastFreq + s.phase1) * 0.15;
        const slow = Math.sin(t * s.slowFreq + s.phase2) * 0.25;
        const tw = Math.max(0.3, Math.min(1, fast + slow + 0.6));

        const sx = s.x * w;
        const sy = s.y * h;

        // 외부 글로우
        const gr = s.glowRadius * (0.8 + tw * 0.2);
        const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, gr);
        grad.addColorStop(0, `rgba(${s.r},${s.g},${s.b},${0.15 * tw})`);
        grad.addColorStop(0.3, `rgba(${s.r},${s.g},${s.b},${0.06 * tw})`);
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.fillRect(sx - gr, sy - gr, gr * 2, gr * 2);

        // 십자 빛갈라짐
        const fl = s.flareLength * tw;
        ctx.strokeStyle = `rgba(${s.r},${s.g},${s.b},${0.2 * tw})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(sx - fl, sy); ctx.lineTo(sx + fl, sy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(sx, sy - fl); ctx.lineTo(sx, sy + fl); ctx.stroke();

        // 대각 짧은 플레어
        const df = fl * 0.35;
        ctx.strokeStyle = `rgba(${s.r},${s.g},${s.b},${0.08 * tw})`;
        ctx.lineWidth = 0.3;
        ctx.beginPath(); ctx.moveTo(sx - df, sy - df); ctx.lineTo(sx + df, sy + df); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(sx + df, sy - df); ctx.lineTo(sx - df, sy + df); ctx.stroke();

        // 코어
        ctx.beginPath();
        ctx.arc(sx, sy, s.size * tw, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${s.r},${s.g},${s.b},${tw})`;
        ctx.fill();

        // 코어 내부 밝은 점
        ctx.beginPath();
        ctx.arc(sx, sy, s.size * 0.4 * tw, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${0.6 * tw})`;
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

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

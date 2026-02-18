"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { startAmbient, stopAmbient, setMuted, isMuted } from "@/lib/sounds";

export default function LandingContent() {
  const [soundStarted, setSoundStarted] = useState(false);
  const [muted, setMutedState] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    const handleInteraction = () => {
      if (startedRef.current) return;
      startedRef.current = true;
      setSoundStarted(true);
      startAmbient();
    };

    window.addEventListener("click", handleInteraction, { once: true });
    window.addEventListener("touchstart", handleInteraction, { once: true });

    return () => {
      window.removeEventListener("click", handleInteraction);
      window.removeEventListener("touchstart", handleInteraction);
      stopAmbient();
    };
  }, []);

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !isMuted();
    setMuted(next);
    setMutedState(next);
  };

  return (
    <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4">
      {/* Sound toggle */}
      {soundStarted && (
        <button
          onClick={toggleMute}
          className="fixed top-5 right-5 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 z-50"
          style={{
            background: "rgba(0,0,0,0.4)",
            border: "1px solid rgba(212, 168, 83, 0.2)",
            backdropFilter: "blur(8px)",
          }}
        >
          <span className="text-base" style={{ color: "rgba(212, 168, 83, 0.7)" }}>
            {muted ? "\u{1F507}" : "\u{1F509}"}
          </span>
        </button>
      )}

      <div className="text-center animate-fadeIn">
        {/* Logo */}
        <h1
          className="text-5xl md:text-7xl font-light tracking-wide text-white"
          style={{
            fontFamily: "var(--font-display), serif",
            textShadow:
              "0 0 40px rgba(212, 168, 83, 0.4), 0 0 80px rgba(179, 136, 255, 0.2)",
          }}
        >
          Parallel Me
        </h1>

        {/* Subtitle */}
        <p
          className="mt-4 text-base md:text-lg text-white/50 tracking-widest animate-fadeInSlow"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          당신조차 몰랐던 당신의 우주를 추적합니다
        </p>

        {/* CTA */}
        <Link
          href="/onboarding"
          className="inline-block mt-10 px-8 py-3.5 border border-amber-500/40 bg-amber-500/5 backdrop-blur-sm rounded-full text-amber-300/90 text-sm tracking-wider hover:bg-amber-500/15 hover:border-amber-400/60 hover:shadow-[0_0_30px_rgba(212,168,83,0.2)] transition-all duration-500 animate-fadeInSlow2"
        >
          나의 우주 열기
        </Link>

        {/* Sound hint */}
        {!soundStarted && (
          <p
            className="mt-6 text-[11px] animate-fadeInSlow2"
            style={{ color: "rgba(255,255,255,0.2)" }}
          >
            화면을 터치하면 우주의 소리가 시작됩니다
          </p>
        )}
      </div>
    </div>
  );
}

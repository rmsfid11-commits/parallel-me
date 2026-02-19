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
      {/* Sound toggle — glass morphism */}
      {soundStarted && (
        <button
          onClick={toggleMute}
          className="fixed top-5 right-5 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 z-50"
          style={{
            background: "rgba(5,5,20,0.5)",
            border: "1px solid rgba(212, 168, 83, 0.15)",
            backdropFilter: "blur(12px)",
            boxShadow: "0 0 20px rgba(0,0,0,0.3)",
          }}
        >
          <span className="text-base" style={{ color: "rgba(212, 168, 83, 0.7)" }}>
            {muted ? "\u{1F507}" : "\u{1F509}"}
          </span>
        </button>
      )}

      <div className="text-center animate-fadeIn">
        {/* Logo — enhanced glow */}
        <h1
          className="text-5xl md:text-7xl font-light tracking-wide text-white animate-glowPulse"
          style={{
            fontFamily: "var(--font-display), serif",
            textShadow:
              "0 0 40px rgba(212, 168, 83, 0.4), 0 0 80px rgba(179, 136, 255, 0.2), 0 0 120px rgba(99, 102, 241, 0.1)",
          }}
        >
          Parallel Me
        </h1>

        {/* Subtitle */}
        <p
          className="mt-5 text-base md:text-lg text-white/45 tracking-widest animate-fadeInSlow"
          style={{
            fontFamily: "var(--font-display), serif",
            textShadow: "0 0 20px rgba(179,136,255,0.1)",
          }}
        >
          당신조차 몰랐던 당신의 우주를 추적합니다
        </p>

        {/* CTA — glass morphism button */}
        <Link
          href="/onboarding"
          className="inline-block mt-12 px-10 py-4 rounded-full text-sm tracking-wider transition-all duration-700 animate-fadeInSlow2"
          style={{
            background: "linear-gradient(135deg, rgba(212,168,83,0.08), rgba(179,136,255,0.05))",
            border: "1px solid rgba(212,168,83,0.3)",
            color: "rgba(212,168,83,0.9)",
            backdropFilter: "blur(12px)",
            boxShadow: "0 0 30px rgba(212,168,83,0.1), 0 0 60px rgba(179,136,255,0.05), inset 0 0 30px rgba(212,168,83,0.03)",
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.boxShadow = "0 0 40px rgba(212,168,83,0.2), 0 0 80px rgba(179,136,255,0.1), inset 0 0 40px rgba(212,168,83,0.05)";
            el.style.borderColor = "rgba(212,168,83,0.5)";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.boxShadow = "0 0 30px rgba(212,168,83,0.1), 0 0 60px rgba(179,136,255,0.05), inset 0 0 30px rgba(212,168,83,0.03)";
            el.style.borderColor = "rgba(212,168,83,0.3)";
          }}
        >
          나의 우주 열기
        </Link>

        {/* Sound hint */}
        {!soundStarted && (
          <p
            className="mt-8 text-[11px] animate-fadeInSlow2"
            style={{
              color: "rgba(255,255,255,0.15)",
              textShadow: "0 0 10px rgba(179,136,255,0.1)",
            }}
          >
            화면을 터치하면 우주의 소리가 시작됩니다
          </p>
        )}
      </div>
    </div>
  );
}

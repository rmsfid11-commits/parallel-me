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
          당신조차 몰랐던 당신의 우주를 추적합니다.
        </p>

        {/* Added descriptive paragraph to explain the app's core value proposition */}
        <p
          className="mt-6 max-w-xl mx-auto text-sm md:text-base text-white/60 leading-relaxed font-light animate-fadeInSlow"
          style={{
            textShadow: "0 0 10px rgba(255,255,255,0.1)",
          }}
        >
          만약 그때 다른 선택을 했다면 어땠을까요? <br />
          간단한 몇 가지 질문을 통해, 다른 차원에 존재하는<br />
          평행우주의 '나(Parallel Me)'를 시뮬레이션 해보세요.
        </p>

        {/* CTA — glass morphism button */}
        <Link
          href="/onboarding"
          className="inline-block mt-12 px-10 py-4 rounded-full text-sm md:text-base font-medium tracking-wider transition-all duration-700 animate-fadeInSlow2"
          style={{
            background: "linear-gradient(135deg, rgba(212,168,83,0.12), rgba(179,136,255,0.08))",
            border: "1px solid rgba(212,168,83,0.4)",
            color: "rgba(212,168,83,0.95)",
            backdropFilter: "blur(12px)",
            boxShadow: "0 0 30px rgba(212,168,83,0.15), 0 0 60px rgba(179,136,255,0.1), inset 0 0 30px rgba(212,168,83,0.05)",
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.boxShadow = "0 0 40px rgba(212,168,83,0.3), 0 0 80px rgba(179,136,255,0.2), inset 0 0 40px rgba(212,168,83,0.1)";
            el.style.borderColor = "rgba(212,168,83,0.6)";
            el.style.background = "linear-gradient(135deg, rgba(212,168,83,0.15), rgba(179,136,255,0.12))";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.boxShadow = "0 0 30px rgba(212,168,83,0.15), 0 0 60px rgba(179,136,255,0.1), inset 0 0 30px rgba(212,168,83,0.05)";
            el.style.borderColor = "rgba(212,168,83,0.4)";
            el.style.background = "linear-gradient(135deg, rgba(212,168,83,0.12), rgba(179,136,255,0.08))";
          }}
        >
          내 평행우주 시뮬레이션 시작하기
        </Link>

        {/* How it Works / Guide section */}
        <div
          className="mt-16 text-left max-w-sm mx-auto p-6 rounded-2xl animate-fadeInSlow2 border border-white/5 bg-white/5 backdrop-blur-md"
        >
          <p className="text-white/80 font-medium mb-4 text-sm tracking-wide text-center">
            이용 안내
          </p>
          <ol className="space-y-4 text-xs md:text-sm text-white/60 font-light">
            <li className="flex gap-3 items-start">
              <span className="text-[#d4a853] font-medium">1</span>
              <span>나의 기본 정보(직업, 관심사) 입력</span>
            </li>
            <li className="flex gap-3 items-start">
              <span className="text-[#d4a853] font-medium">2</span>
              <span>보고 싶은 우주의 분위기(희망/현실/최악) 선택</span>
            </li>
            <li className="flex gap-3 items-start">
              <span className="text-[#d4a853] font-medium">3</span>
              <span>AI가 분석한 나의 평행우주 스토리라인 감상</span>
            </li>
          </ol>
        </div>

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

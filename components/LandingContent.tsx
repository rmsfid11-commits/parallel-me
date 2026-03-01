"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
    <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden pointer-events-none">
      {/* Sound toggle */}
      {soundStarted && (
        <button
          onClick={toggleMute}
          className="fixed top-6 right-6 w-11 h-11 rounded-full flex items-center justify-center transition-all duration-500 z-50 pointer-events-auto"
          style={{
            background: "rgba(10, 5, 25, 0.4)",
            border: "1px solid rgba(140, 100, 255, 0.2)",
            backdropFilter: "blur(16px)",
            boxShadow: "0 0 25px rgba(0,0,0,0.5)",
          }}
        >
          <span className="text-lg" style={{ color: "rgba(212, 168, 83, 0.8)", textShadow: "0 0 10px rgba(212, 168, 83, 0.5)" }}>
            {muted ? "\u{1F507}" : "\u{1F509}"}
          </span>
        </button>
      )}

      <div className="text-center flex flex-col items-center justify-center pointer-events-auto mt-[-5vh]">
        {/* Floating App Logo Image with intense magma/liquid corona effect */}
        <div
          className="relative w-48 h-48 md:w-64 md:h-64 mb-6 rounded-full overflow-hidden"
          style={{
            animation: "float 6s ease-in-out infinite",
            // Powerful outer aura simulating the glowing liquid/lightning from the simulation
            boxShadow: "0 0 60px 10px rgba(179,136,255,0.6), 0 0 100px 30px rgba(212,168,83,0.3), inset 0 0 20px rgba(179,136,255,0.5)",
            border: "2px solid rgba(179,136,255,0.3)"
          }}
        >
          {/* Inner pulsating glow behind the image */}
          <div
            className="absolute inset-0 z-0 animate-pulse"
            style={{
              background: "radial-gradient(circle, rgba(212,168,83,0.4) 0%, rgba(140,100,255,0.1) 70%, transparent 100%)",
              animationDuration: "3s"
            }}
          />
          <Image
            src="/icon-512.png"
            alt="Parallel Me Logo"
            fill
            className="object-cover z-10"
            priority
          />
        </div>

        {/* Text Title (Loads immensely faster now) */}
        <div style={{
          animation: "float 6s ease-in-out infinite", transform: "translateY(-10px)", opacity: 0,
          animationName: "fadeIn, float", animationDuration: "1s, 6s", animationTimingFunction: "ease-out, ease-in-out", animationIterationCount: "1, infinite", animationFillMode: "forwards, none"
        }}>
          <h1
            className="text-6xl md:text-8xl font-light tracking-widest text-white"
            style={{
              fontFamily: "var(--font-display), serif",
              textShadow:
                "0 0 50px rgba(212, 168, 83, 0.5), 0 0 100px rgba(140, 100, 255, 0.3), 0 0 150px rgba(70, 50, 200, 0.2)",
              letterSpacing: "0.15em",
            }}
          >
            Parallel Me
          </h1>
        </div>

        {/* Subtitle (Loads right after title) */}
        <p
          className="mt-8 text-sm md:text-base tracking-[0.3em] font-light"
          style={{
            color: "rgba(255,255,255,0.5)",
            textShadow: "0 0 15px rgba(179,136,255,0.2)",
            opacity: 0,
            animation: "fadeIn 1.5s ease-out forwards 0.5s", // Fast load
          }}
        >
          당신조차 몰랐던 당신의 우주를 추적합니다
        </p>

        {/* CTA Button — glowing portal (Loads fast) */}
        <div
          style={{
            opacity: 0,
            animation: "fadeIn 1.5s ease-out forwards 1.0s", // Fast load
            marginTop: "4rem",
          }}
        >
          <Link
            href="/onboarding"
            className="group relative inline-flex items-center justify-center px-12 py-5 rounded-full overflow-hidden transition-all duration-700"
            style={{
              background: "rgba(20, 10, 40, 0.3)",
              border: "1px solid rgba(212,168,83,0.2)",
              backdropFilter: "blur(12px)",
              boxShadow: "0 0 40px rgba(140, 100, 255, 0.1), inset 0 0 20px rgba(212,168,83,0.05)",
            }}
          >
            {/* Button Inner Glow */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-full"
              style={{
                background: "linear-gradient(135deg, rgba(212,168,83,0.15), rgba(140,100,255,0.15))",
                boxShadow: "inset 0 0 30px rgba(212,168,83,0.1)"
              }}
            />

            <span
              className="relative text-sm tracking-[0.2em] font-light transition-colors duration-500"
              style={{
                color: "rgba(212, 168, 83, 0.8)",
                textShadow: "0 0 15px rgba(212, 168, 83, 0.5)",
              }}
            >
              평행우주 접속하기
            </span>
          </Link>
        </div>

        {/* Sound hint */}
        {!soundStarted && (
          <p
            className="absolute bottom-12 text-[10px] tracking-widest font-light"
            style={{
              color: "rgba(255,255,255,0.2)",
              opacity: 0,
              animation: "fadeIn 4s ease-out forwards 5s",
            }}
          >
            화면을 터치하면 우주의 소리가 깨어납니다
          </p>
        )}
      </div>

      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; filter: blur(10px); }
          to { opacity: 1; filter: blur(0px); }
        }
      `}</style>
    </div>
  );
}

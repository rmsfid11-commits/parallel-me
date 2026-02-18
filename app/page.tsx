import Link from "next/link";
import CosmicCanvas from "@/components/CosmicCanvas";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <CosmicCanvas />

      {/* Content overlay */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4">
        <div className="text-center animate-fadeIn">
          {/* Logo */}
          <h1
            className="text-5xl md:text-7xl font-light tracking-wide text-white"
            style={{
              fontFamily: "var(--font-display), serif",
              textShadow: "0 0 40px rgba(212, 168, 83, 0.4), 0 0 80px rgba(179, 136, 255, 0.2)",
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
        </div>
      </div>
    </main>
  );
}

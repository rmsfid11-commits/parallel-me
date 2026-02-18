import OnboardingForm from "@/components/OnboardingForm";
import StarField from "@/components/StarField";

export default function OnboardingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <StarField />
      <div
        className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-12"
      >
        <div className="text-center mb-10 animate-fadeIn">
          <h2
            className="text-2xl text-white/70 tracking-wide"
            style={{
              fontFamily: "var(--font-display), serif",
              textShadow: "0 0 20px rgba(212, 168, 83, 0.3)",
            }}
          >
            Parallel Me
          </h2>
        </div>

        <div className="animate-slideUp w-full">
          <OnboardingForm />
        </div>
      </div>
    </main>
  );
}

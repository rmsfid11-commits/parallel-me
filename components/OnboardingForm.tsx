"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { UserProfile, SimulationMode } from "@/lib/types";
import { playSwoosh } from "@/lib/sounds";

interface OnboardingStep {
  question: string;
  field: keyof UserProfile;
  type: "text" | "mode";
  placeholder?: string;
}

const STEPS: OnboardingStep[] = [
  {
    question: "생년월일이 어떻게 돼?",
    field: "birthday",
    type: "text",
    placeholder: "예: 1992.04.27",
  },
  {
    question: "어떤 일을 하고 있어?",
    field: "job",
    type: "text",
    placeholder: "직업이나 하는 일",
  },
  {
    question: "요즘 뭐에 관심 있어?",
    field: "interest",
    type: "text",
    placeholder: "요즘 관심사",
  },
  {
    question: "우주를 어떤 필터로 보고 싶어?",
    field: "mode",
    type: "mode",
  },
];

const MODES: { value: SimulationMode; emoji: string; label: string; desc: string }[] = [
  { value: "희망적 우주", emoji: "\u{1F305}", label: "찬란한 빛", desc: "잘 될 거라는 전제로" },
  { value: "현실적 우주", emoji: "\u{2696}\u{FE0F}", label: "있는 그대로", desc: "좋은 것도 나쁜 것도 균형있게" },
  { value: "최악의 우주", emoji: "\u{1F311}", label: "거친 폭풍우", desc: "바닥까지 보여줘" },
];

const STORAGE_KEY = "parallelme-onboarding";

export default function OnboardingForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<UserProfile>({
    birthday: "",
    birthTime: "모름",
    job: "",
    careerYears: "",
    age: 0,
    monthlyIncome: "",
    debt: "",
    pastExperience: "",
    interest: "",
    question: "",
    mode: "현실적 우주",
    learnedFacts: [],
  });
  const [phase, setPhase] = useState<"input" | "transitioning" | "loading">("input");
  const inputRef = useRef<HTMLInputElement>(null);
  const [restored, setRestored] = useState(false);

  const totalSteps = STEPS.length;
  const currentStep = STEPS[Math.min(step, totalSteps - 1)];

  // Restore from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { form: savedForm, step: savedStep } = JSON.parse(saved);
        if (savedForm) setForm(savedForm);
        if (typeof savedStep === "number" && savedStep >= 0 && savedStep < totalSteps) {
          setStep(savedStep);
        }
      }
    } catch {
      // ignore
    }
    setRestored(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save to localStorage on every step/form change
  useEffect(() => {
    if (!restored) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ form, step }));
  }, [form, step, restored]);

  // Browser back button
  useEffect(() => {
    if (!restored) return;
    if (phase === "input") {
      history.pushState({ onboardingStep: step }, "");
    }
    const handlePopState = (e: PopStateEvent) => {
      if (phase === "loading") return;
      e.preventDefault();
      if (step > 0) {
        setStep((s) => s - 1);
        setPhase("input");
        history.pushState({ onboardingStep: step - 1 }, "");
      } else {
        history.back();
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, phase, restored]);

  // Focus input on step change
  useEffect(() => {
    if (phase === "input" && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [step, phase]);

  const canProceed = () => {
    const val = form[currentStep.field];
    if (currentStep.type === "mode") return typeof val === "string" && val.length > 0;
    return typeof val === "string" && val.trim().length > 0;
  };

  const goBack = useCallback(() => {
    if (step <= 0 || phase === "loading") return;
    setPhase("transitioning");
    playSwoosh();
    setTimeout(() => {
      setStep((s) => s - 1);
      setPhase("input");
    }, 350);
  }, [step, phase]);

  const advanceStep = useCallback(() => {
    if (step >= totalSteps - 1) {
      setPhase("loading");
      localStorage.setItem("parallelme-profile", JSON.stringify(form));
      localStorage.removeItem(STORAGE_KEY);
      setTimeout(() => {
        router.push("/simulation");
      }, 2500);
      return;
    }
    setPhase("transitioning");
    playSwoosh();
    setTimeout(() => {
      setStep((s) => s + 1);
      setPhase("input");
    }, 350);
  }, [step, totalSteps, form, router]);

  const submitStep = useCallback(() => {
    if (!canProceed() || phase !== "input") return;
    advanceStep();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, currentStep, phase, advanceStep]);

  // ── Loading screen ──
  if (phase === "loading") {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-fadeIn">
        <div className="relative w-40 h-40 mb-8">
          <div
            className="absolute rounded-full"
            style={{
              top: "50%", left: "50%",
              width: "120px", height: "120px",
              border: "1px solid rgba(212,168,83,0.15)",
              animation: "ringExpand 3s ease-out infinite",
            }}
          />
          <div
            className="absolute rounded-full"
            style={{
              top: "50%", left: "50%",
              width: "120px", height: "120px",
              border: "1px solid rgba(179,136,255,0.1)",
              animation: "ringExpand 3s ease-out 1s infinite",
            }}
          />
          <div
            className="absolute rounded-full"
            style={{
              top: "50%", left: "50%",
              width: "120px", height: "120px",
              border: "1px solid rgba(212,168,83,0.08)",
              animation: "ringExpand 3s ease-out 2s infinite",
            }}
          />
          <div
            className="absolute rounded-full"
            style={{
              width: "12px",
              height: "12px",
              top: "50%",
              left: "50%",
              background: "radial-gradient(circle, #fff 0%, #d4a853 40%, rgba(179,136,255,0.5) 100%)",
              animation: "orbFloat 3s ease-in-out infinite",
            }}
          />
          {[0, 30, 60, 90, 120, 150].map((deg) => (
            <div
              key={deg}
              className="absolute"
              style={{
                top: "50%",
                left: "50%",
                width: `${60 + Math.random() * 40}px`,
                height: "1px",
                transform: `translate(-50%, -50%) rotate(${deg}deg)`,
                background: "linear-gradient(to right, transparent, rgba(212,168,83,0.3), transparent)",
                animation: `fadeIn ${1 + Math.random()}s ease-out ${0.3 + deg * 0.01}s both`,
              }}
            />
          ))}
        </div>
        <p
          className="text-sm tracking-wider animate-glowPulse"
          style={{
            color: "rgba(212, 168, 83, 0.8)",
            fontFamily: "var(--font-display), serif",
          }}
        >
          좋아. 너의 우주를 펼쳐볼게.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto px-4">
      {/* Back button */}
      {step > 0 && phase === "input" && (
        <button
          onClick={goBack}
          className="absolute top-4 left-4 text-sm transition-all duration-500 z-20"
          style={{
            color: "rgba(255, 255, 255, 0.25)",
            textShadow: "0 0 10px rgba(179,136,255,0.2)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "rgba(212, 168, 83, 0.6)";
            e.currentTarget.style.textShadow = "0 0 15px rgba(212,168,83,0.3)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "rgba(255, 255, 255, 0.25)";
            e.currentTarget.style.textShadow = "0 0 10px rgba(179,136,255,0.2)";
          }}
        >
          &larr; 이전
        </button>
      )}

      {/* Progress dots */}
      <div className="flex items-center justify-center gap-1.5 mb-12">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className="rounded-full transition-all duration-700"
            style={{
              width: i === step ? "10px" : "4px",
              height: i === step ? "10px" : "4px",
              background:
                i < step
                  ? "rgba(212, 168, 83, 0.5)"
                  : i === step
                    ? "rgba(212, 168, 83, 0.9)"
                    : "rgba(255, 255, 255, 0.1)",
              boxShadow:
                i === step
                  ? "0 0 12px rgba(212, 168, 83, 0.6), 0 0 24px rgba(212, 168, 83, 0.2)"
                  : i < step
                    ? "0 0 6px rgba(212, 168, 83, 0.2)"
                    : "none",
            }}
          />
        ))}
      </div>

      {/* Question + Input */}
      <div
        key={step}
        className={
          phase === "transitioning"
            ? "animate-dreamyExit"
            : "animate-dreamyReveal"
        }
      >
        <h2
          className="text-2xl md:text-3xl font-medium text-center mb-10 leading-relaxed"
          style={{
            color: "rgba(255, 255, 255, 0.92)",
            fontFamily: "var(--font-display), serif",
            textShadow: "0 0 30px rgba(212,168,83,0.15), 0 0 60px rgba(179,136,255,0.08)",
          }}
        >
          {currentStep.question}
        </h2>

        {/* Text input */}
        {phase === "input" && currentStep.type === "text" && (
          <div className="flex justify-center">
            <div className="relative w-full max-w-sm">
              <input
                ref={inputRef}
                type="text"
                value={form[currentStep.field] as string}
                onChange={(e) =>
                  setForm({ ...form, [currentStep.field]: e.target.value })
                }
                placeholder={currentStep.placeholder}
                autoFocus
                className="w-full text-center text-xl bg-transparent border-b-2 pb-3 outline-none transition-all duration-500 placeholder:text-white/15"
                style={{
                  color: "rgba(255, 255, 255, 0.9)",
                  borderColor: "rgba(212, 168, 83, 0.2)",
                  caretColor: "#d4a853",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "rgba(212, 168, 83, 0.5)";
                  e.currentTarget.style.boxShadow = "0 4px 20px -4px rgba(212, 168, 83, 0.15)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "rgba(212, 168, 83, 0.2)";
                  e.currentTarget.style.boxShadow = "none";
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    submitStep();
                  }
                }}
              />
              <div
                className="absolute bottom-0 left-1/2 -translate-x-1/2 h-px transition-all duration-700"
                style={{
                  width: (form[currentStep.field] as string)?.length > 0 ? "100%" : "0%",
                  background: "linear-gradient(to right, transparent, rgba(212,168,83,0.4), rgba(179,136,255,0.3), transparent)",
                  boxShadow: "0 0 12px rgba(212,168,83,0.2)",
                }}
              />
            </div>
          </div>
        )}

        {/* Mode select */}
        {phase === "input" && currentStep.type === "mode" && (
          <div className="space-y-3 max-w-sm mx-auto">
            {MODES.map((m, idx) => (
              <button
                key={m.value}
                onClick={() => {
                  setForm({ ...form, mode: m.value });
                  setTimeout(() => {
                    setPhase("loading");
                    localStorage.setItem(
                      "parallelme-profile",
                      JSON.stringify({ ...form, mode: m.value })
                    );
                    localStorage.removeItem(STORAGE_KEY);
                    setTimeout(() => router.push("/simulation"), 2500);
                  }, 100);
                }}
                className="w-full flex flex-col items-center gap-1.5 px-5 py-5 rounded-2xl transition-all duration-500 animate-borderGlow"
                style={{
                  background: "rgba(5, 5, 20, 0.5)",
                  backdropFilter: "blur(12px)",
                  border:
                    form.mode === m.value
                      ? "1px solid rgba(212, 168, 83, 0.4)"
                      : "1px solid rgba(255, 255, 255, 0.06)",
                  animationDelay: `${idx * 0.5}s`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(212, 168, 83, 0.35)";
                  e.currentTarget.style.background = "rgba(212, 168, 83, 0.04)";
                  e.currentTarget.style.boxShadow = "0 0 30px rgba(212,168,83,0.08), inset 0 0 30px rgba(212,168,83,0.03)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor =
                    form.mode === m.value
                      ? "rgba(212, 168, 83, 0.4)"
                      : "rgba(255, 255, 255, 0.06)";
                  e.currentTarget.style.background = "rgba(5, 5, 20, 0.5)";
                  e.currentTarget.style.boxShadow = "";
                }}
              >
                <span
                  className="text-lg"
                  style={{
                    color: "rgba(255,255,255,0.9)",
                    textShadow: "0 0 20px rgba(212,168,83,0.2)",
                  }}
                >
                  {m.emoji} {m.label}
                </span>
                <span
                  className="text-[11px]"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                >
                  {m.desc}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Confirm button */}
        {phase === "input" && currentStep.type !== "mode" && (
          <div className="flex justify-center mt-8">
            <button
              onClick={submitStep}
              disabled={!canProceed()}
              className="px-8 py-2.5 rounded-full text-sm font-medium transition-all duration-500 disabled:opacity-0"
              style={{
                background: canProceed()
                  ? "linear-gradient(135deg, rgba(212, 168, 83, 0.12), rgba(179,136,255,0.08))"
                  : "transparent",
                border: canProceed()
                  ? "1px solid rgba(212, 168, 83, 0.35)"
                  : "1px solid transparent",
                color: "rgba(212, 168, 83, 0.9)",
                boxShadow: canProceed()
                  ? "0 0 20px rgba(212,168,83,0.1), inset 0 0 20px rgba(212,168,83,0.03)"
                  : "none",
                backdropFilter: "blur(8px)",
              }}
              onMouseEnter={(e) => {
                if (canProceed()) {
                  e.currentTarget.style.boxShadow =
                    "0 0 30px rgba(212,168,83,0.2), inset 0 0 30px rgba(212,168,83,0.05)";
                  e.currentTarget.style.borderColor = "rgba(212, 168, 83, 0.5)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = canProceed()
                  ? "0 0 20px rgba(212,168,83,0.1), inset 0 0 20px rgba(212,168,83,0.03)"
                  : "none";
                e.currentTarget.style.borderColor = canProceed()
                  ? "rgba(212, 168, 83, 0.35)"
                  : "transparent";
              }}
            >
              확인
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

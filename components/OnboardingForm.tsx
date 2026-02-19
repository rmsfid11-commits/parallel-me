"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { UserProfile, SimulationMode } from "@/lib/types";
import { playTypeTick, playSwoosh } from "@/lib/sounds";

interface OnboardingStep {
  question: string;
  field: keyof UserProfile;
  type: "text" | "number" | "mode";
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
    question: "태어난 시간 알아?",
    field: "birthTime",
    type: "text",
    placeholder: "예: 16:34 또는 모름",
  },
  {
    question: "너는 어떤 분야에서 너만의 칼을 갈아왔어?",
    field: "job",
    type: "text",
    placeholder: "직업이나 하는 일",
  },
  {
    question: "그 칼을 얼마나 오래 갈아왔어?",
    field: "careerYears",
    type: "text",
    placeholder: "예: 3년, 신입, 15년차",
  },
  {
    question: "몇 살이야?",
    field: "age",
    type: "number",
    placeholder: "예: 32",
  },
  {
    question: "매달 네 창고에 쌓이는 숫자는 어느 정도야?",
    field: "monthlyIncome",
    type: "text",
    placeholder: "예: 600만원, 200만원",
  },
  {
    question: "혹시 네 발목을 잡고 있는 모래주머니 같은 게 있어? 없으면 없다고 해도 돼.",
    field: "debt",
    type: "text",
    placeholder: "예: 1800만원, 없음",
  },
  {
    question: "예전에 뭔가 직접 해본 적 있어? 사업이든 부업이든.",
    field: "pastExperience",
    type: "text",
    placeholder: "없으면 '없음'이라고 해도 돼",
  },
  {
    question: "요즘 네 머릿속을 가장 많이 차지하는 건 뭐야?",
    field: "interest",
    type: "text",
    placeholder: "요즘 관심사",
  },
  {
    question: "네 미래에서 제일 궁금한 게 뭐야?",
    field: "question",
    type: "text",
    placeholder: "미래에 대한 궁금함",
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
    birthTime: "",
    job: "",
    careerYears: "",
    age: 0,
    monthlyIncome: "",
    debt: "",
    pastExperience: "",
    interest: "",
    question: "",
    mode: "현실적 우주",
  });
  const [phase, setPhase] = useState<
    "input" | "reacting" | "transitioning" | "loading"
  >("input");
  const [aiReaction, setAiReaction] = useState("");
  const [displayedReaction, setDisplayedReaction] = useState("");
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const typewriterRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  // Browser back button → go to previous step instead of leaving page
  useEffect(() => {
    if (!restored) return;

    history.pushState({ onboardingStep: step }, "");

    const handlePopState = (e: PopStateEvent) => {
      if (phase === "loading") return;
      e.preventDefault();
      if (step > 0) {
        setStep((s) => s - 1);
        setPhase("input");
        setAiReaction("");
        setDisplayedReaction("");
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

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (typewriterRef.current) clearInterval(typewriterRef.current);
      if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    };
  }, []);

  const canProceed = () => {
    const val = form[currentStep.field];
    if (currentStep.type === "mode")
      return typeof val === "string" && val.length > 0;
    if (currentStep.type === "number")
      return typeof val === "number" && val > 0;
    return typeof val === "string" && val.trim().length > 0;
  };

  // Typewriter effect for AI reaction
  const startTypewriter = useCallback(
    (text: string, onDone: () => void) => {
      let index = 0;
      setDisplayedReaction("");

      typewriterRef.current = setInterval(() => {
        index++;
        setDisplayedReaction(text.substring(0, index));
        playTypeTick();
        if (index >= text.length) {
          if (typewriterRef.current)
            clearInterval(typewriterRef.current);
          typewriterRef.current = null;
          onDone();
        }
      }, 40);
    },
    []
  );

  // Go to previous step
  const goBack = useCallback(() => {
    if (step <= 0 || phase === "loading") return;
    if (typewriterRef.current) {
      clearInterval(typewriterRef.current);
      typewriterRef.current = null;
    }
    if (autoAdvanceRef.current) {
      clearTimeout(autoAdvanceRef.current);
      autoAdvanceRef.current = null;
    }
    setPhase("transitioning");
    playSwoosh();
    setTimeout(() => {
      setStep((s) => s - 1);
      setAiReaction("");
      setDisplayedReaction("");
      setPhase("input");
    }, 350);
  }, [step, phase]);

  // Advance to next step
  const advanceStep = useCallback(() => {
    if (step >= totalSteps - 1) {
      setPhase("loading");
      localStorage.setItem(
        "parallelme-profile",
        JSON.stringify(form)
      );
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
      setAiReaction("");
      setDisplayedReaction("");
      setPhase("input");
    }, 350);
  }, [step, totalSteps, form, router]);

  // Submit current step
  const submitStep = useCallback(async () => {
    if (!canProceed() || phase !== "input") return;

    const val = form[currentStep.field];
    const userInput = String(val);

    setPhase("reacting");

    try {
      const res = await fetch("/api/onboarding-react", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step,
          userInput,
          collectedProfile: form,
        }),
      });

      const data = await res.json();
      const reaction = data.reaction || "...";
      setAiReaction(reaction);

      startTypewriter(reaction, () => {
        // Don't auto-advance — user taps to proceed
      });
    } catch {
      advanceStep();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, currentStep, phase, step, startTypewriter, advanceStep]);

  // Tap to skip / advance from reaction
  const skipToNext = useCallback(() => {
    if (phase === "reacting") {
      // If still typing, finish instantly
      if (typewriterRef.current) {
        clearInterval(typewriterRef.current);
        typewriterRef.current = null;
        setDisplayedReaction(aiReaction);
        return; // First tap: show full text. Second tap: advance.
      }
      // Typing is done — advance to next step
      if (autoAdvanceRef.current) {
        clearTimeout(autoAdvanceRef.current);
        autoAdvanceRef.current = null;
      }
      advanceStep();
    }
  }, [phase, aiReaction, advanceStep]);

  // ── Loading screen (dreamy orb) ──
  if (phase === "loading") {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-fadeIn">
        <div className="relative w-40 h-40 mb-8">
          {/* Expanding rings */}
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

          {/* Core orb */}
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

          {/* Light rays */}
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
                background:
                  "linear-gradient(to right, transparent, rgba(212,168,83,0.3), transparent)",
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
    <div
      className="w-full max-w-lg mx-auto px-4"
      onClick={phase === "reacting" ? skipToNext : undefined}
    >
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

      {/* Question + Input area — dreamy transitions */}
      <div
        key={step}
        className={
          phase === "transitioning"
            ? "animate-dreamyExit"
            : "animate-dreamyReveal"
        }
      >
        {/* Question text with glow */}
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

        {/* Text input — ethereal underline */}
        {phase === "input" && currentStep.type === "text" && (
          <div className="flex justify-center">
            <div className="relative w-full max-w-sm">
              <input
                ref={inputRef as React.RefObject<HTMLInputElement>}
                type="text"
                value={form[currentStep.field] as string}
                onChange={(e) =>
                  setForm({
                    ...form,
                    [currentStep.field]: e.target.value,
                  })
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
              {/* Glow line under input */}
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

        {/* Number input (age) — ethereal underline */}
        {phase === "input" && currentStep.type === "number" && (
          <div className="flex justify-center">
            <div className="relative w-full max-w-sm">
              <input
                ref={inputRef as React.RefObject<HTMLInputElement>}
                type="number"
                inputMode="numeric"
                value={form[currentStep.field] === 0 ? "" : String(form[currentStep.field])}
                onChange={(e) =>
                  setForm({
                    ...form,
                    [currentStep.field]: parseInt(e.target.value) || 0,
                  })
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
                  width: form[currentStep.field] !== 0 ? "100%" : "0%",
                  background: "linear-gradient(to right, transparent, rgba(212,168,83,0.4), rgba(179,136,255,0.3), transparent)",
                  boxShadow: "0 0 12px rgba(212,168,83,0.2)",
                }}
              />
            </div>
          </div>
        )}

        {/* Mode select — glassmorphism cards */}
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
                    setTimeout(
                      () => router.push("/simulation"),
                      2500
                    );
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

        {/* Confirm button — golden glow */}
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

        {/* AI Reaction — glowing text */}
        {phase === "reacting" && (
          <div className="flex justify-center mt-8 animate-fadeIn">
            <p
              className="text-center text-lg leading-relaxed max-w-sm animate-glowPulse"
              style={{
                color: "#d4a853",
                fontFamily: "var(--font-display), serif",
                minHeight: "2em",
                textShadow: "0 0 20px rgba(212,168,83,0.4), 0 0 40px rgba(179,136,255,0.15)",
              }}
            >
              {displayedReaction}
              {displayedReaction.length < aiReaction.length && (
                <span
                  className="inline-block w-0.5 h-5 ml-0.5 animate-pulse"
                  style={{
                    background: "linear-gradient(to bottom, #d4a853, rgba(179,136,255,0.5))",
                    verticalAlign: "text-bottom",
                    boxShadow: "0 0 8px rgba(212,168,83,0.6)",
                  }}
                />
              )}
            </p>
          </div>
        )}

        {/* Tap to continue hint */}
        {phase === "reacting" && displayedReaction === aiReaction && (
          <div className="flex justify-center mt-6 animate-fadeIn">
            <span
              className="text-[11px] animate-pulse"
              style={{ color: "rgba(255,255,255,0.2)" }}
            >
              터치하면 다음으로
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

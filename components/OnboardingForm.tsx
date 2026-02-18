"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { UserProfile, SimulationMode } from "@/lib/types";
import { playTypeTick, playSwoosh } from "@/lib/sounds";

interface OnboardingStep {
  question: string;
  field: keyof UserProfile;
  type: "text" | "number" | "gender" | "mode";
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
    question: "태어난 시간 알아? 몰라도 괜찮아",
    field: "birthTime",
    type: "text",
    placeholder: "예: 15:00 또는 모름",
  },
  {
    question: "성별은?",
    field: "gender",
    type: "gender",
  },
  {
    question: "지금 뭐 하고 있어?",
    field: "job",
    type: "text",
    placeholder: "직업이나 하는 일",
  },
  {
    question: "몇 살이야?",
    field: "age",
    type: "number",
    placeholder: "나이",
  },
  {
    question: "요즘 네 머릿속을 가장 많이 차지하는 건 뭐야?",
    field: "interest",
    type: "text",
    placeholder: "자유롭게 적어",
  },
  {
    question: "네 미래에서 제일 궁금한 게 뭐야?",
    field: "question",
    type: "text",
    placeholder: "미래에 대한 궁금함",
  },
  {
    question: "너의 미래를 어떤 눈으로 볼까?",
    field: "mode",
    type: "mode",
  },
];

const GENDERS = [
  { value: "남", label: "남자" },
  { value: "여", label: "여자" },
  { value: "말하고 싶지 않음", label: "말하고 싶지 않음" },
];

const MODES: { value: SimulationMode; label: string; desc: string }[] = [
  { value: "희망적 우주", label: "희망적 우주", desc: "좋은 일이 기다리는 미래" },
  { value: "현실적 우주", label: "현실적 우주", desc: "있는 그대로의 미래" },
  { value: "최악의 우주", label: "최악의 우주", desc: "가장 험난한 미래" },
];

export default function OnboardingForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<UserProfile>({
    birthday: "",
    birthTime: "",
    gender: "",
    job: "",
    age: 0,
    interest: "",
    question: "",
    mode: "현실적 우주",
  });
  const [phase, setPhase] = useState<"input" | "reacting" | "transitioning" | "loading">("input");
  const [aiReaction, setAiReaction] = useState("");
  const [displayedReaction, setDisplayedReaction] = useState("");
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const typewriterRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalSteps = STEPS.length;
  const currentStep = STEPS[Math.min(step, totalSteps - 1)];

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
    if (currentStep.type === "number") return typeof val === "number" && val > 0;
    if (currentStep.type === "gender" || currentStep.type === "mode") return typeof val === "string" && val.length > 0;
    return typeof val === "string" && val.trim().length > 0;
  };

  // Typewriter effect for AI reaction
  const startTypewriter = useCallback((text: string, onDone: () => void) => {
    let index = 0;
    setDisplayedReaction("");

    typewriterRef.current = setInterval(() => {
      index++;
      setDisplayedReaction(text.substring(0, index));
      playTypeTick();
      if (index >= text.length) {
        if (typewriterRef.current) clearInterval(typewriterRef.current);
        typewriterRef.current = null;
        onDone();
      }
    }, 40);
  }, []);

  // Advance to next step
  const advanceStep = useCallback(() => {
    if (step >= totalSteps - 1) {
      // Last step — save profile to sessionStorage and go to simulation
      setPhase("loading");
      sessionStorage.setItem("parallelme-profile", JSON.stringify(form));
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
    }, 300);
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
        autoAdvanceRef.current = setTimeout(advanceStep, 1500);
      });
    } catch {
      // Fallback: just advance
      advanceStep();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, currentStep, phase, step, startTypewriter, advanceStep]);

  // Skip waiting — advance immediately on click/tap during reaction
  const skipToNext = useCallback(() => {
    if (phase === "reacting") {
      if (typewriterRef.current) {
        clearInterval(typewriterRef.current);
        typewriterRef.current = null;
        setDisplayedReaction(aiReaction);
      }
      if (autoAdvanceRef.current) {
        clearTimeout(autoAdvanceRef.current);
        autoAdvanceRef.current = null;
      }
      advanceStep();
    }
  }, [phase, aiReaction, advanceStep]);

  // Loading screen
  if (phase === "loading") {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-fadeIn">
        <div className="relative w-32 h-32 mb-8">
          <div
            className="absolute inset-0 rounded-full animate-ping"
            style={{
              background: "radial-gradient(circle, rgba(212,168,83,0.3) 0%, transparent 70%)",
            }}
          />
          <div
            className="absolute rounded-full animate-pulse"
            style={{
              width: "8px",
              height: "8px",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: "#d4a853",
              boxShadow: "0 0 30px rgba(212,168,83,0.8), 0 0 60px rgba(212,168,83,0.4)",
            }}
          />
          <div
            className="absolute"
            style={{
              top: "50%",
              left: "50%",
              width: "100px",
              height: "2px",
              transform: "translate(-50%, -50%)",
              background: "linear-gradient(to right, transparent, rgba(212,168,83,0.6), transparent)",
              animation: "fadeIn 1s ease-out 0.5s both",
            }}
          />
          <div
            className="absolute"
            style={{
              top: "50%",
              left: "50%",
              width: "80px",
              height: "2px",
              transform: "translate(-50%, -50%) rotate(30deg)",
              background: "linear-gradient(to right, transparent, rgba(212,168,83,0.4), transparent)",
              animation: "fadeIn 1s ease-out 0.8s both",
            }}
          />
          <div
            className="absolute"
            style={{
              top: "50%",
              left: "50%",
              width: "60px",
              height: "2px",
              transform: "translate(-50%, -50%) rotate(-25deg)",
              background: "linear-gradient(to right, transparent, rgba(212,168,83,0.3), transparent)",
              animation: "fadeIn 1s ease-out 1.1s both",
            }}
          />
        </div>
        <p
          className="text-sm tracking-wider"
          style={{
            color: "rgba(212, 168, 83, 0.7)",
            fontFamily: "var(--font-display), serif",
          }}
        >
          당신의 우주를 펼치고 있습니다...
        </p>
      </div>
    );
  }

  return (
    <div
      className="w-full max-w-lg mx-auto px-4"
      onClick={phase === "reacting" ? skipToNext : undefined}
    >
      {/* Progress dots — 7개 */}
      <div className="flex items-center justify-center gap-3 mb-12">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className="rounded-full transition-all duration-500"
            style={{
              width: i === step ? "10px" : "6px",
              height: i === step ? "10px" : "6px",
              background: i <= step
                ? "rgba(212, 168, 83, 0.8)"
                : "rgba(255, 255, 255, 0.15)",
              boxShadow: i === step
                ? "0 0 12px rgba(212, 168, 83, 0.5)"
                : "none",
            }}
          />
        ))}
      </div>

      {/* Question + Input area */}
      <div
        className={`transition-all duration-300 ${
          phase === "transitioning"
            ? "opacity-0 translate-y-4"
            : "opacity-100 translate-y-0"
        }`}
      >
        {/* Question text */}
        <h2
          className="text-2xl md:text-3xl font-medium text-center mb-10 leading-relaxed"
          style={{
            color: "rgba(255, 255, 255, 0.9)",
            fontFamily: "var(--font-display), serif",
          }}
        >
          {currentStep.question}
        </h2>

        {/* Text input */}
        {phase === "input" && currentStep.type === "text" && (
          <div className="flex justify-center">
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type="text"
              value={form[currentStep.field] as string}
              onChange={(e) =>
                setForm({ ...form, [currentStep.field]: e.target.value })
              }
              placeholder={currentStep.placeholder}
              autoFocus
              className="w-full max-w-sm text-center text-xl bg-transparent border-b-2 pb-2 outline-none transition-all duration-300 placeholder:text-white/20"
              style={{
                color: "rgba(255, 255, 255, 0.9)",
                borderColor: "rgba(212, 168, 83, 0.3)",
                caretColor: "#d4a853",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "rgba(212, 168, 83, 0.6)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "rgba(212, 168, 83, 0.3)";
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submitStep();
                }
              }}
            />
          </div>
        )}

        {/* Number input */}
        {phase === "input" && currentStep.type === "number" && (
          <div className="flex justify-center">
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type="number"
              value={form.age || ""}
              onChange={(e) =>
                setForm({ ...form, age: parseInt(e.target.value) || 0 })
              }
              placeholder={currentStep.placeholder}
              min={10}
              max={100}
              autoFocus
              className="w-24 text-center text-3xl bg-transparent border-b-2 pb-2 outline-none transition-all duration-300 placeholder:text-white/20"
              style={{
                color: "rgba(255, 255, 255, 0.9)",
                borderColor: "rgba(212, 168, 83, 0.3)",
                caretColor: "#d4a853",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "rgba(212, 168, 83, 0.6)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "rgba(212, 168, 83, 0.3)";
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submitStep();
                }
              }}
            />
          </div>
        )}

        {/* Gender select — 3 buttons */}
        {phase === "input" && currentStep.type === "gender" && (
          <div className="space-y-3 max-w-sm mx-auto">
            {GENDERS.map((g) => (
              <button
                key={g.value}
                onClick={() => {
                  setForm({ ...form, gender: g.value });
                  // Auto-submit after selection
                  setTimeout(async () => {
                    setPhase("reacting");
                    try {
                      const res = await fetch("/api/onboarding-react", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          step,
                          userInput: g.value,
                          collectedProfile: { ...form, gender: g.value },
                        }),
                      });
                      const data = await res.json();
                      const reaction = data.reaction || "...";
                      setAiReaction(reaction);
                      startTypewriter(reaction, () => {
                        autoAdvanceRef.current = setTimeout(advanceStep, 1500);
                      });
                    } catch {
                      advanceStep();
                    }
                  }, 100);
                }}
                className="w-full flex items-center justify-center gap-3 px-5 py-4 rounded-xl transition-all duration-300"
                style={{
                  background: "rgba(0, 0, 0, 0.4)",
                  border: form.gender === g.value
                    ? "1px solid rgba(212, 168, 83, 0.5)"
                    : "1px solid rgba(255, 255, 255, 0.08)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(212, 168, 83, 0.4)";
                  e.currentTarget.style.background = "rgba(212, 168, 83, 0.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor =
                    form.gender === g.value
                      ? "rgba(212, 168, 83, 0.5)"
                      : "rgba(255, 255, 255, 0.08)";
                  e.currentTarget.style.background = "rgba(0, 0, 0, 0.4)";
                }}
              >
                <span style={{ color: "rgba(255,255,255,0.85)" }}>{g.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Mode select — 3 buttons */}
        {phase === "input" && currentStep.type === "mode" && (
          <div className="space-y-3 max-w-sm mx-auto">
            {MODES.map((m) => (
              <button
                key={m.value}
                onClick={() => {
                  setForm({ ...form, mode: m.value });
                  // Save and go to simulation (last step, no AI reaction)
                  setTimeout(() => {
                    setPhase("loading");
                    sessionStorage.setItem(
                      "parallelme-profile",
                      JSON.stringify({ ...form, mode: m.value })
                    );
                    setTimeout(() => router.push("/simulation"), 2500);
                  }, 100);
                }}
                className="w-full flex flex-col items-center gap-1 px-5 py-4 rounded-xl transition-all duration-300"
                style={{
                  background: "rgba(0, 0, 0, 0.4)",
                  border: form.mode === m.value
                    ? "1px solid rgba(212, 168, 83, 0.5)"
                    : "1px solid rgba(255, 255, 255, 0.08)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(212, 168, 83, 0.4)";
                  e.currentTarget.style.background = "rgba(212, 168, 83, 0.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor =
                    form.mode === m.value
                      ? "rgba(212, 168, 83, 0.5)"
                      : "rgba(255, 255, 255, 0.08)";
                  e.currentTarget.style.background = "rgba(0, 0, 0, 0.4)";
                }}
              >
                <span style={{ color: "rgba(255,255,255,0.85)" }}>{m.label}</span>
                <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>{m.desc}</span>
              </button>
            ))}
          </div>
        )}

        {/* Submit hint */}
        {phase === "input" && currentStep.type !== "gender" && currentStep.type !== "mode" && (
          <div className="flex justify-center mt-6">
            <button
              onClick={submitStep}
              disabled={!canProceed()}
              className="text-sm transition-all duration-300 disabled:opacity-0"
              style={{ color: "rgba(212, 168, 83, 0.5)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "rgba(212, 168, 83, 0.9)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "rgba(212, 168, 83, 0.5)";
              }}
            >
              Enter ↵
            </button>
          </div>
        )}

        {/* AI Reaction */}
        {phase === "reacting" && (
          <div className="flex justify-center mt-8 animate-fadeIn">
            <p
              className="text-center text-lg leading-relaxed max-w-sm"
              style={{
                color: "#d4a853",
                fontFamily: "var(--font-display), serif",
                minHeight: "2em",
              }}
            >
              {displayedReaction}
              {displayedReaction.length < aiReaction.length && (
                <span
                  className="inline-block w-0.5 h-5 ml-0.5 animate-pulse"
                  style={{ background: "#d4a853", verticalAlign: "text-bottom" }}
                />
              )}
            </p>
          </div>
        )}

        {/* Tap to skip hint */}
        {phase === "reacting" && displayedReaction === aiReaction && (
          <div className="flex justify-center mt-4 animate-fadeIn">
            <span
              className="text-[11px]"
              style={{ color: "rgba(255,255,255,0.15)" }}
            >
              탭하면 넘어갑니다
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

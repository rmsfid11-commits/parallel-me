"use client";

import { useRef, useEffect } from "react";
import { ChatMessage } from "@/lib/types";

interface StoryPanelProps {
  messages: ChatMessage[];
  isGenerating: boolean;
}

export default function StoryPanel({
  messages,
  isGenerating,
}: StoryPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, isGenerating]);

  // Filter only assistant messages for story display (+ user interventions)
  const storyMessages = messages.filter(
    (m) => m.role === "assistant" || m.isIntervention
  );

  return (
    <div
      ref={scrollRef}
      className="h-full overflow-y-auto"
      style={{
        scrollbarWidth: "thin",
        scrollbarColor: "rgba(212,168,83,0.2) transparent",
      }}
    >
      <div className="max-w-2xl mx-auto px-5 md:px-8 py-8 pb-4">
        {storyMessages.length === 0 && !isGenerating && (
          <div className="flex items-center justify-center h-40">
            <p
              className="text-sm animate-glowPulse"
              style={{
                color: "rgba(255,255,255,0.2)",
                fontFamily: "var(--font-display), serif",
              }}
            >
              우주가 펼쳐지고 있어...
            </p>
          </div>
        )}

        {storyMessages.map((msg, idx) => (
          <div
            key={msg.id}
            className={idx === storyMessages.length - 1 ? "animate-dreamyReveal" : ""}
          >
            {/* User intervention */}
            {msg.isIntervention && (
              <div className="my-8">
                {/* Branch marker with glow */}
                <div className="flex items-center gap-3 my-5">
                  <div
                    className="flex-1 h-px"
                    style={{
                      background: "linear-gradient(to right, transparent, rgba(179,136,255,0.4), transparent)",
                      boxShadow: "0 0 8px rgba(179,136,255,0.15)",
                    }}
                  />
                  <span
                    className="text-[11px] px-4 py-1.5 rounded-full"
                    style={{
                      color: "rgba(179,136,255,0.85)",
                      background: "rgba(179,136,255,0.06)",
                      border: "1px solid rgba(179,136,255,0.2)",
                      boxShadow: "0 0 15px rgba(179,136,255,0.08)",
                      backdropFilter: "blur(8px)",
                    }}
                  >
                    개입
                  </span>
                  <div
                    className="flex-1 h-px"
                    style={{
                      background: "linear-gradient(to left, transparent, rgba(179,136,255,0.4), transparent)",
                      boxShadow: "0 0 8px rgba(179,136,255,0.15)",
                    }}
                  />
                </div>
                <p
                  className="text-[15px] leading-relaxed text-center"
                  style={{
                    color: "rgba(179,136,255,0.75)",
                    textShadow: "0 0 15px rgba(179,136,255,0.2)",
                  }}
                >
                  {msg.content}
                </p>
              </div>
            )}

            {/* Assistant scenario */}
            {msg.role === "assistant" && (
              <>
                {/* Time label divider — glowing ethereal line */}
                {msg.timeLabel && (
                  <div className="flex items-center gap-4 my-10">
                    <div
                      className="flex-1 h-px"
                      style={{
                        background:
                          "linear-gradient(to right, transparent, rgba(212,168,83,0.35), rgba(179,136,255,0.15))",
                        boxShadow: "0 0 8px rgba(212,168,83,0.1)",
                      }}
                    />
                    <span
                      className="text-[12px] tracking-wider whitespace-nowrap px-1"
                      style={{
                        color: "rgba(212,168,83,0.8)",
                        fontFamily: "var(--font-display), serif",
                        textShadow: "0 0 15px rgba(212,168,83,0.3), 0 0 30px rgba(212,168,83,0.1)",
                      }}
                    >
                      {msg.timeLabel}
                    </span>
                    <div
                      className="flex-1 h-px"
                      style={{
                        background:
                          "linear-gradient(to left, transparent, rgba(212,168,83,0.35), rgba(179,136,255,0.15))",
                        boxShadow: "0 0 8px rgba(212,168,83,0.1)",
                      }}
                    />
                  </div>
                )}

                {/* Scenario text */}
                <div>
                  <p
                    className="text-[16px] leading-[2] whitespace-pre-wrap"
                    style={{
                      color: "rgba(255,255,255,0.87)",
                      wordBreak: "keep-all",
                      textShadow: "0 0 1px rgba(255,255,255,0.1)",
                    }}
                  >
                    {msg.content}
                  </p>
                </div>
              </>
            )}
          </div>
        ))}

        {/* Generating indicator — ethereal breathing dots */}
        {isGenerating && (
          <div className="flex items-center gap-4 mt-10 animate-fadeIn justify-center">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="rounded-full animate-pulse"
                style={{
                  width: "5px",
                  height: "5px",
                  background: "radial-gradient(circle, rgba(212,168,83,0.8), rgba(179,136,255,0.3))",
                  boxShadow: "0 0 10px rgba(212,168,83,0.4), 0 0 20px rgba(212,168,83,0.15)",
                  animationDelay: `${i * 300}ms`,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

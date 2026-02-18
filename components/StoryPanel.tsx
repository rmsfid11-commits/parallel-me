"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChatMessage } from "@/lib/types";

interface StoryPanelProps {
  messages: ChatMessage[];
  isGenerating: boolean;
  isPaused: boolean;
  onPause: () => void;
  onResume: () => void;
  onIntervene: (text: string) => void;
}

export default function StoryPanel({
  messages,
  isGenerating,
  isPaused,
  onPause,
  onResume,
  onIntervene,
}: StoryPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isIntervening, setIsIntervening] = useState(false);
  const [interventionText, setInterventionText] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, isGenerating]);

  // Focus input when intervening
  useEffect(() => {
    if (isIntervening && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isIntervening]);

  const handleIntervene = useCallback(() => {
    setIsIntervening(true);
    onPause();
  }, [onPause]);

  const handleSubmitIntervention = useCallback(() => {
    const text = interventionText.trim();
    if (!text) return;
    onIntervene(text);
    setInterventionText("");
    setIsIntervening(false);
  }, [interventionText, onIntervene]);

  const handleCancelIntervene = useCallback(() => {
    setIsIntervening(false);
    setInterventionText("");
  }, []);

  // Filter only assistant messages for story display (+ user interventions)
  const storyMessages = messages.filter(
    (m) => m.role === "assistant" || m.isIntervention
  );

  return (
    <div className="flex flex-col h-full">
      {/* Story scroll area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(212,168,83,0.3) transparent",
        }}
      >
        <div className="max-w-2xl mx-auto px-5 md:px-8 py-8 pb-32">
          {storyMessages.length === 0 && !isGenerating && (
            <div className="flex items-center justify-center h-40">
              <p
                className="text-sm"
                style={{ color: "rgba(255,255,255,0.2)" }}
              >
                우주가 펼쳐지고 있어...
              </p>
            </div>
          )}

          {storyMessages.map((msg, idx) => (
            <div key={msg.id} className="animate-fadeIn">
              {/* User intervention */}
              {msg.isIntervention && (
                <div className="my-6">
                  {/* Branch marker */}
                  <div className="flex items-center gap-3 my-4">
                    <div
                      className="flex-1 h-px"
                      style={{ background: "rgba(179,136,255,0.3)" }}
                    />
                    <span
                      className="text-[11px] px-3 py-1 rounded-full"
                      style={{
                        color: "rgba(179,136,255,0.8)",
                        background: "rgba(179,136,255,0.08)",
                        border: "1px solid rgba(179,136,255,0.2)",
                      }}
                    >
                      개입
                    </span>
                    <div
                      className="flex-1 h-px"
                      style={{ background: "rgba(179,136,255,0.3)" }}
                    />
                  </div>
                  <p
                    className="text-[15px] leading-relaxed text-center"
                    style={{ color: "rgba(179,136,255,0.7)" }}
                  >
                    {msg.content}
                  </p>
                </div>
              )}

              {/* Assistant scenario */}
              {msg.role === "assistant" && (
                <>
                  {/* Time label divider */}
                  {msg.timeLabel && (
                    <div className="flex items-center gap-3 my-8">
                      <div
                        className="flex-1 h-px"
                        style={{
                          background:
                            "linear-gradient(to right, transparent, rgba(212,168,83,0.3))",
                        }}
                      />
                      <span
                        className="text-[12px] tracking-wider whitespace-nowrap"
                        style={{
                          color: "rgba(212,168,83,0.7)",
                          fontFamily: "var(--font-display), serif",
                        }}
                      >
                        {msg.timeLabel}
                      </span>
                      <div
                        className="flex-1 h-px"
                        style={{
                          background:
                            "linear-gradient(to left, transparent, rgba(212,168,83,0.3))",
                        }}
                      />
                    </div>
                  )}

                  {/* Scenario text */}
                  <div
                    className={idx === storyMessages.length - 1 ? "animate-fadeInSlow" : ""}
                  >
                    <p
                      className="text-[16px] leading-[1.9] whitespace-pre-wrap"
                      style={{
                        color: "rgba(255,255,255,0.85)",
                        wordBreak: "keep-all",
                      }}
                    >
                      {msg.content}
                    </p>
                  </div>
                </>
              )}
            </div>
          ))}

          {/* Generating indicator */}
          {isGenerating && (
            <div className="flex items-center gap-3 mt-8 animate-fadeIn">
              <div
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: "rgba(212,168,83,0.6)" }}
              />
              <div
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{
                  background: "rgba(212,168,83,0.6)",
                  animationDelay: "300ms",
                }}
              />
              <div
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{
                  background: "rgba(212,168,83,0.6)",
                  animationDelay: "600ms",
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Bottom bar */}
      <div
        className="flex-none z-20"
        style={{
          background: "rgba(0,0,0,0.9)",
          borderTop: "1px solid rgba(212,168,83,0.1)",
          paddingBottom: "max(12px, env(safe-area-inset-bottom))",
        }}
      >
        {/* Intervention input */}
        {isIntervening && (
          <div className="px-4 pt-3 pb-2">
            <div
              className="flex items-end gap-2 rounded-xl px-3 py-2"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(179,136,255,0.25)",
              }}
            >
              <textarea
                ref={inputRef}
                value={interventionText}
                onChange={(e) => setInterventionText(e.target.value)}
                placeholder="나는 여기서 이렇게 할 거야..."
                rows={2}
                className="flex-1 bg-transparent outline-none resize-none text-[14px] placeholder:text-white/20"
                style={{
                  color: "rgba(255,255,255,0.9)",
                  caretColor: "#b388ff",
                  lineHeight: "1.5",
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmitIntervention();
                  }
                }}
              />
              <button
                onClick={handleSubmitIntervention}
                disabled={!interventionText.trim()}
                className="flex-none px-3 py-1.5 rounded-lg text-[12px] transition-all disabled:opacity-30"
                style={{
                  background: "rgba(179,136,255,0.15)",
                  border: "1px solid rgba(179,136,255,0.3)",
                  color: "rgba(179,136,255,0.9)",
                }}
              >
                전송
              </button>
              <button
                onClick={handleCancelIntervene}
                className="flex-none px-2 py-1.5 rounded-lg text-[12px] transition-all"
                style={{ color: "rgba(255,255,255,0.3)" }}
              >
                취소
              </button>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center justify-center gap-4 px-4 py-3">
          {!isPaused && !isIntervening && (
            <button
              onClick={onPause}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] transition-all"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.5)",
              }}
            >
              <span style={{ fontSize: "14px" }}>&#x23F8;&#xFE0E;</span>
              멈추기
            </button>
          )}

          {!isIntervening && (
            <button
              onClick={handleIntervene}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] transition-all"
              style={{
                background: "rgba(179,136,255,0.08)",
                border: "1px solid rgba(179,136,255,0.25)",
                color: "rgba(179,136,255,0.8)",
              }}
            >
              <span style={{ fontSize: "14px" }}>&#x270D;&#xFE0E;</span>
              개입하기
            </button>
          )}

          {isPaused && !isIntervening && (
            <button
              onClick={onResume}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] transition-all"
              style={{
                background: "rgba(212,168,83,0.1)",
                border: "1px solid rgba(212,168,83,0.3)",
                color: "rgba(212,168,83,0.9)",
              }}
            >
              <span style={{ fontSize: "14px" }}>&#x25B6;&#xFE0E;</span>
              계속
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

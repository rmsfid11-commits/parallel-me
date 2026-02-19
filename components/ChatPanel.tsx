"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChatMessage as ChatMessageType } from "@/lib/types";
import ChatMessage from "./ChatMessage";
import BranchChoices from "./BranchChoices";

interface ChatPanelProps {
  messages: ChatMessageType[];
  isGenerating: boolean;
  onSendMessage: (text: string) => void;
  onBranchChoice: (msgId: string, label: string, index: number) => void;
}

export default function ChatPanel({
  messages,
  isGenerating,
  onSendMessage,
  onBranchChoice,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isGenerating]);

  // Auto-resize textarea
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-resize
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  }, []);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isGenerating) return;
    onSendMessage(trimmed);
    setInput("");
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
  }, [input, isGenerating, onSendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  return (
    <div
      className="flex flex-col h-full"
      style={{
        background: "linear-gradient(to bottom, rgba(2,2,8,0.75) 0%, rgba(2,2,8,0.88) 30%, rgba(2,2,8,0.92) 100%)",
      }}
    >
      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 md:px-4 py-4 space-y-3"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(212,168,83,0.3) transparent",
        }}
      >
        {messages.map((msg) => (
          <div key={msg.id}>
            <ChatMessage message={msg} />
            {/* Branch choices after assistant message */}
            {msg.role === "assistant" && msg.branchPoint && (
              <div className="mt-2">
                <BranchChoices
                  branchPoint={msg.branchPoint}
                  onChoice={(label, index) => onBranchChoice(msg.id, label, index)}
                  disabled={isGenerating}
                />
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {isGenerating && (
          <div className="flex justify-start animate-fadeIn">
            <div
              className="rounded-2xl px-4 py-3 flex items-center gap-2"
              style={{
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(212, 168, 83, 0.12)",
                borderRadius: "20px 20px 20px 4px",
              }}
            >
              <div className="flex gap-1">
                <div
                  className="w-1.5 h-1.5 rounded-full animate-bounce"
                  style={{ background: "rgba(212, 168, 83, 0.6)", animationDelay: "0ms" }}
                />
                <div
                  className="w-1.5 h-1.5 rounded-full animate-bounce"
                  style={{ background: "rgba(212, 168, 83, 0.6)", animationDelay: "150ms" }}
                />
                <div
                  className="w-1.5 h-1.5 rounded-full animate-bounce"
                  style={{ background: "rgba(212, 168, 83, 0.6)", animationDelay: "300ms" }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <div
        className="flex-none px-3 md:px-4 py-3"
        style={{
          borderTop: "1px solid rgba(212, 168, 83, 0.1)",
          background: "rgba(2, 2, 8, 0.95)",
          backdropFilter: "blur(12px)",
          paddingBottom: "max(12px, env(safe-area-inset-bottom))",
        }}
      >
        <div
          className="flex items-end gap-2 rounded-xl px-3 py-2"
          style={{
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(212, 168, 83, 0.15)",
          }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="계속 / 개입 / 질문..."
            rows={1}
            className="flex-1 bg-transparent outline-none resize-none text-[14px] md:text-[15px] placeholder:text-white/25"
            style={{
              color: "rgba(255, 255, 255, 0.9)",
              caretColor: "#d4a853",
              maxHeight: "120px",
              lineHeight: "1.5",
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isGenerating}
            className="flex-none w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-300 disabled:opacity-20"
            style={{
              background: input.trim()
                ? "rgba(212, 168, 83, 0.2)"
                : "transparent",
              color: "#d4a853",
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        <p
          className="text-[10px] text-center mt-1.5"
          style={{ color: "rgba(255,255,255,0.15)" }}
        >
          Shift+Enter로 줄바꿈
        </p>
      </div>
    </div>
  );
}

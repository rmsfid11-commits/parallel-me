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

  // ── Typing animation ──
  const [typingMsgId, setTypingMsgId] = useState<string | null>(null);
  const [typingRevealed, setTypingRevealed] = useState(0);
  const typingRef = useRef<{
    msgId: string;
    revealed: number;
    total: number;
  } | null>(null);
  const prevMsgCountRef = useRef(0);

  // ── Scroll state ──
  const isNearBottomRef = useRef(true);
  const [hasUnread, setHasUnread] = useState(false);

  // ── Suggestions ──
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestFetchedRef = useRef(false);

  // ── Mobile detect ──
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    setIsMobile(
      /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
        window.innerWidth < 768
    );
  }, []);

  // ── Detect new assistant message → start typing ──
  useEffect(() => {
    if (messages.length > prevMsgCountRef.current) {
      const lastMsg = messages[messages.length - 1];

      if (lastMsg.role === "assistant") {
        typingRef.current = {
          msgId: lastMsg.id,
          revealed: 0,
          total: lastMsg.content.length,
        };
        setTypingMsgId(lastMsg.id);
        setTypingRevealed(0);
      }

      // Scroll or show unread pill
      if (isNearBottomRef.current) {
        setTimeout(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }
        }, 50);
      } else {
        setHasUnread(true);
      }

      // Reset suggestions on new message
      setSuggestions([]);
      setShowSuggestions(false);
      suggestFetchedRef.current = false;
    }
    prevMsgCountRef.current = messages.length;
  }, [messages]);

  // ── Typing animation loop ──
  useEffect(() => {
    if (!typingMsgId) return;

    const CHARS_PER_TICK = 12;
    const TICK_MS = 25;

    const timer = setInterval(() => {
      if (!typingRef.current) {
        clearInterval(timer);
        setTypingMsgId(null);
        return;
      }

      typingRef.current.revealed = Math.min(
        typingRef.current.revealed + CHARS_PER_TICK,
        typingRef.current.total
      );
      setTypingRevealed(typingRef.current.revealed);

      // Auto-scroll during typing if near bottom
      if (isNearBottomRef.current && scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }

      if (typingRef.current.revealed >= typingRef.current.total) {
        typingRef.current = null;
        clearInterval(timer);
        setTimeout(() => setTypingMsgId(null), 100);
      }
    }, TICK_MS);

    return () => clearInterval(timer);
  }, [typingMsgId]);

  // ── Idle suggestion timer ──
  useEffect(() => {
    // Clear previous timer
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);

    // Don't show while generating, typing, or if input has text
    if (isGenerating || typingMsgId || input.trim() || messages.length < 2) {
      setShowSuggestions(false);
      return;
    }

    // Already fetched for this message set
    if (suggestFetchedRef.current) return;

    idleTimerRef.current = setTimeout(async () => {
      if (suggestFetchedRef.current) return;
      suggestFetchedRef.current = true;

      try {
        const res = await fetch("/api/suggest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: messages.slice(-6) }),
        });
        const data = await res.json();
        if (data.suggestions && data.suggestions.length > 0) {
          setSuggestions(data.suggestions);
          setShowSuggestions(true);
        }
      } catch {
        // silent fail
      }
    }, 5000);

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [messages, isGenerating, typingMsgId, input]);

  // Hide suggestions when user starts typing
  useEffect(() => {
    if (input.trim()) {
      setShowSuggestions(false);
    }
  }, [input]);

  // ── Scroll detection ──
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom =
      el.scrollTop + el.clientHeight >= el.scrollHeight - 100;
    isNearBottomRef.current = nearBottom;
    if (nearBottom) setHasUnread(false);
  }, []);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
    setHasUnread(false);
  }, []);

  // Auto-scroll when generating indicator appears
  useEffect(() => {
    if (isGenerating && isNearBottomRef.current) {
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 50);
    }
  }, [isGenerating]);

  // ── Input handling ──
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value);
      e.target.style.height = "auto";
      e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
    },
    []
  );

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isGenerating) return;
    onSendMessage(trimmed);
    setInput("");
    setSuggestions([]);
    setShowSuggestions(false);
    suggestFetchedRef.current = false;
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
    isNearBottomRef.current = true;
    setHasUnread(false);
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 50);
  }, [input, isGenerating, onSendMessage]);

  const handleSuggestionClick = useCallback((text: string) => {
    setInput(text);
    setShowSuggestions(false);
    inputRef.current?.focus();
  }, []);

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
      className="flex flex-col h-full relative"
      style={{
        background:
          "linear-gradient(to bottom, rgba(2,2,8,0.75) 0%, rgba(2,2,8,0.88) 30%, rgba(2,2,8,0.92) 100%)",
      }}
    >
      {/* Messages area */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 md:px-4 py-4 space-y-3"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(212,168,83,0.3) transparent",
        }}
      >
        {messages.map((msg) => (
          <div key={msg.id}>
            <ChatMessage
              message={msg}
              typingReveal={
                typingMsgId === msg.id ? typingRevealed : undefined
              }
            />
            {/* Branch choices — hide while typing */}
            {msg.role === "assistant" &&
              msg.branchPoint &&
              typingMsgId !== msg.id && (
                <div className="mt-2">
                  <BranchChoices
                    branchPoint={msg.branchPoint}
                    onChoice={(label, index) =>
                      onBranchChoice(msg.id, label, index)
                    }
                    disabled={isGenerating}
                  />
                </div>
              )}
          </div>
        ))}

        {/* Typing indicator (only when waiting for API, not during reveal) */}
        {isGenerating && !typingMsgId && (
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
                  style={{
                    background: "rgba(212, 168, 83, 0.6)",
                    animationDelay: "0ms",
                  }}
                />
                <div
                  className="w-1.5 h-1.5 rounded-full animate-bounce"
                  style={{
                    background: "rgba(212, 168, 83, 0.6)",
                    animationDelay: "150ms",
                  }}
                />
                <div
                  className="w-1.5 h-1.5 rounded-full animate-bounce"
                  style={{
                    background: "rgba(212, 168, 83, 0.6)",
                    animationDelay: "300ms",
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* New message pill */}
      {hasUnread && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-20 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-[11px] z-20 animate-slideUp"
          style={{
            background: "rgba(212,168,83,0.15)",
            border: "1px solid rgba(212,168,83,0.4)",
            color: "rgba(212,168,83,0.9)",
            backdropFilter: "blur(8px)",
          }}
        >
          새 메시지 ↓
        </button>
      )}

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
        {/* Suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="flex gap-2 mb-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => handleSuggestionClick(s)}
                className="flex-none px-3 py-1.5 rounded-full text-[12px] transition-all duration-500 animate-fadeIn"
                style={{
                  background: "rgba(212,168,83,0.06)",
                  border: "1px solid rgba(212,168,83,0.15)",
                  color: "rgba(212,168,83,0.6)",
                  animationDelay: `${i * 150}ms`,
                  animationFillMode: "both",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(212,168,83,0.12)";
                  e.currentTarget.style.borderColor = "rgba(212,168,83,0.3)";
                  e.currentTarget.style.color = "rgba(212,168,83,0.85)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(212,168,83,0.06)";
                  e.currentTarget.style.borderColor = "rgba(212,168,83,0.15)";
                  e.currentTarget.style.color = "rgba(212,168,83,0.6)";
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

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
            placeholder="무엇이든 물어봐..."
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
        {!isMobile && (
          <p
            className="text-[10px] text-center mt-1.5"
            style={{ color: "rgba(255,255,255,0.15)" }}
          >
            Shift+Enter로 줄바꿈
          </p>
        )}
      </div>
    </div>
  );
}

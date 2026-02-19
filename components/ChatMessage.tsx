"use client";

import { memo } from "react";
import { ChatMessage as ChatMessageType } from "@/lib/types";

interface ChatMessageProps {
  message: ChatMessageType;
}

// Time tag pattern: [6개월 후], [1년 후], [2주 후], etc.
const TIME_TAG_RE = /^\[(.+?후)\]$/;

// Category header patterns
const CATEGORY_RE = /^(💰\s*경제|🌟\s*꿈|💛\s*행복|🏥\s*건강)/;

function renderAssistantContent(content: string) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines
    if (!line) {
      elements.push(<div key={i} className="h-2" />);
      continue;
    }

    // Time tag divider
    const timeMatch = line.match(TIME_TAG_RE);
    if (timeMatch) {
      elements.push(
        <div
          key={i}
          className="flex items-center gap-3 my-3"
        >
          <div className="flex-1 h-px" style={{ background: "rgba(212, 168, 83, 0.25)" }} />
          <span
            className="text-[12px] font-medium tracking-wide whitespace-nowrap"
            style={{ color: "#d4a853" }}
          >
            {timeMatch[1]}
          </span>
          <div className="flex-1 h-px" style={{ background: "rgba(212, 168, 83, 0.25)" }} />
        </div>
      );
      continue;
    }

    // Category header divider
    const catMatch = line.match(CATEGORY_RE);
    if (catMatch) {
      elements.push(
        <div
          key={i}
          className="flex items-center gap-2 mt-4 mb-2"
        >
          <div className="flex-1 h-px" style={{ background: "rgba(212, 168, 83, 0.15)" }} />
          <span
            className="text-[13px] font-semibold tracking-wide whitespace-nowrap"
            style={{ color: "#d4a853" }}
          >
            {line}
          </span>
          <div className="flex-1 h-px" style={{ background: "rgba(212, 168, 83, 0.15)" }} />
        </div>
      );
      continue;
    }

    // Regular text line
    elements.push(
      <p
        key={i}
        className="text-[14px] md:text-[15px] leading-relaxed"
        style={{
          color: "rgba(255, 255, 255, 0.85)",
          wordBreak: "keep-all",
        }}
      >
        {line}
      </p>
    );
  }

  return elements;
}

function ChatMessageComponent({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end animate-fadeIn">
        <div
          className="max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3"
          style={{
            background: "rgba(212, 168, 83, 0.12)",
            border: "1px solid rgba(212, 168, 83, 0.25)",
            borderRadius: "20px 20px 4px 20px",
          }}
        >
          <p
            className="text-[14px] md:text-[15px] leading-relaxed whitespace-pre-wrap"
            style={{
              color: "rgba(255, 255, 255, 0.9)",
              wordBreak: "keep-all",
            }}
          >
            {message.content}
          </p>
        </div>
      </div>
    );
  }

  // Assistant message with parsed content
  return (
    <div className="flex justify-start animate-fadeIn">
      <div
        className="max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3"
        style={{
          background: "rgba(255, 255, 255, 0.04)",
          border: "1px solid rgba(212, 168, 83, 0.1)",
          borderRadius: "20px 20px 20px 4px",
        }}
      >
        {renderAssistantContent(message.content)}
      </div>
    </div>
  );
}

export default memo(ChatMessageComponent);

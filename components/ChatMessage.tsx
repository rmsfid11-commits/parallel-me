"use client";

import { memo } from "react";
import { ChatMessage as ChatMessageType } from "@/lib/types";

interface ChatMessageProps {
  message: ChatMessageType;
}

function ChatMessageComponent({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"} animate-fadeIn`}
    >
      <div
        className="max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3"
        style={{
          background: isUser
            ? "rgba(212, 168, 83, 0.12)"
            : "rgba(255, 255, 255, 0.04)",
          border: isUser
            ? "1px solid rgba(212, 168, 83, 0.25)"
            : "1px solid rgba(212, 168, 83, 0.1)",
          borderRadius: isUser
            ? "20px 20px 4px 20px"
            : "20px 20px 20px 4px",
        }}
      >
        <p
          className="text-[14px] md:text-[15px] leading-relaxed whitespace-pre-wrap"
          style={{
            color: isUser
              ? "rgba(255, 255, 255, 0.9)"
              : "rgba(255, 255, 255, 0.85)",
            wordBreak: "keep-all",
          }}
        >
          {message.content}
        </p>
      </div>
    </div>
  );
}

export default memo(ChatMessageComponent);

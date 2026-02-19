"use client";

import { memo } from "react";
import { BranchPointData } from "@/lib/types";
import { playHoverTick } from "@/lib/sounds";

interface BranchChoicesProps {
  branchPoint: BranchPointData;
  onChoice: (label: string, index: number) => void;
  disabled?: boolean;
}

function BranchChoicesComponent({ branchPoint, onChoice, disabled }: BranchChoicesProps) {
  const { timeLabel, summary, choices, chosenIndex } = branchPoint;

  return (
    <div className="flex justify-start animate-fadeIn">
      <div
        className="max-w-[90%] md:max-w-[80%] rounded-2xl px-4 py-3"
        style={{
          background: "rgba(179, 136, 255, 0.06)",
          border: "1px solid rgba(179, 136, 255, 0.2)",
          borderRadius: "20px 20px 20px 4px",
        }}
      >
        {/* Branch header */}
        <div className="flex items-center gap-2 mb-2">
          <span
            className="text-[11px] px-2 py-0.5 rounded-full"
            style={{
              color: "rgba(179, 136, 255, 0.9)",
              background: "rgba(179, 136, 255, 0.15)",
            }}
          >
            {timeLabel}
          </span>
          <span
            className="text-[11px]"
            style={{ color: "rgba(212, 168, 83, 0.7)" }}
          >
            갈림길
          </span>
        </div>

        <p
          className="text-[13px] mb-3 leading-relaxed"
          style={{ color: "rgba(255, 255, 255, 0.6)" }}
        >
          {summary}
        </p>

        {/* Choice buttons */}
        <div className="flex flex-col gap-2">
          {choices.map((c, i) => {
            const isChosen = chosenIndex === i;
            const isDim = chosenIndex !== undefined && chosenIndex !== i;

            return (
              <button
                key={i}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!disabled && chosenIndex === undefined) {
                    onChoice(c.label, i);
                  }
                }}
                disabled={disabled || chosenIndex !== undefined}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] transition-all duration-300 text-left"
                style={{
                  touchAction: "manipulation",
                  WebkitTapHighlightColor: "transparent",
                  background: isChosen
                    ? "rgba(212, 168, 83, 0.15)"
                    : "rgba(0, 0, 0, 0.4)",
                  border: isChosen
                    ? "1px solid rgba(212, 168, 83, 0.6)"
                    : "1px solid rgba(255, 255, 255, 0.08)",
                  color: isChosen
                    ? "rgba(212, 168, 83, 1)"
                    : isDim
                      ? "rgba(255, 255, 255, 0.25)"
                      : "rgba(255, 255, 255, 0.7)",
                  boxShadow: isChosen
                    ? "0 0 16px rgba(212, 168, 83, 0.2)"
                    : "none",
                  cursor: chosenIndex !== undefined ? "default" : "pointer",
                  opacity: isDim ? 0.5 : 1,
                }}
                onMouseEnter={(e) => {
                  if (chosenIndex === undefined && !disabled) {
                    e.currentTarget.style.borderColor = "rgba(212, 168, 83, 0.4)";
                    e.currentTarget.style.background = "rgba(212, 168, 83, 0.08)";
                    playHoverTick();
                  }
                }}
                onMouseLeave={(e) => {
                  if (chosenIndex === undefined && !disabled) {
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                    e.currentTarget.style.background = "rgba(0, 0, 0, 0.4)";
                  }
                }}
              >
                <span className="text-base">{c.emoji}</span>
                <span>{c.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default memo(BranchChoicesComponent);

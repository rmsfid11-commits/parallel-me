"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { Choice } from "@/lib/types";

export interface ScenarioNodeData {
  stepNumber: number;
  scenario: string;
  preview: string;
  choices: Choice[];
  isIntervention: boolean;
  interventionText?: string;
  chosenLabel?: string;
  isLoading: boolean;
  isRoot: boolean;
  isOnActivePath: boolean;
  isExpanded: boolean;
  usedChoiceIndices: number[];
  profileLabel?: string;
  onChoice: (label: string, index: number) => void;
  onIntervene: () => void;
  onToggleExpand: () => void;
  onHoverTick: () => void;
  [key: string]: unknown;
}

function ScenarioNode({ data }: { data: ScenarioNodeData }) {
  const {
    stepNumber,
    scenario,
    preview,
    choices,
    isIntervention,
    interventionText,
    isLoading,
    isRoot,
    isOnActivePath,
    isExpanded,
    usedChoiceIndices,
    profileLabel,
    onChoice,
    onIntervene,
    onToggleExpand,
    onHoverTick,
  } = data;

  const hasUnusedChoices = choices.some(
    (_, i) => !usedChoiceIndices.includes(i)
  );

  const dimStyle = !isOnActivePath && !isLoading
    ? { opacity: 0.4, filter: "saturate(0.5)" }
    : {};

  // Extract time tag from scenario (e.g. "[2주 후]")
  const timeTagMatch = scenario.match(/^\[([^\]]+)\]/);
  const timeTag = timeTagMatch ? timeTagMatch[1] : null;
  const scenarioBody = timeTag
    ? scenario.replace(/^\[[^\]]+\]\s*/, "")
    : scenario;

  // For collapsed state: get first ~2 lines (roughly 80 chars)
  const truncatedBody =
    scenarioBody.length > 80
      ? scenarioBody.substring(0, 80) + "..."
      : scenarioBody;

  return (
    <div className="flex flex-col items-center" style={dimStyle}>
      {/* Main card */}
      <div
        className="rounded-2xl transition-all duration-300 cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          if (!isLoading) onToggleExpand();
        }}
        style={{
          width: isRoot ? "min(380px, 90vw)" : "min(350px, 85vw)",
          background: isRoot
            ? "rgba(12, 8, 30, 0.85)"
            : isIntervention
              ? "rgba(20, 15, 5, 0.85)"
              : "rgba(8, 5, 25, 0.85)",
          backdropFilter: "blur(16px)",
          border: isOnActivePath
            ? isRoot
              ? "2px solid rgba(212, 168, 83, 0.7)"
              : "1px solid rgba(212, 168, 83, 0.5)"
            : "1px dashed rgba(212, 168, 83, 0.15)",
          boxShadow: isOnActivePath
            ? isRoot
              ? "0 0 40px rgba(212, 168, 83, 0.25), 0 0 80px rgba(212, 168, 83, 0.1)"
              : "0 0 20px rgba(212, 168, 83, 0.12)"
            : "none",
          padding: "24px",
          overflow: "hidden",
        }}
      >
        {/* Left handle (target) */}
        <Handle
          type="target"
          position={Position.Left}
          id="target"
          className="!w-3 !h-3 !border-2"
          style={{
            background: isOnActivePath
              ? "rgba(212, 168, 83, 0.8)"
              : "rgba(212, 168, 83, 0.2)",
            borderColor: "rgba(212, 168, 83, 0.3)",
          }}
        />

        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <span
            className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
            style={{
              color: "#d4a853",
              background: "rgba(212, 168, 83, 0.1)",
              fontFamily: "var(--font-display), serif",
              letterSpacing: "0.05em",
            }}
          >
            #{stepNumber}
          </span>
          {timeTag && !isLoading && (
            <span
              className="text-[11px] px-2 py-0.5 rounded-full"
              style={{
                color: "rgba(179, 136, 255, 0.9)",
                background: "rgba(179, 136, 255, 0.1)",
              }}
            >
              {timeTag}
            </span>
          )}
          {isIntervention && (
            <span className="text-[11px]" style={{ color: "#d4a853" }}>
              분기
            </span>
          )}
          {isRoot && profileLabel && (
            <span
              className="text-[11px] ml-auto"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              {profileLabel}
            </span>
          )}
        </div>

        {/* Intervention text */}
        {isIntervention && interventionText && (
          <div
            className="mb-3 px-3 py-2 rounded-lg"
            style={{
              background: "rgba(212, 168, 83, 0.06)",
              border: "1px solid rgba(212, 168, 83, 0.12)",
            }}
          >
            <p
              className="text-[12px] italic"
              style={{ color: "rgba(212, 168, 83, 0.8)" }}
            >
              &ldquo;{interventionText}&rdquo;
            </p>
          </div>
        )}

        {/* Body */}
        {isLoading ? (
          <div className="flex items-center gap-3 py-10 justify-center">
            <div
              className="w-5 h-5 border-2 rounded-full animate-spin"
              style={{
                borderColor: "rgba(212, 168, 83, 0.2)",
                borderTopColor: "#d4a853",
              }}
            />
            <span
              className="text-sm"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              시뮬레이션 중...
            </span>
          </div>
        ) : isExpanded ? (
          /* ── Expanded state ── */
          <>
            <p
              style={{
                color: "rgba(255,255,255,0.9)",
                fontSize: "15px",
                lineHeight: "1.8",
                wordBreak: "keep-all",
              }}
            >
              {scenarioBody}
            </p>
            {preview && (
              <>
                <div
                  className="my-3"
                  style={{
                    height: "1px",
                    background:
                      "linear-gradient(to right, transparent, rgba(179,136,255,0.2), transparent)",
                  }}
                />
                <p
                  className="italic"
                  style={{
                    color: "rgba(179, 136, 255, 0.75)",
                    fontSize: "13.5px",
                    lineHeight: "1.6",
                  }}
                >
                  {preview}
                </p>
              </>
            )}
            {/* Collapse button */}
            <div className="flex justify-center mt-3">
              <span
                className="text-[11px] transition-colors duration-200"
                style={{ color: "rgba(255,255,255,0.25)" }}
              >
                접기 ▲
              </span>
            </div>
          </>
        ) : (
          /* ── Collapsed state ── */
          <>
            <p
              style={{
                color: "rgba(255,255,255,0.9)",
                fontSize: "15px",
                lineHeight: "1.8",
                wordBreak: "keep-all",
              }}
            >
              {truncatedBody}
            </p>
            {/* Expand hint */}
            <div className="flex justify-center mt-2">
              <span
                className="text-[11px] transition-colors duration-200"
                style={{ color: "rgba(255,255,255,0.2)" }}
              >
                더 보기 ▼
              </span>
            </div>
          </>
        )}
      </div>

      {/* Choice bubbles — only visible when expanded and not loading */}
      {!isLoading && choices.length > 0 && isExpanded && (
        <div className="flex gap-2 mt-3 flex-wrap justify-center max-w-[400px] relative nodrag nowheel nopan">
          {choices.map((c, i) => {
            const isUsed = usedChoiceIndices.includes(i);
            return (
              <div key={i} className="relative flex flex-col items-center">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isUsed) onChoice(c.label, i);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  disabled={isUsed}
                  className="px-4 py-2 rounded-[20px] text-[13px] transition-all duration-300 whitespace-nowrap"
                  style={{
                    background: isUsed
                      ? "rgba(212, 168, 83, 0.15)"
                      : "rgba(0, 0, 0, 0.6)",
                    border: isUsed
                      ? "1px solid rgba(212, 168, 83, 0.6)"
                      : "1px solid rgba(212, 168, 83, 0.2)",
                    color: isUsed
                      ? "rgba(212, 168, 83, 1)"
                      : "rgba(255,255,255,0.6)",
                    boxShadow: isUsed
                      ? "0 0 16px rgba(212, 168, 83, 0.25)"
                      : "none",
                    cursor: isUsed ? "default" : "pointer",
                    opacity: isUsed ? 1 : 0.6,
                    backdropFilter: "blur(8px)",
                  }}
                  onMouseEnter={(e) => {
                    if (!isUsed) {
                      e.currentTarget.style.opacity = "1";
                      e.currentTarget.style.borderColor =
                        "rgba(212, 168, 83, 0.5)";
                      e.currentTarget.style.boxShadow =
                        "0 0 16px rgba(212, 168, 83, 0.15)";
                      onHoverTick?.();
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isUsed) {
                      e.currentTarget.style.opacity = "0.6";
                      e.currentTarget.style.borderColor =
                        "rgba(212, 168, 83, 0.2)";
                      e.currentTarget.style.boxShadow = "none";
                    }
                  }}
                >
                  <span className="mr-1.5">{c.emoji}</span>
                  {c.label}
                </button>
                {/* Source handle per choice */}
                <Handle
                  type="source"
                  position={Position.Right}
                  id={`source-${i}`}
                  className="!w-2 !h-2 !border-[1.5px]"
                  style={{
                    background: isUsed
                      ? "rgba(212, 168, 83, 0.8)"
                      : "rgba(212, 168, 83, 0.15)",
                    borderColor: isUsed
                      ? "rgba(212, 168, 83, 0.5)"
                      : "rgba(212, 168, 83, 0.1)",
                    right: "-6px",
                    visibility: isUsed ? "visible" : "hidden",
                  }}
                />
              </div>
            );
          })}

          {/* Intervene button */}
          {hasUnusedChoices && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onIntervene();
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className="px-4 py-2 rounded-[20px] text-[12px] transition-all duration-300 whitespace-nowrap"
              style={{
                background: "rgba(179, 136, 255, 0.05)",
                border: "1px solid rgba(179, 136, 255, 0.2)",
                color: "rgba(179, 136, 255, 0.5)",
                backdropFilter: "blur(8px)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor =
                  "rgba(179, 136, 255, 0.4)";
                e.currentTarget.style.color = "rgba(179, 136, 255, 0.9)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor =
                  "rgba(179, 136, 255, 0.2)";
                e.currentTarget.style.color = "rgba(179, 136, 255, 0.5)";
              }}
            >
              직접 개입
            </button>
          )}
        </div>
      )}

      {/* Hidden source handles — only when collapsed, so edges still connect */}
      {!isLoading && !isExpanded && choices.map((_, i) => (
        <Handle
          key={`hidden-source-${i}`}
          type="source"
          position={Position.Right}
          id={`source-${i}`}
          className="!w-0 !h-0"
          style={{
            background: "transparent",
            borderColor: "transparent",
            right: "0px",
            opacity: 0,
          }}
        />
      ))}

      {/* Fallback source handle for intervention */}
      {!isLoading && (
        <Handle
          type="source"
          position={Position.Right}
          id="source-intervention"
          className="!w-2 !h-2 !border-[1.5px]"
          style={{
            background: "rgba(212, 168, 83, 0.3)",
            borderColor: "rgba(212, 168, 83, 0.15)",
            visibility: "hidden",
          }}
        />
      )}
    </div>
  );
}

export default memo(ScenarioNode);

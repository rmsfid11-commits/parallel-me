"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";

export interface ScenarioNodeData {
  timeLabel: string;
  summary: string;
  choiceLabel?: string;
  isOnActivePath: boolean;
  isDimBranch: boolean;       // 선택 안 한 가지
  isChatNode?: boolean;       // 일반 대화 노드 (분기점 아님)
  isExpanded: boolean;
  timelineId: string;
  msgId: string;
  compareMode: boolean;
  isCompareSelected: boolean;
  onRewind: () => void;
  onToggleExpand: () => void;
  onCompareSelect: () => void;
  [key: string]: unknown;
}

function ScenarioNode({ data }: { data: ScenarioNodeData }) {
  const {
    timeLabel,
    summary,
    choiceLabel,
    isOnActivePath,
    isDimBranch,
    isChatNode,
    isExpanded,
    compareMode,
    isCompareSelected,
    onRewind,
    onToggleExpand,
    onCompareSelect,
  } = data;

  const dimStyle = isDimBranch && !isOnActivePath
    ? { opacity: 0.45, filter: "saturate(0.5)" }
    : {};

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (compareMode) {
      onCompareSelect();
    } else if (isDimBranch) {
      onRewind();
    } else {
      onToggleExpand();
    }
  };

  // ── 일반 대화 노드: 작고 흐릿한 퍼플 ──
  if (isChatNode) {
    return (
      <div className="flex flex-col items-center" style={{ opacity: 0.6 }}>
        <div
          className="rounded-xl transition-all duration-300"
          style={{
            width: "120px",
            background: "rgba(15, 10, 30, 0.7)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(179, 136, 255, 0.12)",
            boxShadow: "0 0 12px rgba(179, 136, 255, 0.06)",
            padding: "8px 10px",
            overflow: "hidden",
          }}
        >
          <Handle
            type="target"
            position={Position.Left}
            id="target"
            className="!w-1.5 !h-1.5 !border"
            style={{
              background: "rgba(179, 136, 255, 0.4)",
              borderColor: "rgba(179, 136, 255, 0.2)",
            }}
          />
          <p
            className="text-[10px] leading-snug"
            style={{
              color: "rgba(179, 136, 255, 0.5)",
              wordBreak: "keep-all",
            }}
          >
            {summary}
          </p>
          <Handle
            type="source"
            position={Position.Right}
            id="source"
            className="!w-1.5 !h-1.5 !border"
            style={{
              background: "rgba(179, 136, 255, 0.4)",
              borderColor: "rgba(179, 136, 255, 0.2)",
            }}
          />
        </div>
      </div>
    );
  }

  // ── 분기점 노드: 기존 골드 스타일 ──
  return (
    <div className="flex flex-col items-center" style={dimStyle}>
      <div
        className="rounded-2xl transition-all duration-300 cursor-pointer"
        onClick={handleClick}
        style={{
          width: "min(280px, 80vw)",
          background: isDimBranch
            ? "rgba(20, 15, 35, 0.8)"
            : "rgba(8, 5, 25, 0.85)",
          backdropFilter: "blur(16px)",
          border: isCompareSelected
            ? "2px solid rgba(179, 136, 255, 0.8)"
            : isOnActivePath
              ? "1px solid rgba(212, 168, 83, 0.5)"
              : isDimBranch
                ? "1px dashed rgba(179, 136, 255, 0.25)"
                : "1px dashed rgba(212, 168, 83, 0.15)",
          boxShadow: isCompareSelected
            ? "0 0 30px rgba(179, 136, 255, 0.3)"
            : isOnActivePath
              ? "0 0 20px rgba(212, 168, 83, 0.12)"
              : "none",
          padding: "16px",
          overflow: "hidden",
        }}
      >
        {/* Handle target */}
        <Handle
          type="target"
          position={Position.Left}
          id="target"
          className="!w-2.5 !h-2.5 !border-2"
          style={{
            background: isOnActivePath
              ? "rgba(212, 168, 83, 0.8)"
              : "rgba(212, 168, 83, 0.2)",
            borderColor: "rgba(212, 168, 83, 0.3)",
          }}
        />

        {/* Time label */}
        <div className="flex items-center gap-2 mb-2">
          <span
            className="text-[11px] px-2 py-0.5 rounded-full"
            style={{
              color: "rgba(179, 136, 255, 0.9)",
              background: "rgba(179, 136, 255, 0.1)",
            }}
          >
            {timeLabel}
          </span>
          {isDimBranch && (
            <span
              className="text-[10px]"
              style={{ color: "rgba(179, 136, 255, 0.5)" }}
            >
              다른 선택
            </span>
          )}
        </div>

        {/* Summary */}
        <p
          className="text-[13px] leading-relaxed"
          style={{
            color: isOnActivePath
              ? "rgba(255, 255, 255, 0.85)"
              : "rgba(255, 255, 255, 0.5)",
            wordBreak: "keep-all",
          }}
        >
          {isExpanded ? summary : summary.length > 60 ? summary.substring(0, 60) + "..." : summary}
        </p>

        {/* Choice label */}
        {choiceLabel && (
          <div className="mt-2">
            <span
              className="text-[11px] px-2 py-0.5 rounded-full"
              style={{
                color: isOnActivePath ? "rgba(212, 168, 83, 0.9)" : "rgba(212, 168, 83, 0.5)",
                background: "rgba(212, 168, 83, 0.08)",
              }}
            >
              {choiceLabel}
            </span>
          </div>
        )}

        {/* Rewind hint for dim nodes */}
        {isDimBranch && !compareMode && (
          <div className="mt-2 text-center">
            <span
              className="text-[10px]"
              style={{ color: "rgba(179, 136, 255, 0.4)" }}
            >
              클릭하여 되돌리기
            </span>
          </div>
        )}

        {/* Handle source */}
        <Handle
          type="source"
          position={Position.Right}
          id="source"
          className="!w-2.5 !h-2.5 !border-2"
          style={{
            background: isOnActivePath
              ? "rgba(212, 168, 83, 0.8)"
              : "rgba(212, 168, 83, 0.2)",
            borderColor: "rgba(212, 168, 83, 0.3)",
          }}
        />
      </div>
    </div>
  );
}

export default memo(ScenarioNode);

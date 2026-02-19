"use client";

import { memo, useMemo } from "react";
import { Handle, Position, useStore } from "@xyflow/react";

export interface ParallelNodeData {
  timeLabel: string;
  summary: string;
  choiceLabel?: string;
  isOnActivePath: boolean;
  isDimBranch: boolean;
  timelineId: string;
  msgId: string;
  onRewind: () => void;
  [key: string]: unknown;
}

type ZoomTier = "full" | "compact" | "dot";

function getZoomTier(zoom: number): ZoomTier {
  if (zoom > 0.6) return "full";
  if (zoom >= 0.25) return "compact";
  return "dot";
}

function ParallelNode({ data }: { data: ParallelNodeData }) {
  const {
    timeLabel,
    summary,
    choiceLabel,
    isOnActivePath,
    isDimBranch,
    onRewind,
  } = data;

  // Only re-render when zoom tier changes, not on every zoom pixel
  const tier = useStore(
    (s) => getZoomTier(s.transform[2]),
    (a, b) => a === b
  );

  const dimStyle = useMemo(
    () =>
      isDimBranch && !isOnActivePath
        ? { opacity: 0.45, filter: "saturate(0.5)" }
        : {},
    [isDimBranch, isOnActivePath]
  );

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDimBranch) onRewind();
  };

  // ── DOT tier ──
  if (tier === "dot") {
    return (
      <div className="flex items-center justify-center" style={dimStyle}>
        <Handle type="target" position={Position.Top} id="target" style={{ opacity: 0 }} />
        <div
          onClick={handleClick}
          style={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: isOnActivePath
              ? "rgba(212,168,83,0.9)"
              : isDimBranch
                ? "rgba(179,136,255,0.4)"
                : "rgba(179,136,255,0.6)",
            boxShadow: isOnActivePath
              ? "0 0 10px rgba(212,168,83,0.6), 0 0 20px rgba(212,168,83,0.3)"
              : "0 0 6px rgba(179,136,255,0.3)",
            cursor: isDimBranch ? "pointer" : "default",
          }}
        />
        <Handle type="source" position={Position.Bottom} id="source" style={{ opacity: 0 }} />
      </div>
    );
  }

  // ── COMPACT tier ──
  if (tier === "compact") {
    return (
      <div className="flex flex-col items-center" style={dimStyle}>
        <Handle
          type="target"
          position={Position.Top}
          id="target"
          className="!w-2 !h-2 !border-2"
          style={{
            background: isOnActivePath ? "rgba(212,168,83,0.8)" : "rgba(212,168,83,0.2)",
            borderColor: "rgba(212,168,83,0.3)",
          }}
        />
        <div
          className="rounded-xl cursor-pointer transition-all duration-200"
          onClick={handleClick}
          style={{
            width: 160,
            padding: "8px 10px",
            background: isDimBranch
              ? "rgba(20,15,35,0.8)"
              : "rgba(8,5,25,0.85)",
            backdropFilter: "blur(12px)",
            border: isOnActivePath
              ? "1px solid rgba(212,168,83,0.4)"
              : isDimBranch
                ? "1px dashed rgba(179,136,255,0.2)"
                : "1px solid rgba(212,168,83,0.1)",
            boxShadow: isOnActivePath
              ? "0 0 12px rgba(212,168,83,0.1)"
              : "none",
          }}
        >
          <span
            className="text-[9px] px-1.5 py-0.5 rounded-full"
            style={{
              color: "rgba(179,136,255,0.9)",
              background: "rgba(179,136,255,0.1)",
            }}
          >
            {timeLabel}
          </span>
          <p
            className="text-[10px] mt-1 leading-tight"
            style={{
              color: isOnActivePath ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.4)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {summary.length > 30 ? summary.substring(0, 30) + "..." : summary}
          </p>
        </div>
        <Handle
          type="source"
          position={Position.Bottom}
          id="source"
          className="!w-2 !h-2 !border-2"
          style={{
            background: isOnActivePath ? "rgba(212,168,83,0.8)" : "rgba(212,168,83,0.2)",
            borderColor: "rgba(212,168,83,0.3)",
          }}
        />
      </div>
    );
  }

  // ── FULL tier ──
  return (
    <div className="flex flex-col items-center" style={dimStyle}>
      <Handle
        type="target"
        position={Position.Top}
        id="target"
        className="!w-2.5 !h-2.5 !border-2"
        style={{
          background: isOnActivePath ? "rgba(212,168,83,0.8)" : "rgba(212,168,83,0.2)",
          borderColor: "rgba(212,168,83,0.3)",
        }}
      />
      <div
        className="rounded-2xl cursor-pointer transition-all duration-300"
        onClick={handleClick}
        style={{
          width: 280,
          padding: 16,
          background: isDimBranch
            ? "rgba(20,15,35,0.8)"
            : "rgba(8,5,25,0.85)",
          backdropFilter: "blur(16px)",
          border: isOnActivePath
            ? "1px solid rgba(212,168,83,0.5)"
            : isDimBranch
              ? "1px dashed rgba(179,136,255,0.25)"
              : "1px dashed rgba(212,168,83,0.15)",
          boxShadow: isOnActivePath
            ? "0 0 20px rgba(212,168,83,0.12)"
            : "none",
        }}
      >
        {/* Time label */}
        <div className="flex items-center gap-2 mb-2">
          <span
            className="text-[11px] px-2 py-0.5 rounded-full"
            style={{
              color: "rgba(179,136,255,0.9)",
              background: "rgba(179,136,255,0.1)",
            }}
          >
            {timeLabel}
          </span>
          {isDimBranch && (
            <span className="text-[10px]" style={{ color: "rgba(179,136,255,0.5)" }}>
              다른 선택
            </span>
          )}
        </div>

        {/* Summary */}
        <p
          className="text-[13px] leading-relaxed"
          style={{
            color: isOnActivePath ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.5)",
            wordBreak: "keep-all",
          }}
        >
          {summary.length > 80 ? summary.substring(0, 80) + "..." : summary}
        </p>

        {/* Choice label */}
        {choiceLabel && (
          <div className="mt-2">
            <span
              className="text-[11px] px-2 py-0.5 rounded-full"
              style={{
                color: isOnActivePath ? "rgba(212,168,83,0.9)" : "rgba(212,168,83,0.5)",
                background: "rgba(212,168,83,0.08)",
              }}
            >
              {choiceLabel}
            </span>
          </div>
        )}

        {/* Rewind hint */}
        {isDimBranch && (
          <div className="mt-2 text-center">
            <span className="text-[10px]" style={{ color: "rgba(179,136,255,0.4)" }}>
              클릭하여 되돌리기
            </span>
          </div>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="source"
        className="!w-2.5 !h-2.5 !border-2"
        style={{
          background: isOnActivePath ? "rgba(212,168,83,0.8)" : "rgba(212,168,83,0.2)",
          borderColor: "rgba(212,168,83,0.3)",
        }}
      />
    </div>
  );
}

export default memo(ParallelNode);

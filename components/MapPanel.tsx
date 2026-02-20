"use client";

import {
  ReactFlow,
  Controls,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import ScenarioNode from "./ScenarioNode";

const nodeTypes = { scenario: ScenarioNode };

interface MapPanelProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: ReturnType<typeof useNodesState>[2];
  onEdgesChange: ReturnType<typeof useEdgesState>[2];
  onFitView: () => void;
  onAnalyze: () => void;
  onClose: () => void;
  isOverlay?: boolean;
}

export default function MapPanel({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onFitView,
  onAnalyze,
  onClose,
  isOverlay = false,
}: MapPanelProps) {
  const containerClass = isOverlay
    ? "fixed inset-0 z-40 flex flex-col"
    : "w-full h-full flex flex-col relative";

  return (
    <div className={containerClass} style={{ background: "#000" }}>
      {/* Top bar (only for overlay mode) */}
      {isOverlay && (
        <div
          className="flex-none flex items-center justify-between px-4 py-2.5 z-10"
          style={{
            background: "rgba(0,0,0,0.9)",
            borderBottom: "1px solid rgba(212,168,83,0.1)",
            paddingTop: "max(8px, env(safe-area-inset-top))",
          }}
        >
          <h2
            className="text-sm tracking-wide"
            style={{
              color: "rgba(212,168,83,0.8)",
              fontFamily: "var(--font-display), serif",
            }}
          >
            나의 우주
          </h2>
          <div className="flex gap-2">
            <button
              onClick={onFitView}
              className="px-2.5 py-1 rounded-lg text-[11px] transition-all duration-300"
              style={{
                background: "rgba(0,0,0,0.7)",
                border: "1px solid rgba(212,168,83,0.3)",
                color: "rgba(212,168,83,0.8)",
              }}
            >
              전체 보기
            </button>
            <button
              onClick={onAnalyze}
              className="px-2.5 py-1 rounded-lg text-[11px] transition-all duration-300"
              style={{
                background: "rgba(0,0,0,0.7)",
                border: "1px solid rgba(179,136,255,0.3)",
                color: "rgba(179,136,255,0.8)",
              }}
            >
              우주 분석
            </button>
            <button
              onClick={onClose}
              className="px-2.5 py-1 rounded-lg text-[11px] transition-all duration-300"
              style={{
                background: "rgba(212,168,83,0.1)",
                border: "1px solid rgba(212,168,83,0.3)",
                color: "rgba(212,168,83,0.9)",
              }}
            >
              돌아가기
            </button>
          </div>
        </div>
      )}

      {/* Inline controls (tab mode) */}
      {!isOverlay && (
        <div
          className="flex-none flex items-center justify-end gap-2 px-3 py-2 z-10"
          style={{
            background: "rgba(0,0,0,0.5)",
            borderBottom: "1px solid rgba(212,168,83,0.08)",
          }}
        >
          <button
            onClick={onFitView}
            className="px-2.5 py-1 rounded-lg text-[11px] transition-all duration-300"
            style={{
              background: "rgba(0,0,0,0.7)",
              border: "1px solid rgba(212,168,83,0.3)",
              color: "rgba(212,168,83,0.8)",
            }}
          >
            전체 보기
          </button>
          <button
            onClick={onAnalyze}
            className="px-2.5 py-1 rounded-lg text-[11px] transition-all duration-300"
            style={{
              background: "rgba(0,0,0,0.7)",
              border: "1px solid rgba(179,136,255,0.3)",
              color: "rgba(179,136,255,0.8)",
            }}
          >
            우주 분석
          </button>
        </div>
      )}

      {/* ReactFlow */}
      <div className="flex-1 relative">
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <p
              className="text-sm text-center px-4"
              style={{ color: "rgba(255,255,255,0.25)" }}
            >
              대화를 시작하면 별자리가 생겨나.
            </p>
          </div>
        )}
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.05}
          maxZoom={1.5}
          defaultViewport={{ x: 0, y: 0, zoom: 0.7 }}
          proOptions={{ hideAttribution: true }}
          style={{ background: "transparent", position: "relative", zIndex: 1 }}
        >
          <Controls
            className="!rounded-xl !border-0"
            style={{
              background: "rgba(0, 0, 0, 0.8)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(212, 168, 83, 0.15)",
            }}
          />
        </ReactFlow>
      </div>
    </div>
  );
}

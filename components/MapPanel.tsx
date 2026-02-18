"use client";

import { useCallback } from "react";
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
import StarField from "./StarField";

const nodeTypes = { scenario: ScenarioNode };

interface MapPanelProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: ReturnType<typeof useNodesState>[2];
  onEdgesChange: ReturnType<typeof useEdgesState>[2];
  onFitView: () => void;
  onAnalyze: () => void;
}

export default function MapPanel({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onFitView,
  onAnalyze,
}: MapPanelProps) {
  return (
    <div className="relative w-full h-full">
      <StarField />
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

      {/* Map action buttons */}
      <div
        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2"
      >
        <button
          onClick={onFitView}
          className="px-3 py-1.5 rounded-lg text-xs transition-all duration-300"
          style={{
            background: "rgba(0, 0, 0, 0.8)",
            border: "1px solid rgba(212, 168, 83, 0.3)",
            color: "rgba(212, 168, 83, 0.8)",
            fontFamily: "var(--font-display), serif",
            backdropFilter: "blur(12px)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "rgba(212, 168, 83, 0.6)";
            e.currentTarget.style.boxShadow = "0 0 20px rgba(212, 168, 83, 0.2)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(212, 168, 83, 0.3)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          나의 우주 보기
        </button>
        <button
          onClick={onAnalyze}
          className="px-3 py-1.5 rounded-lg text-xs transition-all duration-300"
          style={{
            background: "rgba(0, 0, 0, 0.8)",
            border: "1px solid rgba(179, 136, 255, 0.3)",
            color: "rgba(179, 136, 255, 0.8)",
            fontFamily: "var(--font-display), serif",
            backdropFilter: "blur(12px)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "rgba(179, 136, 255, 0.6)";
            e.currentTarget.style.boxShadow = "0 0 20px rgba(179, 136, 255, 0.2)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(179, 136, 255, 0.3)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          나의 우주 분석
        </button>
      </div>
    </div>
  );
}

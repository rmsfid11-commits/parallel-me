"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  ReactFlow,
  Controls,
  useReactFlow,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import ParallelNode from "./ParallelNode";
import StarField from "./StarField";
import { playZoomOut } from "@/lib/sounds";

const nodeTypes = { parallel: ParallelNode };

interface ZoomSimulationProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onSwitchToScroll: () => void;
  onAnalyze: () => void;
}

export default function ZoomSimulation({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onSwitchToScroll,
  onAnalyze,
}: ZoomSimulationProps) {
  const { fitView, setCenter } = useReactFlow();
  const prevNodeCountRef = useRef(nodes.length);

  // Auto-focus on newly added node
  useEffect(() => {
    if (nodes.length > prevNodeCountRef.current && nodes.length > 0) {
      const lastNode = nodes[nodes.length - 1];
      if (lastNode.position) {
        setCenter(
          lastNode.position.x + 140,
          lastNode.position.y + 100,
          { zoom: 0.8, duration: 800 }
        );
      }
    }
    prevNodeCountRef.current = nodes.length;
  }, [nodes, setCenter]);

  const handleFitView = useCallback(() => {
    fitView({ duration: 800, padding: 0.3 });
    playZoomOut();
  }, [fitView]);

  return (
    <div className="w-full h-full relative" style={{ background: "#000" }}>
      <StarField />

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.03}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 0.5 }}
        proOptions={{ hideAttribution: true }}
        style={{ background: "transparent", position: "relative", zIndex: 1 }}
      >
        <Controls
          className="!rounded-xl !border-0"
          style={{
            background: "rgba(0,0,0,0.8)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(212,168,83,0.15)",
          }}
        />
      </ReactFlow>

      {/* Floating controls - glassmorphism panel */}
      <div
        className="absolute top-3 right-3 z-20 flex flex-col gap-2"
        style={{ pointerEvents: "auto" }}
      >
        {/* Switch to scroll mode */}
        <button
          onClick={onSwitchToScroll}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] transition-all duration-300"
          style={{
            background: "rgba(5,5,20,0.8)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(212,168,83,0.2)",
            color: "rgba(212,168,83,0.8)",
          }}
        >
          <span style={{ fontSize: 13 }}>&#x1F4DC;</span>
          스크롤 모드
        </button>

        {/* Fit view */}
        <button
          onClick={handleFitView}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] transition-all duration-300"
          style={{
            background: "rgba(5,5,20,0.8)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(179,136,255,0.2)",
            color: "rgba(179,136,255,0.8)",
          }}
        >
          <span style={{ fontSize: 13 }}>&#x1F50D;</span>
          전체 보기
        </button>

        {/* Analyze */}
        <button
          onClick={onAnalyze}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] transition-all duration-300"
          style={{
            background: "rgba(5,5,20,0.8)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(99,102,241,0.2)",
            color: "rgba(99,102,241,0.8)",
          }}
        >
          <span style={{ fontSize: 13 }}>&#x1F52D;</span>
          우주 분석
        </button>
      </div>
    </div>
  );
}

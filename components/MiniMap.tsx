"use client";

import { useEffect, useRef, useCallback, useState } from "react";

interface MiniMapNode {
  id: string;
  timeLabel: string;
  isActive: boolean;
  isDim: boolean;
  x: number;
  y: number;
}

interface MiniMapEdge {
  from: string;
  to: string;
}

interface MiniMapProps {
  branchNodes: {
    id: string;
    timeLabel: string;
    isOnActivePath: boolean;
    isDimBranch: boolean;
    parentNodeId?: string;
  }[];
  onTap: () => void;
}

export default function MiniMap({ branchNodes, onTap }: MiniMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const nodesRef = useRef<MiniMapNode[]>([]);
  const prevCountRef = useRef(0);
  const pulseRef = useRef(0);
  const [mapHeight, setMapHeight] = useState(70);

  // Layout nodes horizontally
  const layoutNodes = useCallback(() => {
    if (branchNodes.length === 0) return [];

    // Build tree structure for layout
    const nodes: MiniMapNode[] = [];
    const roots = branchNodes.filter((n) => !n.parentNodeId);
    const childMap = new Map<string, typeof branchNodes>();

    for (const n of branchNodes) {
      if (n.parentNodeId) {
        const children = childMap.get(n.parentNodeId) || [];
        children.push(n);
        childMap.set(n.parentNodeId, children);
      }
    }

    // BFS layout
    let col = 0;
    const queue: { node: typeof branchNodes[0]; row: number }[] = roots.map((r) => ({
      node: r,
      row: 0,
    }));

    const visited = new Set<string>();

    while (queue.length > 0) {
      const { node, row } = queue.shift()!;
      if (visited.has(node.id)) continue;
      visited.add(node.id);

      const x = col * 60 + 30;
      const y = row * 24 + 30;

      nodes.push({
        id: node.id,
        timeLabel: node.timeLabel,
        isActive: node.isOnActivePath,
        isDim: node.isDimBranch,
        x,
        y,
      });

      const children = childMap.get(node.id) || [];
      // Active children go first (same row), dim go below
      const active = children.filter((c) => c.isOnActivePath);
      const dim = children.filter((c) => !c.isOnActivePath);

      for (const c of active) {
        col++;
        queue.push({ node: c, row });
      }
      for (const c of dim) {
        queue.push({ node: c, row: row + 1 });
      }

      if (active.length === 0 && dim.length === 0) {
        col++;
      }
    }

    return nodes;
  }, [branchNodes]);

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    // Detect new node added for pulse animation
    if (branchNodes.length > prevCountRef.current) {
      pulseRef.current = 1;
    }
    prevCountRef.current = branchNodes.length;

    const nodes = layoutNodes();
    nodesRef.current = nodes;

    // Dynamic height based on max row
    const maxY = nodes.length > 0 ? Math.max(...nodes.map((n) => n.y)) : 30;
    const neededH = Math.min(140, Math.max(60, maxY + 25));
    setMapHeight(neededH);

    // Build edges
    const edges: MiniMapEdge[] = [];
    for (const bn of branchNodes) {
      if (bn.parentNodeId) {
        edges.push({ from: bn.parentNodeId, to: bn.id });
      }
    }

    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    // Calculate scroll offset to keep latest active node visible
    const activeNodes = nodes.filter((n) => n.isActive);
    const lastActive = activeNodes[activeNodes.length - 1];
    const canvasW = canvas.getBoundingClientRect().width;

    let cachedW = canvas.getBoundingClientRect().width;
    let cachedH = canvas.getBoundingClientRect().height;
    const origResize = resize;
    const resizeWithCache = () => {
      origResize();
      cachedW = canvas.getBoundingClientRect().width;
      cachedH = canvas.getBoundingClientRect().height;
    };
    window.removeEventListener("resize", resize);
    window.addEventListener("resize", resizeWithCache);

    const draw = () => {
      const w = cachedW;
      const h = cachedH;
      ctx.clearRect(0, 0, w, h);

      // Scroll offset: keep last active node near center-right
      let offsetX = 0;
      if (lastActive && lastActive.x > w * 0.6) {
        offsetX = -(lastActive.x - w * 0.6);
      }

      // Decay pulse
      if (pulseRef.current > 0) {
        pulseRef.current *= 0.97;
        if (pulseRef.current < 0.01) pulseRef.current = 0;
      }

      // Draw edges
      for (const edge of edges) {
        const from = nodeMap.get(edge.from);
        const to = nodeMap.get(edge.to);
        if (!from || !to) continue;

        const isActiveLine = from.isActive && to.isActive;

        ctx.beginPath();
        ctx.moveTo(from.x + offsetX, from.y);

        // Curved line
        const midX = (from.x + to.x) / 2 + offsetX;
        ctx.quadraticCurveTo(midX, from.y, to.x + offsetX, to.y);

        ctx.strokeStyle = isActiveLine
          ? "rgba(212, 168, 83, 0.5)"
          : "rgba(212, 168, 83, 0.12)";
        ctx.lineWidth = isActiveLine ? 1.5 : 1;

        if (!isActiveLine) {
          ctx.setLineDash([3, 3]);
        } else {
          ctx.setLineDash([]);
        }

        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Draw nodes
      for (const node of nodes) {
        const nx = node.x + offsetX;
        const ny = node.y;

        // Skip if off-screen
        if (nx < -20 || nx > w + 20) continue;

        const radius = node.isActive ? 5 : 3.5;

        // Glow for active nodes
        if (node.isActive) {
          const glowR = radius + 8 + pulseRef.current * 6;
          const glow = ctx.createRadialGradient(nx, ny, 0, nx, ny, glowR);
          glow.addColorStop(0, "rgba(212, 168, 83, 0.25)");
          glow.addColorStop(1, "transparent");
          ctx.fillStyle = glow;
          ctx.fillRect(nx - glowR, ny - glowR, glowR * 2, glowR * 2);
        }

        // Node circle
        ctx.beginPath();
        ctx.arc(nx, ny, radius, 0, Math.PI * 2);
        ctx.fillStyle = node.isActive
          ? "#d4a853"
          : node.isDim
            ? "rgba(179, 136, 255, 0.3)"
            : "rgba(212, 168, 83, 0.3)";
        ctx.fill();

        // Border
        if (node.isActive) {
          ctx.strokeStyle = "rgba(212, 168, 83, 0.6)";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      // "나의 우주" label if no nodes
      if (nodes.length === 0) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
        ctx.font = "11px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("분기점이 생기면 여기에 우주가 펼쳐져요", w / 2, h / 2);
      }

      if (pulseRef.current > 0) {
        animRef.current = requestAnimationFrame(draw);
      }
    };

    draw();

    return () => {
      window.removeEventListener("resize", resizeWithCache);
      cancelAnimationFrame(animRef.current);
    };
  }, [branchNodes, layoutNodes]);

  return (
    <div
      onClick={onTap}
      className="relative w-full cursor-pointer transition-all duration-300 hover:brightness-125"
      style={{
        height: `${mapHeight}px`,
        transition: "height 0.3s ease",
        background: "rgba(0, 0, 0, 0.6)",
        borderBottom: "1px solid rgba(212, 168, 83, 0.1)",
      }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: "block" }}
      />
      {/* Tap hint */}
      <div
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] pointer-events-none"
        style={{ color: "rgba(212, 168, 83, 0.3)" }}
      >
        탭하여 펼치기
      </div>
    </div>
  );
}

import dagre from "dagre";
import { Node, Edge } from "@xyflow/react";

export function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  direction: "TB" | "LR" = "TB"
): { nodes: Node[]; edges: Edge[] } {
  const isMobile =
    typeof window !== "undefined" && window.innerWidth <= 768;

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: direction,
    ranksep: isMobile ? 40 : 60,
    nodesep: isMobile ? 30 : 50,
    edgesep: isMobile ? 15 : 30,
  });

  nodes.forEach((node) => {
    const isChatNode = node.data?.isChatNode;
    const w = isChatNode ? 130 : (isMobile ? 240 : 300);
    const h = isChatNode ? 40 : (isMobile ? 120 : 160);
    g.setNode(node.id, { width: w, height: h });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  const layoutedNodes = nodes.map((node) => {
    const pos = g.node(node.id);
    const isChatNode = node.data?.isChatNode;
    const w = isChatNode ? 130 : (isMobile ? 240 : 300);
    const h = isChatNode ? 40 : (isMobile ? 120 : 160);
    return {
      ...node,
      position: {
        x: pos.x - w / 2,
        y: pos.y - h / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

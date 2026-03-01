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
    ranksep: isMobile ? 80 : 130,
    nodesep: isMobile ? 50 : 90,
    edgesep: isMobile ? 25 : 50,
  });

  nodes.forEach((node) => {
    const isChatNode = node.data?.isChatNode;
    const w = isChatNode ? 150 : (isMobile ? 290 : 350);
    const h = isChatNode ? 60 : (isMobile ? 180 : 250);
    g.setNode(node.id, { width: w, height: h });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  const layoutedNodes = nodes.map((node) => {
    const pos = g.node(node.id);
    const isChatNode = node.data?.isChatNode;
    const w = isChatNode ? 150 : (isMobile ? 290 : 350);
    const h = isChatNode ? 60 : (isMobile ? 180 : 250);
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

import dagre from "dagre";
import { Node, Edge } from "@xyflow/react";

const NODE_WIDTH_LR = 400;
const NODE_HEIGHT_LR = 350;
const NODE_WIDTH_TB = 300;
const NODE_HEIGHT_TB = 200;

export function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  direction: "TB" | "LR" = "LR"
): { nodes: Node[]; edges: Edge[] } {
  const isMobile =
    typeof window !== "undefined" && window.innerWidth <= 768;
  const isTB = direction === "TB";

  const nodeW = isTB ? NODE_WIDTH_TB : NODE_WIDTH_LR;
  const nodeH = isTB ? NODE_HEIGHT_TB : NODE_HEIGHT_LR;

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: direction,
    ranksep: isTB
      ? (isMobile ? 80 : 180)
      : (isMobile ? 100 : 400),
    nodesep: isTB
      ? (isMobile ? 60 : 150)
      : (isMobile ? 80 : 250),
    edgesep: isTB
      ? (isMobile ? 20 : 50)
      : (isMobile ? 30 : 80),
  });

  nodes.forEach((node) => {
    g.setNode(node.id, { width: nodeW, height: nodeH });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  const layoutedNodes = nodes.map((node) => {
    const pos = g.node(node.id);
    return {
      ...node,
      position: {
        x: pos.x - nodeW / 2,
        y: pos.y - nodeH / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

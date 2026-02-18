"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ReactFlow,
  Controls,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { UserProfile, Scenario } from "@/lib/types";
import ScenarioNode, { type ScenarioNodeData } from "@/components/ScenarioNode";
import InterventionModal from "@/components/InterventionModal";
import StarField from "@/components/StarField";
import { getLayoutedElements } from "@/lib/layout";
import {
  startAmbient,
  stopAmbient,
  playNodeCreate,
  playBranchCreate,
  playHoverTick,
  playZoomOut,
  setMuted,
  isMuted,
} from "@/lib/sounds";

const nodeTypes = { scenario: ScenarioNode };

function SimulationCanvas() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { fitView, setCenter } = useReactFlow();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showIntervention, setShowIntervention] = useState(false);
  const [interventionParentId, setInterventionParentId] = useState<
    string | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [activeLeafId, setActiveLeafId] = useState<string | null>(null);
  const [expandedNodeId, setExpandedNodeId] = useState<string | null>(null);
  const [soundMuted, setSoundMuted] = useState(false);

  const stepCounterRef = useRef(0);
  const scenariosRef = useRef<Scenario[]>([]);
  const profileRef = useRef<UserProfile | null>(null);
  const isGeneratingRef = useRef(false);
  const activeLeafIdRef = useRef<string | null>(null);
  const expandedNodeIdRef = useRef<string | null>(null);
  scenariosRef.current = scenarios;
  profileRef.current = profile;
  isGeneratingRef.current = isGenerating;
  activeLeafIdRef.current = activeLeafId;
  expandedNodeIdRef.current = expandedNodeId;

  // Stable refs for callbacks
  const generateRef = useRef<
    (
      parentId: string | null,
      chosenLabel?: string,
      choiceIndex?: number,
      intervention?: string
    ) => void
  >(() => {});
  const setInterventionParentIdRef = useRef(setInterventionParentId);
  const setShowInterventionRef = useRef(setShowIntervention);
  setInterventionParentIdRef.current = setInterventionParentId;
  setShowInterventionRef.current = setShowIntervention;

  // Ref for expand toggling
  const handleToggleExpandRef = useRef<(nodeId: string) => void>(() => {});

  // Start ambient sound on first user interaction
  useEffect(() => {
    const initAudio = () => {
      startAmbient();
      window.removeEventListener("click", initAudio);
      window.removeEventListener("keydown", initAudio);
    };
    window.addEventListener("click", initAudio);
    window.addEventListener("keydown", initAudio);
    return () => {
      window.removeEventListener("click", initAudio);
      window.removeEventListener("keydown", initAudio);
      stopAmbient();
    };
  }, []);

  // Parse profile
  useEffect(() => {
    const p = searchParams.get("profile");
    if (!p) {
      router.push("/");
      return;
    }
    try {
      setProfile(JSON.parse(decodeURIComponent(p)) as UserProfile);
    } catch {
      router.push("/");
    }
  }, [searchParams, router]);

  // Get path from a leaf node to root — returns set of node IDs on the active path
  const getPathToRoot = useCallback(
    (leafId: string | null, list: Scenario[]): Set<string> => {
      const pathIds = new Set<string>();
      if (!leafId) return pathIds;
      let current = list.find((s) => s.id === leafId);
      while (current) {
        pathIds.add(current.id);
        current = current.parentId
          ? list.find((s) => s.id === current!.parentId)
          : undefined;
      }
      return pathIds;
    },
    []
  );

  // Get ancestor chain as ordered array
  const getAncestors = useCallback(
    (scenarioId: string, list: Scenario[]): Scenario[] => {
      const chain: Scenario[] = [];
      let current = list.find((s) => s.id === scenarioId);
      while (current) {
        chain.unshift(current);
        current = current.parentId
          ? list.find((s) => s.id === current!.parentId)
          : undefined;
      }
      return chain;
    },
    []
  );

  // Get which choice indices on a scenario have been used (have children)
  const getUsedChoiceIndices = useCallback(
    (scenarioId: string, list: Scenario[]): number[] => {
      return list
        .filter((s) => s.parentId === scenarioId && s.choiceIndex !== undefined)
        .map((s) => s.choiceIndex!);
    },
    []
  );

  // Find the deepest leaf on the active path (for switching paths)
  const findDeepestLeaf = useCallback(
    (nodeId: string, list: Scenario[]): string => {
      const children = list.filter((s) => s.parentId === nodeId);
      if (children.length === 0) return nodeId;
      return findDeepestLeaf(children[0].id, list);
    },
    []
  );

  // Build React Flow graph
  const rebuildGraph = useCallback(
    (
      scenarioList: Scenario[],
      loadingId?: string,
      currentActiveLeafId?: string,
      currentExpandedId?: string
    ) => {
      const leafId = currentActiveLeafId ?? activeLeafIdRef.current;
      const expId = currentExpandedId ?? expandedNodeIdRef.current;
      const activePathIds = getPathToRoot(leafId, scenarioList);
      const prof = profileRef.current;

      const flowNodes: Node[] = scenarioList.map((s) => ({
        id: s.id,
        type: "scenario",
        position: { x: 0, y: 0 },
        data: {
          stepNumber: s.stepNumber,
          scenario: s.scenario,
          preview: s.preview,
          choices: s.choices,
          isIntervention: s.isIntervention,
          interventionText: s.interventionText,
          chosenLabel: s.chosenLabel,
          isLoading: s.id === loadingId,
          isRoot: !s.parentId,
          isOnActivePath: activePathIds.has(s.id) || s.id === loadingId,
          isExpanded: s.id === expId || s.id === loadingId,
          usedChoiceIndices: getUsedChoiceIndices(s.id, scenarioList),
          profileLabel: !s.parentId && prof
            ? `${prof.job} · ${prof.age}세`
            : undefined,
          onChoice: (label: string, index: number) => {
            generateRef.current(s.id, label, index);
          },
          onIntervene: () => {
            setInterventionParentIdRef.current(s.id);
            setShowInterventionRef.current(true);
          },
          onToggleExpand: () => {
            handleToggleExpandRef.current(s.id);
          },
          onHoverTick: () => {
            playHoverTick();
          },
        } satisfies ScenarioNodeData,
      }));

      // Edge styling: main path = thick gold animated, parallel = thin dashed dim
      const flowEdges: Edge[] = scenarioList
        .filter((s) => s.parentId)
        .map((s) => {
          const isOnActivePath =
            activePathIds.has(s.id) && activePathIds.has(s.parentId!);
          const isLoading = s.id === loadingId;

          return {
            id: `e-${s.parentId}-${s.id}`,
            source: s.parentId!,
            sourceHandle:
              s.choiceIndex !== undefined
                ? `source-${s.choiceIndex}`
                : "source-intervention",
            target: s.id,
            targetHandle: "target",
            type: "default",
            style: isOnActivePath || isLoading
              ? {
                  stroke: s.isIntervention
                    ? "rgba(179, 136, 255, 0.8)"
                    : "rgba(212, 168, 83, 0.8)",
                  strokeWidth: 3,
                  filter: "drop-shadow(0 0 8px rgba(212, 168, 83, 0.4))",
                }
              : {
                  stroke: "rgba(212, 168, 83, 0.2)",
                  strokeWidth: 1.5,
                  strokeDasharray: "6 4",
                },
            animated: isLoading || isOnActivePath,
          };
        });

      const { nodes: layouted, edges: layoutedEdges } = getLayoutedElements(
        flowNodes,
        flowEdges
      );

      setNodes(layouted);
      setEdges(layoutedEdges);

      return layouted;
    },
    [setNodes, setEdges, getUsedChoiceIndices, getPathToRoot]
  );

  // Handle expand/collapse toggle — also switches active path if needed
  const handleToggleExpand = useCallback(
    (nodeId: string) => {
      const list = scenariosRef.current;

      if (expandedNodeIdRef.current === nodeId) {
        // Collapse
        setExpandedNodeId(null);
        expandedNodeIdRef.current = null;
        // Update nodes' isExpanded without full layout recalc
        setNodes((nds) =>
          nds.map((n) => ({
            ...n,
            data: { ...n.data, isExpanded: false },
          }))
        );
      } else {
        // Expand this node + switch active path through it
        setExpandedNodeId(nodeId);
        expandedNodeIdRef.current = nodeId;

        const newLeafId = findDeepestLeaf(nodeId, list);
        const needsPathSwitch = newLeafId !== activeLeafIdRef.current;

        if (needsPathSwitch) {
          setActiveLeafId(newLeafId);
          activeLeafIdRef.current = newLeafId;
          rebuildGraph(list, undefined, newLeafId, nodeId);
        } else {
          // Just update isExpanded on nodes
          setNodes((nds) =>
            nds.map((n) => ({
              ...n,
              data: { ...n.data, isExpanded: n.id === nodeId },
            }))
          );
        }
      }
    },
    [findDeepestLeaf, rebuildGraph, setNodes]
  );

  handleToggleExpandRef.current = handleToggleExpand;

  // Generate scenario
  const generate = useCallback(
    async (
      parentId: string | null,
      chosenLabel?: string,
      choiceIndex?: number,
      intervention?: string
    ) => {
      if (!profileRef.current || isGeneratingRef.current) return;

      // Check if this choice was already used
      if (
        parentId &&
        choiceIndex !== undefined &&
        getUsedChoiceIndices(parentId, scenariosRef.current).includes(
          choiceIndex
        )
      ) {
        return;
      }

      setIsGenerating(true);
      isGeneratingRef.current = true;
      setError(null);

      stepCounterRef.current += 1;
      const step = stepCounterRef.current;
      const loadingId = crypto.randomUUID();

      const loadingScenario: Scenario = {
        id: loadingId,
        stepNumber: step,
        scenario: "",
        preview: "",
        choices: [],
        parentId,
        choiceIndex,
        isIntervention: !!intervention,
        interventionText: intervention,
        chosenLabel,
      };

      const tempList = [...scenariosRef.current, loadingScenario];
      setScenarios(tempList);
      scenariosRef.current = tempList;

      // Update active leaf and expand the new node
      setActiveLeafId(loadingId);
      activeLeafIdRef.current = loadingId;
      setExpandedNodeId(loadingId);
      expandedNodeIdRef.current = loadingId;

      const layouted = rebuildGraph(tempList, loadingId, loadingId, loadingId);

      setTimeout(() => {
        const newNode = layouted.find((n) => n.id === loadingId);
        if (newNode) {
          setCenter(
            newNode.position.x + 190,
            newNode.position.y + 175,
            { zoom: 0.85, duration: 600 }
          );
        }
      }, 100);

      const previousScenarios = parentId
        ? getAncestors(parentId, scenariosRef.current)
        : [];

      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            profile: profileRef.current,
            stepNumber: step,
            previousScenarios,
            chosenLabel,
            intervention,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "시나리오 생성 실패");
        }

        const data = await res.json();

        const realScenario: Scenario = {
          ...loadingScenario,
          scenario: data.scenario,
          preview: data.preview,
          choices: data.choices || [],
        };

        const updatedList = scenariosRef.current.map((s) =>
          s.id === loadingId ? realScenario : s
        );

        setScenarios(updatedList);
        scenariosRef.current = updatedList;
        rebuildGraph(updatedList, undefined, loadingId, loadingId);

        // Sound: branch if parent already has other children, otherwise bell
        if (parentId) {
          const siblings = updatedList.filter(
            (s) => s.parentId === parentId && s.id !== loadingId
          );
          if (siblings.length > 0) {
            playBranchCreate();
          } else {
            playNodeCreate();
          }
        } else {
          playNodeCreate();
        }
      } catch (err) {
        const cleaned = scenariosRef.current.filter(
          (s) => s.id !== loadingId
        );
        setScenarios(cleaned);
        scenariosRef.current = cleaned;
        stepCounterRef.current -= 1;

        const newLeaf = parentId || (cleaned.length > 0 ? cleaned[cleaned.length - 1].id : null);
        setActiveLeafId(newLeaf);
        activeLeafIdRef.current = newLeaf;
        setExpandedNodeId(newLeaf);
        expandedNodeIdRef.current = newLeaf;

        rebuildGraph(cleaned, undefined, newLeaf ?? undefined, newLeaf ?? undefined);
        setError(
          err instanceof Error ? err.message : "오류가 발생했습니다."
        );
      } finally {
        setIsGenerating(false);
        isGeneratingRef.current = false;
      }
    },
    [rebuildGraph, getAncestors, setCenter, getUsedChoiceIndices]
  );

  // Keep ref up to date
  generateRef.current = generate;

  // Handle intervention submit
  const handleIntervention = useCallback(
    (text: string) => {
      setShowIntervention(false);
      generate(interventionParentId, undefined, undefined, text);
    },
    [generate, interventionParentId]
  );

  // Auto-start first scenario
  useEffect(() => {
    if (profile && scenarios.length === 0 && !isGenerating) {
      generate(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-screen h-screen" style={{ background: "#08061a" }}>
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

      {/* Top bar */}
      <div
        className="fixed top-0 left-0 right-0 z-10 flex items-center justify-between px-3 md:px-5 py-2 md:py-3"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.9), rgba(0,0,0,0.5), transparent)",
          paddingTop: "max(8px, env(safe-area-inset-top))",
        }}
      >
        <div className="flex items-center gap-2">
          <h1
            className="text-sm md:text-lg text-white/80 tracking-wide"
            style={{
              fontFamily: "var(--font-display), serif",
              textShadow: "0 0 20px rgba(212, 168, 83, 0.3)",
            }}
          >
            Parallel Me
          </h1>
        </div>
        <div className="hidden md:block text-center">
          <p
            className="text-xs tracking-wider"
            style={{ color: "rgba(212, 168, 83, 0.6)" }}
          >
            {profile.job} | {profile.age}세 | {profile.mode}
          </p>
        </div>
        <div className="flex gap-1.5 md:gap-2 items-center">
          <button
            onClick={() => {
              const next = !soundMuted;
              setSoundMuted(next);
              setMuted(next);
            }}
            className="px-1.5 md:px-2 py-1 md:py-1.5 rounded-lg text-xs md:text-sm transition-all duration-300"
            style={{
              background: "rgba(0, 0, 0, 0.7)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              color: soundMuted ? "rgba(255,255,255,0.25)" : "rgba(212, 168, 83, 0.7)",
            }}
            title={soundMuted ? "소리 켜기" : "소리 끄기"}
          >
            {soundMuted ? "\u{1F507}" : "\u{1F50A}"}
          </button>
          <button
            onClick={() => {
              fitView({ duration: 800, padding: 0.2 });
              playZoomOut();
            }}
            className="px-3 py-1.5 rounded-lg text-xs transition-all duration-300"
            style={{
              background: "rgba(0, 0, 0, 0.7)",
              border: "1px solid rgba(212, 168, 83, 0.3)",
              color: "rgba(212, 168, 83, 0.8)",
              fontFamily: "var(--font-display), serif",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(212, 168, 83, 0.6)";
              e.currentTarget.style.color = "rgba(212, 168, 83, 1)";
              e.currentTarget.style.boxShadow =
                "0 0 20px rgba(212, 168, 83, 0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(212, 168, 83, 0.3)";
              e.currentTarget.style.color = "rgba(212, 168, 83, 0.8)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            나의 우주 보기
          </button>
          <button
            onClick={() => router.push("/")}
            className="px-3 py-1.5 rounded-lg text-xs transition-all duration-300"
            style={{
              background: "rgba(0, 0, 0, 0.7)",
              border: "1px solid rgba(212, 168, 83, 0.15)",
              color: "rgba(255,255,255,0.4)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(212, 168, 83, 0.3)";
              e.currentTarget.style.color = "rgba(255,255,255,0.7)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(212, 168, 83, 0.15)";
              e.currentTarget.style.color = "rgba(255,255,255,0.4)";
            }}
          >
            처음으로
          </button>
        </div>
      </div>

      {/* Error toast */}
      {error && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20 px-6 py-3 bg-red-900/80 backdrop-blur-md border border-red-500/30 rounded-xl animate-slideUp">
          <p className="text-sm text-red-300">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-xs text-red-400/70 hover:text-red-300 mt-1"
          >
            닫기
          </button>
        </div>
      )}

      <InterventionModal
        isOpen={showIntervention}
        onClose={() => setShowIntervention(false)}
        onSubmit={handleIntervention}
      />
    </div>
  );
}

function SimulationWithProvider() {
  return (
    <ReactFlowProvider>
      <SimulationCanvas />
    </ReactFlowProvider>
  );
}

export default function SimulationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-black">
          <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
        </div>
      }
    >
      <SimulationWithProvider />
    </Suspense>
  );
}

"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import {
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import {
  UserProfile,
  ChatMessage,
  Timeline,
  StoryScenario,
} from "@/lib/types";
import { type ScenarioNodeData } from "@/components/ScenarioNode";
import MapPanel from "@/components/MapPanel";
import MiniMap from "@/components/MiniMap";
import StoryPanel from "@/components/StoryPanel";
import StarField from "@/components/StarField";
import ForkEffect from "@/components/ForkEffect";
import ZoomSimulation from "@/components/ZoomSimulation";
import { type ParallelNodeData } from "@/components/ParallelNode";
import { getLayoutedElements } from "@/lib/layout";
import {
  startAmbient,
  stopAmbient,
  playNodeCreate,
  playBranchCreate,
  playZoomOut,
  setMuted,
} from "@/lib/sounds";

// ── 되돌리기 확인 모달 ──
function RewindModal({
  isOpen,
  onConfirm,
  onCancel,
}: {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fadeIn"
        onClick={onCancel}
      />
      <div
        className="relative w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-slideUp"
        style={{
          background: "rgba(8, 8, 25, 0.85)",
          backdropFilter: "blur(24px)",
          border: "1px solid rgba(179,136,255,0.2)",
          boxShadow: "0 0 40px rgba(179,136,255,0.08), 0 0 80px rgba(0,0,0,0.5)",
        }}
      >
        <h3 className="text-lg font-bold text-white mb-3">
          이 우주를 탐험할까?
        </h3>
        <p className="text-sm text-gray-400 mb-5">
          이 시점으로 돌아가서 다른 선택을 해볼래?
          <br />
          새로운 평행우주가 만들어져.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 bg-white/5 border border-white/10 text-gray-300 rounded-xl hover:bg-white/10 transition-colors text-sm"
          >
            아니
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              background:
                "linear-gradient(135deg, rgba(179,136,255,0.3), rgba(212,168,83,0.3))",
              border: "1px solid rgba(179,136,255,0.4)",
              color: "rgba(255,255,255,0.9)",
            }}
          >
            탐험할래
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 우주 요약 리포트 모달 ──
function ReportModal({
  isOpen,
  report,
  isLoading,
  onClose,
}: {
  isOpen: boolean;
  report: string;
  isLoading: boolean;
  onClose: () => void;
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fadeIn"
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-md rounded-2xl p-6 shadow-2xl animate-slideUp max-h-[80vh] overflow-y-auto"
        style={{
          background: "rgba(8, 8, 25, 0.85)",
          backdropFilter: "blur(24px)",
          border: "1px solid rgba(212,168,83,0.2)",
          boxShadow: "0 0 40px rgba(212,168,83,0.08), 0 0 80px rgba(0,0,0,0.5)",
        }}
      >
        <h3 className="text-lg font-bold text-white mb-4">나의 우주 분석</h3>
        {isLoading ? (
          <div className="flex items-center gap-3 py-10 justify-center">
            <div
              className="w-5 h-5 border-2 rounded-full animate-spin"
              style={{
                borderColor: "rgba(212,168,83,0.2)",
                borderTopColor: "#d4a853",
              }}
            />
            <span
              className="text-sm"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              우주를 분석하고 있어...
            </span>
          </div>
        ) : (
          <p
            className="text-[14px] leading-relaxed whitespace-pre-wrap"
            style={{ color: "rgba(255,255,255,0.8)" }}
          >
            {report}
          </p>
        )}
        <button
          onClick={onClose}
          className="mt-4 w-full py-2 bg-white/5 border border-white/10 text-gray-300 rounded-xl hover:bg-white/10 transition-colors text-sm"
        >
          닫기
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// ── 메인 시뮬레이션
// ══════════════════════════════════════════
function SimulationCanvas() {
  const router = useRouter();
  const { fitView } = useReactFlow();

  // Profile
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Timelines (shared data for story + map)
  const [timelines, setTimelines] = useState<Timeline[]>([]);
  const [activeTimelineId, setActiveTimelineId] = useState<string>("");
  const timelinesRef = useRef<Timeline[]>([]);
  const activeTimelineIdRef = useRef("");
  timelinesRef.current = timelines;
  activeTimelineIdRef.current = activeTimelineId;

  // Story scenarios (story mode data)
  const [storyScenarios, setStoryScenarios] = useState<StoryScenario[]>([]);
  const storyScenariosRef = useRef<StoryScenario[]>([]);
  storyScenariosRef.current = storyScenarios;

  // Story mode controls (tap-to-advance, no auto-progress)

  // Intervention UI
  const [isIntervening, setIsIntervening] = useState(false);
  const [interventionText, setInterventionText] = useState("");
  const interventionInputRef = useRef<HTMLTextAreaElement>(null);

  // UI
  const [isGenerating, setIsGenerating] = useState(false);
  const [showFullMap, setShowFullMap] = useState(false);
  const [soundMuted, setSoundMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // View mode: scroll (default) or zoom
  const [viewMode, setViewMode] = useState<"scroll" | "zoom">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("parallelme-viewmode") as "scroll" | "zoom") || "scroll";
    }
    return "scroll";
  });

  // Fork effect
  const [showForkEffect, setShowForkEffect] = useState(false);

  // Zoom mode nodes/edges (TB layout)
  const [zoomNodes, setZoomNodes] = useState<Node[]>([]);
  const [zoomEdges, setZoomEdges] = useState<Edge[]>([]);

  // First branch tracking
  const isFirstBranchRef = useRef(true);

  // Map (ReactFlow)
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Modals
  const [rewindModal, setRewindModal] = useState<{
    open: boolean;
    timelineId: string;
    msgId: string;
    choiceIndex: number;
    choiceLabel: string;
  }>({
    open: false,
    timelineId: "",
    msgId: "",
    choiceIndex: -1,
    choiceLabel: "",
  });

  const [reportModal, setReportModal] = useState(false);
  const [reportText, setReportText] = useState("");
  const [reportLoading, setReportLoading] = useState(false);

  const isGeneratingRef = useRef(false);
  isGeneratingRef.current = isGenerating;

  // ── Audio init ──
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

  // ── Load profile from localStorage ──
  useEffect(() => {
    const stored = localStorage.getItem("parallelme-profile");
    if (!stored) {
      router.push("/");
      return;
    }
    try {
      const p = JSON.parse(stored) as UserProfile;
      setProfile(p);

      // Try restore simulation data from localStorage
      const savedSim = localStorage.getItem("parallelme-simulation");
      if (savedSim) {
        try {
          const { timelines: savedTl, activeTimelineId: savedAtl } = JSON.parse(savedSim);
          if (savedTl && savedTl.length > 0) {
            setTimelines(savedTl);
            setActiveTimelineId(savedAtl || savedTl[0].id);
            return;
          }
        } catch {
          // ignore, create fresh
        }
      }

      const tl: Timeline = {
        id: crypto.randomUUID(),
        parentTimelineId: null,
        branchPointMsgId: "",
        choiceIndex: -1,
        messages: [],
      };
      setTimelines([tl]);
      setActiveTimelineId(tl.id);
    } catch {
      router.push("/");
    }
  }, [router]);

  // ── Persist simulation data to localStorage ──
  useEffect(() => {
    if (timelines.length > 0 && activeTimelineId) {
      localStorage.setItem(
        "parallelme-simulation",
        JSON.stringify({ timelines, activeTimelineId })
      );
    }
  }, [timelines, activeTimelineId]);

  // ── Persist viewMode ──
  useEffect(() => {
    localStorage.setItem("parallelme-viewmode", viewMode);
  }, [viewMode]);

  // ── Swipe / beforeunload protection ──
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const msgs = timelinesRef.current.flatMap((t) => t.messages);
      if (msgs.length > 0) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // ── Focus intervention input ──
  useEffect(() => {
    if (isIntervening && interventionInputRef.current) {
      interventionInputRef.current.focus();
    }
  }, [isIntervening]);

  // ── Helpers ──
  const getActiveMessages = useCallback((): ChatMessage[] => {
    return (
      timelinesRef.current.find(
        (t) => t.id === activeTimelineIdRef.current
      )?.messages || []
    );
  }, []);

  const updateTimelineMessages = useCallback(
    (
      timelineId: string,
      updater: (msgs: ChatMessage[]) => ChatMessage[]
    ) => {
      setTimelines((prev) =>
        prev.map((t) =>
          t.id === timelineId ? { ...t, messages: updater(t.messages) } : t
        )
      );
    },
    []
  );

  // ── Story: convert messages to story scenarios for API ──
  const getStoryScenariosFromMessages = useCallback((): StoryScenario[] => {
    const msgs = getActiveMessages();
    return msgs
      .filter((m) => m.role === "assistant" && m.timeLabel)
      .map((m) => ({
        id: m.id,
        timeLabel: m.timeLabel || "",
        content: m.content,
        autoChoice: undefined,
        isBranch: false,
        parentId: null,
        timelineId: activeTimelineIdRef.current,
      }));
  }, [getActiveMessages]);

  // ── Story: generate next scenario ──
  const generateStoryScenario = useCallback(
    async (interventionText?: string) => {
      if (!profile || isGeneratingRef.current) return;

      setIsGenerating(true);
      isGeneratingRef.current = true;

      try {
        const scenarios = getStoryScenariosFromMessages();
        const res = await fetch("/api/scenario", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            profile,
            previousScenarios: scenarios,
            intervention: interventionText,
          }),
        });

        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error || "시나리오 생성 실패");
        }

        const data = await res.json();
        const tlId = activeTimelineIdRef.current;

        // If this is the first branch, insert a system message
        if (interventionText && isFirstBranchRef.current) {
          isFirstBranchRef.current = false;
          const systemMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: "방금 다른 우주도 하나 태어났어. 상단 맵에서 볼 수 있어. 네가 선택하지 않은 길도 어딘가에서 흐르고 있어.",
            timestamp: Date.now(),
          };
          updateTimelineMessages(tlId, (msgs) => [...msgs, systemMsg]);
        }

        // Add scenario as an assistant message with timeLabel
        const aiMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.content,
          timestamp: Date.now(),
          timeLabel: data.timeLabel,
        };

        updateTimelineMessages(tlId, (msgs) => [...msgs, aiMsg]);

        if (data.isBranch || interventionText) {
          playBranchCreate();
          setShowForkEffect(true);
        } else {
          playNodeCreate();
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "오류가 발생했습니다."
        );
      } finally {
        setIsGenerating(false);
        isGeneratingRef.current = false;
      }
    },
    [profile, getStoryScenariosFromMessages, updateTimelineMessages]
  );

  // ── Story: first scenario auto-start only ──
  useEffect(() => {
    if (!profile || isGenerating) return;

    const msgs = getActiveMessages();
    if (msgs.length === 0) {
      generateStoryScenario();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  // ── Story: tap to advance ──
  const handleTapAdvance = useCallback(() => {
    if (isGeneratingRef.current || !profile) return;
    // Don't advance if intervening
    if (isIntervening) return;
    generateStoryScenario();
  }, [profile, isIntervening, generateStoryScenario]);

  // ── Story: handle intervention ──
  const handleIntervene = useCallback(
    (text: string) => {
      if (!profile) return;

      const tlId = activeTimelineIdRef.current;

      // Add user intervention message
      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: text,
        timestamp: Date.now(),
        isIntervention: true,
      };
      updateTimelineMessages(tlId, (msgs) => [...msgs, userMsg]);

      // Generate scenario with intervention
      generateStoryScenario(text);

      // Close intervention UI
      setIsIntervening(false);
      setInterventionText("");
    },
    [profile, updateTimelineMessages, generateStoryScenario]
  );

  // ── Collect branch nodes for minimap ──
  const collectBranchNodes = useCallback(() => {
    const result: {
      id: string;
      timeLabel: string;
      isOnActivePath: boolean;
      isDimBranch: boolean;
      parentNodeId?: string;
    }[] = [];

    for (const timeline of timelinesRef.current) {
      const isActive = timeline.id === activeTimelineIdRef.current;
      let prevId: string | undefined;

      for (const msg of timeline.messages) {
        if (msg.role === "assistant" && (msg.branchPoint || msg.timeLabel)) {
          const nodeId = `${timeline.id}-${msg.id}`;
          result.push({
            id: nodeId,
            timeLabel: msg.branchPoint?.timeLabel || msg.timeLabel || "",
            isOnActivePath: isActive,
            isDimBranch: !isActive,
            parentNodeId: prevId,
          });
          prevId = nodeId;

          // Dim nodes for unchosen chat branches
          if (msg.branchPoint?.chosenIndex !== undefined) {
            msg.branchPoint.choices.forEach((c, i) => {
              if (i !== msg.branchPoint!.chosenIndex) {
                const hasChild = timelinesRef.current.some(
                  (ct) =>
                    ct.branchPointMsgId === msg.id && ct.choiceIndex === i
                );
                if (!hasChild) {
                  result.push({
                    id: `dim-${timeline.id}-${msg.id}-${i}`,
                    timeLabel: msg.branchPoint!.timeLabel,
                    isOnActivePath: false,
                    isDimBranch: true,
                    parentNodeId: nodeId,
                  });
                }
              }
            });
          }
        }
      }

      // Connect child timelines
      if (timeline.parentTimelineId) {
        const parentNodeId = `${timeline.parentTimelineId}-${timeline.branchPointMsgId}`;
        const first = result.find(
          (r) => r.id.startsWith(timeline.id + "-") && !r.parentNodeId
        );
        if (first) first.parentNodeId = parentNodeId;
      }
    }
    return result;
  }, []);

  // ── Build ReactFlow graph ──
  const rebuildGraph = useCallback(
    (currentTimelines: Timeline[], currentActiveId: string) => {
      const branchNodes: {
        id: string;
        timeLabel: string;
        summary: string;
        choiceLabel?: string;
        timelineId: string;
        msgId: string;
        parentNodeId?: string;
        isOnActivePath: boolean;
        isDimBranch: boolean;
      }[] = [];
      const edgeList: { source: string; target: string }[] = [];

      for (const timeline of currentTimelines) {
        const isActive = timeline.id === currentActiveId;
        let prevBranchNodeId: string | undefined;

        for (const msg of timeline.messages) {
          if (
            msg.role === "assistant" &&
            (msg.branchPoint || msg.timeLabel)
          ) {
            const nodeId = `${timeline.id}-${msg.id}`;
            const summary =
              msg.branchPoint?.summary ||
              msg.content.substring(0, 80) + "...";
            const choiceLabel =
              msg.branchPoint?.chosenIndex !== undefined
                ? msg.branchPoint.choices[msg.branchPoint.chosenIndex]?.label
                : undefined;

            branchNodes.push({
              id: nodeId,
              timeLabel:
                msg.branchPoint?.timeLabel || msg.timeLabel || "",
              summary,
              choiceLabel,
              timelineId: timeline.id,
              msgId: msg.id,
              parentNodeId: prevBranchNodeId,
              isOnActivePath: isActive,
              isDimBranch: !isActive,
            });

            if (prevBranchNodeId)
              edgeList.push({
                source: prevBranchNodeId,
                target: nodeId,
              });
            prevBranchNodeId = nodeId;

            if (msg.branchPoint?.chosenIndex !== undefined) {
              msg.branchPoint.choices.forEach((c, i) => {
                if (i !== msg.branchPoint!.chosenIndex) {
                  const hasChild = currentTimelines.some(
                    (ct) =>
                      ct.branchPointMsgId === msg.id &&
                      ct.choiceIndex === i
                  );
                  if (!hasChild) {
                    const dimId = `dim-${timeline.id}-${msg.id}-${i}`;
                    branchNodes.push({
                      id: dimId,
                      timeLabel: msg.branchPoint!.timeLabel,
                      summary: msg.branchPoint!.summary,
                      choiceLabel: c.label,
                      timelineId: timeline.id,
                      msgId: msg.id,
                      parentNodeId: nodeId,
                      isOnActivePath: false,
                      isDimBranch: true,
                    });
                    edgeList.push({ source: nodeId, target: dimId });
                  }
                }
              });
            }
          }
        }
        if (timeline.parentTimelineId) {
          const pNodeId = `${timeline.parentTimelineId}-${timeline.branchPointMsgId}`;
          const first = branchNodes.find(
            (bn) => bn.timelineId === timeline.id && !bn.parentNodeId
          );
          if (first)
            edgeList.push({ source: pNodeId, target: first.id });
        }
      }

      if (branchNodes.length === 0) {
        setNodes([]);
        setEdges([]);
        return;
      }

      const flowNodes: Node[] = branchNodes.map((bn) => ({
        id: bn.id,
        type: "scenario",
        position: { x: 0, y: 0 },
        data: {
          timeLabel: bn.timeLabel,
          summary: bn.summary,
          choiceLabel: bn.choiceLabel,
          isOnActivePath: bn.isOnActivePath,
          isDimBranch: bn.isDimBranch,
          isExpanded: false,
          timelineId: bn.timelineId,
          msgId: bn.msgId,
          compareMode: false,
          isCompareSelected: false,
          onRewind: () => {
            if (bn.isDimBranch && bn.choiceLabel) {
              const ptl = currentTimelines.find(
                (t) => t.id === bn.timelineId
              );
              const msg = ptl?.messages.find((m) => m.id === bn.msgId);
              if (msg?.branchPoint) {
                const ci = msg.branchPoint.choices.findIndex(
                  (c) => c.label === bn.choiceLabel
                );
                if (ci >= 0) {
                  setRewindModal({
                    open: true,
                    timelineId: bn.timelineId,
                    msgId: bn.msgId,
                    choiceIndex: ci,
                    choiceLabel: bn.choiceLabel!,
                  });
                }
              }
            }
          },
          onToggleExpand: () => {},
          onCompareSelect: () => {},
        } satisfies ScenarioNodeData,
      }));

      const flowEdges: Edge[] = edgeList.map((e) => {
        const target = branchNodes.find((n) => n.id === e.target);
        return {
          id: `e-${e.source}-${e.target}`,
          source: e.source,
          sourceHandle: "source",
          target: e.target,
          targetHandle: "target",
          type: "default",
          style: {
            stroke: target?.isOnActivePath
              ? "rgba(212,168,83,0.6)"
              : "rgba(212,168,83,0.15)",
            strokeWidth: target?.isOnActivePath ? 2.5 : 1.5,
            strokeDasharray: target?.isDimBranch ? "6 4" : undefined,
          },
          animated: target?.isOnActivePath || false,
        };
      });

      const { nodes: layouted, edges: layoutedEdges } =
        getLayoutedElements(flowNodes, flowEdges);
      setNodes(layouted);
      setEdges(layoutedEdges);
    },
    [setNodes, setEdges]
  );

  // Rebuild when timelines change
  useEffect(() => {
    if (timelines.length > 0)
      rebuildGraph(timelines, activeTimelineId);
  }, [timelines, activeTimelineId, rebuildGraph]);

  // ── Build zoom-mode graph (TB layout with ParallelNode) ──
  const rebuildZoomGraph = useCallback(
    (currentTimelines: Timeline[], currentActiveId: string) => {
      const branchNodes: {
        id: string;
        timeLabel: string;
        summary: string;
        choiceLabel?: string;
        timelineId: string;
        msgId: string;
        parentNodeId?: string;
        isOnActivePath: boolean;
        isDimBranch: boolean;
      }[] = [];
      const edgeList: { source: string; target: string }[] = [];

      for (const timeline of currentTimelines) {
        const isActive = timeline.id === currentActiveId;
        let prevBranchNodeId: string | undefined;

        for (const msg of timeline.messages) {
          if (msg.role === "assistant" && (msg.branchPoint || msg.timeLabel)) {
            const nodeId = `z-${timeline.id}-${msg.id}`;
            const summary = msg.branchPoint?.summary || msg.content.substring(0, 80) + "...";
            const choiceLabel = msg.branchPoint?.chosenIndex !== undefined
              ? msg.branchPoint.choices[msg.branchPoint.chosenIndex]?.label
              : undefined;

            branchNodes.push({
              id: nodeId, timeLabel: msg.branchPoint?.timeLabel || msg.timeLabel || "",
              summary, choiceLabel,
              timelineId: timeline.id, msgId: msg.id,
              parentNodeId: prevBranchNodeId,
              isOnActivePath: isActive, isDimBranch: !isActive,
            });

            if (prevBranchNodeId) edgeList.push({ source: prevBranchNodeId, target: nodeId });
            prevBranchNodeId = nodeId;

            if (msg.branchPoint?.chosenIndex !== undefined) {
              msg.branchPoint.choices.forEach((c, i) => {
                if (i !== msg.branchPoint!.chosenIndex) {
                  const hasChild = currentTimelines.some(
                    (ct) => ct.branchPointMsgId === msg.id && ct.choiceIndex === i
                  );
                  if (!hasChild) {
                    const dimId = `z-dim-${timeline.id}-${msg.id}-${i}`;
                    branchNodes.push({
                      id: dimId, timeLabel: msg.branchPoint!.timeLabel,
                      summary: msg.branchPoint!.summary,
                      choiceLabel: c.label,
                      timelineId: timeline.id, msgId: msg.id,
                      parentNodeId: nodeId,
                      isOnActivePath: false, isDimBranch: true,
                    });
                    edgeList.push({ source: nodeId, target: dimId });
                  }
                }
              });
            }
          }
        }
        if (timeline.parentTimelineId) {
          const pNodeId = `z-${timeline.parentTimelineId}-${timeline.branchPointMsgId}`;
          const first = branchNodes.find((bn) => bn.timelineId === timeline.id && !bn.parentNodeId);
          if (first) edgeList.push({ source: pNodeId, target: first.id });
        }
      }

      if (branchNodes.length === 0) {
        setZoomNodes([]);
        setZoomEdges([]);
        return;
      }

      const flowNodes: Node[] = branchNodes.map((bn) => ({
        id: bn.id,
        type: "parallel",
        position: { x: 0, y: 0 },
        data: {
          timeLabel: bn.timeLabel,
          summary: bn.summary,
          choiceLabel: bn.choiceLabel,
          isOnActivePath: bn.isOnActivePath,
          isDimBranch: bn.isDimBranch,
          timelineId: bn.timelineId,
          msgId: bn.msgId,
          onRewind: () => {
            if (bn.isDimBranch && bn.choiceLabel) {
              const ptl = currentTimelines.find((t) => t.id === bn.timelineId);
              const msg = ptl?.messages.find((m) => m.id === bn.msgId);
              if (msg?.branchPoint) {
                const ci = msg.branchPoint.choices.findIndex((c) => c.label === bn.choiceLabel);
                if (ci >= 0) {
                  setRewindModal({
                    open: true, timelineId: bn.timelineId, msgId: bn.msgId,
                    choiceIndex: ci, choiceLabel: bn.choiceLabel!,
                  });
                }
              }
            }
          },
        } satisfies ParallelNodeData,
      }));

      const flowEdges: Edge[] = edgeList.map((e) => {
        const target = branchNodes.find((n) => n.id === e.target);
        return {
          id: `ze-${e.source}-${e.target}`,
          source: e.source, sourceHandle: "source",
          target: e.target, targetHandle: "target",
          type: "default",
          style: {
            stroke: target?.isOnActivePath ? "rgba(212,168,83,0.6)" : "rgba(212,168,83,0.15)",
            strokeWidth: target?.isOnActivePath ? 2.5 : 1.5,
            strokeDasharray: target?.isDimBranch ? "6 4" : undefined,
          },
          animated: target?.isOnActivePath || false,
        };
      });

      const { nodes: layouted, edges: layoutedEdges } = getLayoutedElements(flowNodes, flowEdges, "TB");
      setZoomNodes(layouted);
      setZoomEdges(layoutedEdges);
    },
    []
  );

  // Rebuild zoom graph when timelines change
  useEffect(() => {
    if (timelines.length > 0 && viewMode === "zoom")
      rebuildZoomGraph(timelines, activeTimelineId);
  }, [timelines, activeTimelineId, viewMode, rebuildZoomGraph]);

  // ── Rewind ──
  const handleRewind = useCallback(async () => {
    if (!profile || isGeneratingRef.current) return;
    const { timelineId, msgId, choiceIndex, choiceLabel } = rewindModal;
    setRewindModal({
      open: false,
      timelineId: "",
      msgId: "",
      choiceIndex: -1,
      choiceLabel: "",
    });
    setShowFullMap(false);

    const src = timelinesRef.current.find((t) => t.id === timelineId);
    if (!src) return;
    const branchIdx = src.messages.findIndex((m) => m.id === msgId);
    if (branchIdx === -1) return;

    const copied = src.messages.slice(0, branchIdx + 1).map((m) => ({
      ...m,
      id: m.id === msgId ? m.id : crypto.randomUUID(),
      branchPoint:
        m.id === msgId && m.branchPoint
          ? { ...m.branchPoint, chosenIndex: choiceIndex }
          : m.branchPoint,
    }));

    const newTl: Timeline = {
      id: crypto.randomUUID(),
      parentTimelineId: timelineId,
      branchPointMsgId: msgId,
      choiceIndex,
      messages: copied,
    };
    setTimelines((prev) => [...prev, newTl]);
    setActiveTimelineId(newTl.id);

    setIsGenerating(true);
    isGeneratingRef.current = true;
    try {
      const scenarios = copied
        .filter((m) => m.role === "assistant" && m.timeLabel)
        .map((m) => ({
          id: m.id,
          timeLabel: m.timeLabel || "",
          content: m.content,
          autoChoice: undefined,
          isBranch: false,
          parentId: null,
          timelineId: newTl.id,
        }));

      const res = await fetch("/api/scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          previousScenarios: scenarios,
          intervention: choiceLabel,
        }),
      });
      if (!res.ok) throw new Error("시나리오 생성 실패");
      const data = await res.json();
      const aiMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.content,
        timestamp: Date.now(),
        timeLabel: data.timeLabel,
      };
      setTimelines((prev) =>
        prev.map((t) =>
          t.id === newTl.id
            ? { ...t, messages: [...t.messages, aiMsg] }
            : t
        )
      );
      playBranchCreate();
      setShowForkEffect(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "오류가 발생했습니다."
      );
    } finally {
      setIsGenerating(false);
      isGeneratingRef.current = false;
    }
  }, [profile, rewindModal]);

  // ── Universe Report ──
  const handleAnalyze = useCallback(async () => {
    if (!profile) return;
    setReportModal(true);
    setReportLoading(true);
    const summaries: {
      timeLabel: string;
      summary: string;
      chosen: string;
      notChosen: string[];
    }[] = [];
    for (const tl of timelinesRef.current) {
      for (const msg of tl.messages) {
        if (
          msg.role === "assistant" &&
          msg.branchPoint &&
          msg.branchPoint.chosenIndex !== undefined
        ) {
          const bp = msg.branchPoint;
          summaries.push({
            timeLabel: bp.timeLabel,
            summary: bp.summary,
            chosen: bp.choices[bp.chosenIndex!]?.label || "",
            notChosen: bp.choices
              .filter((_, i) => i !== bp.chosenIndex)
              .map((c) => c.label),
          });
        }
      }
    }
    if (summaries.length === 0) {
      setReportText(
        "아직 분기점이 없어. 개입을 더 해보면 갈림길이 생길 거야."
      );
      setReportLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, branchSummaries: summaries }),
      });
      if (!res.ok) throw new Error("리포트 생성 실패");
      const data = await res.json();
      setReportText(data.report);
    } catch {
      setReportText("분석 중 오류가 발생했어. 다시 시도해봐.");
    } finally {
      setReportLoading(false);
    }
  }, [profile]);

  // Loading
  if (!profile) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#000" }}
      >
        <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  const activeMessages = getActiveMessages();
  const branchNodesForMinimap = collectBranchNodes();

  return (
    <div
      className="w-screen h-screen flex flex-col"
      style={{ background: "#000", touchAction: "pan-y" }}
    >
      {/* StarField behind everything */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <StarField />
      </div>

      {/* Nebula gradient overlay (top) */}
      <div
        className="fixed top-0 left-0 right-0 h-40 z-[1] pointer-events-none animate-nebulaBreathe"
        style={{
          background: "linear-gradient(to bottom, rgba(30,20,60,0.4), rgba(20,15,40,0.15), transparent)",
        }}
      />

      {/* Top bar — glass morphism */}
      <div
        className="flex-none z-10 relative glass-panel"
        style={{
          paddingTop: "max(8px, env(safe-area-inset-top))",
        }}
      >
        {/* Title + controls row */}
        <div className="flex items-center justify-between px-3 py-2">
          <h1
            className="text-sm text-white/80 tracking-wide"
            style={{
              fontFamily: "var(--font-display), serif",
              textShadow: "0 0 25px rgba(212,168,83,0.4), 0 0 50px rgba(179,136,255,0.15)",
            }}
          >
            Parallel Me
          </h1>

          <div className="flex gap-1.5 items-center">
            {/* Timeline selector */}
            {timelines.length > 1 && (
              <div className="flex gap-1 mr-1">
                {timelines.map((t, i) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTimelineId(t.id)}
                    className="px-1.5 py-0.5 rounded-full text-[9px] transition-all"
                    style={{
                      background:
                        t.id === activeTimelineId
                          ? "rgba(212,168,83,0.15)"
                          : "transparent",
                      border:
                        t.id === activeTimelineId
                          ? "1px solid rgba(212,168,83,0.4)"
                          : "1px solid rgba(255,255,255,0.06)",
                      color:
                        t.id === activeTimelineId
                          ? "rgba(212,168,83,0.9)"
                          : "rgba(255,255,255,0.25)",
                    }}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}

            {/* View mode toggle */}
            <button
              onClick={() => setViewMode(viewMode === "scroll" ? "zoom" : "scroll")}
              className="px-2 py-1 rounded-lg text-[11px] transition-all duration-300"
              style={{
                background: viewMode === "zoom"
                  ? "rgba(212,168,83,0.12)"
                  : "rgba(0,0,0,0.5)",
                border: viewMode === "zoom"
                  ? "1px solid rgba(212,168,83,0.3)"
                  : "1px solid rgba(255,255,255,0.06)",
                color: viewMode === "zoom"
                  ? "rgba(212,168,83,0.9)"
                  : "rgba(255,255,255,0.3)",
              }}
            >
              {viewMode === "zoom" ? "\u{1F4DC}" : "\u{1F52D}"}
            </button>

            {/* Home */}
            <button
              onClick={() => router.push("/")}
              className="px-2 py-1 rounded-lg text-[11px] transition-all duration-300"
              style={{
                background: "rgba(0,0,0,0.5)",
                border: "1px solid rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.3)",
              }}
            >
              처음으로
            </button>
          </div>
        </div>
      </div>

      {/* ═══ Scroll Mode ═══ */}
      {viewMode === "scroll" && (
        <>
          {/* Minimap strip */}
          <div className="flex-none z-10 relative">
            <MiniMap
              branchNodes={branchNodesForMinimap}
              onTap={() => {
                setShowFullMap(true);
                setTimeout(
                  () => fitView({ duration: 600, padding: 0.3 }),
                  100
                );
              }}
            />
          </div>

          {/* Scroll reading area — tap to advance */}
          <div className="flex-1 overflow-hidden z-10 relative">
            <StoryPanel
              messages={activeMessages}
              isGenerating={isGenerating}
              onTapAdvance={handleTapAdvance}
            />
          </div>

          {/* Bottom bar — glass morphism */}
          <div
            className="flex-none z-20 glass-panel"
            style={{
              paddingBottom: "max(12px, env(safe-area-inset-bottom))",
            }}
          >
            {/* Intervention input (slide-up above bottom bar) */}
            {isIntervening && (
              <div className="px-4 pt-3 pb-2 animate-slideUp">
                <div
                  className="flex items-end gap-2 rounded-2xl px-3 py-2"
                  style={{
                    background: "rgba(10,10,30,0.6)",
                    backdropFilter: "blur(16px)",
                    border: "1px solid rgba(179,136,255,0.2)",
                    boxShadow: "0 0 20px rgba(179,136,255,0.06), inset 0 0 20px rgba(179,136,255,0.02)",
                  }}
                >
                  <textarea
                    ref={interventionInputRef}
                    value={interventionText}
                    onChange={(e) => setInterventionText(e.target.value)}
                    placeholder="나는 여기서 이렇게 할 거야..."
                    rows={2}
                    className="flex-1 bg-transparent outline-none resize-none text-[14px] placeholder:text-white/20"
                    style={{
                      color: "rgba(255,255,255,0.9)",
                      caretColor: "#b388ff",
                      lineHeight: "1.5",
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (interventionText.trim()) {
                          handleIntervene(interventionText.trim());
                        }
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      if (interventionText.trim()) {
                        handleIntervene(interventionText.trim());
                      }
                    }}
                    disabled={!interventionText.trim()}
                    className="flex-none px-3 py-1.5 rounded-lg text-[12px] transition-all disabled:opacity-30"
                    style={{
                      background: "rgba(179,136,255,0.15)",
                      border: "1px solid rgba(179,136,255,0.3)",
                      color: "rgba(179,136,255,0.9)",
                    }}
                  >
                    전송
                  </button>
                  <button
                    onClick={() => {
                      setIsIntervening(false);
                      setInterventionText("");
                    }}
                    className="flex-none px-2 py-1.5 rounded-lg text-[12px] transition-all"
                    style={{ color: "rgba(255,255,255,0.3)" }}
                  >
                    취소
                  </button>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-center gap-3 px-4 py-3">
              {!isIntervening && (
                <button
                  onClick={() => {
                    setIsIntervening(true);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] transition-all"
                  style={{
                    background: "rgba(179,136,255,0.08)",
                    border: "1px solid rgba(179,136,255,0.25)",
                    color: "rgba(179,136,255,0.8)",
                  }}
                >
                  <span style={{ fontSize: "14px" }}>&#x270D;&#xFE0E;</span>
                  개입하기
                </button>
              )}

              {/* Sound toggle — right side of bottom bar */}
              <button
                onClick={() => {
                  const n = !soundMuted;
                  setSoundMuted(n);
                  setMuted(n);
                }}
                className="ml-auto px-2 py-2 rounded-lg text-xs transition-all duration-300"
                style={{
                  background: "rgba(0,0,0,0.5)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  color: soundMuted
                    ? "rgba(255,255,255,0.2)"
                    : "rgba(212,168,83,0.6)",
                }}
              >
                {soundMuted ? "\u{1F507}" : "\u{1F50A}"}
              </button>
            </div>
          </div>

          {/* Full map overlay (from minimap tap) */}
          {showFullMap && (
            <MapPanel
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onFitView={() => {
                fitView({ duration: 800, padding: 0.2 });
                playZoomOut();
              }}
              onAnalyze={handleAnalyze}
              onClose={() => setShowFullMap(false)}
              isOverlay
            />
          )}
        </>
      )}

      {/* ═══ Zoom Mode ═══ */}
      {viewMode === "zoom" && (
        <div className="flex-1 z-10 relative overflow-hidden">
          <ZoomSimulation
            nodes={zoomNodes}
            edges={zoomEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onSwitchToScroll={() => setViewMode("scroll")}
            onAnalyze={handleAnalyze}
          />
        </div>
      )}

      {/* Fork effect overlay */}
      <ForkEffect
        active={showForkEffect}
        onComplete={() => setShowForkEffect(false)}
      />

      {/* Error toast */}
      {error && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-red-900/80 backdrop-blur-md border border-red-500/30 rounded-xl animate-slideUp">
          <p className="text-sm text-red-300">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-xs text-red-400/70 hover:text-red-300 mt-1"
          >
            닫기
          </button>
        </div>
      )}

      {/* Modals */}
      <RewindModal
        isOpen={rewindModal.open}
        onConfirm={handleRewind}
        onCancel={() =>
          setRewindModal({
            open: false,
            timelineId: "",
            msgId: "",
            choiceIndex: -1,
            choiceLabel: "",
          })
        }
      />
      <ReportModal
        isOpen={reportModal}
        report={reportText}
        isLoading={reportLoading}
        onClose={() => setReportModal(false)}
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
        <div
          className="min-h-screen flex items-center justify-center"
          style={{ background: "#000" }}
        >
          <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
        </div>
      }
    >
      <SimulationWithProvider />
    </Suspense>
  );
}

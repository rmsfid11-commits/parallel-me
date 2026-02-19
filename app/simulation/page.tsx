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
} from "@/lib/types";
import { type ScenarioNodeData } from "@/components/ScenarioNode";
import MapPanel from "@/components/MapPanel";
import MiniMap from "@/components/MiniMap";
import ChatPanel from "@/components/ChatPanel";
import StarField from "@/components/StarField";
import ForkEffect from "@/components/ForkEffect";
import { getLayoutedElements } from "@/lib/layout";
import {
  startAmbient,
  stopAmbient,
  playNodeCreate,
  playBranchCreate,
  playZoomOut,
  setMuted,
} from "@/lib/sounds";

// ── Rewind modal ──
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

// ── Report modal ──
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
// ── Main Simulation (Chat Mode)
// ══════════════════════════════════════════
function SimulationCanvas() {
  const router = useRouter();
  const { fitView } = useReactFlow();

  // Profile
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Timelines
  const [timelines, setTimelines] = useState<Timeline[]>([]);
  const [activeTimelineId, setActiveTimelineId] = useState<string>("");
  const timelinesRef = useRef<Timeline[]>([]);
  const activeTimelineIdRef = useRef("");
  timelinesRef.current = timelines;
  activeTimelineIdRef.current = activeTimelineId;

  // UI state
  const [isGenerating, setIsGenerating] = useState(false);
  const [showFullMap, setShowFullMap] = useState(false);
  const [soundMuted, setSoundMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForkEffect, setShowForkEffect] = useState(false);

  const isGeneratingRef = useRef(false);
  isGeneratingRef.current = isGenerating;
  const hasStartedRef = useRef(false);

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

  // ── Load profile ──
  useEffect(() => {
    const stored = localStorage.getItem("parallelme-profile");
    if (!stored) {
      router.push("/");
      return;
    }
    try {
      const p = JSON.parse(stored) as UserProfile;
      setProfile(p);

      // Restore from localStorage
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

  // ── Persist simulation ──
  useEffect(() => {
    if (timelines.length > 0 && activeTimelineId) {
      localStorage.setItem(
        "parallelme-simulation",
        JSON.stringify({ timelines, activeTimelineId })
      );
    }
  }, [timelines, activeTimelineId]);

  // ── beforeunload protection ──
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

  // ── Call /api/chat ──
  const callChatAPI = useCallback(
    async (msgs: ChatMessage[], chosenLabel?: string) => {
      if (!profile) return null;

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          messages: msgs,
          chosenLabel,
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "응답 생성 실패");
      }

      return await res.json() as { text: string; branchPoint?: import("@/lib/types").BranchPointData };
    },
    [profile]
  );

  // ── Handle sending a message ──
  const handleSendMessage = useCallback(
    async (text: string) => {
      if (!profile || isGeneratingRef.current) return;

      const tlId = activeTimelineIdRef.current;

      // Add user message
      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: text,
        timestamp: Date.now(),
      };
      updateTimelineMessages(tlId, (msgs) => [...msgs, userMsg]);

      setIsGenerating(true);
      isGeneratingRef.current = true;

      try {
        const currentMsgs = [
          ...getActiveMessages(),
          userMsg,
        ];
        const result = await callChatAPI(currentMsgs);
        if (!result) return;

        const aiMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: result.text,
          timestamp: Date.now(),
          branchPoint: result.branchPoint,
        };
        updateTimelineMessages(tlId, (msgs) => [...msgs, aiMsg]);

        if (result.branchPoint) {
          playBranchCreate();
          setShowForkEffect(true);
          if (navigator.vibrate) navigator.vibrate(50);
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
    [profile, getActiveMessages, updateTimelineMessages, callChatAPI]
  );

  // ── Handle branch choice ──
  const handleBranchChoice = useCallback(
    async (msgId: string, label: string, index: number) => {
      if (!profile || isGeneratingRef.current) return;

      const tlId = activeTimelineIdRef.current;

      // Update chosen index on the message
      updateTimelineMessages(tlId, (msgs) =>
        msgs.map((m) =>
          m.id === msgId && m.branchPoint
            ? { ...m, branchPoint: { ...m.branchPoint, chosenIndex: index } }
            : m
        )
      );

      setIsGenerating(true);
      isGeneratingRef.current = true;

      try {
        // Get updated messages (with chosen index set)
        const updatedMsgs = getActiveMessages().map((m) =>
          m.id === msgId && m.branchPoint
            ? { ...m, branchPoint: { ...m.branchPoint, chosenIndex: index } }
            : m
        );

        const result = await callChatAPI(updatedMsgs, label);
        if (!result) return;

        const aiMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: result.text,
          timestamp: Date.now(),
          branchPoint: result.branchPoint,
        };
        updateTimelineMessages(tlId, (msgs) => [...msgs, aiMsg]);

        playBranchCreate();
        setShowForkEffect(true);
        if (navigator.vibrate) navigator.vibrate(50);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "오류가 발생했습니다."
        );
      } finally {
        setIsGenerating(false);
        isGeneratingRef.current = false;
      }
    },
    [profile, getActiveMessages, updateTimelineMessages, callChatAPI]
  );

  // ── Auto-start first chat ──
  useEffect(() => {
    if (!profile || hasStartedRef.current) return;

    const msgs = getActiveMessages();
    if (msgs.length > 0) {
      hasStartedRef.current = true;
      return;
    }

    // Wait for timeline to be ready
    if (timelines.length === 0 || !activeTimelineId) return;

    hasStartedRef.current = true;

    const startChat = async () => {
      setIsGenerating(true);
      isGeneratingRef.current = true;
      try {
        const tlId = activeTimelineIdRef.current;
        const startMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "user",
          content: "시작해줘",
          timestamp: Date.now(),
        };
        updateTimelineMessages(tlId, (msgs) => [...msgs, startMsg]);

        const result = await callChatAPI([startMsg]);
        if (!result) return;

        const aiMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: result.text,
          timestamp: Date.now(),
          branchPoint: result.branchPoint,
        };
        updateTimelineMessages(tlId, (msgs) => [...msgs, aiMsg]);

        if (result.branchPoint) {
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
    };

    startChat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, timelines, activeTimelineId]);

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
      const result = await callChatAPI(copied, choiceLabel);
      if (!result) return;

      const aiMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: result.text,
        timestamp: Date.now(),
        branchPoint: result.branchPoint,
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
  }, [profile, rewindModal, callChatAPI]);

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
        "아직 분기점이 없어. 선택지를 골라보면 갈림길이 생길 거야."
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
      {/* StarField */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <StarField />
      </div>

      {/* Top bar */}
      <div
        className="flex-none z-10 relative glass-panel"
        style={{
          paddingTop: "max(8px, env(safe-area-inset-top))",
        }}
      >
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

            {/* Sound toggle */}
            <button
              onClick={() => {
                const n = !soundMuted;
                setSoundMuted(n);
                setMuted(n);
              }}
              className="px-2 py-1 rounded-lg text-xs transition-all duration-300"
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

      {/* Chat area */}
      <div className="flex-1 overflow-hidden z-10 relative">
        <ChatPanel
          messages={activeMessages}
          isGenerating={isGenerating}
          onSendMessage={handleSendMessage}
          onBranchChoice={handleBranchChoice}
        />
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

      {/* Fork effect */}
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

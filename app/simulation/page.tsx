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

import { UserProfile, ChatMessage, Timeline, BranchPointData } from "@/lib/types";
import { type ScenarioNodeData } from "@/components/ScenarioNode";
import ChatPanel from "@/components/ChatPanel";
import MapPanel from "@/components/MapPanel";
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
      <div className="relative w-full max-w-sm bg-[#0d0d35] border border-purple-500/30 rounded-2xl p-6 shadow-2xl animate-slideUp">
        <h3 className="text-lg font-bold text-white mb-3">다른 선택으로 돌아가기</h3>
        <p className="text-sm text-gray-400 mb-5">
          이 시점으로 돌아가서 다른 선택을 해볼래?
          <br />새로운 평행우주가 만들어져.
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
              background: "linear-gradient(135deg, rgba(179,136,255,0.3), rgba(212,168,83,0.3))",
              border: "1px solid rgba(179,136,255,0.4)",
              color: "rgba(255,255,255,0.9)",
            }}
          >
            돌아갈래
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 비교 모달 ──
function CompareModal({
  isOpen,
  node1,
  node2,
  onClose,
}: {
  isOpen: boolean;
  node1?: { timeLabel: string; summary: string; choiceLabel?: string };
  node2?: { timeLabel: string; summary: string; choiceLabel?: string };
  onClose: () => void;
}) {
  if (!isOpen || !node1 || !node2) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fadeIn"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg bg-[#0d0d35] border border-purple-500/30 rounded-2xl p-6 shadow-2xl animate-slideUp">
        <h3 className="text-lg font-bold text-white mb-4">평행우주 비교</h3>
        <div className="grid grid-cols-2 gap-4">
          {[node1, node2].map((n, i) => (
            <div
              key={i}
              className="rounded-xl p-4"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(212,168,83,0.15)",
              }}
            >
              <span
                className="text-[11px] px-2 py-0.5 rounded-full"
                style={{
                  color: "rgba(179,136,255,0.9)",
                  background: "rgba(179,136,255,0.1)",
                }}
              >
                {n.timeLabel}
              </span>
              <p className="text-[13px] text-white/80 mt-2 leading-relaxed">{n.summary}</p>
              {n.choiceLabel && (
                <p className="text-[11px] mt-2" style={{ color: "rgba(212,168,83,0.7)" }}>
                  선택: {n.choiceLabel}
                </p>
              )}
            </div>
          ))}
        </div>
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
      <div className="relative w-full max-w-md bg-[#0d0d35] border border-amber-500/30 rounded-2xl p-6 shadow-2xl animate-slideUp max-h-[80vh] overflow-y-auto">
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
            <span className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
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

// ── 메인 시뮬레이션 ──
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
  const [mobileView, setMobileView] = useState<"chat" | "map">("chat");
  const [soundMuted, setSoundMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Map
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Compare mode
  const [compareMode, setCompareMode] = useState(false);
  const [compareNodeIds, setCompareNodeIds] = useState<string[]>([]);

  // Modals
  const [rewindModal, setRewindModal] = useState<{
    open: boolean;
    timelineId: string;
    msgId: string;
    choiceIndex: number;
    choiceLabel: string;
  }>({ open: false, timelineId: "", msgId: "", choiceIndex: -1, choiceLabel: "" });

  const [compareModal, setCompareModal] = useState(false);
  const [reportModal, setReportModal] = useState(false);
  const [reportText, setReportText] = useState("");
  const [reportLoading, setReportLoading] = useState(false);

  // Refs for async callbacks
  const isGeneratingRef = useRef(false);
  isGeneratingRef.current = isGenerating;

  // ── Init ──
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

  // Load profile from sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem("parallelme-profile");
    if (!stored) {
      router.push("/");
      return;
    }
    try {
      const p = JSON.parse(stored) as UserProfile;
      setProfile(p);

      // Create initial timeline
      const initialTimeline: Timeline = {
        id: crypto.randomUUID(),
        parentTimelineId: null,
        branchPointMsgId: "",
        choiceIndex: -1,
        messages: [],
      };
      setTimelines([initialTimeline]);
      setActiveTimelineId(initialTimeline.id);
    } catch {
      router.push("/");
    }
  }, [router]);

  // Get current active timeline
  const getActiveTimeline = useCallback((): Timeline | undefined => {
    return timelinesRef.current.find((t) => t.id === activeTimelineIdRef.current);
  }, []);

  const getActiveMessages = useCallback((): ChatMessage[] => {
    return getActiveTimeline()?.messages || [];
  }, [getActiveTimeline]);

  // Update messages in a timeline
  const updateTimelineMessages = useCallback(
    (timelineId: string, updater: (msgs: ChatMessage[]) => ChatMessage[]) => {
      setTimelines((prev) =>
        prev.map((t) =>
          t.id === timelineId
            ? { ...t, messages: updater(t.messages) }
            : t
        )
      );
    },
    []
  );

  // ── Build Map Graph ──
  const rebuildGraph = useCallback(
    (currentTimelines: Timeline[], currentActiveId: string, currentCompareIds: string[] = []) => {
      // Collect all branch points from all timelines
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

      // First pass: gather branch points from each timeline
      for (const timeline of currentTimelines) {
        const isActive = timeline.id === currentActiveId;
        let prevBranchNodeId: string | undefined;

        for (const msg of timeline.messages) {
          if (msg.role === "assistant" && msg.branchPoint) {
            const nodeId = `${timeline.id}-${msg.id}`;

            // Find the chosen label for this branch
            const choiceLabel = msg.branchPoint.chosenIndex !== undefined
              ? msg.branchPoint.choices[msg.branchPoint.chosenIndex]?.label
              : undefined;

            branchNodes.push({
              id: nodeId,
              timeLabel: msg.branchPoint.timeLabel,
              summary: msg.branchPoint.summary,
              choiceLabel,
              timelineId: timeline.id,
              msgId: msg.id,
              parentNodeId: prevBranchNodeId,
              isOnActivePath: isActive,
              isDimBranch: !isActive,
            });

            if (prevBranchNodeId) {
              edgeList.push({ source: prevBranchNodeId, target: nodeId });
            }

            prevBranchNodeId = nodeId;

            // Also add dim nodes for unchosen choices
            if (msg.branchPoint.chosenIndex !== undefined) {
              msg.branchPoint.choices.forEach((c, i) => {
                if (i !== msg.branchPoint!.chosenIndex) {
                  // Check if a child timeline exists for this choice
                  const hasChildTimeline = currentTimelines.some(
                    (ct) => ct.branchPointMsgId === msg.id && ct.choiceIndex === i
                  );

                  if (!hasChildTimeline) {
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

        // Connect child timelines to their parent branch
        if (timeline.parentTimelineId) {
          const parentNodeId = `${timeline.parentTimelineId}-${timeline.branchPointMsgId}`;
          const firstBranch = branchNodes.find(
            (bn) => bn.timelineId === timeline.id && !bn.parentNodeId
          );
          if (firstBranch) {
            edgeList.push({ source: parentNodeId, target: firstBranch.id });
          }
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
          compareMode,
          isCompareSelected: currentCompareIds.includes(bn.id),
          onRewind: () => {
            if (bn.isDimBranch && bn.choiceLabel) {
              // Find the original branch point message
              const parentTimeline = currentTimelines.find((t) => t.id === bn.timelineId);
              const msg = parentTimeline?.messages.find((m) => m.id === bn.msgId);
              if (msg?.branchPoint) {
                const choiceIdx = msg.branchPoint.choices.findIndex(
                  (c) => c.label === bn.choiceLabel
                );
                if (choiceIdx >= 0) {
                  setRewindModal({
                    open: true,
                    timelineId: bn.timelineId,
                    msgId: bn.msgId,
                    choiceIndex: choiceIdx,
                    choiceLabel: bn.choiceLabel!,
                  });
                }
              }
            }
          },
          onToggleExpand: () => {},
          onCompareSelect: () => {
            setCompareNodeIds((prev) => {
              if (prev.includes(bn.id)) return prev.filter((id) => id !== bn.id);
              if (prev.length >= 2) return [prev[1], bn.id];
              return [...prev, bn.id];
            });
          },
        } satisfies ScenarioNodeData,
      }));

      const flowEdges: Edge[] = edgeList.map((e) => ({
        id: `e-${e.source}-${e.target}`,
        source: e.source,
        sourceHandle: "source",
        target: e.target,
        targetHandle: "target",
        type: "default",
        style: {
          stroke: branchNodes.find((n) => n.id === e.target)?.isOnActivePath
            ? "rgba(212, 168, 83, 0.6)"
            : "rgba(212, 168, 83, 0.15)",
          strokeWidth: branchNodes.find((n) => n.id === e.target)?.isOnActivePath ? 2.5 : 1.5,
          strokeDasharray: branchNodes.find((n) => n.id === e.target)?.isDimBranch
            ? "6 4"
            : undefined,
        },
        animated: branchNodes.find((n) => n.id === e.target)?.isOnActivePath || false,
      }));

      const { nodes: layouted, edges: layoutedEdges } = getLayoutedElements(
        flowNodes,
        flowEdges
      );

      setNodes(layouted);
      setEdges(layoutedEdges);
    },
    [setNodes, setEdges, compareMode]
  );

  // Rebuild graph when timelines change
  useEffect(() => {
    if (timelines.length > 0) {
      rebuildGraph(timelines, activeTimelineId, compareNodeIds);
    }
  }, [timelines, activeTimelineId, compareNodeIds, rebuildGraph]);

  // ── Send message ──
  const sendMessage = useCallback(
    async (text: string) => {
      if (!profile || isGeneratingRef.current) return;

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: text,
        timestamp: Date.now(),
      };

      const currentTlId = activeTimelineIdRef.current;

      updateTimelineMessages(currentTlId, (msgs) => [...msgs, userMsg]);

      setIsGenerating(true);
      isGeneratingRef.current = true;

      try {
        const currentMsgs = [
          ...(timelinesRef.current.find((t) => t.id === currentTlId)?.messages || []),
          userMsg,
        ];

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            profile,
            messages: currentMsgs,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "응답 생성 실패");
        }

        const data = await res.json();

        const aiMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.text,
          branchPoint: data.branchPoint,
          timestamp: Date.now(),
        };

        updateTimelineMessages(currentTlId, (msgs) => [...msgs, aiMsg]);

        if (data.branchPoint) {
          playBranchCreate();
        } else {
          playNodeCreate();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
      } finally {
        setIsGenerating(false);
        isGeneratingRef.current = false;
      }
    },
    [profile, updateTimelineMessages]
  );

  // ── Handle branch choice ──
  const handleBranchChoice = useCallback(
    async (msgId: string, label: string, index: number) => {
      if (!profile || isGeneratingRef.current) return;

      const currentTlId = activeTimelineIdRef.current;

      // Mark the chosen index on the branch point
      updateTimelineMessages(currentTlId, (msgs) =>
        msgs.map((m) =>
          m.id === msgId && m.branchPoint
            ? { ...m, branchPoint: { ...m.branchPoint, chosenIndex: index } }
            : m
        )
      );

      setIsGenerating(true);
      isGeneratingRef.current = true;

      try {
        const currentMsgs =
          timelinesRef.current.find((t) => t.id === currentTlId)?.messages || [];

        // Update the branchPoint in messages for context
        const updatedMsgs = currentMsgs.map((m) =>
          m.id === msgId && m.branchPoint
            ? { ...m, branchPoint: { ...m.branchPoint, chosenIndex: index } }
            : m
        );

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            profile,
            messages: updatedMsgs,
            chosenLabel: label,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "응답 생성 실패");
        }

        const data = await res.json();

        const aiMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.text,
          branchPoint: data.branchPoint,
          timestamp: Date.now(),
        };

        updateTimelineMessages(currentTlId, (msgs) => [...msgs, aiMsg]);

        playNodeCreate();
      } catch (err) {
        setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
      } finally {
        setIsGenerating(false);
        isGeneratingRef.current = false;
      }
    },
    [profile, updateTimelineMessages]
  );

  // ── Rewind (되돌리기) ──
  const handleRewind = useCallback(async () => {
    if (!profile || isGeneratingRef.current) return;

    const { timelineId, msgId, choiceIndex, choiceLabel } = rewindModal;
    setRewindModal({ open: false, timelineId: "", msgId: "", choiceIndex: -1, choiceLabel: "" });

    const sourceTimeline = timelinesRef.current.find((t) => t.id === timelineId);
    if (!sourceTimeline) return;

    // Copy messages up to and including the branch point
    const branchMsgIdx = sourceTimeline.messages.findIndex((m) => m.id === msgId);
    if (branchMsgIdx === -1) return;

    const copiedMessages = sourceTimeline.messages.slice(0, branchMsgIdx + 1).map((m) => ({
      ...m,
      id: m.id === msgId ? m.id : crypto.randomUUID(), // Keep branch msg ID for reference
      branchPoint: m.id === msgId && m.branchPoint
        ? { ...m.branchPoint, chosenIndex: choiceIndex }
        : m.branchPoint,
    }));

    // Create new timeline
    const newTimeline: Timeline = {
      id: crypto.randomUUID(),
      parentTimelineId: timelineId,
      branchPointMsgId: msgId,
      choiceIndex,
      messages: copiedMessages,
    };

    setTimelines((prev) => [...prev, newTimeline]);
    setActiveTimelineId(newTimeline.id);

    // Generate response for the new choice
    setIsGenerating(true);
    isGeneratingRef.current = true;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          messages: copiedMessages,
          chosenLabel: choiceLabel,
        }),
      });

      if (!res.ok) throw new Error("응답 생성 실패");

      const data = await res.json();

      const aiMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.text,
        branchPoint: data.branchPoint,
        timestamp: Date.now(),
      };

      setTimelines((prev) =>
        prev.map((t) =>
          t.id === newTimeline.id
            ? { ...t, messages: [...t.messages, aiMsg] }
            : t
        )
      );

      playBranchCreate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
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

    // Collect all branch summaries
    const branchSummaries: { timeLabel: string; summary: string; chosen: string; notChosen: string[] }[] = [];

    for (const timeline of timelinesRef.current) {
      for (const msg of timeline.messages) {
        if (msg.role === "assistant" && msg.branchPoint && msg.branchPoint.chosenIndex !== undefined) {
          const bp = msg.branchPoint;
          branchSummaries.push({
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

    if (branchSummaries.length === 0) {
      setReportText("아직 분기점이 없어. 대화를 더 나눠보면 갈림길이 생길 거야.");
      setReportLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, branchSummaries }),
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

  // ── Compare mode ──
  useEffect(() => {
    if (compareNodeIds.length === 2) {
      setCompareModal(true);
    }
  }, [compareNodeIds]);

  const getCompareNodeData = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return undefined;
    const d = node.data as ScenarioNodeData;
    return { timeLabel: d.timeLabel, summary: d.summary, choiceLabel: d.choiceLabel };
  };

  // ── Auto-start first conversation ──
  useEffect(() => {
    if (profile && timelines.length === 1 && getActiveMessages().length === 0 && !isGenerating) {
      // Send an implicit first message to start the conversation
      const firstMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: "안녕, 내 미래를 보여줘.",
        timestamp: Date.now(),
      };

      const tlId = timelines[0].id;
      updateTimelineMessages(tlId, () => [firstMsg]);

      setIsGenerating(true);
      isGeneratingRef.current = true;

      fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          messages: [firstMsg],
        }),
      })
        .then(async (res) => {
          if (!res.ok) throw new Error("첫 응답 생성 실패");
          const data = await res.json();

          const aiMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: data.text,
            branchPoint: data.branchPoint,
            timestamp: Date.now(),
          };

          updateTimelineMessages(tlId, (msgs) => [...msgs, aiMsg]);
          playNodeCreate();
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
        })
        .finally(() => {
          setIsGenerating(false);
          isGeneratingRef.current = false;
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, timelines.length]);

  // Loading state
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#000" }}>
        <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  const activeMessages = getActiveMessages();

  return (
    <div className="w-screen h-screen flex flex-col" style={{ background: "#000" }}>
      {/* Top bar */}
      <div
        className="flex-none flex items-center justify-between px-3 md:px-5 py-2 z-10"
        style={{
          background: "rgba(0,0,0,0.9)",
          borderBottom: "1px solid rgba(212,168,83,0.1)",
          paddingTop: "max(8px, env(safe-area-inset-top))",
        }}
      >
        <h1
          className="text-sm md:text-lg text-white/80 tracking-wide"
          style={{
            fontFamily: "var(--font-display), serif",
            textShadow: "0 0 20px rgba(212,168,83,0.3)",
          }}
        >
          Parallel Me
        </h1>

        <div className="hidden md:block text-center">
          <p className="text-xs tracking-wider" style={{ color: "rgba(212,168,83,0.6)" }}>
            {profile.job} | {profile.age}세
          </p>
        </div>

        <div className="flex gap-1.5 items-center">
          {/* Compare toggle */}
          <button
            onClick={() => {
              setCompareMode(!compareMode);
              setCompareNodeIds([]);
            }}
            className="px-2 py-1 rounded-lg text-xs transition-all duration-300"
            style={{
              background: compareMode ? "rgba(179,136,255,0.15)" : "rgba(0,0,0,0.7)",
              border: compareMode
                ? "1px solid rgba(179,136,255,0.4)"
                : "1px solid rgba(255,255,255,0.08)",
              color: compareMode ? "rgba(179,136,255,0.9)" : "rgba(255,255,255,0.4)",
            }}
          >
            비교
          </button>

          {/* Mute */}
          <button
            onClick={() => {
              const next = !soundMuted;
              setSoundMuted(next);
              setMuted(next);
            }}
            className="px-1.5 py-1 rounded-lg text-xs transition-all duration-300"
            style={{
              background: "rgba(0,0,0,0.7)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: soundMuted ? "rgba(255,255,255,0.25)" : "rgba(212,168,83,0.7)",
            }}
          >
            {soundMuted ? "\u{1F507}" : "\u{1F50A}"}
          </button>

          {/* Mobile view toggle */}
          <button
            onClick={() => setMobileView(mobileView === "chat" ? "map" : "chat")}
            className="md:hidden px-2 py-1 rounded-lg text-xs transition-all duration-300"
            style={{
              background: "rgba(0,0,0,0.7)",
              border: "1px solid rgba(212,168,83,0.3)",
              color: "rgba(212,168,83,0.8)",
            }}
          >
            {mobileView === "chat" ? "나의 우주 보기" : "대화로 돌아가기"}
          </button>

          {/* Home */}
          <button
            onClick={() => router.push("/")}
            className="px-2 py-1 rounded-lg text-xs transition-all duration-300"
            style={{
              background: "rgba(0,0,0,0.7)",
              border: "1px solid rgba(212,168,83,0.15)",
              color: "rgba(255,255,255,0.4)",
            }}
          >
            처음으로
          </button>
        </div>
      </div>

      {/* Timeline selector (if multiple timelines) */}
      {timelines.length > 1 && (
        <div
          className="flex-none flex items-center gap-2 px-3 md:px-5 py-1.5 overflow-x-auto"
          style={{
            background: "rgba(0,0,0,0.8)",
            borderBottom: "1px solid rgba(212,168,83,0.08)",
          }}
        >
          <span className="text-[10px] flex-none" style={{ color: "rgba(255,255,255,0.3)" }}>
            우주:
          </span>
          {timelines.map((t, i) => (
            <button
              key={t.id}
              onClick={() => setActiveTimelineId(t.id)}
              className="px-2 py-0.5 rounded-full text-[10px] transition-all flex-none"
              style={{
                background: t.id === activeTimelineId
                  ? "rgba(212,168,83,0.15)"
                  : "rgba(255,255,255,0.03)",
                border: t.id === activeTimelineId
                  ? "1px solid rgba(212,168,83,0.4)"
                  : "1px solid rgba(255,255,255,0.06)",
                color: t.id === activeTimelineId
                  ? "rgba(212,168,83,0.9)"
                  : "rgba(255,255,255,0.3)",
              }}
            >
              우주 {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* Main content: Chat + Map */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Panel — desktop 40vw, mobile 100% (default view) */}
        <div
          className={`flex-col h-full ${
            mobileView === "chat" ? "flex" : "hidden md:flex"
          }`}
          style={{ width: "100%", borderRight: "1px solid rgba(212,168,83,0.08)" }}
        >
          <style jsx>{`
            @media (min-width: 768px) {
              div { width: 40vw !important; }
            }
          `}</style>
          <ChatPanel
            messages={activeMessages}
            isGenerating={isGenerating}
            onSendMessage={sendMessage}
            onBranchChoice={handleBranchChoice}
          />
        </div>

        {/* Map Panel — desktop flex-1, mobile toggle */}
        <div
          className={`flex-col flex-1 h-full ${
            mobileView === "map" ? "flex" : "hidden md:flex"
          }`}
        >
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
          />
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

      {/* Modals */}
      <RewindModal
        isOpen={rewindModal.open}
        onConfirm={handleRewind}
        onCancel={() => setRewindModal({ open: false, timelineId: "", msgId: "", choiceIndex: -1, choiceLabel: "" })}
      />

      <CompareModal
        isOpen={compareModal}
        node1={compareNodeIds[0] ? getCompareNodeData(compareNodeIds[0]) : undefined}
        node2={compareNodeIds[1] ? getCompareNodeData(compareNodeIds[1]) : undefined}
        onClose={() => {
          setCompareModal(false);
          setCompareNodeIds([]);
        }}
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
        <div className="min-h-screen flex items-center justify-center" style={{ background: "#000" }}>
          <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
        </div>
      }
    >
      <SimulationWithProvider />
    </Suspense>
  );
}

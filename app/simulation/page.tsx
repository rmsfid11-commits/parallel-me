"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import {
  ReactFlow,
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
  SimulationSession,
} from "@/lib/types";
import ScenarioNode, { type ScenarioNodeData } from "@/components/ScenarioNode";

const nodeTypes = { scenario: ScenarioNode };
import ChatPanel from "@/components/ChatPanel";
import StarField from "@/components/StarField";
import ForkEffect from "@/components/ForkEffect";
import { getLayoutedElements } from "@/lib/layout";
import {
  startAmbient,
  stopAmbient,
  playNodeCreate,
  playBranchCreate,
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

// ── Session Drawer ──
function SessionDrawer({
  isOpen,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onClose,
}: {
  isOpen: boolean;
  sessions: SimulationSession[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string) => void;
  onClose: () => void;
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fadeIn"
        onClick={onClose}
      />
      <div
        className="relative ml-auto w-72 h-full flex flex-col animate-slideLeft"
        style={{
          background: "rgba(8, 8, 25, 0.95)",
          borderLeft: "1px solid rgba(212,168,83,0.15)",
          backdropFilter: "blur(24px)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
        >
          <h2 className="text-sm font-bold text-white/80">
            내 시뮬레이션
          </h2>
          <button
            onClick={onClose}
            className="text-white/30 hover:text-white/60 text-lg transition-colors"
          >
            ✕
          </button>
        </div>

        {/* New session button */}
        <button
          onClick={onNewSession}
          className="mx-3 mt-3 mb-2 py-2.5 rounded-xl text-[13px] font-semibold transition-all hover:opacity-80"
          style={{
            background:
              "linear-gradient(135deg, rgba(179,136,255,0.15), rgba(212,168,83,0.15))",
            border: "1px solid rgba(212,168,83,0.3)",
            color: "rgba(212,168,83,0.9)",
          }}
        >
          + 새로 시작
        </button>

        {/* Session list */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
          {sessions
            .slice()
            .sort((a, b) => b.createdAt - a.createdAt)
            .map((s) => {
              const isActive = s.id === activeSessionId;
              return (
                <div
                  key={s.id}
                  className="relative group rounded-xl transition-all"
                  style={{
                    background: isActive
                      ? "rgba(212,168,83,0.1)"
                      : "rgba(255,255,255,0.03)",
                    border: isActive
                      ? "1px solid rgba(212,168,83,0.3)"
                      : "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <button
                    onClick={() => onSelectSession(s.id)}
                    className="w-full text-left px-3 py-2.5"
                  >
                    <p
                      className="text-[13px] font-medium"
                      style={{
                        color: isActive
                          ? "rgba(212,168,83,0.9)"
                          : "rgba(255,255,255,0.7)",
                      }}
                    >
                      {s.name}
                    </p>
                    <p
                      className="text-[11px] mt-0.5"
                      style={{ color: "rgba(255,255,255,0.3)" }}
                    >
                      {new Date(s.createdAt).toLocaleDateString("ko-KR", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      · {s.msgCount}개 메시지
                    </p>
                  </button>
                  {/* Delete session */}
                  {sessions.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("이 세션을 삭제할까?")) {
                          onDeleteSession(s.id);
                        }
                      }}
                      className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full opacity-60 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                      style={{
                        background: isActive ? "rgba(255,80,80,0.25)" : "rgba(255,80,80,0.15)",
                        color: "rgba(255,80,80,0.7)",
                        fontSize: "11px",
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })}
        </div>
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

  // Sessions
  const [sessions, setSessions] = useState<SimulationSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [showSessionDrawer, setShowSessionDrawer] = useState(false);

  // UI state
  const [isGenerating, setIsGenerating] = useState(false);
  const [soundMuted, setSoundMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForkEffect, setShowForkEffect] = useState(false);
  const [startFailed, setStartFailed] = useState(false);

  const isGeneratingRef = useRef(false);
  isGeneratingRef.current = isGenerating;
  const hasStartedRef = useRef(false);

  // Map (ReactFlow)
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Split layout
  const [splitDir, setSplitDir] = useState<"LR" | "TB">("TB");
  const [splitRatio, setSplitRatio] = useState(0.5);
  const [splitSwapped, setSplitSwapped] = useState(false);
  const isDraggingSplit = useRef(false);

  // StarField props
  const [zoomLevel, setZoomLevel] = useState(0.4);

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

  // ── Mobile detection — default TB + compact ratio on phone ──
  useEffect(() => {
    const w = window.innerWidth;
    if (w >= 768) {
      setSplitDir("LR");
    } else {
      setSplitRatio(0.35);
    }
  }, []);

  // ── Load profile + sessions ──
  useEffect(() => {
    const stored = localStorage.getItem("parallelme-profile");
    if (!stored) {
      router.push("/");
      return;
    }
    try {
      const p = JSON.parse(stored) as UserProfile;
      setProfile(p);

      // 1) Try loading sessions
      const savedSessions = localStorage.getItem("parallelme-sessions");
      if (savedSessions) {
        try {
          const parsed = JSON.parse(savedSessions) as {
            sessions: SimulationSession[];
            activeSessionId: string;
          };
          if (parsed.sessions && parsed.sessions.length > 0) {
            setSessions(parsed.sessions);
            const activeId =
              parsed.activeSessionId || parsed.sessions[0].id;
            setActiveSessionId(activeId);
            const active =
              parsed.sessions.find((s) => s.id === activeId) ||
              parsed.sessions[0];
            setTimelines(active.timelines);
            setActiveTimelineId(
              active.activeTimelineId || active.timelines[0]?.id || ""
            );
            return;
          }
        } catch {
          // ignore, fall through
        }
      }

      // 2) Legacy migration: parallelme-simulation → session
      const savedSim = localStorage.getItem("parallelme-simulation");
      if (savedSim) {
        try {
          const {
            timelines: savedTl,
            activeTimelineId: savedAtl,
          } = JSON.parse(savedSim);
          if (savedTl && savedTl.length > 0) {
            const session: SimulationSession = {
              id: crypto.randomUUID(),
              name: `${p.mode} · ${new Date().toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}`,
              timelines: savedTl,
              activeTimelineId: savedAtl || savedTl[0].id,
              createdAt: Date.now(),
              msgCount: (savedTl as Timeline[]).flatMap(
                (t) => t.messages
              ).length,
            };
            setSessions([session]);
            setActiveSessionId(session.id);
            setTimelines(savedTl);
            setActiveTimelineId(savedAtl || savedTl[0].id);
            localStorage.removeItem("parallelme-simulation");
            return;
          }
        } catch {
          // ignore
        }
      }

      // 3) Fresh start
      const tl: Timeline = {
        id: crypto.randomUUID(),
        parentTimelineId: null,
        branchPointMsgId: "",
        choiceIndex: -1,
        messages: [],
      };
      const session: SimulationSession = {
        id: crypto.randomUUID(),
        name: `${p.mode} · ${new Date().toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}`,
        timelines: [tl],
        activeTimelineId: tl.id,
        createdAt: Date.now(),
        msgCount: 0,
      };
      setSessions([session]);
      setActiveSessionId(session.id);
      setTimelines([tl]);
      setActiveTimelineId(tl.id);
    } catch {
      router.push("/");
    }
  }, [router]);

  // ── Persist sessions ──
  useEffect(() => {
    if (sessions.length > 0 && activeSessionId && timelines.length > 0) {
      const updatedSessions = sessions.map((s) =>
        s.id === activeSessionId
          ? {
              ...s,
              timelines,
              activeTimelineId,
              msgCount: timelines.flatMap((t) => t.messages).length,
            }
          : s
      );
      localStorage.setItem(
        "parallelme-sessions",
        JSON.stringify({ sessions: updatedSessions, activeSessionId })
      );
    }
  }, [timelines, activeTimelineId, sessions, activeSessionId]);

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

      return await res.json() as {
        text: string;
        branchPoint?: import("@/lib/types").BranchPointData;
        updatedFacts?: string[];
      };
    },
    [profile]
  );

  // ── Handle sending a message ──
  const handleSendMessage = useCallback(
    async (text: string) => {
      if (!profile || isGeneratingRef.current) return;
      setError(null);

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

        // ── learnedFacts 누적 → 프로필 업데이트 + 저장 ──
        if (result.updatedFacts && result.updatedFacts.length > 0) {
          setProfile(prev => {
            if (!prev) return prev;
            const existing = prev.learnedFacts || [];
            const merged = [...existing, ...result.updatedFacts!.filter(f => !existing.includes(f))];
            const updated = { ...prev, learnedFacts: merged };
            localStorage.setItem("parallelme-profile", JSON.stringify(updated));
            return updated;
          });
        }

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
      setError(null);

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

  // ── Start chat (extracted for retry) ──
  const startChat = useCallback(async () => {
    if (isGeneratingRef.current) return;
    setIsGenerating(true);
    isGeneratingRef.current = true;
    setStartFailed(false);
    setError(null);
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
      setStartFailed(true);
      setError(
        err instanceof Error ? err.message : "오류가 발생했습니다."
      );
    } finally {
      setIsGenerating(false);
      isGeneratingRef.current = false;
    }
  }, [updateTimelineMessages, callChatAPI]);

  // ── Auto-start first chat ──
  useEffect(() => {
    if (!profile || hasStartedRef.current) return;

    const msgs = getActiveMessages();
    if (msgs.length > 0) {
      hasStartedRef.current = true;
      return;
    }

    if (timelines.length === 0 || !activeTimelineId) return;

    hasStartedRef.current = true;
    startChat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, timelines, activeTimelineId]);

  // ── Collect branch nodes for minimap ──
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
        isChatNode: boolean;
      }[] = [];
      const edgeList: { source: string; target: string }[] = [];

      for (const timeline of currentTimelines) {
        const isActive = timeline.id === currentActiveId;
        let prevNodeId: string | undefined;

        for (const msg of timeline.messages) {
          if (msg.role !== "assistant") continue;

          const nodeId = `${timeline.id}-${msg.id}`;
          const hasBranch = !!msg.branchPoint;

          const summary = hasBranch
            ? (msg.branchPoint?.summary || msg.content.substring(0, 80) + "...")
            : msg.content.substring(0, 20) + (msg.content.length > 20 ? "..." : "");
          const choiceLabel = hasBranch && msg.branchPoint?.chosenIndex !== undefined
            ? msg.branchPoint.choices[msg.branchPoint.chosenIndex]?.label
            : undefined;

          branchNodes.push({
            id: nodeId,
            timeLabel: hasBranch
              ? (msg.branchPoint?.timeLabel || msg.timeLabel || "")
              : "",
            summary,
            choiceLabel,
            timelineId: timeline.id,
            msgId: msg.id,
            parentNodeId: prevNodeId,
            isOnActivePath: isActive,
            isDimBranch: !isActive,
            isChatNode: !hasBranch,
          });

          if (prevNodeId)
            edgeList.push({ source: prevNodeId, target: nodeId });
          prevNodeId = nodeId;

          // 분기점의 선택 안 한 가지
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
                    isChatNode: false,
                  });
                  edgeList.push({ source: nodeId, target: dimId });
                }
              }
            });
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
          isChatNode: bn.isChatNode,
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
        const source = branchNodes.find((n) => n.id === e.source);
        const isChatEdge = target?.isChatNode || source?.isChatNode;
        return {
          id: `e-${e.source}-${e.target}`,
          source: e.source,
          sourceHandle: "source",  // Bottom
          target: e.target,
          targetHandle: "target",  // Top
          type: "default",
          style: {
            stroke: isChatEdge
              ? (target?.isOnActivePath ? "rgba(179,136,255,0.2)" : "rgba(179,136,255,0.08)")
              : target?.isOnActivePath
                ? "rgba(212,168,83,0.6)"
                : "rgba(212,168,83,0.15)",
            strokeWidth: isChatEdge ? 1 : (target?.isOnActivePath ? 2.5 : 1.5),
            strokeDasharray: target?.isDimBranch ? "6 4" : isChatEdge ? "3 3" : undefined,
          },
          animated: !isChatEdge && (target?.isOnActivePath || false),
        };
      });

      const { nodes: layouted, edges: layoutedEdges } =
        getLayoutedElements(flowNodes, flowEdges, "TB");
      setNodes(layouted);
      setEdges(layoutedEdges);

      // 최신 노드로 자동 스크롤
      const activeNodes = branchNodes.filter(bn => bn.isOnActivePath);
      if (activeNodes.length > 0) {
        const lastNode = activeNodes[activeNodes.length - 1];
        const layoutedLast = layouted.find(n => n.id === lastNode.id);
        if (layoutedLast) {
          setTimeout(() => {
            try {
              fitView({
                nodes: [{ id: layoutedLast.id }],
                duration: 500,
                padding: 0.5,
              });
            } catch {
              // fitView may not be ready
            }
          }, 100);
        }
      }
    },
    [setNodes, setEdges, fitView]
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

  // ── Session management ──
  const handleSwitchSession = useCallback(
    (sessionId: string) => {
      if (sessionId === activeSessionId) {
        setShowSessionDrawer(false);
        return;
      }

      // Save current working copy back to sessions
      const updatedSessions = sessions.map((s) =>
        s.id === activeSessionId
          ? {
              ...s,
              timelines,
              activeTimelineId,
              msgCount: timelines.flatMap((t) => t.messages).length,
            }
          : s
      );

      const target = updatedSessions.find((s) => s.id === sessionId);
      if (!target) return;

      setSessions(updatedSessions);
      setActiveSessionId(sessionId);
      setTimelines(target.timelines);
      setActiveTimelineId(
        target.activeTimelineId || target.timelines[0]?.id || ""
      );
      hasStartedRef.current = target.timelines.some(
        (t) => t.messages.length > 0
      );
      setShowSessionDrawer(false);
    },
    [activeSessionId, sessions, timelines, activeTimelineId]
  );

  const handleNewSession = useCallback(() => {
    if (!profile) return;

    // Save current session
    const updatedSessions = sessions.map((s) =>
      s.id === activeSessionId
        ? {
            ...s,
            timelines,
            activeTimelineId,
            msgCount: timelines.flatMap((t) => t.messages).length,
          }
        : s
    );

    const tl: Timeline = {
      id: crypto.randomUUID(),
      parentTimelineId: null,
      branchPointMsgId: "",
      choiceIndex: -1,
      messages: [],
    };
    const newSession: SimulationSession = {
      id: crypto.randomUUID(),
      name: `${profile.mode} · ${new Date().toLocaleDateString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`,
      timelines: [tl],
      activeTimelineId: tl.id,
      createdAt: Date.now(),
      msgCount: 0,
    };

    setSessions([...updatedSessions, newSession]);
    setActiveSessionId(newSession.id);
    setTimelines([tl]);
    setActiveTimelineId(tl.id);
    hasStartedRef.current = false;
    setShowSessionDrawer(false);
  }, [profile, activeSessionId, sessions, timelines, activeTimelineId]);

  const handleDeleteSession = useCallback(
    (sessionId: string) => {
      if (sessions.length <= 1) return;
      if (sessionId === activeSessionId) {
        const other = sessions.find(s => s.id !== sessionId);
        if (!other) return;
        setActiveSessionId(other.id);
        setTimelines(other.timelines);
        setActiveTimelineId(other.activeTimelineId || other.timelines[0]?.id || "");
        hasStartedRef.current = other.timelines.some(t => t.messages.length > 0);
      }
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    },
    [activeSessionId, sessions]
  );

  // ── Split divider drag ──
  const handleSplitPointerDown = useCallback((e: React.PointerEvent) => {
    isDraggingSplit.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handleSplitPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDraggingSplit.current) return;
      const rect = (e.currentTarget as HTMLElement).parentElement?.getBoundingClientRect();
      if (!rect) return;
      let ratio: number;
      if (splitDir === "LR") {
        ratio = (e.clientX - rect.left) / rect.width;
      } else {
        ratio = (e.clientY - rect.top) / rect.height;
      }
      setSplitRatio(Math.min(0.8, Math.max(0.2, ratio)));
    },
    [splitDir]
  );

  const handleSplitPointerUp = useCallback(() => {
    isDraggingSplit.current = false;
  }, []);

  // ── ReactFlow zoom tracking ──
  const handleMove = useCallback((_: unknown, viewport: { zoom: number }) => {
    setZoomLevel(viewport.zoom);
  }, []);

  // ── Message count ──
  const messageCount = timelines.flatMap((t) => t.messages).length;

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

  const isLR = splitDir === "LR";

  return (
    <div
      className="w-screen h-screen relative overflow-hidden flex flex-col"
      style={{ background: "#000" }}
    >
      {/* StarField — 배경 최하단 */}
      <StarField messageCount={messageCount} zoomLevel={zoomLevel} splitDir={splitDir} splitRatio={splitRatio} />

      {/* Top bar */}
      <div
        className="flex-none relative z-20"
        style={{
          background: "rgba(0,0,0,0.85)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(212,168,83,0.08)",
          paddingTop: "max(4px, env(safe-area-inset-top))",
        }}
      >
        <div className="flex items-center justify-between px-3 py-1.5">
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
                      background: t.id === activeTimelineId ? "rgba(212,168,83,0.15)" : "transparent",
                      border: t.id === activeTimelineId ? "1px solid rgba(212,168,83,0.4)" : "1px solid rgba(255,255,255,0.06)",
                      color: t.id === activeTimelineId ? "rgba(212,168,83,0.9)" : "rgba(255,255,255,0.25)",
                    }}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}

            {/* Split toggle */}
            <button
              onClick={() => setSplitDir((d) => (d === "LR" ? "TB" : "LR"))}
              className="px-2 py-1 rounded-lg text-[11px] transition-all duration-300"
              style={{
                background: "rgba(0,0,0,0.5)",
                border: "1px solid rgba(212,168,83,0.2)",
                color: "rgba(212,168,83,0.7)",
              }}
              title={isLR ? "상하 분할" : "좌우 분할"}
            >
              {isLR ? "⬍" : "⬌"}
            </button>

            {/* Swap panels */}
            <button
              onClick={() => setSplitSwapped((s) => !s)}
              className="px-2 py-1 rounded-lg text-[11px] transition-all duration-300"
              style={{
                background: splitSwapped ? "rgba(212,168,83,0.12)" : "rgba(0,0,0,0.5)",
                border: "1px solid rgba(212,168,83,0.2)",
                color: "rgba(212,168,83,0.7)",
              }}
              title="패널 위치 교체"
            >
              ⇄
            </button>

            {/* Sessions */}
            <button
              onClick={() => setShowSessionDrawer(true)}
              className="px-2 py-1 rounded-lg text-[11px] transition-all duration-300"
              style={{
                background: "rgba(0,0,0,0.5)",
                border: "1px solid rgba(179,136,255,0.15)",
                color: "rgba(179,136,255,0.6)",
              }}
            >
              {sessions.length > 1 ? `${sessions.length}개 세션` : "세션"}
            </button>

            {/* Sound */}
            <button
              onClick={() => { const n = !soundMuted; setSoundMuted(n); setMuted(n); }}
              className="px-2 py-1 rounded-lg text-xs transition-all duration-300"
              style={{
                background: "rgba(0,0,0,0.5)",
                border: "1px solid rgba(255,255,255,0.06)",
                color: soundMuted ? "rgba(255,255,255,0.2)" : "rgba(212,168,83,0.6)",
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

      {/* Split content area */}
      <div
        className="flex-1 relative z-10 flex overflow-hidden"
        style={{ flexDirection: isLR ? "row" : "column" }}
        onPointerMove={handleSplitPointerMove}
        onPointerUp={handleSplitPointerUp}
      >
        {/* Panel A (first) */}
        <div
          style={{
            [isLR ? "width" : "height"]: `${splitRatio * 100}%`,
            minWidth: isLR ? 0 : undefined,
            minHeight: isLR ? undefined : 0,
            position: "relative",
            display: splitSwapped ? "flex" : undefined,
            flexDirection: splitSwapped ? "column" : undefined,
          }}
        >
          {splitSwapped ? (
            <ChatPanel
              messages={activeMessages}
              isGenerating={isGenerating}
              onSendMessage={handleSendMessage}
              onBranchChoice={handleBranchChoice}
            />
          ) : (
            <>
              {nodes.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <p className="text-xs text-center px-4" style={{ color: "rgba(255,255,255,0.2)" }}>
                    대화를 시작하면 별자리가 생겨나.
                  </p>
                </div>
              )}
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onMove={handleMove}
                nodeTypes={nodeTypes}
                fitView
                minZoom={0.02}
                maxZoom={1.5}
                defaultViewport={{ x: 0, y: 0, zoom: 0.4 }}
                proOptions={{ hideAttribution: true }}
                panOnDrag
                zoomOnScroll
                zoomOnPinch
                nodesDraggable={false}
                nodesConnectable={false}
                style={{ background: "transparent", width: "100%", height: "100%" }}
              />
            </>
          )}
        </div>

        {/* Divider — wide touch target */}
        <div
          onPointerDown={handleSplitPointerDown}
          style={{
            [isLR ? "width" : "height"]: "24px",
            cursor: isLR ? "col-resize" : "row-resize",
            background: "transparent",
            flexShrink: 0,
            position: "relative",
            zIndex: 5,
            touchAction: "none",
          }}
        >
          {/* Visible bar */}
          <div
            style={{
              position: "absolute",
              [isLR ? "left" : "top"]: "50%",
              [isLR ? "top" : "left"]: "0",
              [isLR ? "width" : "height"]: "4px",
              [isLR ? "height" : "width"]: "100%",
              transform: isLR ? "translateX(-50%)" : "translateY(-50%)",
              background: "rgba(212,168,83,0.12)",
            }}
          />
          {/* Handle grip */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              [isLR ? "width" : "height"]: "4px",
              [isLR ? "height" : "width"]: "36px",
              borderRadius: "2px",
              background: "rgba(212,168,83,0.45)",
            }}
          />
        </div>

        {/* Panel B (second) */}
        <div
          style={{
            [isLR ? "width" : "height"]: `${(1 - splitRatio) * 100}%`,
            minWidth: isLR ? 0 : undefined,
            minHeight: isLR ? undefined : 0,
            position: "relative",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {splitSwapped ? (
            <>
              {nodes.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <p className="text-xs text-center px-4" style={{ color: "rgba(255,255,255,0.2)" }}>
                    대화를 시작하면 별자리가 생겨나.
                  </p>
                </div>
              )}
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onMove={handleMove}
                nodeTypes={nodeTypes}
                fitView
                minZoom={0.02}
                maxZoom={1.5}
                defaultViewport={{ x: 0, y: 0, zoom: 0.4 }}
                proOptions={{ hideAttribution: true }}
                panOnDrag
                zoomOnScroll
                zoomOnPinch
                nodesDraggable={false}
                nodesConnectable={false}
                style={{ background: "transparent", width: "100%", height: "100%" }}
              />
            </>
          ) : (
            <ChatPanel
              messages={activeMessages}
              isGenerating={isGenerating}
              onSendMessage={handleSendMessage}
              onBranchChoice={handleBranchChoice}
            />
          )}
        </div>
      </div>

      {/* Fork effect */}
      <ForkEffect
        active={showForkEffect}
        onComplete={() => setShowForkEffect(false)}
      />

      {/* Error toast */}
      {error && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-red-900/80 backdrop-blur-md border border-red-500/30 rounded-xl animate-slideUp">
          <p className="text-sm text-red-300">{error}</p>
          <div className="flex gap-3 mt-2">
            {startFailed && (
              <button
                onClick={() => { hasStartedRef.current = false; startChat(); }}
                className="text-xs text-amber-400/80 hover:text-amber-300 transition-colors"
              >
                다시 시도
              </button>
            )}
            <button
              onClick={() => setError(null)}
              className="text-xs text-red-400/70 hover:text-red-300 transition-colors"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <RewindModal
        isOpen={rewindModal.open}
        onConfirm={handleRewind}
        onCancel={() =>
          setRewindModal({ open: false, timelineId: "", msgId: "", choiceIndex: -1, choiceLabel: "" })
        }
      />
      <ReportModal
        isOpen={reportModal}
        report={reportText}
        isLoading={reportLoading}
        onClose={() => setReportModal(false)}
      />
      <SessionDrawer
        isOpen={showSessionDrawer}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={handleSwitchSession}
        onNewSession={handleNewSession}
        onDeleteSession={handleDeleteSession}
        onClose={() => setShowSessionDrawer(false)}
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

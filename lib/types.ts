// ── 시뮬레이션 모드 ──
export type SimulationMode = "희망적 우주" | "현실적 우주" | "최악의 우주";

// ── UserProfile (온보딩 수집 + 대화하면서 쌓이는 기억) ──
export interface UserProfile {
  birthday: string;           // "1992.04.27"
  birthTime: string;          // "16:34" 또는 "모름"
  job: string;
  careerYears: string;
  age: number;
  monthlyIncome: string;
  debt: string;
  pastExperience: string;
  interest: string;
  question: string;
  mode: SimulationMode;

  // 대화하면서 쌓이는 기억들 — "나를 기억하는 AI"의 핵심
  learnedFacts?: string[];    // ["스마트팜 관심있음", "결혼 고려중", "5년 안에 FIRE 목표"]
}

// ── 채팅 메시지 ──
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  branchPoint?: BranchPointData;
  timestamp: number;
  timeLabel?: string;
  isIntervention?: boolean;
}

// ── 분기점 데이터 ──
export interface BranchPointData {
  timeLabel: string;
  summary: string;
  choices: Choice[];
  chosenIndex?: number;
}

// ── Choice ──
export interface Choice {
  emoji: string;
  label: string;
}

// ── 타임라인 (평행우주) ──
export interface Timeline {
  id: string;
  parentTimelineId: string | null;
  branchPointMsgId: string;
  choiceIndex: number;
  messages: ChatMessage[];
}

// ── 시뮬레이션 세션 ──
export interface SimulationSession {
  id: string;
  name: string;
  timelines: Timeline[];
  activeTimelineId: string;
  createdAt: number;
  msgCount: number;
}

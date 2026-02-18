// ── 새 UserProfile (7 필드) ──
export interface UserProfile {
  birthday: string;      // "1992.04.27"
  birthTime: string;     // "15:00" 또는 "모름"
  gender: string;        // "남" | "여" | "말하고 싶지 않음"
  job: string;
  age: number;
  interest: string;      // 관심사
  question: string;      // 미래에서 궁금한 것
}

// ── 채팅 메시지 ──
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  branchPoint?: BranchPointData;
  timestamp: number;
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

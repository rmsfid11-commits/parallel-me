// ── 시뮬레이션 모드 ──
export type SimulationMode = "희망적 우주" | "현실적 우주" | "최악의 우주";

// ── UserProfile (온보딩 수집) ──
export interface UserProfile {
  birthday: string;           // "1992.04.27"
  birthTime: string;          // "16:34" 또는 "모름"
  job: string;                // 직업
  careerYears: string;        // 경력/연차 "15년", "3년차"
  monthlyIncome: string;      // 월수입 "600만원"
  debt: string;               // 빚 "1800만원" 또는 "없음"
  pastExperience: string;     // 과거 사업/부업 경험
  question: string;           // 미래에서 궁금한 것
  mode: SimulationMode;
}

// ── 스토리 시나리오 (자동 진행 모드) ──
export interface StoryScenario {
  id: string;
  timeLabel: string;
  content: string;
  autoChoice?: string;      // AI's auto-choice (internal)
  isBranch: boolean;
  branchMessage?: string;
  interventionText?: string; // user's intervention text
  parentId: string | null;
  timelineId: string;
}

// ── 채팅 메시지 ──
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  branchPoint?: BranchPointData;
  timestamp: number;
  timeLabel?: string;         // 스토리 모드 시간 태그
  isIntervention?: boolean;   // 사용자 개입 텍스트
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

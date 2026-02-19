// ══════════════════════════════════════════
// 파라렐미 — 동서양 운명 분석 계산 모듈
// 사주팔자, 수비학, 마야달력, 별자리, 바이오리듬
// ══════════════════════════════════════════

// ── 천간 (10 Heavenly Stems) ──
const STEMS = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"] as const;
const STEM_HANJA = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"] as const;

// ── 지지 (12 Earthly Branches) ──
const BRANCHES = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"] as const;
const BRANCH_HANJA = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const;

// ── 오행 (Five Elements) ──
const STEM_ELEMENTS = ["목", "목", "화", "화", "토", "토", "금", "금", "수", "수"] as const;
const BRANCH_ELEMENTS = ["수", "토", "목", "목", "토", "화", "화", "토", "금", "금", "토", "수"] as const;

// ── 띠 (Chinese Zodiac Animals) ──
const ZODIAC_ANIMALS = ["쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양", "원숭이", "닭", "개", "돼지"] as const;

// ── 십성 (Ten Gods) 관계표 ──
// 일간 기준 다른 간과의 관계
const TEN_GODS_TABLE: Record<string, string> = {
  "same_yang": "비견",     // 같은 오행, 같은 음양
  "same_yin": "겁재",      // 같은 오행, 다른 음양
  "produce_yang": "식신",   // 내가 생하는 오행, 같은 음양
  "produce_yin": "상관",    // 내가 생하는 오행, 다른 음양
  "wealth_yang": "편재",    // 내가 극하는 오행, 같은 음양
  "wealth_yin": "정재",     // 내가 극하는 오행, 다른 음양
  "power_yang": "편관",     // 나를 극하는 오행, 같은 음양
  "power_yin": "정관",      // 나를 극하는 오행, 다른 음양
  "resource_yang": "편인",  // 나를 생하는 오행, 같은 음양
  "resource_yin": "정인",   // 나를 생하는 오행, 다른 음양
};

// 오행 상생: 목→화→토→금→수→목
const ELEMENT_CYCLE = ["목", "화", "토", "금", "수"];

function getElementIndex(element: string): number {
  return ELEMENT_CYCLE.indexOf(element);
}

// 내가 생하는 오행 (produces)
function producedElement(element: string): string {
  const idx = getElementIndex(element);
  return ELEMENT_CYCLE[(idx + 1) % 5];
}

// 나를 극하는 오행 (controlled by)
function controllerElement(element: string): string {
  const idx = getElementIndex(element);
  return ELEMENT_CYCLE[(idx + 2) % 5];
}

// 내가 극하는 오행 (controls)
function controlledElement(element: string): string {
  const idx = getElementIndex(element);
  return ELEMENT_CYCLE[(idx + 3) % 5]; // same as (idx - 2 + 5) % 5
}

// 나를 생하는 오행 (produced by)
function producerElement(element: string): string {
  const idx = getElementIndex(element);
  return ELEMENT_CYCLE[(idx + 4) % 5]; // same as (idx - 1 + 5) % 5
}

function isYang(stemIndex: number): boolean {
  return stemIndex % 2 === 0;
}

function getTenGod(dayStemIdx: number, otherStemIdx: number): string {
  const dayElement = STEM_ELEMENTS[dayStemIdx];
  const otherElement = STEM_ELEMENTS[otherStemIdx];
  const sameYinYang = isYang(dayStemIdx) === isYang(otherStemIdx);

  if (dayElement === otherElement) {
    return sameYinYang ? "비견" : "겁재";
  }
  if (producedElement(dayElement) === otherElement) {
    return sameYinYang ? "식신" : "상관";
  }
  if (controlledElement(dayElement) === otherElement) {
    return sameYinYang ? "편재" : "정재";
  }
  if (controllerElement(dayElement) === otherElement) {
    return sameYinYang ? "편관" : "정관";
  }
  if (producerElement(dayElement) === otherElement) {
    return sameYinYang ? "편인" : "정인";
  }
  return "비견";
}

// ── Julian Day Number 계산 ──
function toJDN(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

// ── 날짜 파싱 ──
function parseDate(dateStr: string): { year: number; month: number; day: number } | null {
  // "1992.04.27" or "1992-04-27" or "19920427"
  const clean = dateStr.replace(/[.\-\/]/g, "");
  if (clean.length === 8) {
    return {
      year: parseInt(clean.substring(0, 4)),
      month: parseInt(clean.substring(4, 6)),
      day: parseInt(clean.substring(6, 8)),
    };
  }
  return null;
}

function parseTime(timeStr: string): number | null {
  // "15:00" → 15, "모름" → null
  if (!timeStr || timeStr === "모름" || timeStr === "모름") return null;
  const match = timeStr.match(/(\d{1,2})/);
  return match ? parseInt(match[1]) : null;
}

// ══════════════════════════════════════════
// 1. 사주팔자 (Four Pillars of Destiny)
// ══════════════════════════════════════════

export interface SajuResult {
  yearPillar: string;    // e.g., "임신(壬申)"
  monthPillar: string;
  dayPillar: string;
  hourPillar: string;
  dayMaster: string;     // 일주 천간 (핵심 자아)
  dayMasterElement: string;
  elements: Record<string, number>; // 오행 분포: {목:2, 화:1, ...}
  tenGods: string[];     // 사주 내 십성
  animal: string;        // 띠
  summary: string;       // 핵심 성향 요약
}

// 오호진원 (月柱 천간 결정)
function getMonthStemStart(yearStemIdx: number): number {
  // 갑/기년 → 병(2), 을/경 → 무(4), 병/신 → 경(6), 정/임 → 임(8), 무/계 → 갑(0)
  const base = yearStemIdx % 5;
  return (base * 2 + 2) % 10;
}

// 일진 시간 → 시주 천간 결정
function getHourStemStart(dayStemIdx: number): number {
  // 갑/기일 → 갑(0), 을/경 → 병(2), 병/신 → 무(4), 정/임 → 경(6), 무/계 → 임(8)
  const base = dayStemIdx % 5;
  return (base * 2) % 10;
}

// 시간 → 지지 인덱스 (12시진)
function hourToBranch(hour: number): number {
  // 자시: 23-01, 축시: 01-03, 인시: 03-05, ...
  if (hour === 23 || hour === 0) return 0; // 자
  return Math.floor((hour + 1) / 2);
}

// 절기 기반 월 (간략 근사: 양력 기준)
function solarMonth(month: number, day: number): number {
  // 입춘(2/4경) 기준으로 月 시작
  const solarTerms = [
    { m: 2, d: 4 },   // 인월 시작
    { m: 3, d: 6 },   // 묘월
    { m: 4, d: 5 },   // 진월
    { m: 5, d: 6 },   // 사월
    { m: 6, d: 6 },   // 오월
    { m: 7, d: 7 },   // 미월
    { m: 8, d: 7 },   // 신월
    { m: 9, d: 8 },   // 유월
    { m: 10, d: 8 },  // 술월
    { m: 11, d: 7 },  // 해월
    { m: 12, d: 7 },  // 자월
    { m: 1, d: 6 },   // 축월
  ];

  for (let i = solarTerms.length - 1; i >= 0; i--) {
    const st = solarTerms[i];
    if (month > st.m || (month === st.m && day >= st.d)) {
      return i; // 0=인월, 1=묘월, ..., 11=축월
    }
  }
  return 11; // 축월 (1월 초)
}

// 사주 성향 요약 생성
function generateSajuSummary(
  dayElement: string,
  elements: Record<string, number>,
  tenGods: string[]
): string {
  const dayDesc: Record<string, string> = {
    "목": "성장과 창의력의 기운. 새로운 것을 시작하는 힘이 강하고, 계획과 전략에 능함. 유연하지만 뿌리는 단단함.",
    "화": "열정과 표현의 기운. 사람을 끌어당기는 카리스마가 있고, 아이디어를 실행에 옮기는 추진력. 한번 불 붙으면 멈추기 어려움.",
    "토": "안정과 신뢰의 기운. 중심을 잡고 사람들을 모으는 능력. 실용적이고 현실적. 변화보다 기반을 다지는 걸 선호.",
    "금": "결단과 실행의 기운. 칼같은 판단력과 정리정돈 능력. 데이터와 실물 중심의 사고. 냉철하지만 의리 있음.",
    "수": "지혜와 적응의 기운. 흐르는 물처럼 상황을 읽고 유연하게 대처. 깊은 사고력과 직관. 혼자 있는 시간에서 에너지를 얻음.",
  };

  // 가장 강한/약한 오행
  const sorted = Object.entries(elements).sort((a, b) => b[1] - a[1]);
  const strongest = sorted[0];
  const weakest = sorted[sorted.length - 1];

  let summary = dayDesc[dayElement] || "";

  if (strongest[1] >= 4) {
    summary += ` ${strongest[0]}(${strongest[0] === "목" ? "木" : strongest[0] === "화" ? "火" : strongest[0] === "토" ? "土" : strongest[0] === "금" ? "金" : "水"}) 기운이 강해서 `;
    if (strongest[0] === "금") summary += "실물 자산과 데이터 기반 판단에 강점.";
    else if (strongest[0] === "화") summary += "사람과 열정 중심의 활동에서 빛남.";
    else if (strongest[0] === "목") summary += "새로운 시작과 성장 분야에서 두각.";
    else if (strongest[0] === "수") summary += "분석과 전략 분야에서 능력 발휘.";
    else summary += "꾸준함과 안정감으로 기반을 다지는 스타일.";
  }

  if (weakest[1] === 0) {
    summary += ` ${weakest[0]} 기운이 부족해서 그 영역에서 의식적 노력 필요.`;
  }

  // 십성 기반 보완
  const hasEdguan = tenGods.includes("편관");
  const hasJeonggwan = tenGods.includes("정관");
  const hasPyeonjae = tenGods.includes("편재");

  if (hasPyeonjae) summary += " 편재가 있어 투자와 사업 감각이 있음.";
  if (hasEdguan) summary += " 편관이 있어 도전적이고 독립적 성향.";
  if (hasJeonggwan) summary += " 정관이 있어 체계적이고 조직적.";

  return summary;
}

export function calculateSaju(birthday: string, birthTime?: string): SajuResult {
  const date = parseDate(birthday);
  if (!date) {
    return {
      yearPillar: "정보 부족", monthPillar: "", dayPillar: "", hourPillar: "시간 모름",
      dayMaster: "", dayMasterElement: "", elements: {}, tenGods: [],
      animal: "", summary: "생년월일 정보가 부족합니다.",
    };
  }

  const { year, month, day } = date;
  const hour = birthTime ? parseTime(birthTime) : null;

  // Year Pillar
  const yearStemIdx = (year - 4) % 10;
  const yearBranchIdx = (year - 4) % 12;

  // Month Pillar
  const monthIdx = solarMonth(month, day);
  const monthBranchIdx = (monthIdx + 2) % 12; // 인(2)부터 시작
  const monthStemStart = getMonthStemStart(yearStemIdx);
  const monthStemIdx = (monthStemStart + monthIdx) % 10;

  // Day Pillar (Julian Day)
  const jdn = toJDN(year, month, day);
  // Calibrated: 2000-01-01 = 갑진(甲辰) → stem=0, branch=4
  // JDN(2000-01-01) = 2451545
  // stem: (2451545 + 5) % 10 = 0 ✓, branch: (2451545 - 1) % 12 = 4 ✓
  const dayStemIdx = (jdn + 5) % 10;
  const dayBranchIdx = (jdn - 1) % 12;

  // Hour Pillar
  let hourStemIdx = -1;
  let hourBranchIdx = -1;
  if (hour !== null) {
    hourBranchIdx = hourToBranch(hour);
    const hourStemStart = getHourStemStart(dayStemIdx);
    hourStemIdx = (hourStemStart + hourBranchIdx) % 10;
  }

  // Format pillars
  const formatPillar = (sIdx: number, bIdx: number) =>
    `${STEMS[sIdx]}${BRANCHES[bIdx]}(${STEM_HANJA[sIdx]}${BRANCH_HANJA[bIdx]})`;

  const yearPillar = formatPillar(yearStemIdx, yearBranchIdx);
  const monthPillar = formatPillar(monthStemIdx, monthBranchIdx);
  const dayPillar = formatPillar(dayStemIdx, dayBranchIdx);
  const hourPillar = hour !== null
    ? formatPillar(hourStemIdx, hourBranchIdx)
    : "시간 모름";

  // Five Elements distribution
  const elements: Record<string, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };

  const allStems = [yearStemIdx, monthStemIdx, dayStemIdx];
  const allBranches = [yearBranchIdx, monthBranchIdx, dayBranchIdx];
  if (hour !== null) {
    allStems.push(hourStemIdx);
    allBranches.push(hourBranchIdx);
  }

  for (const s of allStems) elements[STEM_ELEMENTS[s]]++;
  for (const b of allBranches) elements[BRANCH_ELEMENTS[b]]++;

  // Ten Gods (십성)
  const tenGods: string[] = [];
  for (const s of [yearStemIdx, monthStemIdx]) {
    tenGods.push(getTenGod(dayStemIdx, s));
  }
  if (hour !== null) {
    tenGods.push(getTenGod(dayStemIdx, hourStemIdx));
  }

  // Day Master
  const dayMaster = `${STEMS[dayStemIdx]}(${STEM_HANJA[dayStemIdx]})`;
  const dayMasterElement = STEM_ELEMENTS[dayStemIdx];

  // Animal (띠)
  const animal = ZODIAC_ANIMALS[yearBranchIdx];

  // Summary
  const summary = generateSajuSummary(dayMasterElement, elements, tenGods);

  return {
    yearPillar,
    monthPillar,
    dayPillar,
    hourPillar,
    dayMaster,
    dayMasterElement,
    elements,
    tenGods,
    animal,
    summary,
  };
}

// ══════════════════════════════════════════
// 2. 수비학 (Numerology)
// ══════════════════════════════════════════

export interface NumerologyResult {
  lifePath: number;       // 생명수
  destiny: number;        // 운명수
  soul: number;           // 영혼수
  personalYear: number;   // 올해의 개인년
  description: string;
}

function reduceToSingle(n: number): number {
  // Master numbers: 11, 22, 33
  while (n > 9 && n !== 11 && n !== 22 && n !== 33) {
    n = String(n).split("").reduce((sum, d) => sum + parseInt(d), 0);
  }
  return n;
}

export function calculateNumerology(birthday: string): NumerologyResult {
  const date = parseDate(birthday);
  if (!date) {
    return { lifePath: 0, destiny: 0, soul: 0, personalYear: 0, description: "정보 부족" };
  }

  const { year, month, day } = date;

  // Life Path Number (생명수): sum all digits of full birthday
  const digits = `${year}${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}`;
  const lifePath = reduceToSingle(
    digits.split("").reduce((sum, d) => sum + parseInt(d), 0)
  );

  // Destiny Number (운명수): sum of birth month + day
  const destiny = reduceToSingle(month + day);

  // Soul Number (영혼수): sum of birth year digits
  const soul = reduceToSingle(
    String(year).split("").reduce((sum, d) => sum + parseInt(d), 0)
  );

  // Personal Year (올해의 개인년)
  const currentYear = new Date().getFullYear();
  const personalYear = reduceToSingle(
    `${currentYear}${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}`
      .split("")
      .reduce((sum, d) => sum + parseInt(d), 0)
  );

  const descriptions: Record<number, string> = {
    1: "독립과 리더십의 수. 새로운 시작, 개척자 기질.",
    2: "조화와 협력의 수. 관계에서 빛나는 중재자.",
    3: "표현과 창의의 수. 소통과 예술적 감각.",
    4: "안정과 체계의 수. 기초를 다지는 건축가.",
    5: "변화와 자유의 수. 모험과 경험 추구.",
    6: "책임과 돌봄의 수. 가정과 공동체 중심.",
    7: "탐구와 내면의 수. 깊은 사색과 직관.",
    8: "권력과 물질의 수. 사업과 성취 지향.",
    9: "완성과 이타의 수. 넓은 시야와 봉사.",
    11: "영감의 마스터 수. 직관이 매우 강하고 영적 성장.",
    22: "건설의 마스터 수. 큰 비전을 현실로 만드는 능력.",
    33: "치유의 마스터 수. 타인을 위한 헌신과 사랑.",
  };

  const yearDescriptions: Record<number, string> = {
    1: "새로운 시작과 기회의 해. 큰 결정을 내리기 좋음.",
    2: "인내와 협력의 해. 관계에 집중.",
    3: "표현과 확장의 해. 창의적 활동이 결실.",
    4: "기반을 다지는 해. 안정을 위한 노력.",
    5: "변화와 전환의 해. 예상 못한 기회.",
    6: "가정과 책임의 해. 관계가 중심.",
    7: "내면 탐색의 해. 공부와 자기 성찰.",
    8: "물질적 성과의 해. 재정 관련 결실.",
    9: "완결과 정리의 해. 한 사이클의 마무리.",
  };

  const lifeDesc = descriptions[lifePath] || descriptions[lifePath % 10] || "";
  const yearDesc = yearDescriptions[personalYear % 10] || "";

  return {
    lifePath,
    destiny,
    soul,
    personalYear,
    description: `생명수 ${lifePath}: ${lifeDesc} 올해는 개인년 ${personalYear}: ${yearDesc}`,
  };
}

// ══════════════════════════════════════════
// 3. 마야달력 (Mayan Tzolkin Calendar)
// ══════════════════════════════════════════

export interface MayanResult {
  kinNumber: number;      // 1-260
  solarSeal: string;      // 태양 문장 (20개)
  galacticTone: number;   // 은하 톤 (1-13)
  description: string;
}

const SOLAR_SEALS = [
  "붉은 용 (Imix)", "흰 바람 (Ik)", "파란 밤 (Akbal)", "노란 씨앗 (Kan)",
  "붉은 뱀 (Chicchan)", "흰 세상연결자 (Cimi)", "파란 손 (Manik)", "노란 별 (Lamat)",
  "붉은 달 (Muluc)", "흰 개 (Oc)", "파란 원숭이 (Chuen)", "노란 사람 (Eb)",
  "붉은 하늘걷는자 (Ben)", "흰 마법사 (Ix)", "파란 독수리 (Men)", "노란 전사 (Cib)",
  "붉은 땅 (Caban)", "흰 거울 (Etznab)", "파란 폭풍 (Cauac)", "노란 태양 (Ahau)",
] as const;

const SEAL_MEANINGS: Record<number, string> = {
  0: "시작과 양육의 에너지. 창조의 근원.",
  1: "소통과 영감. 바람처럼 자유로운 정신.",
  2: "꿈과 직관의 방. 내면의 풍요.",
  3: "가능성의 씨앗. 성장과 개화의 잠재력.",
  4: "생명력과 본능. 강한 생존 에너지.",
  5: "변환과 연결. 세상과의 다리.",
  6: "치유와 성취. 손으로 만드는 세계.",
  7: "아름다움과 조화. 예술적 감각.",
  8: "감정의 흐름. 정화와 새로운 시작.",
  9: "충성과 사랑. 따뜻한 마음의 안내자.",
  10: "놀이와 환상. 창의적 유머.",
  11: "경험과 길. 자유로운 의지.",
  12: "탐험과 모험. 하늘과 땅의 연결.",
  13: "시간을 넘는 지혜. 마법적 직관.",
  14: "비전과 통찰. 높은 곳에서 보는 시야.",
  15: "용기와 지성. 내면의 전사.",
  16: "진화와 동시성. 지구의 지혜.",
  17: "진실과 반영. 끝없는 질서.",
  18: "변화와 재생. 자기 발전의 촉매.",
  19: "깨달음과 완성. 보편적 불의 에너지.",
};

export function calculateMayan(birthday: string): MayanResult {
  const date = parseDate(birthday);
  if (!date) {
    return { kinNumber: 0, solarSeal: "", galacticTone: 0, description: "정보 부족" };
  }

  const { year, month, day } = date;
  const jdn = toJDN(year, month, day);

  // GMT Correlation: JDN 584283 = Mayan 0.0.0.0.0 = 4 Ahau 8 Kumku
  // Kin = (JDN - 584283) mod 260
  const daysSinceEpoch = jdn - 584283;
  const kinNumber = ((daysSinceEpoch % 260) + 260) % 260; // ensure positive

  const sealIndex = kinNumber % 20;
  const galacticTone = (kinNumber % 13) + 1;

  const solarSeal = SOLAR_SEALS[sealIndex];
  const meaning = SEAL_MEANINGS[sealIndex] || "";

  return {
    kinNumber: kinNumber + 1, // Display as 1-260
    solarSeal,
    galacticTone,
    description: `킨 ${kinNumber + 1}, 은하톤 ${galacticTone}, ${solarSeal}. ${meaning}`,
  };
}

// ══════════════════════════════════════════
// 4. 별자리 (Western Zodiac)
// ══════════════════════════════════════════

export interface ZodiacResult {
  sign: string;
  element: string;
  description: string;
}

interface ZodiacSign {
  name: string;
  startMonth: number;
  startDay: number;
  element: string;
  desc: string;
}

const ZODIAC_SIGNS: ZodiacSign[] = [
  { name: "물병자리", startMonth: 1, startDay: 20, element: "공기", desc: "혁신적이고 독립적. 관습을 깨는 진보적 사고." },
  { name: "물고기자리", startMonth: 2, startDay: 19, element: "물", desc: "직관적이고 공감 능력이 뛰어남. 예술적 감성." },
  { name: "양자리", startMonth: 3, startDay: 21, element: "불", desc: "선구자적이고 용감함. 도전을 즐기는 개척자." },
  { name: "황소자리", startMonth: 4, startDay: 20, element: "흙", desc: "안정적이고 인내심 강함. 실용적 가치 중시." },
  { name: "쌍둥이자리", startMonth: 5, startDay: 21, element: "공기", desc: "다재다능하고 소통력 뛰어남. 호기심과 적응력." },
  { name: "게자리", startMonth: 6, startDay: 21, element: "물", desc: "가정적이고 돌보는 성향. 감정의 깊이." },
  { name: "사자자리", startMonth: 7, startDay: 23, element: "불", desc: "리더십과 카리스마. 표현력과 자신감." },
  { name: "처녀자리", startMonth: 8, startDay: 23, element: "흙", desc: "분석적이고 완벽주의. 세밀한 관찰력." },
  { name: "천칭자리", startMonth: 9, startDay: 23, element: "공기", desc: "균형과 조화 추구. 관계와 미적 감각." },
  { name: "전갈자리", startMonth: 10, startDay: 23, element: "물", desc: "통찰력과 열정. 깊은 변환의 에너지." },
  { name: "사수자리", startMonth: 11, startDay: 22, element: "불", desc: "자유와 탐험. 넓은 시야와 철학적 사고." },
  { name: "염소자리", startMonth: 12, startDay: 22, element: "흙", desc: "야망과 인내. 장기적 목표 달성에 강함." },
];

export function calculateZodiac(birthday: string): ZodiacResult {
  const date = parseDate(birthday);
  if (!date) {
    return { sign: "", element: "", description: "정보 부족" };
  }

  const { month, day } = date;

  // Find zodiac sign
  let sign = ZODIAC_SIGNS[ZODIAC_SIGNS.length - 1]; // Default: 염소
  for (let i = 0; i < ZODIAC_SIGNS.length; i++) {
    const z = ZODIAC_SIGNS[i];
    if (month === z.startMonth && day >= z.startDay) {
      sign = z;
    } else if (month === z.startMonth - 1 && day < ZODIAC_SIGNS[(i + 1) % 12]?.startDay) {
      // This handles the case before the next sign starts
    }
  }

  // More accurate approach
  for (let i = ZODIAC_SIGNS.length - 1; i >= 0; i--) {
    const z = ZODIAC_SIGNS[i];
    if (month > z.startMonth || (month === z.startMonth && day >= z.startDay)) {
      sign = z;
      break;
    }
  }

  // Handle January before Aquarius (still Capricorn)
  if (month === 1 && day < 20) {
    sign = ZODIAC_SIGNS[11]; // 염소자리
  }

  return {
    sign: sign.name,
    element: sign.element,
    description: `${sign.name} (${sign.element} 원소). ${sign.desc}`,
  };
}

// ══════════════════════════════════════════
// 5. 바이오리듬 (Biorhythm)
// ══════════════════════════════════════════

export interface BiorhythmResult {
  physical: number;       // -100 ~ +100
  emotional: number;
  intellectual: number;
  description: string;
}

export function calculateBiorhythm(birthday: string): BiorhythmResult {
  const date = parseDate(birthday);
  if (!date) {
    return { physical: 0, emotional: 0, intellectual: 0, description: "정보 부족" };
  }

  const { year, month, day } = date;
  const birthDate = new Date(year, month - 1, day);
  const today = new Date();
  const diffMs = today.getTime() - birthDate.getTime();
  const daysSinceBirth = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const physical = Math.round(Math.sin((2 * Math.PI * daysSinceBirth) / 23) * 100);
  const emotional = Math.round(Math.sin((2 * Math.PI * daysSinceBirth) / 28) * 100);
  const intellectual = Math.round(Math.sin((2 * Math.PI * daysSinceBirth) / 33) * 100);

  const levelDesc = (val: number, name: string): string => {
    if (val > 60) return `${name} 상승기`;
    if (val > 20) return `${name} 양호`;
    if (val > -20) return `${name} 전환기`;
    if (val > -60) return `${name} 저조`;
    return `${name} 회복기`;
  };

  const description = [
    levelDesc(physical, "신체"),
    levelDesc(emotional, "감성"),
    levelDesc(intellectual, "지성"),
  ].join(", ");

  return { physical, emotional, intellectual, description };
}

// ══════════════════════════════════════════
// 통합: 전체 분석 결과
// ══════════════════════════════════════════

export interface AstrologyData {
  saju: SajuResult;
  numerology: NumerologyResult;
  mayan: MayanResult;
  zodiac: ZodiacResult;
  biorhythm: BiorhythmResult;
}

export function computeAllAstrology(birthday: string, birthTime?: string): AstrologyData {
  return {
    saju: calculateSaju(birthday, birthTime),
    numerology: calculateNumerology(birthday),
    mayan: calculateMayan(birthday),
    zodiac: calculateZodiac(birthday),
    biorhythm: calculateBiorhythm(birthday),
  };
}

// 프롬프트용 텍스트 포맷
export function formatAstrologyForPrompt(data: AstrologyData): string {
  const { saju, numerology, mayan, zodiac, biorhythm } = data;

  const elementStr = Object.entries(saju.elements)
    .map(([k, v]) => `${k}:${v}`)
    .join(", ");

  return `[사주팔자 분석]
- 연주: ${saju.yearPillar}
- 월주: ${saju.monthPillar}
- 일주: ${saju.dayPillar} (일간 = ${saju.dayMaster}, 핵심 자아)
- 시주: ${saju.hourPillar}
- 오행 분포: ${elementStr}
- 십성: ${saju.tenGods.join(", ")}
- 띠: ${saju.animal}띠
- 핵심 성향: ${saju.summary}

[수비학 분석]
- ${numerology.description}

[마야달력 분석]
- ${mayan.description}

[별자리]
- ${zodiac.description}

[바이오리듬 (현재)]
- 신체: ${biorhythm.physical}%, 감성: ${biorhythm.emotional}%, 지성: ${biorhythm.intellectual}%
- ${biorhythm.description}`;
}

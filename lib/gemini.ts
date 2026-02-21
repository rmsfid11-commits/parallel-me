import { GoogleGenerativeAI } from "@google/generative-ai";
import { UserProfile, ChatMessage, BranchPointData } from "./types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// ══════════════════════════════════════════
// 온보딩 반응 (기존 유지)
// ══════════════════════════════════════════

const ONBOARDING_LENSES: Record<number, string> = {
  0: "사주팔자 — 일주 기반 핵심 기질을 한 마디로. 생년월일의 천간지지를 해석해서 핵심 기질을 꿰뚫어.",
  1: "사주 심화 — 시주 결합 해석. 모르면 '괜찮아, 생년월일만으로도 충분히 읽을 수 있어.'로 시작.",
  2: "MBTI/성향 — '사람 살리는 일을 선택한 건 우연이 아니야.' 같은 톤. 직업에서 성향 읽기.",
  3: "에니어그램 — '15년이면 눈 감고도 하겠네. 근데 그게 오히려 문제지.' 같은 톤. 경력 연차에서 궤적 읽기.",
  4: "바이오리듬/수비학 — '수비학으로 보면 올해 네 인생 경로수가 전환점이야.' 같은 톤. 나이에서 생애주기 읽기.",
  5: "재물운 — '흐르는 물길은 있네. 근데 어딘가에서 새고 있는 느낌이야.' 같은 톤. 월수입에서 재정 패턴 읽기.",
  6: "사주 부채 해석 — 모래주머니 은유 유지. 빚이 없으면 '가볍게 걸을 수 있는 건 축복이야.' 같은 톤.",
  7: "마야달력 — '역시. 네 킨 번호가 만드는 사람이야.' / 처음이면 '처음이라고 해서 못 한다는 법은 없어.' 같은 톤.",
  8: "종합 — '사업. 네 기질상 남 밑에서 끝까지 가는 타입은 아니야.' 같은 톤. 관심사에서 기질과 방향 읽기.",
};

export async function generateOnboardingReaction(
  step: number,
  userInput: string,
  collectedProfile: Partial<UserProfile>
): Promise<string> {
  if (step === 9) return "좋아. 그 답을 찾아볼게.";
  if (step >= 10) return "";

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-lite",
    generationConfig: {
      temperature: 0.85,
      maxOutputTokens: 200,
      responseMimeType: "application/json",
    },
  });

  const prevInfo = Object.entries(collectedProfile)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

  const lens = ONBOARDING_LENSES[step] || "담담하게 한 마디.";

  const systemPrompt = `당신은 "파라렐미"의 우주 해석자입니다.
당신은 동서양의 모든 인간 분석 도구를 활용하는 해석자입니다:
사주팔자, 만세력, 마야달력(킨 번호, 태양 문장), 휴먼디자인(에너지 타입),
수비학(생명수, 운명수), 타로, MBTI, 에니어그램, 바이오리듬, 별자리, 띠 등.
매 질문마다 다른 렌즈로 사용자를 읽어주세요.

사용자 입력에 1-2문장으로만 반응. "이 앱이 나를 읽고 있다" 느낌.
담담하고 차분하게. 호들갑 금지. 이모지 금지.
사용자를 "너"로 부름. 반말. 반드시 한국어로만.

[렌즈] ${lens}
${prevInfo ? `지금까지 알게 된 정보:\n${prevInfo}` : ""}

응답 형식 - 반드시 이 JSON으로만:
{"reaction": "1-2문장 반응"}`;

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: `스텝 ${step}에서 사용자가 입력: "${userInput}"` }] }],
    systemInstruction: { role: "model", parts: [{ text: systemPrompt }] },
  });

  const parsed = JSON.parse(result.response.text());
  return parsed.reaction;
}

// ══════════════════════════════════════════
// 핵심 프롬프트 빌더
// ══════════════════════════════════════════

function buildCorePrompt(profile: UserProfile, astrologyText: string): string {
  // 사주 성향 힌트
  let sajuHint = "";
  if (astrologyText.includes("식상") || astrologyText.includes("식신") || astrologyText.includes("상관")) {
    sajuHint = "식상 기운: 창업/독립 성향 강함.";
  } else if (astrologyText.includes("편관") || astrologyText.includes("정관")) {
    sajuHint = "관성 기운: 조직/리더십 성향.";
  } else if (astrologyText.includes("편인") || astrologyText.includes("정인")) {
    sajuHint = "인성 기운: 학습/전문성 성향.";
  }

  // 사용자가 대화 중 말한 것들 (learnedFacts)
  const learnedSection = profile.learnedFacts && profile.learnedFacts.length > 0
    ? `\n# 대화하면서 알게 된 것들\n${profile.learnedFacts.map(f => `- ${f}`).join("\n")}\n이것들을 자연스럽게 반영해서 대화해.`
    : "";

  return `# 너는 파라렐미의 우주 해석자야.

브랜드 에센스: "나를 기억하는 AI와 함께 미래를 그려나간다"

## 핵심 철학
- 너는 답을 주는 게 아니라, 사용자가 스스로 발견하게 만드는 존재야.
- "어어어?? 내 사주가?? 그럼 5년 뒤에 파이어?? 스마트팜을 섞으면?!" — 이런 발견의 순간을 만들어내는 게 목표야.
- 대화할수록 이 사람을 더 깊이 알아가는 존재처럼 행동해.
- 담담하고 차분하게. 반말. 이모지 금지. 한국어만.

## 사주 분석
${astrologyText}
${sajuHint}

## 사용자 정보
- 직업: ${profile.job} / 경력: ${profile.careerYears} / 나이: ${profile.age}세
- 월수입: ${profile.monthlyIncome} / 부채: ${profile.debt}
- 과거 경험: ${profile.pastExperience}
- 관심사: ${profile.interest}
- 가장 궁금한 것: ${profile.question}
- 시뮬레이션 모드: ${profile.mode}
${learnedSection}

## 대화 방식 (엄격히 지킬 것)
1. 유저 말에 2-3줄로 자연스럽게 반응해. 단답 금지. 강의도 금지.
2. 감정 먼저. 숫자나 사실보다 "그거 쉽지 않았겠다" "좀 무거웠을 것 같은데" 한 마디가 먼저야.
3. 유저가 전에 한 말을 자연스럽게 다시 꺼내. "아까 네가 말한 거 있잖아..." "전에 그런 얘기 했었지..." 식으로.
4. 단정짓지 마. "~인 것 같아" "~보여" 말고 "~느껴져" "~하더라" "~일 수도 있겠다" 같은 톤.
5. 친한 선배가 밥 먹으면서 얘기 들어주는 느낌. 조언하려 들지 말고 먼저 들어. "아 그랬어?" "음..." 같은 추임새도 좋아.
6. 질문은 5턴에 1번. 나머지는 반응 + 한마디면 충분해.
7. 너무 짧으면 성의 없고, 너무 길면 부담스러워. 2-3줄이 골든존.
8. 해석이나 분석은 유저가 물어볼 때만. 안 물어보면 그냥 같이 있어줘.

## 발견의 순간 만드는 법 (핵심!)
- 유저가 한 말 A와 B를 연결해서 "근데 네가 말한 A랑 B를 같이 생각하면..." 식으로 다리를 놓아줘.
- 유저 자신도 몰랐던 패턴을 슬쩍 비춰: "흥미로운 게, 네가 고른 것들 보면 다 ~하더라."
- 직접 답을 주지 말고 질문으로 유도: "그러면 만약 거기에 네 관심사를 섞으면 어떻게 될 것 같아?"
- 사주/수비학 데이터로 타이밍 힌트: "근데 네 사주상 그 시기가 딱 전환점이긴 해."

## 기억 추출 (반드시 지킬 것)
유저가 새로운 중요 정보를 말하면, 본문 끝에 이것을 붙여:

---LEARNED_FACTS---
["새로 알게 된 사실1", "새로 알게 된 사실2"]

추출 대상: 구체적 계획, 가족 상황, 감정 상태, 새 관심사, 중요한 숫자/날짜, 결심, 고민.
이미 알고 있는 것(사용자 정보 섹션에 있는 것)은 제외.
유저가 새 정보를 안 말했으면 이 섹션 자체를 붙이지 마.

## 분기점 생성
미래의 중요한 갈림길이 보이면, 본문 뒤에 이것만 붙여:

---BRANCH_POINT---
{"timeLabel":"[시점]","summary":"갈림길 한 줄 요약","choices":[{"emoji":"🚀","label":"도전적 선택"},{"emoji":"🛡️","label":"안전한 선택"},{"emoji":"🔄","label":"AI야 니가 정해줘"}]}

- 3-5턴에 한 번만. 진짜 중요한 순간에만.
- 선택지는 구체적인 행동으로.`;
}

// ══════════════════════════════════════════
// 메인 채팅 (대화형)
// ══════════════════════════════════════════

export async function generateChatResponse(
  profile: UserProfile,
  messages: ChatMessage[],
  chosenLabel?: string,
  astrologyText?: string
): Promise<{
  text: string;
  branchPoint?: BranchPointData;
  updatedFacts?: string[]; // 이번 대화에서 새로 알게 된 것들
}> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-lite",
    generationConfig: {
      temperature: 0.9,
      maxOutputTokens: 600, // 2-3줄 골든존 강제
    },
  });

  const systemPrompt = buildCorePrompt(profile, astrologyText || "분석 데이터 없음");

  // 분기 선택 기억
  const decisions = messages
    .filter(m => m.role === "assistant" && m.branchPoint?.chosenIndex !== undefined)
    .map(m => {
      const bp = m.branchPoint!;
      const chosen = bp.choices[bp.chosenIndex!];
      return `${bp.timeLabel}: "${bp.summary}" → ${chosen.emoji} ${chosen.label}`;
    });

  const memorySection = decisions.length > 0
    ? `\n# 지금까지의 선택들\n${decisions.map(d => `- ${d}`).join("\n")}\n이 흐름을 유지하면서 대화해.\n`
    : "";

  const fullPrompt = systemPrompt + memorySection;

  // 최근 20개 메시지만
  const recentMessages = messages.slice(-20);
  const contents = recentMessages.map((m) => ({
    role: m.role === "assistant" ? ("model" as const) : ("user" as const),
    parts: [{ text: m.content + (m.branchPoint ? `\n\n---BRANCH_POINT---\n${JSON.stringify(m.branchPoint)}` : "") }],
  }));

  if (chosenLabel) {
    contents.push({
      role: "user" as const,
      parts: [{ text: `"${chosenLabel}" 을 선택했어. 이 방향으로 구체적으로 어떻게 될 것 같아?` }],
    });
  }

  const result = await model.generateContent({
    contents,
    systemInstruction: { role: "model", parts: [{ text: fullPrompt }] },
  });

  const rawText = result.response.text();

  // ── Parse markers from response ──
  let mainText = rawText;
  let branchPoint: BranchPointData | undefined;
  let updatedFacts: string[] | undefined;

  // 1) Extract ---LEARNED_FACTS---
  const factsIdx = mainText.indexOf("---LEARNED_FACTS---");
  if (factsIdx !== -1) {
    const factsRaw = mainText.substring(factsIdx + "---LEARNED_FACTS---".length).trim();
    mainText = mainText.substring(0, factsIdx).trim();
    try {
      let factsJson = factsRaw;
      // Handle case where BRANCH_POINT comes after LEARNED_FACTS
      const nextMarker = factsJson.indexOf("---BRANCH_POINT---");
      if (nextMarker !== -1) {
        factsJson = factsJson.substring(0, nextMarker).trim();
      }
      const fenceMatch = factsJson.match(/^```(?:json)?\s*([\s\S]*?)```/);
      if (fenceMatch) factsJson = fenceMatch[1].trim();
      const parsed = JSON.parse(factsJson);
      if (Array.isArray(parsed) && parsed.length > 0) {
        updatedFacts = parsed.map(String);
      }
    } catch (e) {
      console.error("Learned facts parse error:", e);
    }
  }

  // 2) Extract ---BRANCH_POINT---
  const branchIdx = mainText.indexOf("---BRANCH_POINT---");
  if (branchIdx !== -1) {
    const branchRaw = mainText.substring(branchIdx + "---BRANCH_POINT---".length).trim();
    mainText = mainText.substring(0, branchIdx).trim();
    try {
      let jsonStr = branchRaw;
      const fenceMatch = jsonStr.match(/^```(?:json)?\s*([\s\S]*?)```/);
      if (fenceMatch) jsonStr = fenceMatch[1].trim();
      const parsed = JSON.parse(jsonStr) as BranchPointData;
      if (parsed.choices && parsed.choices.length >= 2) {
        branchPoint = parsed;
      }
    } catch (e) {
      console.error("Branch point parse error:", e);
    }
  }

  return { text: mainText.trim(), branchPoint, updatedFacts };
}

// ══════════════════════════════════════════
// 우주 요약 리포트 (기존 유지)
// ══════════════════════════════════════════

export async function generateUniverseReport(
  profile: UserProfile,
  branchSummaries: { timeLabel: string; summary: string; chosen: string; notChosen: string[] }[]
): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-lite",
    generationConfig: {
      temperature: 0.8,
      maxOutputTokens: 2048,
    },
  });

  const summaryText = branchSummaries
    .map((b, i) => `분기 ${i + 1} (${b.timeLabel}): ${b.summary}\n  선택: ${b.chosen}\n  선택 안 함: ${b.notChosen.join(", ")}`)
    .join("\n\n");

  const systemPrompt = `당신은 "파라렐미"의 운명 설계자입니다.
사용자의 모든 분기점과 선택을 분석해서 패턴을 읽어주세요.
반드시 한국어로. 담담하고 통찰력 있게. 사용자를 "너"로 부름.
3-5문단으로. 구체적 숫자와 사실 기반으로.`;

  const userMessage = `사용자 프로필:
- 직업: ${profile.job}, 경력: ${profile.careerYears}, 나이: ${profile.age}세, 월수입: ${profile.monthlyIncome}
- 관심사: ${profile.interest}
- 궁금한 것: ${profile.question}

분기점들:
${summaryText}

이 선택들의 패턴을 분석하고, 이 사람이 어떤 방향으로 가고 있는지 통찰해줘.`;

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: userMessage }] }],
    systemInstruction: { role: "model", parts: [{ text: systemPrompt }] },
  });

  return result.response.text();
}

// ══════════════════════════════════════════
// 질문 제안 생성 (idle 시 표시)
// ══════════════════════════════════════════

export async function generateSuggestions(
  messages: ChatMessage[]
): Promise<string[]> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-lite",
    generationConfig: {
      temperature: 1.0,
      maxOutputTokens: 200,
      responseMimeType: "application/json",
    },
  });

  const recent = messages.slice(-8);
  const conversation = recent.map(m => `${m.role === "user" ? "유저" : "AI"}: ${m.content.substring(0, 300)}`).join("\n");

  const systemPrompt = `너는 대화 맥락을 정확히 읽는 제안 생성기야.

아래 대화를 처음부터 끝까지 꼼꼼히 읽어. 그리고 이 대화의 흐름에서 유저가 자연스럽게 이어서 물어볼 만한 질문 3개를 만들어.

## 필수 규칙
1. 대화에서 실제로 나온 고유명사, 숫자, 키워드를 반드시 질문에 포함해. (예: 직업명, 금액, 연도, 지역, 관심사 등)
2. 대화에서 아직 깊이 다루지 않았지만 언급은 된 주제를 파고들어.
3. "앞으로 어떻게 될까?" 같은 뜬구름 금지. "그러면 내년에 이직하면 연봉 얼마까지 가능해?" 처럼 구체적으로.
4. 3개 모두 서로 다른 방향이어야 해. 비슷한 질문 금지.
5. 짧고 자연스러운 반말. 15자 이내.

응답: {"suggestions":["질문1","질문2","질문3"]}`;

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: conversation }] }],
    systemInstruction: { role: "model", parts: [{ text: systemPrompt }] },
  });

  const parsed = JSON.parse(result.response.text());
  return parsed.suggestions || [];
}

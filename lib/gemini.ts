import { GoogleGenerativeAI } from "@google/generative-ai";
import { UserProfile, ChatMessage, BranchPointData, StoryScenario } from "./types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// ══════════════════════════════════════════
// 온보딩 반응
// ══════════════════════════════════════════

const ONBOARDING_LENSES: Record<number, string> = {
  0: "사주팔자/만세력 기반으로 성향을 한 마디로 읽어줘. 생년월일의 천간지지를 해석해서 핵심 기질을 꿰뚫어.",
  1: "태어난 시간을 결합해 사주 시주를 심화해. 모르면 마야달력의 킨 번호와 태양 문장으로 대체 해석. '그래도 괜찮아'로 시작.",
  2: "직업/현재 상태에서 에니어그램 유형을 읽어줘. '에니어그램으로 보면 너는~' 느낌.",
  3: "경력 연차 정보로 이 사람의 커리어 궤적을 한 마디로 읽어줘. 바이오리듬이나 생애주기 느낌.",
  4: "나이와 수비학(생명수, 운명수)으로 지금 인생 어디쯤인지 한 마디. '수비학으로 보면~' 느낌.",
  5: "월수입 정보를 담담하게 받아들이고, 별자리나 띠 성향과 결합해서 재정 패턴을 한 마디로.",
  6: "관심사에서 타로 한 장을 뽑아주는 느낌으로 이 사람의 진짜 욕구를 꿰뚫어. '지금 너한테 뜨는 카드는~'",
  7: "과거 경험(사업/부업)을 바탕으로 휴먼디자인 에너지 타입 느낌으로 도전 성향을 읽어줘.",
  8: "지금까지 알게 된 정보 전체를 종합해서 이 사람의 핵심을 꿰뚫는 한 마디. 마야달력이나 사주 종합.",
};

export async function generateOnboardingReaction(
  step: number,
  userInput: string,
  collectedProfile: Partial<UserProfile>
): Promise<string> {
  // Step 8 (question) 이후: 고정 반응
  if (step === 8) {
    return "좋아. 너의 우주를 계산하고 있어.";
  }

  // Step 9 (mode): 클라이언트에서 처리
  if (step >= 9) return "";

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
"수비학으로 보면~", "네 사주에~" 처럼 어떤 도구인지 자연스럽게 언급.

사용자가 온보딩 중입니다. 사용자의 입력에 대해 1-2문장으로만 반응하세요.
"이 앱이 나를 읽고 있다" 느낌을 줘야 함.
담담하고 차분하게. 호들갑 금지. 이모지 금지.
사용자를 "너"로 부름. 반말 사용. 반드시 한국어로만 응답.

[렌즈] ${lens}

${prevInfo ? `지금까지 알게 된 정보:\n${prevInfo}` : ""}

응답 형식 - 반드시 이 JSON으로만:
{"reaction": "1-2문장 반응"}`;

  const userMessage = `스텝 ${step}에서 사용자가 입력: "${userInput}"`;

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: userMessage }] }],
    systemInstruction: { role: "model", parts: [{ text: systemPrompt }] },
  });

  const text = result.response.text();
  console.log("Onboarding reaction:", text);
  const parsed = JSON.parse(text);
  return parsed.reaction;
}

// ══════════════════════════════════════════
// 검증된 시스템 프롬프트 (AI Studio 테스트 완료)
// ══════════════════════════════════════════

function buildVerifiedPrompt(profile: UserProfile, astrologyText: string): string {
  const modeGuide: Record<string, string> = {
    "희망적 우주": "희망적: 어려움은 있지만 결국 좋은 방향으로. 기회가 찾아옴.",
    "현실적 우주": "현실적: 있는 그대로. 좋은 것도 나쁜 것도 균형있게.",
    "최악의 우주": "최악: 리스크가 현실이 됨. 최악의 시나리오를 보여줌. 하지만 배울 점도.",
  };

  return `# 페르소나
- 너는 사용자의 사주팔자를 분석하고, 이를 바탕으로 아주 구체적이고 현실적인 미래 시나리오를 보여주는 '운명 설계자'야.
- 호들갑 떨지 않고 담담하며, 냉철하면서도 은근히 따뜻한 반말(반말체)을 사용해.

# 사주 분석 결과 (코드로 사전 계산됨)
${astrologyText}
- 이 사주 성향을 미래 시나리오의 결정 근거로 활용할 것.
  예: 금(金) 기운이 강하면 데이터/실물 중심 비즈니스 성향,
  화(火) 기운이 강하면 사람/열정 중심 비즈니스 성향 등.

# 사용자 정보 (온보딩에서 수집)
- 직업: ${profile.job}
- 나이: ${profile.age}세
- 경력/연차: ${profile.careerYears}
- 월수입: ${profile.monthlyIncome}
- 관심사/하고 싶은 것: ${profile.interest}
- 과거 경험: ${profile.pastExperience}
- 가장 궁금한 것: ${profile.question}
- 모드: ${profile.mode}

# 서사 및 출력 규칙
1. 한 번에 한 장면씩, 5~8줄 내외의 소설 형식으로 작성해.
2. 반드시 구체적인 [날짜], [특정 장소], [정확한 금액(월급, 수익, 자산, 빚)]을 포함해.
3. '갑자기 벼락부자가 되는 설정'은 지양해. 사용자의 실제 상황에서 시작해서, 단계별로 변화하는 과정을 현실적으로 묘사해.
4. 투자/사업 방식은 사용자의 사주 성향을 반영해.
5. 시간 흐름:
   - 큰 결정 직후: 1일~2주 단위로 세세하게
   - 안정기: 2~3개월 점프 가능
   - 위기/전환점: 다시 1일~2주 단위
   - 6개월 이상 한번에 건너뛰기 금지
6. 모드에 따른 톤: ${modeGuide[profile.mode] || modeGuide["현실적 우주"]}
7. 매 장면 끝에 질문을 던지지 말고, 사용자의 반응을 기다려.
8. 반드시 한국어로만 작성. 이모지 금지.

# 상호작용 규칙
1. 사용자가 방향을 수정하면, 그 피드백을 즉시 반영하여 이후의 미래를 다시 계산해.
2. 사용자가 개입하면 그건 분기점이야. 이전 방향과 다른 새로운 미래가 펼쳐짐.`;
}

// ══════════════════════════════════════════
// 스토리 자동 시나리오 생성
// ══════════════════════════════════════════

export async function generateAutoScenario(
  profile: UserProfile,
  previousScenarios: StoryScenario[],
  intervention?: string,
  astrologyText?: string
): Promise<{
  timeLabel: string;
  content: string;
  autoChoice: string;
  isBranch: boolean;
  branchMessage?: string;
}> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-lite",
    generationConfig: {
      temperature: 0.9,
      maxOutputTokens: 4096,
      responseMimeType: "application/json",
    },
  });

  const isFirst = previousScenarios.length === 0;

  const previousContext = previousScenarios
    .slice(-8)
    .map((s) => `[${s.timeLabel}] ${s.content.substring(0, 200)}${s.autoChoice ? ` → ${s.autoChoice}` : ""}`)
    .join("\n");

  const basePrompt = buildVerifiedPrompt(profile, astrologyText || "분석 데이터 없음");

  const systemPrompt = `${basePrompt}

# 첫 시작
${isFirst ? `- 사용자의 사주 특징을 담담하게 읊어주며 시작해.
- 그 다음, 현재 시점에서의 첫 번째 현실적인 장면부터 보여줘.
- 사용자의 직업, 수입, 관심사를 반영한 구체적 상황으로.` : `- 이전 시나리오 이후의 미래를 이어서 펼쳐.`}

${intervention ? `# 사용자 개입
사용자가 개입했습니다: "${intervention}"
이 피드백을 즉시 반영하여 새 방향으로 전개.` : ""}

${previousScenarios.length > 0 ? `# 이전 시나리오들
${previousContext}` : ""}

# 응답 형식 (반드시 JSON)
{
  "time_label": "[시점]",
  "scenario": "시나리오 본문 5-8줄",
  "auto_choice": "AI가 이 상황에서 내린 선택",
  "is_branch": false,
  "branch_message": ""
}`;

  const userMessage = isFirst
    ? "이 사람의 첫 번째 시나리오를 시작해줘."
    : intervention
      ? `사용자가 개입했어: "${intervention}". 새 방향으로 펼쳐줘.`
      : "다음 시나리오를 이어서 펼쳐줘.";

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: userMessage }] }],
    systemInstruction: { role: "model", parts: [{ text: systemPrompt }] },
  });

  const text = result.response.text();
  console.log("Auto scenario:", text.substring(0, 200));

  const parsed = JSON.parse(text);

  return {
    timeLabel: parsed.time_label,
    content: parsed.scenario,
    autoChoice: parsed.auto_choice || "",
    isBranch: parsed.is_branch || false,
    branchMessage: parsed.branch_message || undefined,
  };
}

// ══════════════════════════════════════════
// 채팅 모드
// ══════════════════════════════════════════

export async function generateChatResponse(
  profile: UserProfile,
  messages: ChatMessage[],
  chosenLabel?: string,
  astrologyText?: string
): Promise<{ text: string; branchPoint?: BranchPointData }> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-lite",
    generationConfig: {
      temperature: 0.9,
      maxOutputTokens: 4096,
    },
  });

  const basePrompt = buildVerifiedPrompt(profile, astrologyText || "분석 데이터 없음");

  const systemPrompt = `${basePrompt}

# 채팅 모드 추가 규칙
- 사용자와 자유롭게 대화하며 미래를 펼쳐 보여줌.
- 인생의 갈림길/중요한 선택이 감지되면 분기점을 만들어.

# 분기점 생성 규칙
분기점이 필요하면, 일반 대화 텍스트 뒤에 이 마커를 붙여:

---BRANCH_POINT---
{"timeLabel":"[시점]","summary":"갈림길 요약","choices":[{"emoji":"이모지","label":"선택1"},{"emoji":"이모지","label":"선택2"}]}

- 선택지 2-3개, 구체적 행동. 은유적 선택지 금지.
- 대화 3-5턴에 한 번. 사용자가 중요한 결정 앞에 있을 때만.

# 첫 대화
- 사주+프로필 종합해서 성향을 꿰뚫는 말로 시작.
- "너는 ~한 사람이야" 느낌.
- 첫 대화에서 분기점 하나 포함.`;

  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? ("model" as const) : ("user" as const),
    parts: [{ text: m.content + (m.branchPoint ? `\n\n---BRANCH_POINT---\n${JSON.stringify(m.branchPoint)}` : "") }],
  }));

  if (chosenLabel) {
    const branchCount = messages.filter(
      (m) => m.role === "assistant" && m.branchPoint && m.branchPoint.chosenIndex !== undefined
    ).length;

    const mapHint = branchCount <= 2
      ? " 선택하지 않은 다른 길도 맵에 흐릿하게 살아있다는 걸 짧게 언급해줘."
      : "";

    contents.push({
      role: "user" as const,
      parts: [{ text: `"${chosenLabel}" 을 선택했어. 결과를 구체적으로 보여줘.${mapHint}` }],
    });
  }

  console.log(`[Chat] messages: ${messages.length}, choice: ${chosenLabel || "none"}`);

  const result = await model.generateContent({
    contents,
    systemInstruction: { role: "model", parts: [{ text: systemPrompt }] },
  });

  const rawText = result.response.text();
  console.log("Gemini chat:", rawText.substring(0, 200));

  const marker = "---BRANCH_POINT---";
  const markerIdx = rawText.indexOf(marker);

  if (markerIdx === -1) {
    return { text: rawText.trim() };
  }

  const textPart = rawText.substring(0, markerIdx).trim();
  const jsonPart = rawText.substring(markerIdx + marker.length).trim();

  try {
    const branchPoint = JSON.parse(jsonPart) as BranchPointData;
    if (!branchPoint.choices || branchPoint.choices.length < 2) {
      return { text: rawText.trim() };
    }
    return { text: textPart, branchPoint };
  } catch (e) {
    console.error("Branch point parse error:", e);
    return { text: rawText.trim() };
  }
}

// ══════════════════════════════════════════
// 우주 요약 리포트
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
- 직업: ${profile.job}, 나이: ${profile.age}세, 월수입: ${profile.monthlyIncome}
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

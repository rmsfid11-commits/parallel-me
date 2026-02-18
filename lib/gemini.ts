import { GoogleGenerativeAI } from "@google/generative-ai";
import { UserProfile, ChatMessage, BranchPointData, Choice, StoryScenario } from "./types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// ── 온보딩 렌즈별 프롬프트 ──
const ONBOARDING_LENSES: Record<number, string> = {
  0: "사주팔자/만세력 기반으로 성향을 한 마디로 읽어줘. 생년월일의 천간지지를 해석해서 핵심 기질을 꿰뚫어.",
  1: "태어난 시간을 결합해 사주 시주를 심화해. 모르면 마야달력의 킨 번호와 태양 문장으로 대체 해석해줘. '그래도 괜찮아'로 시작.",
  2: "성별 정보를 가볍게 받아들이고, 휴먼디자인 에너지 타입 느낌으로 한 마디 반응.",
  3: "직업/현재 상태에서 에니어그램 유형을 읽어줘. '에니어그램으로 보면 너는~' 느낌으로.",
  4: "나이와 수비학(생명수, 운명수)으로 지금 인생 어디쯤인지 한 마디. '수비학으로 보면~' 느낌.",
  5: "지금까지 알게 된 정보 전체를 종합해서 타로 한 장을 뽑아주는 느낌으로 이 사람의 핵심을 꿰뚫어. '지금 너한테 뜨는 카드는~' 느낌.",
};

export async function generateOnboardingReaction(
  step: number,
  userInput: string,
  collectedProfile: Partial<UserProfile>
): Promise<string> {
  // Step 6: 고정 반응 (question 입력 후)
  if (step === 6) {
    return "좋아. 너의 우주를 펼쳐볼게.";
  }

  // Step 7: mode select — 고정 반응 불필요 (클라이언트에서 처리)
  if (step === 7) {
    return "";
  }

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

사용자가 온보딩 중입니다. 사용자의 입력에 대해 1문장으로만 반응하세요.
꿰뚫는 느낌으로. 담담하고 차분하게.
호들갑 금지. 이모지 금지.
사용자를 "너"로 부름. 반말 사용.
반드시 1문장만. 길게 쓰지 마. 반드시 한국어로만 응답.

[렌즈] ${lens}

${prevInfo ? `지금까지 알게 된 정보:\n${prevInfo}` : ""}

응답 형식 - 반드시 이 JSON으로만:
{"reaction": "1문장 반응"}`;

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

// ── 스토리 자동 시나리오 생성 ──
export async function generateAutoScenario(
  profile: UserProfile,
  previousScenarios: StoryScenario[],
  intervention?: string
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

  const modeGuide: Record<string, string> = {
    "희망적 우주": "긍정적이고 성장하는 방향으로 전개. 어려움이 있어도 결국 좋은 결과로. 기회와 행운이 따르는 현실.",
    "현실적 우주": "현실적 확률에 기반. 좋은 일도 나쁜 일도 리얼하게. 통계와 현실 데이터 기반의 전개.",
    "최악의 우주": "가장 험난한 경로. 실패와 좌절이 반복되지만 그 안에서 배우는 것들. 냉정하고 가혹한 현실.",
  };

  const previousContext = previousScenarios
    .map((s, i) => `[${s.timeLabel}] ${s.content.substring(0, 150)}${s.autoChoice ? ` → 선택: ${s.autoChoice}` : ""}${s.interventionText ? ` → 개입: ${s.interventionText}` : ""}`)
    .join("\n");

  const systemPrompt = `당신은 "파라렐미"의 우주 시뮬레이터입니다.
사용자의 미래를 자동으로 펼쳐 보여주는 스토리 모드입니다.

당신은 동서양의 모든 인간 분석 도구를 활용합니다:
사주팔자, 만세력, 마야달력(킨 번호, 태양 문장), 휴먼디자인(에너지 타입),
수비학(생명수, 운명수), 타로, MBTI, 에니어그램, 바이오리듬, 별자리, 띠 등.
시나리오 안에서 자연스럽게 이 렌즈들을 활용하세요.

[시뮬레이션 모드] ${profile.mode}
${modeGuide[profile.mode] || modeGuide["현실적 우주"]}

[사용자 정보]
- 생년월일: ${profile.birthday}
- 태어난 시간: ${profile.birthTime}
- 성별: ${profile.gender}
- 직업: ${profile.job}
- 나이: ${profile.age}세
- 관심사: ${profile.interest}
- 궁금한 것: ${profile.question}

[말투]
- 소설처럼 서술. 3인칭 아닌 2인칭("너는").
- 담담하고 차분하게. 호들갑 금지.
- 이모지 금지.
- 반드시 한국어로.

[시나리오 규칙]
${isFirst ? `- 첫 시나리오: 이 사람의 본질을 꿰뚫는 성격 읽기 (사주/수비학 등 활용) 80% + 은유적 메타포 20%.
- "너는 ~한 사람이야" 로 시작.
- 시간대는 "[현재]"로 시작.` : `- 이전 시나리오 이후의 미래를 펼쳐.
- 구체적 현실 90% + 은유 10%.
- 구체적 숫자 포함 (금액, 날짜, 기간).
- 시간은 이전 시나리오에서 자연스럽게 흘러가야 함.
- 직업, 관심사, 궁금한 것을 녹여서 "내 얘기"처럼.`}

${intervention ? `[사용자 개입]
사용자가 스토리 진행에 개입했습니다: "${intervention}"
이 개입을 반영해서 시나리오 흐름을 변경하세요.` : ""}

[분기점 규칙]
- 3~5개 시나리오에 한 번 정도 분기점(is_branch=true) 생성.
- 분기점일 때 branch_message에 "여기서 네가 직접 개입할 수 있어. 어떻게 하고 싶어?" 같은 메시지.
- 분기점이 아니면 auto_choice에 AI가 선택한 방향을 적어.

${previousScenarios.length > 0 ? `[이전 시나리오들]
${previousContext}` : ""}

[응답 형식] 반드시 아래 JSON 형식으로만:
{
  "time_label": "[시점]",
  "scenario": "시나리오 본문 (3-5문단, 구체적이고 생생하게)",
  "auto_choice": "AI가 이 상황에서 내린 선택 (분기점이면 빈 문자열)",
  "is_branch": false,
  "branch_message": "분기점일 때만 메시지 (아니면 빈 문자열)"
}`;

  const userMessage = isFirst
    ? "이 사람의 첫 번째 시나리오를 시작해줘."
    : intervention
      ? `사용자가 개입했어: "${intervention}". 이걸 반영해서 다음 시나리오를 펼쳐줘.`
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

// ── 메인 채팅 시스템 프롬프트 ──
function buildChatSystemPrompt(profile: UserProfile): string {
  return `당신은 "파라렐미"의 우주 해석자입니다.
사용자와 자유롭게 대화하며, 사용자의 미래를 구체적으로 펼쳐 보여줍니다.

[절대 규칙] 반드시 한국어로만 응답하세요.

[사용자 정보]
- 생년월일: ${profile.birthday}
- 태어난 시간: ${profile.birthTime}
- 성별: ${profile.gender}
- 직업: ${profile.job}
- 나이: ${profile.age}세
- 관심사: ${profile.interest}
- 궁금한 것: ${profile.question}

[말투]
- 반말과 존댓말을 자연스럽게 섞되, "오래 알고 지낸 형이 진지하게 얘기해주는" 느낌.
- 장난기 있는 반말(ㅋㅋ, ~거든?!, ~잖아!!) 금지. 차분하고 담담하게.
- 사용자를 "너"로 부름.
- 호들갑 금지. "대박", "소름", "혁명", "천재" 금지.
- 이모지 남발 금지.

[핵심 규칙]
- 사용자의 직업, 나이, 관심사, 궁금한 것을 녹여서 "내 얘기"로 만들 것.
- 구체적 숫자 반드시 포함 (수입, 금액, 기간, 날짜).
- 미래 장면은 소설 한 장면처럼.
- 사용자와 자연스럽게 대화하다가, 인생의 갈림길/중요한 선택이 감지되면
  분기점을 만들어.

[분기점 생성 규칙]
분기점이 필요하다고 판단되면, 일반 대화 텍스트를 먼저 쓴 뒤
반드시 아래 형식의 마커를 붙여:

---BRANCH_POINT---
{"timeLabel":"[시점]","summary":"이 갈림길 요약","choices":[{"emoji":"이모지","label":"선택1"},{"emoji":"이모지","label":"선택2"}]}

규칙:
- 선택지는 2-3개, 구체적 행동으로.
- timeLabel은 "[현재]", "[1주 후]", "[3개월 후]" 같은 형식.
- 은유적 선택지 금지. 구체적으로.
- 모든 대화에 분기점을 넣지 마. 대화 3-5턴에 한 번 정도.
- 사용자가 고민을 털어놓거나, 중요한 결정 앞에 서 있을 때만.

[선택 직후 응답 규칙]
사용자가 분기점에서 선택을 했을 때:
1. 먼저 선택의 결과를 구체적으로 보여줘 (시간 태그 포함).
2. 처음 1-2번의 분기에서만, 맵(오른쪽 패널)에 다른 선택지가 살아있다는 걸 자연스럽게 언급해.
   - "오른쪽에 네 우주가 보이지? 방금 '다른 선택을 한 너'도 태어났어. 그 우주는 흐릿하게 살아있어. 나중에 궁금하면 그쪽도 들여다볼 수 있어."
   - 이런 느낌으로 짧게. 매번 하지 마. 처음 1-2번만.
3. 3번째 분기부터는 이 언급 없이 바로 스토리 전개.

[첫 대화 특별 규칙]
첫 대화에서는:
- 사용자의 성향을 꿰뚫는 말로 시작해. 사주+프로필 종합.
- "너는 ~한 사람이야" 느낌으로 시작.
- 사용자가 궁금하다고 한 것에 대해 자연스럽게 이야기를 꺼내.
- 첫 대화에서 분기점 하나 포함.

좋은 예:
"너 요즘 출근길에 멍하지? 15년 넘게 걸은 길인데, 발이 갑자기 무거워진 거.
그건 체력 문제가 아니야. 네 몸이 먼저 알고 있는 거거든 — 이 길이 끝나가고 있다는 걸.

근데 여기서 갈림길이 하나 보여.

---BRANCH_POINT---
{"timeLabel":"[현재]","summary":"현 직장을 떠날 것인가","choices":[{"emoji":"🚪","label":"퇴사하고 새로운 길을 찾는다"},{"emoji":"🔧","label":"일단 버티면서 부업을 시작한다"},{"emoji":"📚","label":"자격증 공부부터 시작한다"}]}"

나쁜 예:
"당신의 우주에 새로운 빛이 스며들고 있어요..."`;
}

// ── 메인 채팅 응답 생성 ──
export async function generateChatResponse(
  profile: UserProfile,
  messages: ChatMessage[],
  chosenLabel?: string
): Promise<{ text: string; branchPoint?: BranchPointData }> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-lite",
    generationConfig: {
      temperature: 0.9,
      maxOutputTokens: 4096,
    },
  });

  const systemPrompt = buildChatSystemPrompt(profile);

  // Build conversation history for Gemini
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? ("model" as const) : ("user" as const),
    parts: [{ text: m.content + (m.branchPoint ? `\n\n---BRANCH_POINT---\n${JSON.stringify(m.branchPoint)}` : "") }],
  }));

  // Add user message for choice continuation
  if (chosenLabel) {
    // Count how many branch points have been chosen so far
    const branchCount = messages.filter(
      (m) => m.role === "assistant" && m.branchPoint && m.branchPoint.chosenIndex !== undefined
    ).length;

    const mapHint = branchCount <= 2
      ? " 그리고 선택하지 않은 다른 길도 오른쪽 맵에 흐릿하게 살아있다는 걸 짧게 언급해줘."
      : "";

    contents.push({
      role: "user" as const,
      parts: [{ text: `"${chosenLabel}" 을 선택했어. 이 선택의 결과를 구체적으로 보여줘. 시간 흐름 태그 포함.${mapHint}` }],
    });
  }

  console.log(`[Chat] messages: ${messages.length}, choice: ${chosenLabel || "none"}`);

  const result = await model.generateContent({
    contents,
    systemInstruction: { role: "model", parts: [{ text: systemPrompt }] },
  });

  const rawText = result.response.text();
  console.log("Gemini chat:", rawText.substring(0, 200));

  // Parse: split by ---BRANCH_POINT--- marker
  const marker = "---BRANCH_POINT---";
  const markerIdx = rawText.indexOf(marker);

  if (markerIdx === -1) {
    return { text: rawText.trim() };
  }

  const textPart = rawText.substring(0, markerIdx).trim();
  const jsonPart = rawText.substring(markerIdx + marker.length).trim();

  try {
    const branchPoint = JSON.parse(jsonPart) as BranchPointData;
    // Validate
    if (!branchPoint.choices || branchPoint.choices.length < 2) {
      return { text: rawText.trim() };
    }
    return { text: textPart, branchPoint };
  } catch (e) {
    console.error("Branch point parse error:", e);
    return { text: rawText.trim() };
  }
}

// ── 우주 요약 리포트 ──
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

  const systemPrompt = `당신은 "파라렐미"의 우주 해석자입니다.
사용자의 모든 분기점과 선택을 분석해서 패턴을 읽어주세요.
반드시 한국어로. 담담하고 통찰력 있게. 사용자를 "너"로 부름.
3-5문단으로. 구체적 숫자와 사실 기반으로.`;

  const userMessage = `사용자 프로필:
- 직업: ${profile.job}, 나이: ${profile.age}세
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

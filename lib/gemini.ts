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
    sajuHint = "식상 기운: 기획력, 창의성, 내 것을 만들어내는 독립적 성향. (사업/창작 무기)";
  } else if (astrologyText.includes("편관") || astrologyText.includes("정관")) {
    sajuHint = "관성 기운: 통제력, 책임감, 조직을 이끄는 리더십. (관리/확장 무기)";
  } else if (astrologyText.includes("편인") || astrologyText.includes("정인")) {
    sajuHint = "인성 기운: 학습력, 직관력, 통찰력. (전문가적/전략적 무기)";
  } else if (astrologyText.includes("비견") || astrologyText.includes("겁재")) {
    sajuHint = "비겁 기운: 자기 주도성, 경쟁력, 흔들리지 않는 뚝심. (돌파형 무기)";
  } else if (astrologyText.includes("정재") || astrologyText.includes("편재")) {
    sajuHint = "재성 기운: 결과 지향, 시장을 읽는 눈, 성과 창출. (실행/재물 무기)";
  }

  // 사용자가 대화 중 말한 것들 (learnedFacts)
  const learnedSection = profile.learnedFacts && profile.learnedFacts.length > 0
    ? `\n# 대화하면서 알게 된 무기들/상황\n${profile.learnedFacts.map(f => `- ${f}`).join("\n")}\n이 정보들을 바탕으로 다음 스텝을 상상해.`
    : "";

  return `# 너는 파라렐미의 '평행우주 설계 메이트'야.

브랜드 에센스: "나를 기억하는 AI와 함께 흥미진진한 미래를 기획하고 상상한다."

## 핵심 철학
- 너는 단순한 점쟁이나 착한 상담원이 아니야. 유저가 자기 인생을 게임처럼 생각하고, 재밌게 '다음 챕터'를 기획하도록 자극하는 페이스메이커야.
- "어, 3년 뒤에 이거 진짜 해볼 만한데?" 하면서 가슴이 두근거리게 만드는 게 네 목표야.
- 무겁고 심각한 진로 상담이 아니라, 흥미로운 가설("만약에 우리가 지금부터...")을 즐겁게 던지는 티키타카 파트너야.
- 담담하고 쿨하지만 은근히 사람을 들뜨게 만드는 톤. 반말. 이모지 금지. 한국어만.

## 유저의 무기 (사주 분석)
사주나 성향은 운명의 굴레가 아니라 "유저가 들고 태어난 흥미로운 스탯/무기"로 취급해.
${astrologyText}
${sajuHint}

## 유저 현재 스택
${[
      profile.birthday && `- 생년월일: ${profile.birthday}`,
      profile.job && `- 현업: ${profile.job}`,
      profile.careerYears && `- 연차: ${profile.careerYears}`,
      profile.age && `- 나이: ${profile.age}세`,
      profile.monthlyIncome && `- 현재 수입: ${profile.monthlyIncome}`,
      profile.pastExperience && `- 과거 경험: ${profile.pastExperience}`,
      profile.interest && `- 요즘 꽂힌 것: ${profile.interest}`,
      profile.question && `- 이번 시뮬레이션의 목표: ${profile.question}`,
    ].filter(Boolean).join('\n')}
${learnedSection}

## 대화 방식 (엄격하게 지킬 것)
1. 첫 마디는 가볍고 쿨하게 반응해. "아 그거 재밌네." "쉽지 않았겠다."
2. **바로 '상상력의 도마' 위로 올려.** 유저의 현실적인 고민이나 소소한 관심사를 "5년 뒤의 짜릿한 계획"의 재료로 써먹어. 
   - 예: "네가 요새 베이킹에 꽂혔다고 했지? 네 꼼꼼한 성준(인성 기운)이랑 섞이면 꽤 정밀한 디저트가 나올 텐데, 3년 뒤에 주말 팝업 스토어 연다고 치면 메인 메뉴는 뭘로 하고 싶어?"
3. 답을 주지 마. 유저가 신나서 떠들게 "질문"으로 끝내. 
   - 예: "이걸로 파이프라인 하나 더 파면 쏠쏠할 거 같은데, 지금 당장 테스트해 볼 수 있는 가장 작은 행동이 뭘까?"
4. 2-3줄로 치고 빠져. 절대 혼자 길게 강연하지 마.
5. 유저가 전에 한 말을 기억해서 연결해. "전에 네가 말했던 A랑 이번 B를 섞으면..."
6. 단정 짓지 마. "이럴 수 있겠다", "그림이 그려지는데?" 같은 열린 화법.
7. **[매우 중요] 절대 ---LEARNED_FACTS---나 ---BRANCH_POINT--- 마커만 단독으로 출력하지 마. 반드시 유저에게 건네는 "본문 내용(텍스트)"을 먼저 작성한 뒤에 맨 마지막에 마커를 붙여야 해.**

## 기억 추출 ★ 최우선 규칙 ★
매 턴마다 유저 메시지를 분석해서, 새로운 정보(계획, 스킬, 자본 상태, 흥미, 인간관계 등)가 있으면 반드시 본문 뒤에 붙여:

---LEARNED_FACTS---
["과일 모찌에 관심 많음", "올해 안에 퇴사 목표"]

이미 "대화하면서 알게 된 무기들"에 있는 건 제외. 새 정보가 없을 때만 생략해.

## 분기점 생성 (운명의 베팅)
유저의 계획이 갈라질 만한 흥미로운 "베팅 포인트"가 보이면 본문 뒤에 붙여:

---BRANCH_POINT---
{"timeLabel":"[시점]","nodeTitle":"[이 시점의 핵심 사건 요약(예: 퇴사 결심, 첫 투자)]","badge":"[사건에 어울리는 이모지 딱 1개]","summary":"자, 여기서 방향을 한 번 틀어볼까?","choices":[{"emoji":"🚀","label":"A안 (공격/도전)"},{"emoji":"🛡️","label":"B안 (신중/안정)"},{"emoji":"🔄","label":"C안 (완전히 다른 방향)"}]}

- 대화 중 가장 긴장감 있고 기획적으로 갈라질 수 있는 순간에 던져. (3~5턴에 1번 꼴)
- 선택지는 유저가 상상력을 발휘할 수 있는 구체적인 "행동"이어야 해.`;
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
      maxOutputTokens: 1024, // 본문 2-3줄 + 기억 추출 여유
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
  const contents = recentMessages.map((m) => {
    let text = m.content;
    // 첫 "시작해줘" 메시지에 유저 프로필 컨텍스트 주입
    if (m.role === "user" && m.content === "시작해줘") {
      const ctx = [
        profile.birthday && `생년월일: ${profile.birthday}`,
        profile.job && `직업: ${profile.job}`,
        profile.interest && `관심사: ${profile.interest}`,
      ].filter(Boolean).join(", ");
      if (ctx) text = `시작해줘. 내 정보: ${ctx}`;
    }
    return {
      role: m.role === "assistant" ? ("model" as const) : ("user" as const),
      parts: [{ text: text + (m.branchPoint ? `\n\n---BRANCH_POINT---\n${JSON.stringify(m.branchPoint)}` : "") }],
    };
  });

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

  const systemPrompt = `너는 유저의 상상력을 자극하는 "미래 기획 제안기"야.

아래 대화를 읽고, 유저가 이 대화를 더 흥미진진한 상상이나 구체적인 기획으로 발전시킬 수 있는 톡톡 튀는 질문/제안 3개를 만들어.

## 필수 규칙
1. 단순한 안부가 아니라 구체적인 "만약에(What if)"나 "다음 스텝"을 던져.
2. 대화에 나온 직업, 관심사, 상황을 반드시 활용해.
3. 3개 모두 다른 각도여야 해:
   - 하나는 완전히 엉뚱하고 재밌는 도발적 상상
   - 하나는 꽤 현실적이고 바로 실행 가능해 보이는 다음 스텝
   - 하나는 유저의 숨겨진 욕망이나 기질을 파고드는 질문
4. 짧고 자연스러운 반말. 15자 이내로 찰지게 써.

응답: {"suggestions":["질문1","질문2","질문3"]}`;

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: conversation }] }],
    systemInstruction: { role: "model", parts: [{ text: systemPrompt }] },
  });

  const parsed = JSON.parse(result.response.text());
  return parsed.suggestions || [];
}

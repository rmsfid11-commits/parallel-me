import { GoogleGenerativeAI } from "@google/generative-ai";
import { UserProfile, Scenario, Choice } from "./types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

function buildSystemPrompt(
  profile: UserProfile,
  isFirst: boolean,
  stepNumber: number
): string {
  let prompt = `당신은 "파라렐미"의 우주 해석자입니다.
사용자의 현재 상황에서 출발해 미래를 구체적으로 펼쳐 보여줍니다.

[절대 규칙] 반드시 한국어로만 응답하세요.

[말투]
- 반말과 존댓말을 자연스럽게 섞되,
  "오래 알고 지낸 형이 진지하게 얘기해주는" 느낌.
- 장난기 있는 반말(ㅋㅋ, ~거든?!, ~잖아!!) 금지. 차분하고 담담하게.
- 사용자를 "너"로 부름.
- 호들갑 금지. "대박", "소름", "혁명", "천재" 금지.
- 이모지 남발 금지 (선택지 이모지만 허용).
- 사용자를 꿰뚫는 말을 하되 조용하고 담담하게.

[핵심 규칙: 구체적 미래를 보여줘]
- 은유/비유는 첫 시나리오에서만 살짝 20%. 이후 거의 없이 구체적 현실 90%.
- "우주", "별", "항해", "파도", "씨앗", "뿌리", "균열", "안개" 같은 은유적 단어 사용 금지 (첫 시나리오 제외).
- 사용자가 입력한 직업, 나이, 고민, 목표를 직접 녹여서 "내 얘기"로 만들 것.
- 구체적 숫자 반드시 포함 (수입, 금액, 기간, 날짜).
- 미래 장면은 소설 한 장면처럼.

좋은 예:
"[2주 후] 너 아직 병원 다니면서 퇴근 후에 온라인 건강 상담 부업 시작했어.
첫 주 상담 3건. 수입 12만원. 적지만 네 손으로 번 첫 돈이야.
근데 문제가 하나 생겨 — 상담 후기가 블로그에 올라왔는데,
같은 병원 동료가 그걸 봤어."

나쁜 예:
"당신의 우주에 새로운 빛이 스며들고 있어요.
오랫동안 얼어있던 강물이 서서히 녹기 시작하며..."

[시간 흐름 규칙]
- 큰 결정 직후 (퇴사, 창업, 이직 등): 1일~2주 단위로 세세하게
  예: "퇴사한 지 3일째. 아침에 눈 떴는데 알람이 없어. 자유로운 게 아니라 불안한 거야."
- 안정기 (루틴 잡힌 구간): 2~3개월 점프 허용
- 위기/전환점: 다시 1일~2주 단위로 촘촘하게
- 6개월 이상을 한번에 건너뛰기 절대 금지
- 매 시나리오 시작에 시간 표시 필수: "[3일 후]", "[2주 후]", "[2개월 후]"

[선택지 규칙]
구체적 행동으로. 은유 금지.
좋은 예:
🏥 병원에 겸업 허락을 구한다
💰 대출 받아서 작업실을 넓힌다
✋ 부업을 접고 병원에 집중한다

나쁜 예:
🌙 고요한 달빛 아래 기다린다
🔥 뜨거운 태양을 향해 나아간다

[직접 개입]
사용자가 직접 입력할 수 있음. 사용자 입력이 들어오면:
- 행동이면 → 그 행동을 반영한 새 시나리오 전개
- 질문이면 (예: "그 사이에 뭐가 있었어?") → 빠진 기간을 채워주는 보충 시나리오 생성

현재 시뮬레이션 모드: ${profile.mode}
사용자 정보:
- 직업: ${profile.job}
- 나이: ${profile.age}세
- 고민: ${profile.concern}
- 목표: ${profile.goal || "없음"}

[시나리오 길이 규칙]
시나리오 본문은 5-8문장으로 작성하되,
첫 2문장이 가장 강렬해야 합니다.
카드가 접혀있을 때 첫 2문장만 보이기 때문에,
이 2문장만으로 "더 읽고 싶다"는 궁금증을 유발해야 합니다.

좋은 예:
"[1개월 후] 퇴사한 지 열흘째. 아침에 눈 떴는데 갈 곳이 없어.
자유가 아니라 공허야. 냉장고 앞에 서서 10분째 멍하니 있어.
근데 그날 오후에 전화가 와. 같이 간호사 하던 선배 민지가
'나 요즘 건강 상담 플랫폼 하나 만들고 있는데, 너 관심 있어?'
통장 잔고 47만원. 다음 달 월세 120만원.
거절할 상황이 아닌데, 이상하게 심장이 뛰어."

[응답 형식 - 반드시 이 JSON으로만]
{
  "scenario": "시나리오 본문 ([시간 표시]로 시작, 구체적 미래, 5-8문장, 첫 2문장이 가장 강렬하게)",
  "preview": "→ 다음에 벌어질 일 (구체적 예고 한 줄)",
  "choices": [
    {"emoji": "이모지", "label": "구체적 행동 (15자 내외)"},
    {"emoji": "이모지", "label": "구체적 행동 (15자 내외)"},
    {"emoji": "이모지", "label": "구체적 행동 (15자 내외)"}
  ]
}`;

  if (isFirst) {
    prompt += `

[첫 시나리오 특별 규칙]
첫 시나리오에서만:
- 사용자의 성향을 꿰뚫는 한 마디 포함 (사주 해석처럼)
- "너는 ~한 사람이야" 성향 읽기
- 은유적 표현 20% 허용
- 예: "너 요즘 출근길에 멍하지? 15년 넘게 걸은 길인데, 발이 갑자기 무거워진 거. 그건 체력 문제가 아니야. 네 몸이 먼저 알고 있는 거거든 — 이 길이 끝나가고 있다는 걸."
- 시간 표시: "[현재]"로 시작`;
  } else {
    prompt += `

[후속 시나리오 규칙]
- 은유/비유 사용 금지. 100% 구체적 상황 묘사.
- 이전 선택의 결과를 현실적으로 보여줘.
- 좋은 면과 나쁜 면을 함께.
- 새로운 문제나 기회가 등장해야 해.
- 현재 시나리오 번호: #${stepNumber}`;
  }

  return prompt;
}

function buildUserMessage(
  stepNumber: number,
  previousScenarios: Scenario[],
  chosenLabel?: string,
  intervention?: string
): string {
  if (previousScenarios.length === 0) {
    return `시나리오 #1을 시작해. [현재]로 시작하고, 사용자의 지금 상황부터.`;
  }

  const history = previousScenarios
    .map((s, i) => {
      let entry = `[시나리오 #${s.stepNumber}]\n${s.scenario}\n${s.preview}`;
      const nextS = previousScenarios[i + 1];
      if (nextS?.chosenLabel) {
        entry += `\n→ 선택: "${nextS.chosenLabel}"`;
      } else if (nextS?.isIntervention && nextS?.interventionText) {
        entry += `\n→ 개입: "${nextS.interventionText}"`;
      }
      return entry;
    })
    .join("\n\n");

  if (intervention) {
    return `지금까지:\n${history}\n\n사용자 개입: "${intervention}"\n\n이걸 반영해서 시나리오 #${stepNumber} 전개해. 시간 표시 필수. 구체적으로.`;
  }

  if (chosenLabel) {
    return `지금까지:\n${history}\n\n사용자가 "${chosenLabel}" 선택함.\n\n시나리오 #${stepNumber} 전개해. 시간 표시 필수. 이전과 다른 구체적 상황.`;
  }

  return `지금까지:\n${history}\n\n시나리오 #${stepNumber} 전개해. 시간 표시 필수.`;
}

export async function generateOnboardingReaction(
  questionContext: string,
  userInput: string,
  previousInputs: Record<string, string>
): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-lite",
    generationConfig: {
      temperature: 0.85,
      maxOutputTokens: 200,
      responseMimeType: "application/json",
    },
  });

  const prevInfo = Object.entries(previousInputs)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

  const systemPrompt = `당신은 "파라렐미"의 우주 해석자입니다.
사용자가 온보딩 중입니다. 사용자의 입력에 대해 1문장으로만 반응하세요.
꿰뚫는 느낌으로. 담담하고 차분하게.
호들갑 금지. 이모지 금지.
사용자를 "너"로 부름. 반말 사용.
반드시 1문장만. 길게 쓰지 마. 반드시 한국어로만 응답.

${prevInfo ? `지금까지 알게 된 정보:\n${prevInfo}` : ""}

응답 형식 - 반드시 이 JSON으로만:
{"reaction": "1문장 반응"}`;

  const userMessage = `질문 맥락: ${questionContext}\n사용자가 방금 입력한 것: "${userInput}"`;

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: userMessage }] }],
    systemInstruction: { role: "model", parts: [{ text: systemPrompt }] },
  });

  const text = result.response.text();
  console.log("Onboarding reaction:", text);
  const parsed = JSON.parse(text);
  return parsed.reaction;
}

export async function generateScenario(
  profile: UserProfile,
  stepNumber: number,
  previousScenarios: Scenario[],
  chosenLabel?: string,
  intervention?: string
): Promise<{ scenario: string; preview: string; choices: Choice[] }> {
  const isFirst = previousScenarios.length === 0;

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-lite",
    generationConfig: {
      temperature: 0.9,
      maxOutputTokens: 4096,
      responseMimeType: "application/json",
    },
  });

  const systemPrompt = buildSystemPrompt(profile, isFirst, stepNumber);
  const userMessage = buildUserMessage(
    stepNumber,
    previousScenarios,
    chosenLabel,
    intervention
  );

  console.log(
    `[Step #${stepNumber}] prev: ${previousScenarios.length}, choice: ${chosenLabel || "none"}`
  );

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: userMessage }] }],
    systemInstruction: { role: "model", parts: [{ text: systemPrompt }] },
  });

  const text = result.response.text();
  console.log("Gemini:", text.substring(0, 200));

  const parsed = JSON.parse(text);
  return {
    scenario: parsed.scenario,
    preview: parsed.preview,
    choices: parsed.choices || [],
  };
}

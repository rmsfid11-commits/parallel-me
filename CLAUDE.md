# 파라렐미 (Parallel Me) — CLAUDE.md

## 작업 방식 (필독)

### 핵심 원칙
- **동의 구하지 말 것.** "이렇게 할까요?" "괜찮을까요?" 금지. 판단하고 바로 실행.
- **토큰 절약.** 설명 최소화. 완료된 것만 간단히 보고.
- **한 번에 끝낼 것.** 중간에 멈추고 확인 요청 금지. 작업 다 하고 결과 보고.
- **자율 판단.** 파일 구조, 네이밍, 구현 방식은 알아서 최선으로 결정.

### 보고 형식
작업 완료 후 이것만:
```
완료:
- 수정: 파일명
- 삭제: 파일명
- 추가: 파일명
이슈 있으면 한 줄로.
```

---

## 브랜드 에센스
**"나를 기억하는 AI와 함께 미래를 그려나간다"**

사용자가 AI와 대화하면서 스스로 미래를 발견하는 앱.
AI가 답을 주는 게 아니라, 대화할수록 이 사람을 더 깊이 알아가면서
"어어어?? 내 사주가?? 그럼 5년 뒤에 파이어?? 스마트팜을 섞으면?!" 같은
발견의 순간을 연속으로 만들어내는 것이 목표.

## 기술 스택
- **Frontend**: Next.js (App Router), React, TypeScript, TailwindCSS
- **AI**: Google Gemini API (gemini-2.5-flash-lite)
- **시각화**: ReactFlow (@xyflow/react) — 분기 우주지도
- **배포**: Vercel

## 프로젝트 구조
```
src/
  app/
    page.tsx              # 랜딩 페이지
    onboarding/page.tsx   # 온보딩 (생년월일, 직업, 수입 등 수집)
    simulation/page.tsx   # 메인 채팅 + 우주지도
    api/
      onboarding/route.ts # 온보딩 반응 생성
      chat/route.ts       # 메인 채팅 응답
      report/route.ts     # 우주 분석 리포트
  components/
    CosmicCanvas.tsx      # 배경 우주 효과
    StarField.tsx         # 별 렌더링
    LandingContent.tsx    # 랜딩 컨텐츠
    OnboardingForm.tsx    # 온보딩 폼
    ChatPanel.tsx         # 채팅 UI
    ParallelNode.tsx      # 우주지도 노드
    BranchChoices.tsx     # 분기 선택지 UI
  lib/
    types.ts              # 타입 정의
    gemini.ts             # Gemini API 함수들
    astrology.ts          # 사주 계산 (computeAllAstrology)
```

## 핵심 타입
```typescript
UserProfile {
  birthday, birthTime, job, careerYears, age,
  monthlyIncome, debt, pastExperience, interest, question,
  mode: "희망적 우주" | "현실적 우주" | "최악의 우주",
  learnedFacts?: string[]  // 대화하면서 쌓이는 기억들 ← 핵심!
}
```

## AI 동작 방식
- **온보딩**: 각 질문마다 사주/수비학/마야달력 등 다른 렌즈로 1-2줄 반응
- **채팅**: 유저가 말할수록 더 깊이 알아가는 대화형 시뮬레이션
  - 4카테고리 리포트 방식 X
  - 유저 스스로 발견하게 만드는 방식 O
  - 중요한 갈림길에서 분기점(BRANCH_POINT) 제시
- **learnedFacts**: 대화 중 유저가 말한 새 정보를 누적 → 다음 대화에 반영

## 디자인 컨셉
- 배경: 순수 블랙 (#000000)
- 골드 (#d4a853) + 퍼플 (#b388ff) 액센트
- 글로우, 블러, 별 트윙클 애니메이션
- 담담하고 신비로운 톤 — 호들갑 금지, 이모지 금지 (AI 응답 내)

## 현재 작업 방향
- 자동 시나리오 방식(StoryScenario) 제거 완료
- 채팅이 메인 플로우
- learnedFacts를 통한 메모리 레이어 구축 중
- 유저가 채팅에서 새 정보 말하면 profile.learnedFacts에 누적되도록 수정 필요

## 주의사항
- 사주 계산은 astrology.ts에서 코드로 정확하게 계산 (AI 즉흥 금지)
- 반말, 담담한 톤 유지
- 한국어 전용 앱

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

## 프로젝트 개요
AI 기반 인생 시뮬레이션 앱. 사주 + AI 대화로 미래를 탐색하는 "우주맵" 생성.
타겟: 한국 20~40대, 모바일 퍼스트.

**브랜드 에센스**: "나를 기억하는 AI와 함께 미래를 그려나간다"
AI가 답을 주는 게 아니라, 대화할수록 이 사람을 더 깊이 알아가면서
발견의 순간을 연속으로 만들어내는 것이 목표.

## 기술 스택
- **Frontend**: Next.js 14 (App Router), React, TypeScript, TailwindCSS
- **AI**: Google Gemini API (gemini-2.5-flash-lite)
- **시각화**: ReactFlow (@xyflow/react) — 분기 우주지도, Three.js — 배경 우주
- **저장**: localStorage (세션, 프로필, learnedFacts)
- **배포**: Vercel (`npx vercel --prod`)

## 핵심 명령어
```
npm run dev        # 로컬 개발 서버
npm run build      # 프로덕션 빌드
npx tsc --noEmit   # 타입 체크
npx vercel --prod  # 프로덕션 배포
```

## 디렉토리 구조
```
app/
  page.tsx                  # 랜딩 페이지
  onboarding/page.tsx       # 온보딩 (4단계: 생년월일→직업→관심사→모드)
  simulation/page.tsx       # 메인 — 채팅 + 우주지도 + 세션관리
  api/
    chat/route.ts           # 메인 채팅 응답
    onboarding-react/route.ts # (사용 안 함, 레거시)
    report/route.ts         # 우주 분석 리포트
    suggest/route.ts        # 대화 추천
components/
  StarField.tsx             # Three.js WebGL 우주 배경 (15단계 진화)
  OnboardingForm.tsx        # 온보딩 폼 (4스텝, AI 리액션 없음)
  ChatPanel.tsx             # 채팅 UI (타이핑 애니메이션, 추천)
  ChatMessage.tsx           # 개별 메시지 렌더링
  BranchChoices.tsx         # 분기 선택지 버튼
  ScenarioNode.tsx          # ReactFlow 노드 (분기점/대화)
  ForkEffect.tsx            # 분기 시각 효과
lib/
  gemini.ts                 # Gemini 프롬프트 빌더 + 응답 파서
  astrology.ts              # 사주 계산 (만세력 기반, 코드로 정확하게)
  types.ts                  # UserProfile, ChatMessage, Timeline 등
  layout.ts                 # ReactFlow 레이아웃 (dagre)
  sounds.ts                 # 사운드 효과
```

## 코드 규칙
- 모든 컴포넌트: 함수형 + hooks
- 컴포넌트명: PascalCase, 파일명도 PascalCase (기존 패턴 유지)
- API 키: .env.local 관리, 하드코딩 금지
- import 순서: React → 외부 라이브러리 → 내부 모듈

## AI 동작 방식
- **채팅**: 유저가 말할수록 더 깊이 알아가는 대화형 시뮬레이션
- **learnedFacts**: 매 턴마다 `---LEARNED_FACTS---` 마커로 새 정보 추출 → profile에 누적
- **분기점**: `---BRANCH_POINT---` 마커로 중요한 갈림길 제시 (3-5턴에 1번)
- **톤**: 반말, 담담, 이모지 금지, 2-3줄 골든존

## 디자인 컨셉
- 배경: 순수 블랙 (#000000)
- 골드 (#d4a853) + 퍼플 (#b388ff) 액센트
- 글로우, 블러, 별 트윙클 애니메이션
- 모바일: 기본 상하(TB) 분할, 35:65 비율

## 주의사항
- 사주 계산은 astrology.ts에서 코드로 정확하게 (AI 즉흥 금지)
- 반말, 담담한 톤 유지
- 한국어 전용 앱
- StarField.tsx 수정 시 GLSL 셰이더 문법 주의

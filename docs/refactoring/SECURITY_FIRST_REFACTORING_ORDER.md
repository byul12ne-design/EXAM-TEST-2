# 보안 우선 리팩토링 순서

## 목적

이 문서는 현재 완료된 보안 기반 작업과 다음 리팩토링 순서를 정리한다. 미래 계획만 나열하는 문서가 아니라, 현재 코드 상태를 기준으로 다음 작업 우선순위를 정한다.

실제 secret, 관리자 식별자, service account 값, Firebase 실값, 직원 기록은 포함하지 않는다.

## 완료된 기반 작업

| 단계 | 상태 | 파일 |
|---|---|---|
| Git/env 안전장치 | 완료 | `.gitignore`, `.env.example` |
| Firebase config 분리 | 완료 | `src/lib/firebase.ts`, `src/App.tsx` |
| 로그인 전 Firestore 구독 제거 | 완료 | `src/App.tsx` |
| 관리자 비밀번호 제거 | 완료 | `src/App.tsx` |
| 관리자 로그인 분리 | 완료 | `src/App.tsx` |
| 관리자 Custom Claim 확인 | 완료 | `src/App.tsx` |
| Firestore Rules 초안 | 완료, production 미배포 | `firestore.rules`, `firebase.json`, `firestore.indexes.json` |
| Rules Emulator 테스트 | 완료, 통과 | `scripts/firestore-rules-emulator-test.mjs` |
| admin claim 운영 스크립트 | 완료 | `scripts/set-admin-claim.mjs` |

## 현재 구조 제약

대부분의 앱 로직이 여전히 `src/App.tsx`에 집중되어 있다. 인증 흐름, 관리자/학생 view 상태, Firestore read/write, CSV 처리, 퀴즈 흐름, 결과 생성, toast 상태, loading 상태, 큰 JSX 영역이 한 파일에 함께 있다.

다음 리팩토링은 Firestore collection 이름 변경이나 DB migration 없이 위험을 줄이는 방향으로 진행해야 한다.

## 다음 리팩토링 순서

### Step 1 - production Rules 적용 준비

| 작업 | 이유 |
|---|---|
| Preview 기본 동작 점검 | Rules 배포가 실제 사용자 흐름을 막을 수 있음 |
| 관리자 claim 계정 확인 | 관리자 Rules가 `admin: true`에 의존 |
| 롤백 경로 준비 | Rules 오류는 production 데이터 접근을 즉시 막을 수 있음 |
| owner 승인 후 Rules 배포 | 현재 production 데이터 위험이 존재 |

### Step 2 - Auth service 분리

권장 파일:

```text
src/services/authService.ts
src/hooks/useAuth.ts
```

분리 대상:

| 현재 영역 | 새 책임 |
|---|---|
| 학생 로그인/회원가입 | `signInStudent`, `registerStudent` |
| 관리자 로그인 | `signInAdmin` |
| claim 확인 | `assertAdminClaim`, `getCurrentClaims` |
| 로그아웃 | `signOutCurrentUser` |
| profile 로드 | `loadUserProfile` |

학생 UX는 아직 변경하지 않는다. 우선 현재 동작을 격리해 다음 단계에서 학생 공통 인증값을 안전하게 제거할 수 있게 한다.

### Step 3 - Firestore service 분리

권장 파일:

```text
src/services/courseService.ts
src/services/resultService.ts
src/services/questionBankService.ts
src/services/progressService.ts
```

service 구현에서는 현재 collection 이름을 유지한다.

| 현재 collection | service domain 이름 |
|---|---|
| `exams` | course service |
| `results` | result service |
| `questionBank` | question bank service |
| `studyProgress` | study progress service |
| `testProgress` | quiz progress service |

이렇게 하면 DB migration 없이 가독성과 Rules 디버깅 가능성을 높일 수 있다.

### Step 4 - 학생 인증 개선

owner/admin 입력이 필요한 항목:

| 필요한 입력 | 이유 |
|---|---|
| 사번 검증 원천 | 신뢰할 수 있는 데이터 없이는 허위 사번 차단 불가 |
| 계정 lifecycle 정책 | 등록, 비밀번호 재설정, 퇴사자 처리 기준 필요 |
| 공통 인증값 대체 정책 | 공통 인증값을 `VITE_*`로 옮기면 보안 해결이 아님 |

가능한 방식:

| 방식 | 적합도 |
|---|---|
| 관리자 사전 등록 | 내부 운영용 1차 통제로 적합 |
| 일회용 등록코드 | 배포/회수 절차가 있으면 적합 |
| Vercel/Firebase Function 검증 | 사번 UX 유지와 보안을 함께 만족 |
| 회사 SSO/email | 장기적으로 가장 안정적 |

### Step 5 - 결과 무결성 개선

결과 관련 로직을 먼저 테스트 가능한 함수로 분리한다.

```text
src/services/resultService.ts
src/utils/scoring.ts
```

이후 Vercel Function 또는 Firebase Function으로 서버 측 검증/채점을 추가한다. Firestore Rules만으로 client가 제출한 점수가 실제 정답 기반인지 완전히 증명할 수 없다.

### Step 6 - UI/UX 안정성 보강

| 영역 | 개선 방향 |
|---|---|
| 권한 실패 | 명확한 오류 상태와 복구 action 제공 |
| 저장 실패 | 저장 성공 전 완료 화면으로 이동하지 않음 |
| loading 상태 | auth loading, data loading, save loading 분리 |
| 모바일 navigation | 뒤로가기/나가기 동작 일관화 |
| 접근성 | label, focus 처리, `aria-live` toast 보강 |

### Step 7 - 성능과 build 개선

| 영역 | 개선 방향 |
|---|---|
| bundle size | 관리자/학생 module 분리 또는 manualChunks 적용 |
| Tailwind CDN | build-time Tailwind로 전환 |
| Firestore read | 필요한 곳에 pagination/limit 적용 |
| Vercel Node | owner 합의 후 version pin 추가 |

## 아직 하지 않을 작업

| 보류 항목 | 이유 |
|---|---|
| Firestore collection rename | migration 필요 |
| DB schema migration | 현재 보안 baseline에는 불필요 |
| client-side 직원 allowlist | 직원 명부가 노출됨 |
| secret을 `VITE_*`에 저장 | browser bundle에 노출됨 |
| 점검 없는 Firestore Rules 배포 | 관리자/학생 흐름 차단 가능 |

## commit 전 안전 체크리스트

```powershell
git status --short
git grep --untracked -n -e "[SENSITIVE_PATTERN]" -- . ':!docs/internal/**' ':!.env.local' ':!dist/**' ':!node_modules/**'
npm.cmd run build
```

허용 가능한 발견은 `admin: true` 정책 설명과 테스트용 claim이다. `src/App.tsx`에 남아 있는 학생 공통 인증값은 기존 미해결 보안 이슈이며, 다음 보안 변경에서 제거해야 한다.

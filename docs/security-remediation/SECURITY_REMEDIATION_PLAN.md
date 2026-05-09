# 보안 개선 계획

## 현재 상태 요약

이 문서는 현재 repository 상태를 기준으로 작성한다. 실제 비밀번호, service account key, Firebase 실값, 관리자 식별자, uid, 직원 데이터는 포함하지 않는다.

| 영역 | 현재 상태 |
|---|---|
| Firebase client config | `src/lib/firebase.ts`로 분리, `VITE_FIREBASE_*`에서 로드 |
| 로컬 env | `.env.local` 구성 완료, Git 추적 제외 |
| Vercel env | Preview/Production env 등록 완료, 현재 동일 Firebase web client config 사용 |
| 로그인 전 Firestore 구독 | 민감 collection 기준 제거 완료 |
| 관리자 비밀번호 비교 | 제거 완료 |
| 관리자 로그인 | 별도 관리자 ID/password Firebase Auth 흐름 |
| 관리자 권한 | Firebase ID token의 `admin: true` Custom Claim |
| 관리자 계정/claim | 운영자 생성 및 claim 부여 완료, 로그인 확인 완료 |
| Firestore Rules | production 배포 완료, Emulator 20개 시나리오 통과 |
| production Rules 배포 | 완료, 운영자 확인 기준 |
| 학생 공통 인증값 | 미해결 |
| 사번 실제 직원 검증 | 구현 없음, 외부 정책/원천 데이터 필요 |

## 현재 보안 상태

| 심각도 | 위험 | 현재 원인 | 현재 상태 | 필요한 조치 |
|---|---|---|---|---|
| 치명 | 학생 도용 | 학생 흐름에 공통 인증 구조가 남아 있음 | 미해결 | 개인별 또는 검증된 인증으로 전환 |
| 치명 | 허위 사번 등록 | 실제 직원 명부 검증 없음 | 미해결 | 서버 측 또는 관리자 통제 검증 추가 |
| 높음 | Rules 배포 후 전체 smoke test 일부 미확인 | production Rules 적용 후 일부 운영 흐름 결과가 문서상 미확인 | 추가 확인 필요 | 관리자 CRUD와 학생 결과 저장/조회 확인 |
| 높음 | Preview 테스트가 production 데이터에 영향 | Preview와 Production이 같은 Firebase project 사용 | 미해결 | staging Firebase project 생성 |
| 높음 | 결과 위변조 가능성 | browser가 점수/결과 payload를 생성 | 미해결 | 서버 측 검증/채점 도입 |
| 보통 | 큰 bundle | 단일 entry에 Firebase/관리자/학생 UI 포함 | 미해결 | code splitting/manualChunks 적용 |
| 보통 | Tailwind CDN runtime 의존 | 외부 runtime script에 의존 | 미해결 | build-time Tailwind 전환 |

## 완료된 보안 작업

| 완료 항목 | 파일 |
|---|---|
| Firebase config env 분리 | `src/lib/firebase.ts`, `.env.example`, `.gitignore`, `src/App.tsx` |
| env 누락 시 명확한 오류 | `src/lib/firebase.ts` |
| 로그인 전 민감 데이터 구독 제거 | `src/App.tsx` |
| 관리자 로그인과 학생 흐름 분리 | `src/App.tsx` |
| 관리자 하드코딩 비밀번호 비교 제거 | `src/App.tsx` |
| 관리자 Custom Claim 확인 추가 | `src/App.tsx` |
| claim 없는 관리자 로그인 차단 | `src/App.tsx` |
| Firestore Rules 추가 및 production 배포 | `firestore.rules`, `firebase.json`, `firestore.indexes.json` |
| Rules Emulator 테스트 추가 및 실행 | `scripts/firestore-rules-emulator-test.mjs` |
| admin claim 운영 스크립트 추가 | `scripts/set-admin-claim.mjs` |
| admin claim 운영 문서 추가 | `docs/operations/ADMIN_CLAIM_SETUP.md` |

## 현재 관리자 보안 모델

| 계층 | 정책 |
|---|---|
| 관리자 login ID | 학생 사번 namespace와 분리 |
| 내부 Auth email | `${adminId}@wuerth-admin.exam` |
| 인증 | Firebase Auth email/password |
| 권한 | `admin: true` Custom Claim |
| 앱 guard | `getIdTokenResult(user, true)`와 `claims.admin === true` |
| Firestore Rules | `request.auth.token.admin == true` |
| secret 취급 | 관리자 비밀번호/secret을 코드나 `VITE_*` env에 저장하지 않음 |

Custom Claim은 Firebase Admin SDK 또는 안전한 운영 절차로만 부여한다. 웹 client가 자기 자신에게 관리자 claim을 부여하는 구조는 허용하지 않는다.

## 남은 개선 계획

### Phase 1 - production 보호 장치 운영 안정화

목표: production에 적용된 Rules가 실제 운영 흐름과 충돌하지 않는지 확인한다.

| 작업 | 대상 | 메모 |
|---|---|---|
| Emulator 테스트 결과 확인 | `docs/security-remediation/FIRESTORE_RULES_EMULATOR_TEST.md` | 현재 통과 |
| Firestore Rules production 배포 | Firebase Console/CLI | 완료, 운영자 확인 기준 |
| production 기본 동작 점검 | Production URL | 관리자 CRUD와 학생 결과 저장/조회 추가 확인 필요 |
| Vercel Preview 기본 동작 점검 | Vercel Preview URL | 동일 Firebase project 위험 수용 필요 |

### Phase 2 - 학생 인증 개선

목표: 학생 공통 인증값과 허위 사번 등록 위험을 제거한다.

| 작업 | 필요한 owner 입력 |
|---|---|
| 사번 검증 방식 선택 | owner/admin/IT 결정 |
| 직원 allowlist 또는 검증 endpoint 제공 | HR/system owner/backend |
| 학생 계정 lifecycle 결정 | 운영자 |
| 학생 공통 인증값 제거 | 정책 확정 후 개발 진행 |

권장 1차 방식은 사번 UX를 유지하면서 관리자 사전 등록 또는 서버 측 검증을 추가하는 것이다.

### Phase 3 - 결과 무결성 개선

목표: client가 계산한 결과 payload를 그대로 신뢰하지 않는다.

| 작업 | 방향 |
|---|---|
| 결과 생성/채점 로직 분리 | 테스트 가능한 함수로 이동 |
| 서버 측 검증/채점 추가 | Vercel Function 또는 Firebase Function |
| 중복/비정상 제출 방지 | transaction 또는 idempotency 설계 |

### Phase 4 - 유지보수성과 runtime 안정성 개선

| 작업 | 방향 |
|---|---|
| Auth 로직 분리 | `src/services/authService.ts`, `src/hooks/useAuth.ts` |
| Firestore 접근 분리 | domain별 service module |
| error/loading UX 개선 | 권한, 네트워크, 저장 실패 안내 |
| Tailwind CDN 제거 | build-time Tailwind 구성 |
| bundle size 개선 | code splitting/manualChunks |

## GitHub 공개 기준

올려도 되는 것:

| 항목 | 조건 |
|---|---|
| `.env.example` | placeholder만 포함 |
| public docs | 실제 인증값과 우회 절차 없음 |
| Firebase client 변수명 | 변수명만 포함 |
| Firestore Rules | 실제 uid/email/project 값 없음 |
| admin claim script | secret 내장 없음 |

올리면 안 되는 것:

| 항목 | 이유 |
|---|---|
| 실제 관리자 비밀번호 | 관리자 권한 노출 |
| 실제 학생 공통 인증값 | 학생 계정 도용 위험 |
| service account JSON | Firebase Admin 권한 노출 |
| private key/client email 값 | 서버 권한 노출 |
| `.env.local`/`.env.production` | 실제 환경값 포함 가능 |
| 실제 관리자 uid/email | 운영 계정 표적화 위험 |

## 다음 권장 코드 작업

1. collection rename이나 DB migration은 아직 하지 않는다.
2. 현재 관리자 claim 흐름을 기준 상태로 유지한다.
3. Rules 배포 후 production smoke test를 완료한다.
4. owner에게 사번 검증 원천/정책을 요청한다.
5. 정책 확정 후 학생 공통 인증값을 제거한다.
6. 더 큰 UX 변경 전에 auth/firestore 로직을 service로 분리한다.

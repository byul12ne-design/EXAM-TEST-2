# 최종 요약

## 현재 구현 상태

| 항목 | 현재 상태 |
|---|---|
| Firebase env 분리 | 완료 |
| 로그인 전 Firestore 전체 구독 제거 | 완료 |
| Firestore Rules 초안 | 작성 완료 |
| Firestore Rules Emulator 테스트 | 20개 시나리오 통과 |
| 관리자 하드코딩 비밀번호 | 제거 완료 |
| 관리자 로그인 분리 | 완료 |
| 관리자 인증 방식 | 관리자 ID + Firebase Auth 비밀번호 |
| 관리자 권한 확인 | Firebase ID token의 `admin: true` Custom Claim |
| 관리자 Auth 계정 | 운영자가 1개 생성 완료 |
| 관리자 Custom Claim | 운영자가 부여 완료 |
| 실제 관리자 로그인 | 운영자가 확인 완료 |
| Firestore Rules production 배포 | 미적용 |

## 현재 검증 결과

| 검증 항목 | 결과 |
|---|---|
| `npm.cmd run build` | 통과 |
| 로컬 Vite dev server | 통과 |
| 로컬 첫 진입 HTTP 확인 | 통과 |
| Firestore Rules Emulator | 20개 통과 / 실패 0개 |
| admin claim script 문법 검사 | 통과 |
| admin claim script 실제 적용 없는 테스트 실행 | 통과 |
| production 배포 | 수행하지 않음 |

자세한 결과는 `docs/operations/SMOKE_TEST_RESULTS.md`에 기록한다.

## 완료된 보안 개선

| 완료 항목 | 상태 |
|---|---|
| Firebase client configuration env 분리 | 완료 |
| `.env.example` 추가 | 완료 |
| `.gitignore` env/internal/service account 패턴 보강 | 완료 |
| 로그인 전 민감 Firestore 구독 제거 | 완료 |
| 관리자 하드코딩 비밀번호 접근 제거 | 완료 |
| 관리자 로그인 UI 분리 | 완료 |
| 관리자 내부 email namespace 적용 | 완료 |
| 관리자 Custom Claim 확인 추가 | 완료 |
| Custom Claim 없는 관리자 로그인 차단 | 완료 |
| Firestore Rules 초안 추가 | 완료 |
| Rules Emulator 테스트 추가 및 통과 | 완료 |
| admin claim 운영 스크립트 추가 | 완료 |

## 남은 주요 위험

| 심각도 | 항목 | 현재 상태 | 다음 조치 |
|---|---|---|---|
| 치명 | 학생 공통 인증값 | 미해결 | 개인별 인증 또는 검증된 등록 흐름으로 전환 |
| 치명 | 실제 직원 사번 검증 | 미해결 | owner가 검증 정책 또는 원천 데이터를 제공해야 함 |
| 치명 | Firestore Rules production 배포 | 미적용 | Preview/운영 전 기본 동작 점검 및 롤백 준비 후 배포 |
| 높음 | Preview와 Production 동일 Firebase project 사용 | 미해결 | staging Firebase project 분리 |
| 높음 | 점수/결과 payload client 계산 | 미해결 | 서버 측 채점 또는 검증 도입 |
| 보통 | Tailwind CDN runtime 의존 | 미해결 | build-time Tailwind 구성으로 전환 |
| 보통 | 큰 JS chunk 경고 | 미해결 | code splitting 또는 manualChunks 적용 |
| 보통 | lint/test npm script 부재 | 미해결 | ESLint/Vitest 등 도입 |

## 운영 가능 수준 평가

| 수준 | 평가 |
|---|---|
| 로컬 개발 | 사용 가능 |
| Vercel Preview | 주의 필요 상태 |
| 제한적 내부 운영 | 알려진 보안 한계를 수용하는 경우에만 가능 |
| production/상용 운영 | 아직 불가 |

관리자 권한 구조는 크게 개선되었지만, 학생 인증, 사번 검증, production Rules 배포, 결과 무결성이 아직 남아 있어 production 운영 가능 상태로 보기는 어렵다.

## 다음 우선순위

1. owner가 승인한 사번 검증 방식을 확정한다.
2. 학생 공통 인증값을 제거한다.
3. Preview 점검과 롤백 준비 후 Firestore Rules를 production에 배포한다.
4. Preview와 Production Firebase project를 분리한다.
5. 점수/결과 검증을 서버 측으로 이동한다.
6. 인증과 Firestore 접근 로직을 `src/App.tsx`에서 분리한다.

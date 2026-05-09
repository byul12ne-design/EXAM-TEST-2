# 관리자 로그인 분리 완료 기록

## 현재 상태

관리자 로그인 분리는 구현 완료 상태다. 이 문서는 과거 계획이 아니라 현재 구현 결과와 남은 보안 과제를 짧게 기록한다.

| 항목 | 현재 상태 |
|---|---|
| 학생 로그인 UX | 기존 사번 기반 흐름 유지 |
| 관리자 로그인 UI | 별도 관리자 ID + 비밀번호 form |
| 관리자 ID namespace | 학생 사번 namespace와 분리 |
| 내부 관리자 email | `${adminId}@wuerth-admin.exam` |
| 관리자 인증 | Firebase Auth `signInWithEmailAndPassword` |
| 관리자 권한 확인 | ID token의 `admin: true` Custom Claim |
| claim 없는 계정 처리 | 즉시 로그아웃 후 접근 차단 |
| 관리자 하드코딩 비밀번호 | 제거 완료 |
| Firestore Rules | production 배포 완료, `request.auth.token.admin == true` 사용 |

실제 관리자 ID, email, uid, 비밀번호, service account 경로, Firebase project 실값은 이 문서에 기록하지 않는다.

## 구현 요약

관리자 ID는 lowercase로 normalize한 뒤 내부 Firebase Auth email로 변환한다. 로그인 성공 후 앱은 `getIdTokenResult(user, true)`로 token을 갱신하고 `claims.admin === true`일 때만 관리자 대시보드 진입을 허용한다.

운영 절차와 권한 부여/회수 방법은 `docs/operations/ADMIN_CLAIM_SETUP.md`를 기준으로 한다.

## 학생 흐름 영향

관리자 로그인 분리는 학생 onboarding이나 학생 인증 구조를 변경하지 않았다.

| 남은 학생 인증 이슈 | 상태 |
|---|---|
| 학생 공통 인증값 | 미해결 |
| 사번 실제 직원 검증 | 외부 정책/원천 데이터 필요 |
| 결과 payload client 계산 | 서버 측 검증 필요 |

## 남은 작업

| 우선순위 | 작업 | 이유 |
|---|---|---|
| P0 | 학생 공통 인증값 제거 | 학생 계정 도용 위험 완화 |
| P0 | 사번 검증 원천/정책 확정 | 허위 사번 가입 차단 |
| P0 | Rules 배포 후 전체 smoke test 완료 | 관리자 CRUD와 학생 결과 저장/조회 확인 |
| P1 | auth 로직 service/hook 분리 | `src/App.tsx` 집중도 완화 |


# 관리자 로그인 분리 현황

## 현재 상태

이 문서의 계획은 현재 코드에 구현되어 있다.

| 항목 | 현재 상태 |
|---|---|
| 학생 로그인 UX | 유지 |
| 관리자 로그인 UI | 별도 구현 완료 |
| 관리자 ID namespace | 학생 사번 namespace와 분리 |
| 내부 관리자 email | `${adminId}@wuerth-admin.exam` |
| 관리자 인증 | Firebase Auth `signInWithEmailAndPassword` |
| 관리자 권한 확인 | Firebase ID token의 `admin: true` Custom Claim |
| claim 없는 계정 처리 | 즉시 로그아웃 후 접근 차단 |
| 관리자 하드코딩 비밀번호 | 제거 완료 |
| Firestore collection rename | 수행하지 않음 |
| DB migration | 수행하지 않음 |
| Firestore Rules production 배포 | 미적용 |

실제 관리자 ID, email, uid, 비밀번호, service account 경로, Firebase project 실값은 기록하지 않는다.

## 구현된 흐름

| 순서 | 동작 |
|---|---|
| 1 | 사용자가 로그인 카드에서 관리자 로그인 화면으로 이동 |
| 2 | 관리자 ID와 비밀번호 입력 |
| 3 | 앱이 관리자 ID를 lowercase로 normalize |
| 4 | 앱이 내부 Firebase Auth email을 `${adminId}@wuerth-admin.exam` 형식으로 생성 |
| 5 | `signInWithEmailAndPassword(auth, adminEmail, password)` 호출 |
| 6 | `getIdTokenResult(user, true)` 호출 |
| 7 | `claims.admin === true`이면 `admin-dash` 진입 |
| 8 | claim이 없으면 `signOut(auth)` 후 권한 오류 표시 |

구현 형태:

```ts
const adminEmail = `${normalizedAdminId}@wuerth-admin.exam`;
const credential = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
const token = await getIdTokenResult(credential.user, true);

if (token.claims.admin !== true) {
  await signOut(auth);
  throw new Error('ADMIN_CLAIM_REQUIRED');
}
```

## 실제 코드 기준 위치

| 영역 | 파일 | 현재 역할 |
|---|---|---|
| Auth import | `src/App.tsx` | Firebase Auth login/logout/token 함수 사용 |
| 관리자 로그인 state | `src/App.tsx` | 관리자 ID/password form 값 보관 |
| 관리자 로그인 handler | `src/App.tsx` | Firebase Auth 로그인과 claim 확인 수행 |
| 관리자 접근 재확인 | `src/App.tsx` | 기존 session의 claim 재검증 |
| 관리자 데이터 구독 | `src/App.tsx` | `isAdmin && isAdminView`일 때만 실행 |
| Firestore Rules 정책 | `firestore.rules` | `request.auth.token.admin == true` 사용 |

## 학생 흐름 영향

| 학생 흐름 | 현재 상태 |
|---|---|
| 사번 입력 | 유지 |
| 학생 pseudo email | 유지 |
| 학생 회원가입/로그인 | 유지 |
| 학생 공통 인증값 | 미해결 |
| 사번 실제 직원 검증 | 외부 정책/원천 데이터 필요 |

이번 관리자 로그인 분리 작업은 학생 onboarding이나 학생 인증 구조를 변경하지 않았다.

## Firebase 운영 필요사항

운영자는 현재 관리자 Firebase Auth 계정 1개를 생성했고 `admin: true` Custom Claim을 부여했다. 이후 관리자 계정을 추가할 때도 같은 정책을 따른다.

| 요구사항 | 정책 |
|---|---|
| 계정 생성 | Firebase Authentication 사용자로 먼저 생성 |
| email 규칙 | `${adminId}@wuerth-admin.exam` |
| 비밀번호 | Firebase Auth와 보안 채널에서만 관리 |
| claim | `admin: true` |
| claim 반영 | 재로그인 또는 token refresh 필요 |
| 권한 회수 | `admin` claim 제거 후 재로그인 강제 |

운영 절차는 `docs/operations/ADMIN_CLAIM_SETUP.md`를 기준으로 한다.

## 남은 작업

| 우선순위 | 작업 | 이유 |
|---|---|---|
| P0 | 학생 공통 인증값 제거 | 현재 학생 인증은 도용 위험이 남아 있음 |
| P0 | 사번 검증 원천/정책 확정 | 허위 사번 가입을 막을 수 없음 |
| P0 | Firestore Rules production 배포 | repository Rules는 배포 전까지 production에 적용되지 않음 |
| P1 | auth 로직 service/hook 분리 | 현재 로직이 `App.tsx`에 집중되어 있음 |
| P1 | 인증/loading/error UX 보강 | claim 실패와 네트워크 실패 안내가 더 명확해야 함 |

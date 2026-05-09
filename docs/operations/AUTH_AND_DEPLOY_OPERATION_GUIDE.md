# 인증 및 배포 운영 가이드

## 목적

이 문서는 운영자가 Firebase CLI 로그인/로그아웃, 관리자 앱 로그인/로그아웃, Firestore Rules 배포, 배포 후 기본 동작 점검을 한 곳에서 확인할 수 있도록 정리한다.

실제 Firebase project id, 관리자 ID, 관리자 email, uid, 비밀번호, service account 경로, private key는 이 문서에 기록하지 않는다.

## 현재 운영 상태 요약

| 항목 | 현재 상태 |
|---|---|
| 관리자 앱 로그인 | Firebase Auth 관리자 ID/password 방식 |
| 관리자 권한 | `admin: true` Custom Claim 필요 |
| 학생 로그인 | 기존 사번 기반 UX 유지 |
| Firestore Rules | production 배포 완료, 운영자 확인 기준 |
| 기존 production Rules 백업 | internal 영역 또는 repository 밖 보관 |
| Preview/Production Firebase | 현재 동일 Firebase project 사용 중 |

## Firebase CLI 로그인

PowerShell 기준:

```powershell
npx.cmd firebase-tools login
```

로그인된 계정 확인:

```powershell
npx.cmd firebase-tools login:list
```

project 목록 확인:

```powershell
npx.cmd firebase-tools projects:list
```

주의:

- Firebase project 권한이 있는 Google 계정으로 로그인한다.
- 로그인 계정은 문서나 commit message에 기록하지 않는다.
- 공용 PC 또는 임시 작업 환경에서는 작업 후 반드시 로그아웃한다.

## Firebase CLI 로그아웃

```powershell
npx.cmd firebase-tools logout
```

로그아웃 확인:

```powershell
npx.cmd firebase-tools login:list
```

로그아웃 후 다시 작업해야 하면 다음 순서로 진행한다.

```powershell
npx.cmd firebase-tools login
npx.cmd firebase-tools login:list
```

## 관리자 앱 로그인

관리자 앱 로그인은 학생 사번 로그인과 분리되어 있다.

| 항목 | 정책 |
|---|---|
| 입력값 | 관리자 ID + 비밀번호 |
| 내부 Firebase Auth email | `${adminId}@wuerth-admin.exam` |
| 인증 방식 | Firebase Auth `signInWithEmailAndPassword` |
| 권한 확인 | ID token의 `admin: true` Custom Claim |
| claim 없는 계정 | 즉시 로그아웃 후 접근 차단 |

운영 절차:

1. 앱에서 관리자 로그인 화면으로 이동한다.
2. 관리자 ID와 비밀번호를 입력한다.
3. 관리자 대시보드 진입 여부를 확인한다.
4. 진입 실패 시 해당 Firebase Auth 계정에 `admin: true` Custom Claim이 있는지 확인한다.
5. claim을 새로 부여했다면 로그아웃 후 다시 로그인한다.

## 관리자 앱 로그아웃

앱 우측 상단 또는 제공된 로그아웃 버튼을 사용한다.

claim 변경 후에는 반드시 다음을 수행한다.

1. 앱에서 로그아웃한다.
2. 다시 로그인한다.
3. 관리자 대시보드 접근 가능 여부를 확인한다.

이유:

- Firebase Custom Claim은 기존 ID token에 즉시 반영되지 않을 수 있다.
- 앱은 관리자 접근 시 `getIdTokenResult(user, true)`로 token refresh를 시도하지만, 운영 확인에서는 재로그인이 가장 명확하다.

## admin Custom Claim 부여/회수

자세한 절차는 `docs/operations/ADMIN_CLAIM_SETUP.md`를 기준으로 한다.

부여 예시:

```powershell
npm run admin:claim -- --uid "[ADMIN_UID]" --service-account "[LOCAL_SERVICE_ACCOUNT_JSON_PATH]" --action grant --confirm
```

회수 예시:

```powershell
npm run admin:claim -- --uid "[ADMIN_UID]" --service-account "[LOCAL_SERVICE_ACCOUNT_JSON_PATH]" --action revoke --confirm
```

주의:

- 실제 uid와 service account 경로는 문서에 기록하지 않는다.
- `--confirm`이 없으면 실제 적용 없는 테스트 실행으로 동작한다.
- service account JSON은 Git에 commit하지 않는다.

## Firestore Rules 재배포 전 확인

Firestore Rules는 production에 배포된 상태다. Rules를 다시 변경하거나 재배포할 때는 반드시 현재 production Rules를 백업한다.

권장 백업 위치:

```text
docs/internal/
```

또는 repository 밖 안전한 위치.

주의:

- `docs/internal/`은 Git 추적 제외 대상이다.
- 백업 Rules 파일은 public repository에 commit하지 않는다.
- 기존 Rules가 open rule이어도 롤백용 백업은 남긴다.

재배포 전 최소 확인:

| 확인 항목 | 기준 |
|---|---|
| Firebase CLI 로그인 | `npx.cmd firebase-tools login:list`에서 계정 확인 |
| project 확인 | 대상 Firebase project id 확인 |
| 현재 Rules 백업 | Firebase Console Rules 내용을 복사 저장 |
| 관리자 로그인 | admin claim 계정으로 대시보드 진입 가능 |
| 학생 화면 | 로그인/회원가입 화면 진입 가능 |
| build | `npm.cmd run build` 통과 |
| Emulator | Firestore Rules Emulator 테스트 통과 |

## Firestore Rules 재배포

재배포 전 `firestore.rules`와 `firebase.json`이 현재 repository 기준인지 확인한다.

배포 명령:

```powershell
npx.cmd firebase-tools deploy --only firestore:rules --project "[FIREBASE_PROJECT_ID]"
```

주의:

- 실제 project id는 문서에 기록하지 않는다.
- 배포 중 오류가 발생하면 오류 메시지를 기록하되, 민감값은 제거한다.
- 재배포 직후 바로 기본 동작 점검을 수행한다.

## 배포 후 기본 동작 점검

관리자:

| 확인 항목 | 기대 결과 |
|---|---|
| 관리자 로그인 | 성공 |
| 관리자 대시보드 진입 | 성공 |
| 과정 목록 조회 | 성공 |
| 문제은행 조회 | 성공 |
| 결과 목록 조회 | 성공 |
| 과정 생성/수정/삭제 | 필요한 운영 범위에서 성공 |
| 문제 생성/수정/삭제 | 필요한 운영 범위에서 성공 |

학생:

| 확인 항목 | 기대 결과 |
|---|---|
| 학생 로그인/회원가입 화면 | 표시 |
| 학생 로그인 또는 회원가입 | 성공 |
| 공개 과정 조회 | 성공 |
| 학습/퀴즈 진입 | 성공 |
| 답안 선택 | 성공 |
| 결과 저장 | 성공 |
| 본인 결과 조회 | 성공 |

차단:

| 확인 항목 | 기대 결과 |
|---|---|
| 로그아웃 상태 민감 데이터 접근 | 차단 |
| 학생 계정의 관리자 화면 접근 | 차단 |
| claim 없는 계정의 관리자 접근 | 차단 |
| 학생의 `questionBank` 접근 | 차단 |
| 학생의 다른 사용자 결과 접근 | 차단 |

## 롤백 절차

배포 후 앱 사용이 치명적으로 막히면 다음 순서로 롤백한다.

1. Firebase Console의 Firestore Rules 화면을 연다.
2. 백업해 둔 기존 Rules 내용을 붙여넣는다.
3. Publish를 실행한다.
4. 앱 기본 동작을 다시 확인한다.
5. 문제 상황을 기록한다.

주의:

- 기존 Rules가 open rule이었다면 롤백은 긴급 기능 복구용으로만 사용한다.
- 롤백 후에는 가능한 빨리 제한된 Rules를 다시 수정해 배포한다.

## 자주 보는 오류

| 오류 | 의미 | 조치 |
|---|---|---|
| `Failed to authenticate, have you run firebase login?` | Firebase CLI 로그인 없음 | `npx.cmd firebase-tools login` 실행 |
| `Permission denied` | 로그인 계정에 project 권한 없음 | Firebase project 권한 계정으로 로그인 |
| 관리자 로그인 성공 후 접근 차단 | `admin: true` claim 없음 또는 token 미갱신 | claim 확인 후 로그아웃/재로그인 |
| 학생 결과 저장 실패 | Rules와 result payload 불일치 가능 | Console error와 `results` create rule 확인 |
| 관리자 목록 조회 실패 | admin claim 또는 Rules 배포 문제 가능 | claim, token refresh, Rules 확인 |

## 관련 문서

| 문서 | 용도 |
|---|---|
| `docs/operations/ADMIN_CLAIM_SETUP.md` | 관리자 Custom Claim 부여/회수 |
| `docs/operations/SMOKE_TEST_RESULTS.md` | 현재 기본 동작 점검 결과 |
| `docs/security-remediation/FIREBASE_RULES_PLAN.md` | Firestore Rules 정책과 운영 상태 |
| `docs/operations/VERCEL_ENV_STATUS.md` | Vercel env 운영 상태 |
| `docs/archive/` | 완료되었거나 중복된 이전 점검 문서 |


# 관리자 Custom Claim 설정 절차

## 목적

이 문서는 관리자 권한을 부여하고 확인하는 현재 운영 절차를 정리한다.

현재 앱은 관리자 화면 진입 전에 Firebase Auth ID token의 Custom Claim을 확인한다.

Firebase CLI 로그인/로그아웃과 Firestore Rules 배포 절차는 `docs/operations/AUTH_AND_DEPLOY_OPERATION_GUIDE.md`를 함께 확인한다.

```text
admin: true
```

웹 앱은 이 claim이 있을 때만 관리자 화면 접근을 허용한다. production에 배포된 Firestore Rules도 동일하게 `request.auth.token.admin == true` 정책을 사용한다.

실제 관리자 ID, email, uid, 비밀번호, service account 경로, private key, Firebase project 실값은 이 문서에 기록하지 않는다.

## 현재 상태

| 항목 | 현재 상태 |
|---|---|
| 관리자 하드코딩 비밀번호 | 제거 완료 |
| 관리자 로그인 UI | 별도 관리자 ID + 비밀번호 form 구현 완료 |
| 내부 관리자 email 형식 | `${adminId}@wuerth-admin.exam` |
| 관리자 Auth 계정 | 운영자가 1개 생성 완료 |
| 관리자 Custom Claim | 운영자가 `admin: true` 부여 완료 |
| 실제 관리자 로그인 | 운영자가 확인 완료 |
| Firestore Rules production 배포 | 완료, 운영자 확인 기준 |
| 학생 인증 위험 | 학생 공통 인증값과 사번 검증 문제가 남아 있음 |

## 필요한 권한

| 작업 | 필요한 권한 |
|---|---|
| 관리자 Auth user 생성 | Firebase Authentication 사용자 관리 권한 |
| Custom Claim 부여/회수 | Firebase Admin SDK 실행 권한 |
| Firestore Rules 배포 | Firebase Rules 배포 권한 |
| Vercel 배포 확인 | Vercel project 접근 권한 |

## 관리자 계정 형식

관리자 계정은 앱에서 로그인하기 전에 Firebase Authentication에 먼저 생성되어 있어야 한다.

| 항목 | 정책 |
|---|---|
| 관리자 ID | 학생 사번 namespace와 분리 |
| Firebase Auth email | `${adminId}@wuerth-admin.exam` |
| 비밀번호 | Firebase Auth와 보안 채널에서만 관리 |
| 권한 claim | `admin: true` |

실제 관리자 ID, 생성된 email, uid, 비밀번호는 public 문서나 Git에 남기지 않는다.

## 준비된 일회성 운영 스크립트

repository에는 로컬 운영용 스크립트가 준비되어 있다.

```text
scripts/set-admin-claim.mjs
```

이 스크립트는 Firebase Admin SDK를 사용하며, 민감 입력값은 환경변수 또는 CLI 인자로만 받는다.

필수 입력:

| 입력 | 허용 방식 |
|---|---|
| service account JSON 경로 | `--service-account`, `FIREBASE_SERVICE_ACCOUNT_PATH`, `GOOGLE_APPLICATION_CREDENTIALS` |
| 관리자 uid | `--uid`, `FIREBASE_ADMIN_UID`, `ADMIN_UID` |
| 작업 | `--action grant` 또는 `--action revoke` |
| 실제 적용 확인 | `--confirm` 또는 `CONFIRM_ADMIN_CLAIM=true` |

기본값은 실제 적용 없는 테스트 실행이다. `--confirm`이 없으면 Firebase 값을 변경하지 않는다.

부여 예시:

```powershell
npm run admin:claim -- --uid "[ADMIN_UID]" --service-account "[LOCAL_SERVICE_ACCOUNT_JSON_PATH]" --action grant --confirm
```

회수 예시:

```powershell
npm run admin:claim -- --uid "[ADMIN_UID]" --service-account "[LOCAL_SERVICE_ACCOUNT_JSON_PATH]" --action revoke --confirm
```

환경변수 사용 예시:

```powershell
$env:FIREBASE_ADMIN_UID="[ADMIN_UID]"
$env:FIREBASE_SERVICE_ACCOUNT_PATH="[LOCAL_SERVICE_ACCOUNT_JSON_PATH]"
npm run admin:claim -- --action grant --confirm
```

## service account 취급 원칙

다음 파일과 값은 절대 commit하지 않는다.

| 금지 항목 | 이유 |
|---|---|
| service account JSON | Firebase Admin 권한 노출 |
| service account private key | 서버 권한 탈취 위험 |
| service account client email 값 | 운영 계정 식별 정보 노출 |
| 실제 관리자 uid/email/password | 관리자 계정 표적화 위험 |
| secret이 포함된 shell history/log | 로컬 유출 위험 |

`.gitignore`에는 local service account 파일 패턴이 포함되어 있다.

```text
serviceAccount*.json
*.service-account.json
*.service-account.local.json
firebase-adminsdk*.json
```

## token refresh 필요성

Custom Claim 변경은 이미 발급된 ID token에 즉시 반영되지 않을 수 있다.

`admin: true` 부여 또는 회수 후에는 다음 절차를 따른다.

1. 대상 관리자 사용자를 로그아웃한다.
2. 다시 로그인한다.
3. 앱이 관리자 로그인/접근 시 `getIdTokenResult(user, true)`를 호출한다.
4. 관리자 화면 접근이 허용 또는 차단되는지 확인한다.

## 운영 전 기본 동작 점검

| 순서 | 기대 결과 |
|---|---|
| 비관리자 사용자가 관리자 로그인 화면 진입 | 관리자 로그인 form 표시 |
| claim 없는 Firebase Auth 계정으로 로그인 | 즉시 로그아웃되고 접근 차단 |
| admin claim 계정으로 로그인 | 관리자 대시보드 진입 |
| 관리자 로그아웃 | 관리자 화면 접근 해제 |
| admin claim 회수 후 재시도 | 관리자 접근 차단 |
| 학생 로그인 흐름 사용 | 기존 학생 흐름 유지 |

## 현재 남은 주의사항

| 주의사항 | 상태 |
|---|---|
| Rules 배포 후 전체 smoke test | 일부 운영자 추가 확인 필요 |
| 학생 공통 인증값 | 미해결 |
| 사번 실제 직원 검증 | 외부 정책/원천 데이터 필요 |
| Preview와 Production 동일 Firebase project 사용 | staging 분리 필요 |

## Firestore Rules 배포 후 운영 확인

`firestore.rules`는 production에 배포된 상태다. Rules 변경이나 재배포가 필요할 때는 다음을 확인한다.

1. 관리자 계정으로 관리자 대시보드 진입이 가능한지 확인한다.
2. 관리자 과정/문제은행/결과 조회 흐름을 확인한다.
3. 배포 직후 사용할 관리자 쓰기 흐름을 확인한다.
4. 현재 Firebase Console Rules 백업은 public repository 밖에 보관한다.
5. 문제가 생기면 백업한 Rules로 롤백할 수 있게 준비한다.
6. claim 변경 후에는 다시 로그인해 ID token을 갱신한다.

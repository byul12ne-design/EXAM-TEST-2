# 환경변수 운영 가이드

## 목적

이 문서는 Vite + Vercel 환경에서 어떤 값을 환경변수로 둘 수 있고, 어떤 값은 client 환경변수에 넣으면 안 되는지 정리한다.

실제 값은 기록하지 않는다. `.env.example`에는 placeholder만 사용한다.

## 현재 상태

| 항목 | 현재 상태 |
|---|---|
| `import.meta.env` 사용 | `src/lib/firebase.ts`에서 사용 |
| `VITE_*` 사용 | Firebase web client configuration 변수에 사용 |
| `.env.local` | 로컬 구성 완료, Git 추적 제외 |
| `.env.example` | placeholder 기준으로 존재 |
| Firebase client configuration | `src/lib/firebase.ts`에서 env 기반 로드 |
| 관리자 인증값 | 코드/Vite env에 저장하지 않음. Firebase Auth + Custom Claim 사용 |
| 학생 공통 인증값 | 기존 미해결 보안 이슈로 남아 있음 |
| `.gitignore` env 정책 | `.env`, `.env.*`, `!.env.example` 정책 적용 |

## Vite client env 한계

| 원칙 | 설명 |
|---|---|
| `VITE_*`는 공개값이다 | Vite는 `VITE_*` 값을 browser bundle에 삽입한다 |
| Vercel env도 예외가 아니다 | Vercel Dashboard에 넣어도 `VITE_*`이면 client에서 확인 가능하다 |
| Firebase client configuration은 admin secret이 아니다 | 단, Firestore Rules가 없으면 DB 보호가 되지 않는다 |
| 인증값은 `VITE_*`에 넣지 않는다 | 관리자/학생 인증값을 env로 이동해도 보안 문제가 해결되지 않는다 |
| 서버 민감값은 server runtime에만 둔다 | Vercel Function 또는 backend에서만 접근해야 한다 |

## GitHub에 올려도 되는 것과 안 되는 것

### 올려도 되는 것

| 항목 | 예시 |
|---|---|
| `.env.example` | placeholder만 포함 |
| Firebase client configuration 변수명 | `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_PROJECT_ID` 등 |
| Vercel 설정 예시 | rewrite, build/output 설정 |
| public docs | 실제 값과 우회 절차 없는 문서 |

### 올리면 안 되는 것

| 항목 | 처리 |
|---|---|
| 실제 관리자 인증값 | Firebase Auth/Claims 또는 서버로 전환 |
| 실제 학생 공통 인증값 | 공통값 폐기, 개인별 인증으로 전환 |
| service account key | Vercel server env 또는 별도 보안 저장소 |
| private key | GitHub commit 금지 |
| server API 민감값 | client env 금지 |
| production DB 접근 민감값 | client env 금지 |
| `.env.local` | 로컬 전용, Git 제외 |
| `.env.production` | 운영 전용, Git 제외 |

## 권장 `.env.example`

아래 파일은 실제 값을 넣지 않고 GitHub에 commit할 수 있다.

```dotenv
# Firebase web client configuration.
# VITE_ prefix 값은 browser bundle에 포함된다.
# 관리자 인증값, 학생 공통 인증값, service account key,
# private key, server-only token을 여기에 넣지 않는다.

VITE_FIREBASE_API_KEY="[REPLACE_WITH_FIREBASE_WEB_API_KEY]"
VITE_FIREBASE_AUTH_DOMAIN="[REPLACE_WITH_FIREBASE_AUTH_DOMAIN]"
VITE_FIREBASE_PROJECT_ID="[REPLACE_WITH_FIREBASE_PROJECT_ID]"
VITE_FIREBASE_STORAGE_BUCKET="[REPLACE_WITH_FIREBASE_STORAGE_BUCKET]"
VITE_FIREBASE_MESSAGING_SENDER_ID="[REPLACE_WITH_FIREBASE_MESSAGING_SENDER_ID]"
VITE_FIREBASE_APP_ID="[REPLACE_WITH_FIREBASE_APP_ID]"
VITE_FIREBASE_MEASUREMENT_ID="[OPTIONAL_REPLACE_WITH_FIREBASE_MEASUREMENT_ID]"
```

## `.gitignore` 정책

현재 `.gitignore`에는 env, internal 문서, service account 관련 제외 정책이 포함되어 있다. 기준은 다음과 같다.

```gitignore
.env
.env.*
!.env.example
docs/internal/
docs/internal.zip
serviceAccount*.json
*.service-account.json
*.service-account.local.json
firebase-adminsdk*.json
```

주의:

- 이미 추적 중인 env 파일이 있는지 `git ls-files ".env*"`로 확인한다.
- 이미 추적된 파일은 `.gitignore`만으로 제외되지 않는다.

## 코드 방향

| 영역 | 방향 |
|---|---|
| Firebase 초기화 | `src/lib/firebase.ts`에서만 수행 |
| env 누락 처리 | 누락 변수명을 명확히 throw |
| 관리자 인증 | Firebase Auth + `admin: true` Custom Claim |
| 학생 인증 | 공통 인증값 제거 후 검증된 등록 흐름으로 전환 |
| 서버 secret | `VITE_*`가 아니라 server runtime env에 저장 |

## 인증값 처리 원칙

| 현재 문제 | 잘못된 해결 | 올바른 방향 |
|---|---|---|
| 관리자 인증값이 client에 있음 | `VITE_*`로 이동 | Firebase Auth + Custom Claim |
| 학생 공통 인증값이 client에 있음 | `VITE_*`로 이동 | 개인별 Auth 또는 서버 검증 |
| 직원 명부 검증이 필요함 | client allowlist 하드코딩 | server-side 검증 또는 관리자 사전 등록 |
| Firestore 접근 제어 필요 | client 조건문만 사용 | Firestore Rules와 Auth claim |

## Vercel 환경별 권장 구분

| 환경 | 목적 | 권장 값 |
|---|---|---|
| Local | 개발자 로컬 검증 | `.env.local`, Firebase dev/staging project |
| Preview | 배포 전 검증 | Vercel Preview env, Firebase staging project |
| Production | 실제 운영 | Vercel Production env, Firebase production project |

현재는 별도 staging Firebase project가 없어 Preview와 Production에 동일 Firebase web client configuration이 등록되어 있다.

## 검증 명령

```powershell
git check-ignore -v .env.local .env.production
git ls-files ".env*"
npm.cmd run build
```

기대 결과:

- `.env.local`과 `.env.production`은 Git 추적 대상이 아니다.
- 추적되는 env 파일은 `.env.example`만 허용한다.
- build가 env 누락 없이 통과한다.

## 결론

Firebase client configuration을 env로 분리한 것은 배포 운영성과 실수 방지에 도움이 된다. 하지만 `VITE_*`는 secret 저장소가 아니므로 학생 공통 인증값이나 관리자 secret을 넣으면 안 된다. 실제 보안 경계는 Firebase Auth, Custom Claim, Firestore Rules, 필요한 경우 server-side 검증에서 만들어야 한다.


# Vercel env 운영 상태

## 목적

이 문서는 로컬 개발과 Vercel 배포에서 Firebase web client 환경변수를 어떻게 운영하는지 정리한다.

`src/lib/firebase.ts`는 `import.meta.env.VITE_FIREBASE_*`에서 Firebase web client configuration을 읽는다. 로컬 개발은 `.env.local`을 사용하고, Vercel 배포는 Vercel Dashboard의 Environment Variables를 사용한다.

실제 값은 Git에 commit하지 않는다. `VITE_*` 값은 browser bundle에 포함되는 client env이므로 secret 저장소가 아니다.

## 현재 등록된 변수명

문서에는 변수명만 기록한다.

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_MEASUREMENT_ID
```

## 환경별 운영 정책

현재는 별도 staging Firebase project가 제공되지 않아 Preview와 Production Vercel 환경에 동일한 Firebase web client configuration이 등록되어 있다.

| 환경 | 목적 | Firebase project | 현재 상태 |
|---|---|---|---|
| Local | 개발자 로컬 build/dev 검증 | `.env.local` 값 | 로컬 구성 완료, Git 추적 제외 |
| Preview | Vercel preview 기본 동작 점검 | Production과 동일 Firebase project | env 등록 완료, 테스트가 production 데이터에 영향을 줄 수 있음 |
| Production | 실제 사용자 배포 | Preview와 동일 Firebase project | env 등록 완료, 안전성은 Auth/Rules/runtime 점검에 의존 |

Preview와 Production env 등록은 완료되었지만, 데이터 격리는 완료되지 않았다. 권장 상태는 다음과 같다.

```text
Preview    -> staging Firebase project
Production -> production Firebase project
```

## Vercel Dashboard 등록 위치

```text
Vercel Dashboard
Project
Settings
Environment Variables
```

env 변경 시 절차:

1. `.env.local`에서 먼저 값을 테스트한다.
2. `npm.cmd run build`를 실행한다.
3. 로컬 dev server 기본 동작을 확인한다.
4. Vercel Preview 변수를 업데이트한다.
5. Preview를 배포하고 주의해서 기본 동작을 점검한다.
6. Production 변수를 업데이트한다.
7. Production을 redeploy한다.
8. Production URL에서 기본 동작을 점검한다.

## Vite env 주의사항

| 원칙 | 설명 |
|---|---|
| `VITE_*`는 공개값이다 | browser bundle에 포함된다 |
| Firebase web config는 admin secret이 아니다 | 그래도 Firestore Rules/Auth가 반드시 필요하다 |
| `VITE_*`에 secret 저장 금지 | 관리자 비밀번호, 학생 공통 인증값, service account key, server token을 넣지 않는다 |
| env 누락 시 빠르게 실패 | `src/lib/firebase.ts`가 누락 변수명을 명확히 throw한다 |

## 현재 검증 상태

| 확인 항목 | 결과 |
|---|---|
| `.env.example` 존재 | 통과 |
| `.env.local` Git 제외 | 통과 |
| 로컬 production build | 통과 |
| 로컬 dev server | 통과, root HTTP 200 |
| Vercel Dashboard env | 운영자 기준 Preview/Production 등록 완료 |
| 실제 production URL 동작 | Vercel Dashboard와 browser에서 별도 확인 필요 |

이 프로젝트는 Vercel 자동배포 환경일 수 있으나, 저장소 코드만으로는 Vercel Dashboard의 실제 설정, 환경 변수, 배포 로그, production domain 동작을 확정할 수 없다. 따라서 본 분석은 저장소 코드와 로컬 production build 기준이며, 실제 배포 상태는 Vercel Dashboard와 배포 URL에서 별도 확인해야 한다.

## 남은 운영 위험

| 위험 | 영향 | 권장 조치 |
|---|---|---|
| Preview/Production 동일 Firebase project 사용 | Preview 테스트가 production 데이터에 영향을 줄 수 있음 | staging Firebase project 생성 |
| Rules 배포 후 전체 smoke test 일부 미확인 | 배포된 Rules가 일부 운영 흐름과 충돌할 수 있음 | 관리자 CRUD와 학생 결과 저장/조회 재확인 |
| 학생 공통 인증값 | 학생 계정 도용 위험 | 검증된 개인별 인증 흐름으로 전환 |
| 사번 실제 직원 검증 부재 | 허위/도용 사번 가입 가능 | 서버 측 또는 관리자 통제 검증 추가 |
| Tailwind CDN runtime 의존 | CDN 실패 시 화면 초기화 위험 | build-time Tailwind로 전환 |

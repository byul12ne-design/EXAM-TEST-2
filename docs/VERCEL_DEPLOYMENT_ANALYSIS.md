# Vercel 배포 분석

## 분석 범위

이 프로젝트는 Vercel 자동배포 환경일 수 있으나, 저장소 코드만으로는 Vercel Dashboard의 실제 설정, 환경 변수, 배포 로그, production domain 동작을 확정할 수 없다. 따라서 본 분석은 저장소 코드와 로컬 production build 기준이며, 실제 배포 상태는 Vercel Dashboard와 배포 URL에서 별도 확인해야 한다.

## 현재 배포 상태

| 항목 | 현재 상태 |
|---|---|
| framework | React + Vite SPA |
| build command | `npm.cmd run build` 기준 `tsc && vite build` |
| output directory | `dist/` |
| 로컬 production build | 통과 |
| 로컬 dev server | 통과, root URL HTTP 200 확인 |
| Vercel env | 운영자 기준 Preview/Production 변수 등록 완료 |
| Firebase config | `src/lib/firebase.ts`에서 `VITE_FIREBASE_*` 로드 |
| Preview/Production Firebase | 현재 동일 Firebase project/config 사용 |
| 관리자 로그인 | Firebase Auth 관리자 ID/password + `admin: true` Custom Claim |
| Firestore Rules | Emulator 테스트 통과, production 배포 완료 |

## 저장소 기준 Vercel 설정

| 설정 | 저장소 상태 | 위험 |
|---|---|---|
| `vercel.json` | 없음 | Vercel preset/build/output 동작이 Dashboard 자동 감지에 의존 |
| `.vercelignore` | 없음 | Vercel 기본 ignore와 `.gitignore`에 의존 |
| Node version | 고정 없음 | Vercel Node 버전이 로컬과 다를 수 있음 |
| SPA rewrite | 설정 없음 | 향후 path 기반 route 도입 시 직접 접근 404 가능 |
| 환경 변수 | `.env.example`에 변수명 문서화 | 실제 값은 Vercel Dashboard에서 별도 확인 필요 |

현재 앱은 `src/App.tsx` 내부 상태 기반 화면 전환을 사용하므로 root path 배포는 rewrite 없이 동작할 수 있다. React Router나 직접 접근 가능한 URL route를 도입하면 다음 설정이 필요하다.

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/"
    }
  ]
}
```

## 필요한 환경 변수

Vercel에 필요한 변수명:

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_MEASUREMENT_ID
```

현재는 별도 staging Firebase project가 제공되지 않아 Preview와 Production Vercel 환경에 동일한 Firebase web client configuration이 등록되어 있다.

제한적 테스트에는 사용할 수 있으나, Preview 테스트가 production 데이터에 영향을 줄 수 있다. 권장 상태는 Preview와 Production Firebase project를 분리하는 것이다.

## build와 bundle 결과

최근 로컬 production build 결과:

```text
vite v5.4.21 building for production...
dist/index.html                  0.48 kB
dist/assets/index-C-dvAIOk.css   1.80 kB
dist/assets/index-BaebhwFW.js  637.38 kB
```

Vite 경고:

```text
Some chunks are larger than 500 kB after minification.
```

주요 원인:

| 원인 | 설명 |
|---|---|
| 단일 `App.tsx` 집중 | 학생 UI, 관리자 UI, 비즈니스 로직, 데이터 접근이 한 entry에 포함 |
| Firebase SDK 포함 | Auth와 Firestore SDK가 main bundle에 포함 |
| route-level splitting 없음 | 관리자 코드도 첫 진입 시 함께 내려받음 |
| manualChunks 없음 | Firebase/vendor chunk가 분리되지 않음 |

## production runtime 위험

| 심각도 | 위험 | 현재 원인 | 권장 조치 |
|---|---|---|---|
| 치명 | 학생 공통 인증값 유지 | 학생 로그인에 공통 인증 구조가 남아 있음 | 검증된 개인별 인증 흐름으로 전환 |
| 치명 | 사번 실제 직원 검증 부재 | 기본 형식 검증만 존재 | 서버 측 또는 관리자 통제 검증 도입 |
| 높음 | Preview가 production Firebase 사용 | Preview와 Production Firebase config가 동일 | staging Firebase project 추가 |
| 높음 | 결과 payload client 계산 | 점수/결과가 browser에서 만들어짐 | 서버 측 검증/채점 도입 |
| 높음 | Rules 배포 후 production smoke test | 전체 학생/관리자 흐름 확인이 문서상 완료되지 않음 | 배포 후 운영 전 기본 동작 점검 기록 |
| 보통 | 큰 JS chunk | 단일 entry bundle 구조 | code splitting/manualChunks 적용 |
| 보통 | Tailwind CDN 의존 | runtime 스타일 의존성 유지 | build-time Tailwind로 전환 |
| 보통 | Node version 미고정 | Vercel과 로컬 Node 차이 가능 | owner 합의 후 `engines` 또는 `.nvmrc` 추가 |

## production blocking issue

production 운영 가능 판정 전 필요한 작업:

1. Firestore Rules 배포 후 production 관리자/학생 흐름을 확인한다.
2. 학생 공통 인증값을 제거한다.
3. 실제 직원 사번 검증을 추가한다.
4. Preview와 Production Firebase project를 분리한다.
5. 실제 Vercel 배포 URL에서 운영 전 기본 동작 점검 결과를 기록한다.
6. 인증, 권한, 네트워크 실패에 대한 사용자 안내를 보강한다.

## 현재 준비도 판정

| 수준 | 판정 |
|---|---|
| 로컬 개발 | 가능 |
| Vercel Preview | 주의 필요 상태 |
| 제한적 내부 운영 | 알려진 위험을 수용하는 경우에만 가능 |
| production/상용 운영 | 아직 불가 |

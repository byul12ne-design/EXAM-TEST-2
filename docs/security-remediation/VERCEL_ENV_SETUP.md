# Vercel env 설정 가이드

## 목적

이 문서는 Vercel 자동배포 환경에서 필요한 환경변수와 production 검증 절차를 정리한다. 저장소 코드만으로는 Vercel Dashboard의 실제 설정, 등록된 환경변수, 배포 로그, production domain 동작을 확정할 수 없다.

실제 값은 이 문서에 기록하지 않는다.

## 현재 저장소 기준 Vercel 상태

| 항목 | 현재 상태 |
|---|---|
| `vercel.json` | 없음 |
| `.vercelignore` | 없음 |
| `package.json` build | `tsc && vite build` |
| output directory | Vite 기본 `dist` |
| Node.js version pin | 없음 |
| Vercel env 사용 | Firebase web client configuration을 `VITE_FIREBASE_*`로 사용 |
| SPA rewrite | 없음 |
| Firebase client configuration | `src/lib/firebase.ts`에서 env 기반 로드 |
| Vercel Preview env | 등록 완료. Production과 동일한 Firebase web client configuration 사용 중 |
| Vercel Production env | 등록 완료. Preview와 동일한 Firebase web client configuration 사용 중 |

## 필요한 Vercel env 목록

실제 값은 Vercel Dashboard에만 등록한다.

| 변수명 | 환경 | 민감도 | 설명 |
|---|---|---|---|
| `VITE_FIREBASE_API_KEY` | Preview, Production | client 공개값 | Firebase web app key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Preview, Production | client 공개값 | Firebase Auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Preview, Production | client 공개값 | Firebase project id |
| `VITE_FIREBASE_STORAGE_BUCKET` | Preview, Production | client 공개값 | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Preview, Production | client 공개값 | Firebase sender id |
| `VITE_FIREBASE_APP_ID` | Preview, Production | client 공개값 | Firebase app id |
| `VITE_FIREBASE_MEASUREMENT_ID` | Preview, Production | client 공개값, optional | Analytics measurement id |

`VITE_*` 값은 browser bundle에 포함된다. 관리자 인증값, 학생 공통 인증값, service account key, private key, server-only token은 절대 넣지 않는다.

## Vercel Dashboard 설정 절차

현재는 별도 staging Firebase project가 제공되지 않아 Preview와 Production Vercel 환경에 동일한 Firebase web client configuration이 등록되어 있다.

현재 Preview/Production env는 모두 등록 완료 상태지만 Firebase project 분리는 아직 완료되지 않았다. 이후 변경 시 절차는 다음과 같다.

1. Local `.env.local`에서 값을 먼저 검증한다.
2. Vercel Dashboard의 Project Settings로 이동한다.
3. Environment Variables에서 Preview 값을 업데이트한다.
4. Preview deploy를 실행한다.
5. Preview URL에서 기본 동작을 점검한다.
6. 문제가 없으면 Production 값을 반영한다.
7. 배포 URL에서 기본 동작을 점검한다.

## 권장 `vercel.json`

현재 앱은 상태 기반 화면 전환을 사용하므로 root path에서는 동작한다. 향후 React Router 또는 직접 접근 가능한 route를 도입하면 다음 rewrite가 필요하다.

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

## Preview / Production 현재 상태와 권장 분리

| 항목 | Preview | Production |
|---|---|---|
| 현재 Firebase project | Production과 동일 | Preview와 동일 |
| 권장 Firebase project | staging Firebase project | production Firebase project |
| 현재 데이터 영향 | Preview 테스트가 Production 데이터에 영향을 줄 수 있음 | 운영 데이터 |
| 권장 운영 | 안전한 테스트 데이터 사용 | 실제 운영 데이터 보호 |

## 자동배포 전 체크리스트

| 확인 항목 | 현재 기준 |
|---|---|
| local build | `npm.cmd run build` 통과 |
| local dev | root HTTP 200 확인 |
| Vercel env | Dashboard에 Preview/Production 모두 등록 완료. 단, 현재는 동일 Firebase web client configuration 사용 |
| Firestore Rules | 초안 존재, Emulator 통과, production 배포 미적용 |
| 관리자 claim | 운영자 기준 부여 완료 |
| 학생 인증 | 공통 인증값과 사번 검증 이슈 남아 있음 |
| production runtime | 배포 URL에서 첫 진입/로그인/제출/관리자 접근 별도 확인 필요 |

## Production 기본 동작 점검

배포 후 최소 확인:

1. 첫 진입 화면이 정상 표시되는지 확인한다.
2. 학생 로그인/회원가입 화면이 표시되는지 확인한다.
3. 관리자 로그인 화면이 표시되는지 확인한다.
4. admin claim 계정만 관리자 화면에 진입하는지 확인한다.
5. 학생 공개 과정 조회가 가능한지 확인한다.
6. 학생 결과 저장/조회가 가능한지 확인한다.
7. 관리자 과정/문제/결과 조회가 가능한지 확인한다.
8. claim 없는 계정이 관리자 기능에서 차단되는지 확인한다.

## 현재 build 기준

현재 로컬 production build와 dev server 시작은 성공한다. Vercel Preview/Production env는 모두 등록 완료 상태다. 현재는 별도 staging Firebase project가 제공되지 않아 Preview와 Production Vercel 환경에 동일한 Firebase web client configuration이 등록되어 있다. 따라서 build/dev 성공은 Vercel runtime 안정성, Firebase Rules 안전성, production domain 동작, Preview와 Production 데이터 분리를 보장하지 않는다.

## 남은 위험

| 위험 | 설명 |
|---|---|
| Preview/Production 동일 Firebase 사용 | Preview 테스트가 Production 데이터에 영향을 줄 수 있음 |
| Firestore Rules production 미배포 | repository Rules가 아직 production을 보호하지 않음 |
| 학생 공통 인증값 | 다음 보안 개선에서 제거 필요 |
| 사번 실제 직원 검증 부재 | owner 정책/원천 데이터 필요 |
| Tailwind CDN runtime 의존 | CDN 실패 시 초기 화면 문제 가능 |

## 다음 작업 순서

1. Firestore Rules production 배포 전 Console Rules 백업과 기본 동작 점검을 완료한다.
2. staging Firebase project를 마련해 Preview와 Production Firebase project를 분리한다.
3. 학생 공통 인증값 제거와 사번 검증 정책을 적용한다.
4. production deploy 전 운영 계정/권한을 재검증한다.

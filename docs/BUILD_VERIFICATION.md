# Build 검증

## 검증 범위

| 항목 | 현재 상태 |
|---|---|
| 기준 | 현재 repository working tree |
| 앱 production 배포 | 저장소 기준 확인 불가 |
| Firestore Rules 배포 | 완료, 운영자 확인 기준 |
| 로컬 production build | 통과 |
| 로컬 dev server | 통과 |
| Firestore Emulator Rules 테스트 | 통과 |

## 실행 환경

| 항목 | 값 |
|---|---|
| Node | `v22.18.0` |
| npm | `10.9.1` |
| shell | PowerShell |
| framework | Vite + React |

## 의존성 상태

| dependency | 용도 |
|---|---|
| `firebase` | 앱 runtime dependency |
| `firebase-admin` | admin claim 부여용 로컬 운영 스크립트 |
| `@firebase/rules-unit-testing` | Firestore Rules Emulator 테스트 |

`npm install` 출력 기준 audit 취약점이 보고되었다. 이번 작업 범위는 문서 정리와 현재 상태 검증이므로 `npm audit fix`는 수행하지 않았다.

## production build

명령어:

```powershell
npm.cmd run build
```

결과:

| 확인 항목 | 결과 |
|---|---|
| TypeScript compile | 통과 |
| Vite build | 통과 |
| output directory | `dist/` |
| main JS chunk | `637.38 kB`, gzip `163.87 kB` |
| CSS asset | `1.80 kB`, gzip `0.83 kB` |
| 경고 | Vite 500 kB chunk warning 유지 |

메모:

- sandbox 실행에서는 Vite config 접근 제한으로 실패할 수 있다.
- 로컬 권한 실행 기준 build는 성공했다.
- chunk warning은 배포 실패가 아니라 초기 로딩 성능 경고다.

## 로컬 dev server

명령어:

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

결과:

| 확인 항목 | 결과 |
|---|---|
| Vite ready | 통과 |
| root URL | `http://127.0.0.1:5173/` |
| HTTP status | `200` |
| root app container | 확인됨 |
| dev server 종료 | 완료 |

## Firestore Rules Emulator

명령어:

```powershell
$env:JAVA_HOME='C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot'
$env:PATH="$env:JAVA_HOME\bin;$env:PATH"
npx.cmd firebase-tools emulators:exec --project demo-exam-test-rules --only firestore "node scripts/firestore-rules-emulator-test.mjs"
```

결과:

| 확인 항목 | 결과 |
|---|---|
| Firestore Emulator 시작 | 통과 |
| 시나리오 수 | 20 |
| 통과 | 20 |
| 실패 | 0 |
| production 배포 | 수행하지 않음. Emulator 검증만 수행 |

## npm script 상태

| script | 현재 상태 |
|---|---|
| `dev` | 있음 |
| `build` | 있음 |
| `preview` | 있음 |
| `admin:claim` | 있음 |
| `lint` | 없음 |
| `test` | 없음 |

## 남은 build/runtime 위험

| 항목 | 상태 |
|---|---|
| Firestore Rules production 배포 | 완료, 운영자 확인 기준 |
| 학생 공통 인증값 | 보안 개선 필요 |
| 사번 실제 직원 검증 | 외부 정책/원천 데이터 필요 |
| Preview/Production Firebase 분리 | staging project 필요 |
| Tailwind CDN 의존 | build-time 전환 필요 |
| 큰 JS chunk | code splitting 또는 manualChunks 필요 |

# 운영 전 기본 동작 점검 결과

## 점검 범위

| 항목 | 현재 결과 |
|---|---|
| 로컬 production build | 통과 |
| 로컬 dev server | 통과 |
| Firestore Rules Emulator | 통과 |
| admin claim script 문법 검사 | 통과 |
| admin claim script 실제 적용 없는 테스트 실행 | 통과 |
| production 배포 | 수행하지 않음 |
| Firestore Rules production 배포 | 수행하지 않음 |

실제 관리자 ID, email, uid, 비밀번호, service account 경로, Firebase 실값은 이 문서에 기록하지 않는다.

## 현재 구현 상태

| 항목 | 현재 상태 |
|---|---|
| Firebase env 분리 | 완료 |
| 로그인 전 Firestore 구독 | 민감 데이터 기준 제거 완료 |
| 관리자 하드코딩 비밀번호 | 제거 완료 |
| 관리자 로그인 | 별도 관리자 ID + Firebase Auth 비밀번호 |
| 내부 관리자 Auth email | `${adminId}@wuerth-admin.exam` |
| 관리자 권한 확인 | `getIdTokenResult(user, true)`와 `claims.admin === true` |
| claim 없는 관리자 계정 | 로그아웃 후 접근 차단 |
| 관리자 계정/claim | 운영자가 생성 및 부여 완료 |
| 실제 관리자 로그인 | 운영자가 확인 완료 |
| Firestore Rules 초안 | 추가 완료, Emulator 검증 완료 |

## 로컬 build

명령어:

```powershell
npm.cmd run build
```

결과:

| 확인 항목 | 결과 |
|---|---|
| TypeScript compile | 통과 |
| Vite production build | 통과 |
| output directory | `dist/` |
| main JS chunk | `637.38 kB`, gzip `163.87 kB` |
| CSS asset | `1.80 kB`, gzip `0.83 kB` |
| 경고 | 500 kB 초과 chunk warning 유지 |

## 로컬 dev server

명령어:

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

결과:

| 확인 항목 | 결과 |
|---|---|
| Vite ready | 통과 |
| URL | `http://127.0.0.1:5173/` |
| HTTP status | `200` |
| app root container | 확인됨 |
| env 누락 에러 | 확인되지 않음 |
| server 종료 | 완료 |

운영자 수동 확인:

| 시나리오 | 결과 |
|---|---|
| 실제 관리자 로그인 | 확인 완료 |
| claim 확인 후 관리자 대시보드 진입 | 확인 완료 |
| 실제 계정 정보 | 문서에 기록하지 않음 |

학생 전체 end-to-end 제출 흐름은 이번 자동 점검에서 수행하지 않았다.

## Firestore Rules production 배포 전 점검 상태

| 영역 | 상태 |
|---|---|
| 로컬 build | 통과 |
| 로컬 첫 진입 | 통과, HTTP 200 및 root container 확인 |
| Firestore Rules Emulator | 통과, 20개 시나리오 |
| admin claim 계정 실제 로그인 | 운영자 확인 완료 |
| 관리자 과정/문제/결과 조회 | production Rules 배포 전 운영자 확인 필요 |
| 관리자 생성/수정/삭제 | production Rules 배포 전 운영자 확인 필요 |
| 학생 회원가입/로그인 | production Rules 배포 전 운영자 확인 필요 |
| 학생 결과 저장/조회 | production Rules 배포 전 운영자 확인 필요 |
| claim 없는 관리자 접근 차단 | Emulator와 앱 로직 기준 확인, 실제 앱 재확인 권장 |
| 비로그인 민감 데이터 접근 차단 | Emulator와 앱 로직 기준 확인 |

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
| Java | Temurin JDK 21 |
| Firestore Emulator 시작 | 통과 |
| 총 시나리오 | 20 |
| 통과 | 20 |
| 실패 | 0 |
| production data 접근 | 없음 |
| production Rules 배포 | 없음 |

시나리오 요약:

| 범위 | 결과 |
|---|---|
| 비로그인 read/write 차단 | 통과 |
| 학생 공개 과정 read | 통과 |
| 학생 본인 결과/progress 접근 | 통과 |
| 학생의 다른 사용자 데이터 접근 차단 | 통과 |
| 학생의 관리자 데이터 접근 차단 | 통과 |
| claim 없는 관리자 유사 계정 차단 | 통과 |
| admin claim 계정의 관리자 데이터 접근 | 통과 |

## admin claim script

점검 명령:

```powershell
node --check scripts/set-admin-claim.mjs
npm run admin:claim -- --uid TEST_ADMIN_UID --service-account ./serviceAccount-test.json --action grant
```

결과:

| 확인 항목 | 결과 |
|---|---|
| 문법 검사 | 통과 |
| 실제 적용 없는 테스트 실행 | 통과 |
| 실제 Firebase 변경 | 없음 |
| 실제 적용 시 `--confirm` 필요 | 필요 |

## 남은 위험

| 위험 | 상태 |
|---|---|
| 학생 공통 인증값 | 미해결 |
| 사번 실제 직원 검증 | 미해결 |
| Firestore Rules production 배포 | 미적용 |
| Preview와 Production 동일 Firebase project | 미해결 |
| 점수/결과 payload client 계산 | 미해결 |
| Tailwind CDN runtime 의존 | 미해결 |
| 큰 JS chunk warning | 미해결 |

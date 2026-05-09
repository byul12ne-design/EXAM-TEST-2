# Firestore Rules Emulator 테스트

## 목적

이 문서는 repository의 `firestore.rules`를 로컬 Firestore Emulator로 검증한 결과를 기록한다.

Emulator 테스트 자체는 로컬에서만 수행했으며 production 데이터에 접근하지 않았다. 이후 운영자가 동일한 Rules를 production Firebase project에 배포 완료한 상태다.

## 현재 테스트 구성

| 항목 | 현재 상태 |
|---|---|
| `firestore.rules` | 존재 |
| `firebase.json` | 존재 |
| `firestore.indexes.json` | 존재 |
| 테스트 스크립트 | `scripts/firestore-rules-emulator-test.mjs` |
| Firebase CLI | `npx firebase-tools`로 실행 |
| Java | Temurin JDK 21 사용 |
| Rules unit test package | `@firebase/rules-unit-testing@3.0.4` |

## 실행 명령

```powershell
$env:JAVA_HOME='C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot'
$env:PATH="$env:JAVA_HOME\bin;$env:PATH"
npx.cmd firebase-tools emulators:exec --project demo-exam-test-rules --only firestore "node scripts/firestore-rules-emulator-test.mjs"
```

## 최신 결과

| 항목 | 결과 |
|---|---|
| Firestore Emulator 시작 | 통과 |
| Rules 시나리오 실행 | 통과 |
| 총 시나리오 | 20 |
| 통과 | 20 |
| 실패 | 0 |
| production 배포 | Emulator 실행 중에는 수행하지 않음. 이후 운영자 배포 완료 |
| production data 접근 | 수행하지 않음 |

차단되어야 하는 시나리오에서 출력된 `PERMISSION_DENIED` 메시지는 정상적인 negative test 결과다.

## Emulator 검증 이력

최근 Emulator 재점검에서도 동일한 결과가 나왔다.

| 확인 항목 | 결과 |
|---|---|
| Rules 점검 전 로컬 build | 통과 |
| Firestore Emulator 명령 | 통과 |
| 총 시나리오 | 20 |
| 통과 | 20 |
| 실패 | 0 |
| production Rules 배포 | Emulator 명령에서는 수행하지 않음 |

Emulator 결과는 repository Rules가 준비된 비로그인/학생/claim 없는 사용자/admin claim 사용자 시나리오와 일치함을 확인한다. 다만 실제 Vercel Preview 또는 production 앱에서의 운영 전 기본 동작 점검을 대체하지는 않는다.

## 시나리오 범위

| 사용자 | 시나리오 | 기대 결과 | 결과 |
|---|---|---|---|
| 비로그인 | 공개 과정 query | 차단 | 통과 |
| 비로그인 | `results` read | 차단 | 통과 |
| 비로그인 | `questionBank` read | 차단 | 통과 |
| 학생 A | 공개 과정 query | 허용 | 통과 |
| 학생 A | 비공개 과정 직접 read | 차단 | 통과 |
| 학생 A | 본인 결과 query | 허용 | 통과 |
| 학생 A | 다른 학생 결과 직접 read | 차단 | 통과 |
| 학생 A | 과정 write | 차단 | 통과 |
| 학생 A | `questionBank` read | 차단 | 통과 |
| 학생 A | 본인 결과 create | 허용 | 통과 |
| 학생 A | 다른 사번 결과 create | 차단 | 통과 |
| 학생 A | 본인 progress write | 허용 | 통과 |
| 학생 B | 학생 A progress read | 차단 | 통과 |
| claim 없는 사용자 | 관리자용 `exams` 전체 read | 차단 | 통과 |
| claim 없는 사용자 | `questionBank` read | 차단 | 통과 |
| claim 없는 사용자 | 전체 `results` read | 차단 | 통과 |
| admin claim 사용자 | 전체 `exams` read | 허용 | 통과 |
| admin claim 사용자 | `questionBank` read | 허용 | 통과 |
| admin claim 사용자 | result delete | 허용 | 통과 |
| admin claim 사용자 | course update | 허용 | 통과 |

## 현재 앱과의 정합성

| 영역 | 현재 상태 |
|---|---|
| 관리자 로그인 | Firebase Auth 관리자 ID/password 흐름 |
| 관리자 권한 확인 | `getIdTokenResult(user, true)`와 `claims.admin === true` |
| 관리자 구독 | `isAdmin && admin view`일 때만 실행 |
| 학생 구독 | 공개 과정과 본인 결과 |
| 비로그인 구독 | 민감 collection 구독 제거 |

## 남은 충돌 가능성과 한계

| 이슈 | 현재 위험 |
|---|---|
| Rules 배포 후 전체 smoke test 일부 미확인 | 실제 운영 흐름 일부는 추가 확인 필요 |
| 학생 공통 인증값 | Rules만으로 사번 사용자가 실제 직원인지 증명할 수 없음 |
| 사번 실제 직원 검증 부재 | 형식이 맞는 허위 사번 등록을 막지 못함 |
| 결과 payload client 계산 | Rules만으로 점수/정답 무결성을 완전히 보장할 수 없음 |
| Preview/Production 동일 Firebase 사용 | Preview 점검이 production 데이터에 영향을 줄 수 있음 |

## production 배포 후 확인 항목

Rules는 production에 배포된 상태다. 다음 항목은 배포 후에도 계속 확인한다.

1. 관리자 claim 계정 로그인 확인.
2. 학생 기본 동작 점검.
3. 관리자 기본 동작 점검.
4. Preview 데이터 위험 수용 또는 staging Firebase project 준비.
5. 롤백 계획 유지.

현재 상태: production Rules 배포 완료, 전체 운영 smoke test는 일부 추가 확인 필요.

## 결론

현재 Firestore Rules는 로컬 Emulator 20개 시나리오를 통과했고 production에 배포된 상태다. 관리자 Custom Claim 흐름과 정합성이 있지만, 학생 인증과 결과 무결성 문제는 Rules만으로 해결되지 않는다.

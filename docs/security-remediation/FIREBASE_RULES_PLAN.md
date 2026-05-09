# Firestore Rules 계획 및 배포 전 판정

## 현재 상태

repository에는 Firestore Rules 초안이 포함되어 있다. 로컬 Firestore Emulator 기준 테스트는 통과했지만, production Firebase project에는 아직 배포하지 않았다.

| 항목 | 현재 상태 |
|---|---|
| `firestore.rules` | 존재 |
| `firebase.json` | rules/indexes 연결 |
| `firestore.indexes.json` | 존재, 현재 custom composite index 없음 |
| Emulator test script | 존재 |
| Emulator 결과 | 20개 시나리오 통과 |
| production 배포 | 미적용 |
| 관리자 인증 정합성 | 앱과 Rules 모두 `admin: true` claim 사용 |

## 현재 Rules 정책

Rules는 deny-by-default 원칙을 사용한다. 명시적으로 허용한 인증 흐름만 접근할 수 있다.

| collection | 학생 접근 | 관리자 접근 | 비고 |
|---|---|---|---|
| `users` | 본인 문서만 | admin claim 사용자 | client profile 필드는 권한 근거가 아님 |
| `exams` | 공개 과정만 read | 전체 read/write/delete | 학생 write 차단 |
| `results` | 본인 결과만 | 전체 read/delete | 점수 무결성은 Rules만으로 완전 보장 불가 |
| `questionBank` | 차단 | 전체 read/write/delete | 학생에게 원본 문제 저장고 노출 금지 |
| `studyProgress` | 본인 uid prefix 문서 | 현재 초안은 owner 접근 중심 | 기존 collection 이름 유지 |
| `testProgress` | 본인 uid prefix 문서 | 현재 초안은 owner 접근 중심 | 기존 collection 이름 유지 |

현재 collection 이름은 유지한다.

```text
users
exams
results
questionBank
studyProgress
testProgress
```

이번 단계에는 collection rename이나 DB migration이 포함되지 않는다.

## 관리자 Custom Claim 정책

관리자 접근은 Firebase Auth Custom Claim 기준이다.

```text
request.auth.token.admin == true
```

앱도 동일하게 확인한다.

```text
claims.admin === true
```

현재 client와 Rules의 관리자 권한 기준은 일치한다.

## 중요한 한계

| 한계 | 영향 | 후속 조치 |
|---|---|---|
| Rules production 미배포 | repository 파일은 배포 전까지 production DB를 보호하지 않음 | Preview/운영 전 점검 후 배포 |
| 학생 공통 인증값 유지 | 학생 도용 위험 유지 | 개인별 인증 또는 검증된 등록 흐름으로 전환 |
| 사번 실제 직원 검증 부재 | 허위 사번 등록 차단 불가 | 서버 측 또는 관리자 통제 검증 추가 |
| 결과 payload client 계산 | 점수/정답 무결성 보장 불가 | 서버 측 검증/채점 도입 |
| Preview와 Production 동일 Firebase 사용 | Preview 테스트가 production 데이터에 영향 가능 | staging Firebase project 생성 |

## 현재 코드와의 정합성

| 흐름 | 현재 코드 상태 | Rules 정합성 |
|---|---|---|
| 로그인 전 데이터 접근 | 민감 collection 구독 제거 | 인증 전 read 감소 |
| 학생 과정 조회 | `isVisible == true` 과정만 query | 공개 과정 rule과 일치 |
| 학생 결과 조회 | 본인 `studentId` 결과만 query | 본인 결과 정책과 일치 |
| 관리자 데이터 구독 | admin claim 확인 후 관리자 view에서만 실행 | admin claim rule과 일치 |
| 문제은행 | 관리자 전용 UI/data 흐름 | admin-only rule과 일치 |

## production 배포 전 조건

`firestore.rules`를 production에 배포하기 전에 다음을 완료한다.

1. 대상 관리자 Firebase Auth 계정이 존재하는지 확인한다.
2. 각 관리자 계정에 `admin: true`가 부여되어 있는지 확인한다.
3. claim 부여 후 관리자 계정이 재로그인했는지 확인한다.
4. Emulator 테스트를 실행한다.
5. Vercel Preview에서 운영 전 기본 동작 점검을 수행한다.
6. Preview 테스트가 production 데이터를 변경할 수 있음을 수용하거나 staging Firebase project를 먼저 만든다.
7. Firebase Console 또는 Firebase CLI로 Rules를 배포한다.
8. 배포 직후 production 기본 동작 점검을 수행한다.

## production 배포 전 판정

| 항목 | 상태 | 배포 영향 |
|---|---|---|
| Rules 문법과 Emulator 시나리오 | 통과 | Emulator 기준 blocker 없음 |
| collection 이름 | 현재 코드와 일치 | collection rename 불필요 |
| 관리자 claim 조건 | 앱과 Rules 모두 `admin: true` | claim 없는 관리자 계정은 의도적으로 차단 |
| 학생 공개 과정 query | `isVisible == true` rule과 일치 | 인증된 학생 기준 동작 예상 |
| 학생 결과 read query | `studentId == userProfile.employeeId` rule과 일치 | profile이 있으면 동작 예상 |
| 학생 결과 create | 현재 결과 payload key와 일치 | 점수 무결성은 별도 문제 |
| progress 문서 ID | `${uid}_${examId}` prefix rule과 일치 | 현재 코드 기준 동작 예상 |
| questionBank | 관리자 전용 | 학생 차단 예상 |
| 현재 Console Rules 백업 | repository에서 확인 불가 | 배포 전 반드시 백업 필요 |
| 실제 앱 관리자 write 점검 | repository에서 확인 불가 | 배포 전 반드시 운영자 확인 필요 |

현재 판정: **즉시 production 배포는 차단됨**. 현재 Firebase Console Rules 백업과 실제 앱 기본 동작 점검이 완료되어야 한다. 완료 후에도 Preview와 Production이 같은 Firebase project를 쓰므로 **주의 필요 상태**로 배포해야 한다.

## 롤백 계획

배포 전 절차:

1. 대상 Firebase project의 Firebase Console을 연다.
2. 현재 활성화된 Firestore Rules를 복사한다.
3. 백업을 public repository 밖 또는 `docs/internal/`에 저장한다.
4. project-specific 민감 context가 포함될 수 있으므로 백업 파일은 commit하지 않는다.
5. 새 Rules를 배포한다.
6. 로그인, 조회, 저장 흐름이 깨지면 즉시 백업한 Rules를 다시 붙여넣고 게시한다.
7. 실제 사용자 식별자 없이 장애 상황과 차단된 작업을 기록한다.

## 이번 단계에서 하지 않는 것

| 금지 작업 | 이유 |
|---|---|
| collection rename | migration 필요 |
| DB migration | 현재 범위 아님 |
| client에서 Custom Claim 부여 | Admin SDK 또는 안전한 backend에서만 가능 |
| 운영 전 점검 없는 production Rules 배포 | 관리자/학생 흐름을 막을 수 있음 |
| 실제 관리자 식별자 문서 기록 | 운영 계정 노출 위험 |

## 결론

Rules 초안은 repository에 유지하고, Emulator 테스트를 안전장치로 사용한다. production 배포는 관리자 claim 계정, Preview/운영 전 기본 동작 점검, 롤백 준비가 확인된 뒤 진행한다.

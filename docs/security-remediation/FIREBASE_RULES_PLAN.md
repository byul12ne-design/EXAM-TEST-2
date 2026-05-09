# Firebase Rules Plan

## 목적

현재 프로젝트는 Firebase Auth와 Firestore를 client에서 직접 사용한다. 따라서 운영 보안은 Firestore Rules와 Auth claim 설계에 크게 의존한다.

이 문서는 실제 코드의 데이터 접근 패턴을 기준으로 Rules 방향을 정리한다. 상세 운영 식별자나 실제 인증값은 포함하지 않는다.

## 현재 Firestore 접근 요약

| 범위 | 실제 코드 위치 | 현재 동작 | 위험 |
|---|---|---|---|
| 사용자 프로필 읽기 | `src/App.tsx:105` | Auth 사용자 uid로 profile read | profile 생성/수정 권한 검증 필요 |
| 과정 데이터 구독 | `src/App.tsx:109` | 전체 실시간 구독 | 공개/비공개 과정 구분 Rules 필요 |
| 결과 데이터 구독 | `src/App.tsx:110` | 전체 실시간 구독 | 학생에게 전체 결과 노출 금지 필요 |
| 문제 저장고 구독 | `src/App.tsx:111` | 전체 실시간 구독 | 관리자 전용으로 제한 필요 |
| 문제 저장고 일괄 추가 | `src/App.tsx:147` | client batch write | admin claim 필요 |
| 학생 프로필 생성 | `src/App.tsx:177` | client에서 profile create | 본인 uid만 생성 가능해야 함 |
| 진행 데이터 저장/삭제 | `src/App.tsx:192-193`, `src/App.tsx:235`, `src/App.tsx:263-274`, `src/App.tsx:286-292`, `src/App.tsx:317` | 본인 진행 데이터 write | 본인 uid scope 검증 필요 |
| 결과 저장 | `src/App.tsx:315` | client에서 결과 create | 본인 결과만 생성, 서버 검증 검토 필요 |
| 과정 관리 | `src/App.tsx:334-348`, `src/App.tsx:491` | client에서 과정 create/update/delete | admin claim 필요 |
| 문제 관리 | `src/App.tsx:355-356`, `src/App.tsx:545` | client에서 문제 create/update/delete | admin claim 필요 |
| 결과 삭제 | `src/App.tsx:565` | client batch delete | admin claim 필요 |

## Rules 설계 원칙

| 원칙 | 설명 |
|---|---|
| deny by default | 명시적으로 허용하지 않은 read/write는 거부 |
| request.auth 필수 | 공개 데이터도 필요한 최소 범위만 허용 |
| client role 불신 | Firestore 문서의 `role` 필드는 권한 근거로 쓰지 않음 |
| Custom Claims 신뢰 | `request.auth.token.role == 'admin'` 같은 token claim 사용 |
| 본인 데이터 제한 | 학생은 uid 기준 본인 데이터만 read/write |
| 관리자 write 제한 | 과정/문제/결과 관리는 admin claim 필요 |
| 스키마 검증 | 필수 필드, 타입, 허용 범위 검증 |
| 서버 시간 권장 | 생성/수정 시간은 server timestamp 또는 서버 검증 권장 |

## 역할별 정책

| 데이터 범위 | 학생 정책 | 관리자 정책 |
|---|---|---|
| 공개 과정 | 로그인한 학생이 공개 상태만 read | 전체 read/write |
| 문제 데이터 | 공개 과정에 포함된 문제만 read | 전체 read/write |
| 학생 프로필 | 본인 profile read/create/update 제한 | 필요 범위 read/update |
| 학습 진행 | 본인 uid scope만 read/write/delete | 필요 시 read/delete |
| 퀴즈 진행 | 본인 uid scope만 read/write/delete | 필요 시 read/delete |
| 결과 | 본인 결과 create/read | 전체 read/delete/export |
| 관리 메타데이터 | read/write 불가 | admin only |

## 권장 claim 구조

| claim | 값 | 의미 |
|---|---|---|
| `role` | `admin` | 관리자 |
| `role` | `student` | 일반 학생 |
| `employeeId` | normalized employee id | 학생 본인 식별 |

주의:

- claim은 client에서 직접 부여할 수 없다.
- Admin SDK가 있는 서버/Cloud Function/관리 스크립트에서만 설정해야 한다.
- claim 변경 후 client는 token refresh가 필요하다.

## Rules 초안 방향

아래 예시는 정책 방향을 설명하기 위한 skeleton이다. 실제 반영 시 현재 코드의 데이터 영역명과 필드명에 맞춰 조정해야 한다.

```js
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() {
      return request.auth != null;
    }

    function isAdmin() {
      return signedIn() && request.auth.token.role == 'admin';
    }

    function isStudent() {
      return signedIn() && request.auth.token.role == 'student';
    }

    function owns(uid) {
      return signedIn() && request.auth.uid == uid;
    }

    match /{document=**} {
      allow read, write: if false;
    }

    // Course/problem content area.
    match /courseContent/{id} {
      allow read: if isAdmin() || (isStudent() && resource.data.isVisible == true);
      allow create, update, delete: if isAdmin();
    }

    // Student profile area.
    match /userProfiles/{uid} {
      allow read: if isAdmin() || owns(uid);
      allow create: if owns(uid) && request.resource.data.role == 'student';
      allow update: if owns(uid) && request.resource.data.role == resource.data.role;
      allow delete: if isAdmin();
    }

    // Student progress area.
    match /studentProgress/{progressId} {
      allow read, write, delete: if isAdmin() || (
        isStudent() &&
        request.resource.data.uid == request.auth.uid
      );
    }

    // Result area.
    match /studentResults/{resultId} {
      allow read: if isAdmin() || resource.data.uid == request.auth.uid;
      allow create: if isStudent() && request.resource.data.uid == request.auth.uid;
      allow update: if false;
      allow delete: if isAdmin();
    }
  }
}
```

## Rules로 충분하지 않은 영역

| 영역 | 이유 | 권장 |
|---|---|---|
| 점수 계산 | Rules에서 정답 계산과 문제 세트 무결성 검증이 어렵다 | Vercel Function 또는 backend에서 채점 |
| 랜덤 문항 선택 | client에서 선택하면 조작 가능성 존재 | 서버에서 문항 세트 발급 |
| 결과 제출 중복 방지 | Rules만으로 복잡한 idempotency 관리가 어렵다 | 서버 endpoint 또는 transaction 설계 |
| CSV 업로드 검증 | Rules는 파일 파싱/검증을 담당하지 않음 | 관리자 전용 서버 검증 |

## Client 변경 필요사항

| 현재 코드 | 변경 방향 |
|---|---|
| 앱 시작 시 전체 데이터 구독 | Auth 확인 후 role별 query |
| 관리자 `view` 상태 접근 | admin claim guard 적용 |
| profile role 필드 의존 | token claim 기준으로 변경 |
| 결과 create 후 즉시 완료 화면 | 저장 성공/실패 명확히 분기 |
| 과정/문제 관리 client write | admin claim + Rules 제한, 운영 수준은 서버 write |

## 검증 계획

| 단계 | 검증 |
|---|---|
| Emulator | 학생/관리자/비로그인 read/write 테스트 |
| Staging | 실제 Firebase staging project에서 smoke test |
| Preview | Vercel preview URL에서 로그인/제출/관리자 접근 확인 |
| Production | 최소 권한 계정으로 read/write 실패/성공 케이스 확인 |

## 최소 테스트 케이스

| 사용자 | 기대 결과 |
|---|---|
| 비로그인 | 모든 private 데이터 read/write 거부 |
| 학생 A | 학생 A 본인 진행/결과만 접근 가능 |
| 학생 A | 학생 B 진행/결과 접근 거부 |
| 학생 | 과정/문제 관리 write 거부 |
| 관리자 | 과정/문제/결과 관리 가능 |
| 관리자 claim 없음 | 관리자 화면 접근 및 Firestore write 거부 |

## 결론

Firestore Rules는 현재 구조의 필수 방어선이다. 단, Rules만으로 점수 계산과 제출 무결성을 완전히 보장하기 어렵기 때문에 상용 운영 단계에서는 서버 검증을 추가해야 한다.


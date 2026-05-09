# Firestore Rules Emulator Test

## Purpose

This document records the current local Firestore Emulator verification for the repository `firestore.rules` draft.

The tests were run against the local Emulator only. Production Firebase Rules were not deployed and production data was not accessed.

## Current Test Setup

| Item | Current State |
|---|---|
| `firestore.rules` | Present |
| `firebase.json` | Present |
| `firestore.indexes.json` | Present |
| Test script | `scripts/firestore-rules-emulator-test.mjs` |
| Firebase CLI | Executed through `npx firebase-tools` |
| Java | Temurin JDK 21 used for Emulator |
| Rules unit test package | `@firebase/rules-unit-testing@3.0.4` |

## Command Used

```powershell
$env:JAVA_HOME='C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot'
$env:PATH="$env:JAVA_HOME\bin;$env:PATH"
npx.cmd firebase-tools emulators:exec --project demo-exam-test-rules --only firestore "node scripts/firestore-rules-emulator-test.mjs"
```

## Latest Result

| Metric | Result |
|---|---|
| Firestore Emulator started | Pass |
| Rules scenarios executed | Pass |
| Total scenarios | 20 |
| Passed | 20 |
| Failed | 0 |
| Production deploy | Not performed |
| Production data access | Not performed |

Expected `PERMISSION_DENIED` messages were printed for denied scenarios. Those messages are part of successful negative testing.

## Scenario Coverage

| Actor | Scenario | Expected Result | Result |
|---|---|---|---|
| Signed out | Public course query | Denied | Pass |
| Signed out | `results` read | Denied | Pass |
| Signed out | `questionBank` read | Denied | Pass |
| Student A | Visible course query | Allowed | Pass |
| Student A | Hidden course direct read | Denied | Pass |
| Student A | Own result query | Allowed | Pass |
| Student A | Other student's result read | Denied | Pass |
| Student A | Course write | Denied | Pass |
| Student A | `questionBank` read | Denied | Pass |
| Student A | Own result create | Allowed | Pass |
| Student A | Other employee result create | Denied | Pass |
| Student A | Own progress write | Allowed | Pass |
| Student B | Student A progress read | Denied | Pass |
| Claimless user | Admin `exams` read | Denied | Pass |
| Claimless user | `questionBank` read | Denied | Pass |
| Claimless user | Full `results` read | Denied | Pass |
| Admin claim user | Full `exams` read | Allowed | Pass |
| Admin claim user | `questionBank` read | Allowed | Pass |
| Admin claim user | Result delete | Allowed | Pass |
| Admin claim user | Course update | Allowed | Pass |

## Current App Alignment

| Area | Current State |
|---|---|
| Admin login | Firebase Auth admin ID/password flow |
| Admin authorization | `getIdTokenResult(user, true)` and `claims.admin === true` |
| Admin subscription | Runs only when `isAdmin && admin view` |
| Student subscription | Visible courses and own results |
| Signed-out subscription | Sensitive collection subscriptions removed |

## Remaining Conflicts And Limits

| Issue | Current Risk |
|---|---|
| Rules not deployed | Production still uses currently deployed Firebase Rules, not necessarily this file |
| Student shared credential | Rules cannot prove the person using an employee ID is the real employee |
| Employee ID validation absent | Fake 8-digit employee IDs can still be registered by client flow |
| Client result payload | Rules cannot fully validate true score/answer integrity |
| Same Firebase for Preview/Production | Preview smoke tests can affect production data |

## Production Deployment Gate

Do not deploy the rules until:

1. Admin claim account is verified.
2. Student smoke test passes.
3. Admin smoke test passes.
4. Preview data-risk is accepted or a staging Firebase project exists.
5. Rollback plan is ready.

## Conclusion

The current draft Firestore Rules pass local Emulator verification for the prepared 20 scenarios. They are aligned with the implemented admin custom claim flow, but they are not active in production until deployed.

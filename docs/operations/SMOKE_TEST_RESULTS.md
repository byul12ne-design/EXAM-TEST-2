# Smoke Test Results

## Scope

| Item | Current Result |
|---|---|
| Local production build | PASS |
| Local dev server | PASS |
| Firestore Rules Emulator | PASS |
| Admin claim script syntax check | PASS |
| Admin claim script dry-run | PASS |
| Production deploy | Not performed |
| Firestore Rules production deploy | Not performed |

No real administrator ID, email, UID, password, service account path, or Firebase value is recorded in this document.

## Current Implementation Snapshot

| Item | Current State |
|---|---|
| Firebase env split | Completed |
| Login-before Firestore subscriptions | Removed for sensitive data |
| Admin hardcoded password | Removed |
| Admin login | Separate admin ID + Firebase Auth password flow |
| Internal admin Auth email | `${adminId}@wuerth-admin.exam` |
| Admin authorization | `getIdTokenResult(user, true)` and `claims.admin === true` |
| Claimless admin account | Signed out and blocked |
| Admin account/claim | Created and granted by operator |
| Actual admin login | Confirmed by operator |
| Firestore Rules draft | Added and Emulator verified |

## Local Build

Command:

```powershell
npm.cmd run build
```

Result:

| Check | Result |
|---|---|
| TypeScript compile | PASS |
| Vite production build | PASS |
| Output directory | `dist/` |
| Main JS chunk | `637.38 kB`, gzip `163.87 kB` |
| CSS asset | `1.80 kB`, gzip `0.83 kB` |
| Warning | 500 kB chunk warning remains |

## Local Dev Server

Command:

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Result:

| Check | Result |
|---|---|
| Vite ready | PASS |
| URL | `http://127.0.0.1:5173/` |
| HTTP status | `200` |
| App root container | Present |
| Env missing error | Not observed |
| Server cleanup | Completed |

Browser/manual verification recorded by operator:

| Scenario | Result |
|---|---|
| Actual admin login | Confirmed |
| Admin dashboard access after claim check | Confirmed |
| Real account details | Not recorded in docs |

Student full end-to-end submission was not executed in this automated smoke pass.

## Firestore Rules Emulator

Command:

```powershell
$env:JAVA_HOME='C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot'
$env:PATH="$env:JAVA_HOME\bin;$env:PATH"
npx.cmd firebase-tools emulators:exec --project demo-exam-test-rules --only firestore "node scripts/firestore-rules-emulator-test.mjs"
```

Result:

| Check | Result |
|---|---|
| Java | Temurin JDK 21 |
| Firestore Emulator start | PASS |
| Total scenarios | 20 |
| Passed | 20 |
| Failed | 0 |
| Production data touched | No |
| Production Rules deployed | No |

Coverage summary:

| Scope | Result |
|---|---|
| Signed-out reads/writes blocked | PASS |
| Student visible course read | PASS |
| Student own result/progress access | PASS |
| Student access to other user data blocked | PASS |
| Student access to admin data blocked | PASS |
| Claimless admin-like account blocked | PASS |
| Admin claim account allowed for admin data | PASS |

## Admin Claim Script

Checks:

```powershell
node --check scripts/set-admin-claim.mjs
npm run admin:claim -- --uid TEST_ADMIN_UID --service-account ./serviceAccount-test.json --action grant
```

Result:

| Check | Result |
|---|---|
| Syntax | PASS |
| Dry-run | PASS |
| Actual Firebase mutation | No |
| Requires `--confirm` for mutation | Yes |

## Remaining Risks

| Risk | Status |
|---|---|
| Student shared credential | Unresolved |
| Real employee ID validation | Unresolved |
| Firestore Rules production deployment | Pending |
| Preview and Production same Firebase project | Unresolved |
| Client-calculated score/result payload | Unresolved |
| Tailwind CDN runtime dependency | Unresolved |
| Large JS chunk warning | Unresolved |

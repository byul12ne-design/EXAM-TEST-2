# Firebase Rules Plan

## Current Status

The repository now includes a Firestore Rules draft. The rules have been tested with the local Firestore Emulator, but they have not been deployed to the production Firebase project.

| Item | Current State |
|---|---|
| `firestore.rules` | Exists |
| `firebase.json` | Exists and points to rules/indexes |
| `firestore.indexes.json` | Exists, no custom composite indexes currently required |
| Emulator test script | Exists |
| Emulator result | 20 scenarios passed |
| Production deploy | Not performed |
| Admin auth alignment | App and rules both use `admin: true` claim |

## Current Policy

The rules use deny-by-default. Access is allowed only for explicitly defined authenticated flows.

| Collection | Student Access | Admin Access | Notes |
|---|---|---|---|
| `users` | Own document only | Admin claim user | Client profile fields are not authority |
| `exams` | Read only visible courses | Full read/write/delete | Student write is denied |
| `results` | Own result data only | Full read/delete | Score integrity is not fully guaranteed by rules |
| `questionBank` | Denied | Full read/write/delete | Hidden from students |
| `studyProgress` | Own UID-prefixed progress | Current draft focuses on owner access | Current collection name is preserved |
| `testProgress` | Own UID-prefixed progress | Current draft focuses on owner access | Current collection name is preserved |

The current collection names are intentionally preserved:

```text
users
exams
results
questionBank
studyProgress
testProgress
```

No collection rename or DB migration is included in this phase.

## Admin Claim Policy

Admin access is based on Firebase Auth custom claim:

```text
request.auth.token.admin == true
```

The app also checks:

```text
claims.admin === true
```

This alignment is now implemented in the client and in the draft rules.

## Important Limitations

| Limitation | Impact | Required Follow-Up |
|---|---|---|
| Rules are not deployed | Production database is not protected by this repository file until deployment | Deploy only after preview/staging verification |
| Student shared credential remains | Student impersonation risk remains | Replace with per-user or server-verified auth |
| Employee ID validation absent | Fake employee IDs are not blocked | Add external validation source or admin pre-registration |
| Client-calculated result payload | Scores/answers can be manipulated before submission | Move validation/scoring server-side |
| Preview and Production share Firebase | Preview tests can affect production data | Create staging Firebase project |

## Current Code Alignment

| Flow | Current Code State | Rules Alignment |
|---|---|---|
| Login-before data access | Removed for sensitive collections | Reduces unauthorized reads before auth |
| Student course read | Query is limited to visible courses | Matches visible course rule |
| Student result read | Query is limited to own `studentId` | Matches own-result policy |
| Admin data subscription | Runs only in admin view after claim check | Matches admin claim rule |
| Question bank | Admin-only UI/data flow | Matches admin-only rule |

## Production Deployment Preconditions

Before deploying `firestore.rules` to production:

1. Confirm the intended admin Firebase Auth accounts exist.
2. Confirm each admin account has `admin: true`.
3. Confirm the admin user has re-logged in after claim assignment.
4. Run the Emulator test suite.
5. Run Vercel Preview smoke test.
6. Confirm Preview testing will not corrupt production data, or create a staging Firebase project first.
7. Deploy rules through Firebase Console or Firebase CLI.
8. Run production smoke test immediately after deployment.

## Do Not Do In This Phase

| Prohibited Work | Reason |
|---|---|
| Collection rename | Requires migration |
| DB migration | Out of current scope |
| Custom Claim assignment in client | Must use Admin SDK/secure backend |
| Production Rules deploy without smoke test | Can block admin or student flows |
| Store admin identifiers in docs | Operational account exposure |

## Current Recommendation

Keep the rules draft in the repository, use the Emulator test as a safety check, and deploy to production only after the operator confirms the admin claim account, Preview smoke test, and acceptable data-risk window.

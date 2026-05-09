# Security Remediation Plan

## Current State Summary

This document reflects the current repository state. It does not contain real passwords, service account keys, Firebase values, administrator identifiers, UIDs, or employee data.

| Area | Current State |
|---|---|
| Firebase client config | Moved to `src/lib/firebase.ts` and loaded from `VITE_FIREBASE_*` |
| Local env | `.env.local` configured locally and ignored by Git |
| Vercel env | Preview/Production env registered with the same Firebase web client config |
| Login-before Firestore subscriptions | Removed for sensitive collections |
| Admin password comparison | Removed |
| Admin login | Separate admin ID/password Firebase Auth flow |
| Admin authorization | Firebase ID token `admin: true` custom claim |
| Admin account/claim | One operator-created account has been granted `admin: true` and login was confirmed |
| Firestore Rules | Draft added and Emulator 20-scenario test passed |
| Production Rules deploy | Not performed |
| Student shared credential | Still unresolved |
| Employee ID validation | Not implemented; external policy/dependency required |

## Current Security Posture

| Severity | Risk | Current Cause | Current Status | Required Action |
|---|---|---|---|---|
| Critical | Student impersonation | Student flow still uses a shared credential model | Unresolved | Replace with verified per-user auth |
| Critical | Fake employee ID registration | No authoritative employee directory check | Unresolved | Add server-side/admin-controlled validation |
| Critical | Firestore Rules not active in production | Rules draft exists but is not deployed | Unresolved | Deploy after preview/staging smoke test |
| High | Preview can affect production data | Preview and Production use same Firebase project | Unresolved | Create staging Firebase project |
| High | Client-calculated score/result payload | Browser submits computed result data | Unresolved | Validate/score on server |
| Medium | Large bundle | Single entry bundle with Firebase/admin/student UI | Unresolved | Split code and vendor chunks |
| Medium | Tailwind CDN runtime dependency | Styling depends on external runtime script | Unresolved | Move Tailwind to build-time CSS |

## Completed Security Work

| Completed Work | Files |
|---|---|
| Firebase config env split | `src/lib/firebase.ts`, `.env.example`, `.gitignore`, `src/App.tsx` |
| Clear env missing error | `src/lib/firebase.ts` |
| Pre-login sensitive subscriptions removed | `src/App.tsx` |
| Admin login separated from student flow | `src/App.tsx` |
| Admin hardcoded password comparison removed | `src/App.tsx` |
| Admin claim check added | `src/App.tsx` |
| Claimless admin login blocked/sign-out | `src/App.tsx` |
| Firestore Rules draft added | `firestore.rules`, `firebase.json`, `firestore.indexes.json` |
| Rules Emulator test added and run | `scripts/firestore-rules-emulator-test.mjs` |
| Admin claim operation script added | `scripts/set-admin-claim.mjs` |
| Admin claim operating docs added | `docs/operations/ADMIN_CLAIM_SETUP.md` |

## Current Admin Security Model

| Layer | Policy |
|---|---|
| Admin login ID | Separate namespace from student employee ID |
| Internal Auth email | `${adminId}@wuerth-admin.exam` |
| Authentication | Firebase Auth email/password |
| Authorization | `admin: true` custom claim |
| App guard | `getIdTokenResult(user, true)` and `claims.admin === true` |
| Firestore Rules | `request.auth.token.admin == true` |
| Secret handling | No admin password or secret in code or `VITE_*` env |

The custom claim must be assigned through Firebase Admin SDK or another secure operator process. The web client must never assign its own admin claim.

## Remaining Plan

### Phase 1 - Production Guardrail

Goal: safely activate the rules-based protection.

| Work | Target | Notes |
|---|---|---|
| Review Emulator test output | `docs/security-remediation/FIRESTORE_RULES_EMULATOR_TEST.md` | Current result is pass |
| Run Vercel Preview smoke test | Vercel Preview URL | Same Firebase project risk must be accepted |
| Deploy Firestore Rules | Firebase Console/CLI | Do not deploy before smoke test |
| Run production smoke test | Production URL | Verify student/admin flows immediately |

### Phase 2 - Student Auth Remediation

Goal: remove student shared credential and fake employee ID registration risk.

| Work | Required Owner Input |
|---|---|
| Choose validation model | Owner/admin/IT decision |
| Provide employee allowlist or validation endpoint | HR/system owner/backend |
| Decide student account lifecycle | Operator |
| Replace shared credential | Developer after policy is decided |

Recommended first option: admin pre-registration or server-side validation while keeping employee ID UX.

### Phase 3 - Result Integrity

Goal: stop trusting client-computed result payloads.

| Work | Direction |
|---|---|
| Separate result builder/calculator | Refactor into testable functions |
| Add server-side validation/scoring | Vercel Function or Firebase Function |
| Prevent duplicate/invalid submissions | Server transaction/idempotency |

### Phase 4 - Maintainability And Runtime Hardening

| Work | Direction |
|---|---|
| Move Auth logic out of `App.tsx` | `src/services/authService.ts`, `src/hooks/useAuth.ts` |
| Move Firestore access out of `App.tsx` | service modules per domain |
| Add better error/loading UX | Permission/network/save failure states |
| Remove Tailwind CDN | Build-time Tailwind setup |
| Reduce bundle size | code splitting/manual chunks |

## GitHub Safety Policy

Allowed:

| Allowed Item | Condition |
|---|---|
| `.env.example` | Placeholder values only |
| Public docs | No real credentials or exploit instructions |
| Firebase client variable names | Names only |
| Firestore Rules draft | No real UID/email/project values |
| Admin claim script | No embedded secrets |

Forbidden:

| Forbidden Item | Reason |
|---|---|
| Actual admin password | Admin compromise |
| Actual student shared credential | Student account compromise |
| Service account JSON | Firebase Admin compromise |
| Private key/client email values | Server credential exposure |
| `.env.local`/`.env.production` | Real environment values |
| Real admin UID/email | Account targeting risk |

## Next Recommended Code Work

1. Do not change collections or migrate data yet.
2. Keep admin claim flow as current baseline.
3. Deploy Firestore Rules only after preview/rollback plan.
4. Ask owner for employee validation source/policy.
5. Replace the student shared credential after the validation policy is decided.
6. Move auth/firestore logic into services before larger UX changes.

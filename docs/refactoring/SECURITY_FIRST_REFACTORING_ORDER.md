# Security First Refactoring Order

## Current Purpose

This document is now a current-state refactoring order, not a future-only plan. It records what has already been completed and what should be done next to continue security-first development.

No real secrets, admin identifiers, service account values, Firebase values, or employee records are included.

## Completed Foundation

| Step | Status | Files |
|---|---|---|
| Git/env safety | Completed | `.gitignore`, `.env.example` |
| Firebase config split | Completed | `src/lib/firebase.ts`, `src/App.tsx` |
| Login-before Firestore subscription removal | Completed | `src/App.tsx` |
| Admin password removal | Completed | `src/App.tsx` |
| Admin login separation | Completed | `src/App.tsx` |
| Admin custom claim check | Completed | `src/App.tsx` |
| Firestore Rules draft | Completed, not deployed | `firestore.rules`, `firebase.json`, `firestore.indexes.json` |
| Rules Emulator test | Completed, pass | `scripts/firestore-rules-emulator-test.mjs` |
| Admin claim operating script | Completed | `scripts/set-admin-claim.mjs` |

## Current Architecture Constraint

Most application logic still lives in `src/App.tsx`. This includes authentication flow, admin/student view state, Firestore reads/writes, CSV handling, quiz flow, result generation, toast state, loading state, and large JSX sections.

The next refactoring should reduce risk without changing Firestore collection names or requiring DB migration.

## Next Refactoring Order

### Step 1 - Production Rules Activation Preparation

| Task | Reason |
|---|---|
| Run Preview smoke test | Rules deployment can block real user flows |
| Confirm admin claim account | Admin rules depend on `admin: true` |
| Prepare rollback path | Rules mistakes can block production data access |
| Deploy rules only after owner approval | Production currently has real data risk |

### Step 2 - Auth Service Split

Recommended files:

```text
src/services/authService.ts
src/hooks/useAuth.ts
```

Move:

| Current Area | New Responsibility |
|---|---|
| Student login/register | `signInStudent`, `registerStudent` |
| Admin login | `signInAdmin` |
| Claim check | `assertAdminClaim`, `getCurrentClaims` |
| Logout | `signOutCurrentUser` |
| Profile loading | `loadUserProfile` |

Do not change student UX yet. The goal is to isolate the current behavior so the shared credential can be removed safely later.

### Step 3 - Firestore Service Split

Recommended files:

```text
src/services/courseService.ts
src/services/resultService.ts
src/services/questionBankService.ts
src/services/progressService.ts
```

Keep current collection names in service implementations:

| Current Collection | Service Domain Name |
|---|---|
| `exams` | course service |
| `results` | result service |
| `questionBank` | question bank service |
| `studyProgress` | study progress service |
| `testProgress` | quiz progress service |

This avoids DB migration while improving readability and Rules debugging.

### Step 4 - Student Auth Remediation

Blocked by owner/admin input:

| Needed Input | Why |
|---|---|
| Employee validation source | Fake employee IDs cannot be blocked without authoritative data |
| Account lifecycle policy | Need rules for registration, reset, offboarding |
| Shared credential replacement policy | Must avoid moving the shared credential to `VITE_*` |

Possible implementation choices:

| Option | Suitability |
|---|---|
| Admin pre-registration | Good first internal control |
| One-time registration code | Good if distribution process exists |
| Vercel/Firebase Function validation | Best technical fit while keeping employee ID UX |
| Company SSO/email | Best long-term identity model |

### Step 5 - Result Integrity

Move result-related logic into testable functions before changing backend behavior:

```text
src/services/resultService.ts
src/utils/scoring.ts
```

Then add server-side validation/scoring through Vercel Function or Firebase Function. Firestore Rules alone cannot prove that a client-submitted score is correct.

### Step 6 - UI/UX Hardening

| Area | Improvement |
|---|---|
| Permission failures | Clear error state and recovery action |
| Save failures | Do not navigate to final screen until save succeeds |
| Loading states | Separate auth loading, data loading, save loading |
| Mobile navigation | Make back/exit behavior consistent |
| Accessibility | Labels, focus handling, `aria-live` toast |

### Step 7 - Performance And Build

| Area | Improvement |
|---|---|
| Bundle size | Split admin/student modules or manual chunks |
| Tailwind CDN | Move to build-time Tailwind |
| Firestore reads | Add pagination/limits where needed |
| Vercel Node | Pin version after owner agreement |

## What Not To Do Yet

| Avoid | Reason |
|---|---|
| Rename Firestore collections | Requires migration |
| Migrate DB schema | Not needed for current security baseline |
| Add client-side employee allowlist | Leaks roster data |
| Put student/admin secrets in `VITE_*` | Browser bundle exposes them |
| Deploy Firestore Rules without smoke test | Can block admin/student flows |

## Pre-Commit Safety Checklist

```powershell
git status --short
git grep --untracked -n -e "[SENSITIVE_PATTERN]" -- . ':!docs/internal/**' ':!.env.local' ':!dist/**' ':!node_modules/**'
npm.cmd run build
```

Allowed findings include documented `admin: true` policy and test claims. The remaining student shared credential in `src/App.tsx` is an unresolved existing security issue and must be removed in the next security change.

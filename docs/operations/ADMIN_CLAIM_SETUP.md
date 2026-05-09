# Admin Claim Setup

## Purpose

This document describes the current operating procedure for granting and verifying administrator access.

The application now requires a Firebase Auth ID token custom claim:

```text
admin: true
```

The web client checks this claim before entering the admin dashboard, and the draft Firestore Rules use the same policy with `request.auth.token.admin == true`.

Do not record real administrator IDs, emails, UIDs, passwords, service account paths, private keys, or Firebase project values in this document.

## Current Status

| Item | Current State |
|---|---|
| Admin hardcoded password | Removed from admin access flow |
| Admin login UI | Implemented as separate administrator ID + password form |
| Internal admin email format | `${adminId}@wuerth-admin.exam` |
| Admin Auth account | One account has been created by the operator |
| Admin custom claim | `admin: true` has been granted by the operator |
| Actual admin login | Confirmed by the operator |
| Firestore Rules production deploy | Not performed yet |
| Student auth risk | Student shared credential and employee ID validation remain unresolved |

## Required Permissions

| Task | Required Access |
|---|---|
| Create admin Auth user | Firebase Authentication user management access |
| Grant or revoke custom claim | Firebase Admin SDK execution permission |
| Deploy Firestore Rules | Firebase Rules deployment permission |
| Verify Vercel deployment | Vercel project access |

## Admin Account Format

The admin account must be created in Firebase Authentication before using the app.

| Field | Policy |
|---|---|
| Admin ID | Separate from student employee ID namespace |
| Firebase Auth email | `${adminId}@wuerth-admin.exam` |
| Password | Managed only in Firebase Auth/secure operator channel |
| Claim | `admin: true` |

The real admin ID, generated email, UID, and password must not be committed or written in public docs.

## Prepared One-Time Script

The repository includes a local-only operating script:

```text
scripts/set-admin-claim.mjs
```

It uses Firebase Admin SDK and accepts sensitive inputs only through environment variables or CLI arguments.

Required inputs:

| Input | Accepted Source |
|---|---|
| Service account JSON path | `--service-account`, `FIREBASE_SERVICE_ACCOUNT_PATH`, or `GOOGLE_APPLICATION_CREDENTIALS` |
| Admin UID | `--uid`, `FIREBASE_ADMIN_UID`, or `ADMIN_UID` |
| Action | `--action grant` or `--action revoke` |
| Real execution confirmation | `--confirm` or `CONFIRM_ADMIN_CLAIM=true` |

The script defaults to dry-run mode. Without `--confirm`, it does not change Firebase.

Grant example:

```powershell
npm run admin:claim -- --uid "[ADMIN_UID]" --service-account "[LOCAL_SERVICE_ACCOUNT_JSON_PATH]" --action grant --confirm
```

Revoke example:

```powershell
npm run admin:claim -- --uid "[ADMIN_UID]" --service-account "[LOCAL_SERVICE_ACCOUNT_JSON_PATH]" --action revoke --confirm
```

Environment variable example:

```powershell
$env:FIREBASE_ADMIN_UID="[ADMIN_UID]"
$env:FIREBASE_SERVICE_ACCOUNT_PATH="[LOCAL_SERVICE_ACCOUNT_JSON_PATH]"
npm run admin:claim -- --action grant --confirm
```

## Service Account Handling

Never commit these files or values:

| Forbidden Item | Reason |
|---|---|
| Service account JSON | Firebase Admin access exposure |
| Service account private key | Full server credential exposure |
| Service account client email value | Operational identity exposure |
| Real admin UID/email/password | Account targeting risk |
| Shell history containing secrets | Local leakage risk |

`.gitignore` includes patterns for local service account files:

```text
serviceAccount*.json
*.service-account.json
*.service-account.local.json
firebase-adminsdk*.json
```

## Token Refresh Requirement

Custom claim changes are not always visible in an already issued ID token.

After granting or revoking `admin: true`:

1. Sign the admin user out.
2. Sign in again.
3. The app calls `getIdTokenResult(user, true)` during admin login/access checks.
4. Confirm the admin dashboard is allowed or blocked as expected.

## Smoke Test Checklist

| Step | Expected Result |
|---|---|
| Non-admin user opens admin login | Admin login form renders |
| Claimless Firebase Auth account signs in | App signs the user out and blocks access |
| Admin claim account signs in | Admin dashboard opens |
| Admin logs out | Admin dashboard access is removed |
| Admin claim is revoked and user retries | Admin dashboard access is blocked |
| Student login flow is used | Student flow remains unchanged |

## Current Caveats

| Caveat | Status |
|---|---|
| Firestore Rules are not deployed to production | Still pending |
| Student shared credential remains | Still pending |
| Employee ID validation is not implemented | External policy/dependency, still pending |
| Preview and Production use the same Firebase project | Still pending staging split |

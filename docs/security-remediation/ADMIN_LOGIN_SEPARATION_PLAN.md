# Admin Login Separation Plan

## Current Status

This plan has been implemented for the current codebase.

| Item | Current State |
|---|---|
| Student login UX | Preserved |
| Admin login UI | Implemented separately |
| Admin ID namespace | Separated from student employee ID namespace |
| Internal admin email | `${adminId}@wuerth-admin.exam` |
| Admin authentication | Firebase Auth `signInWithEmailAndPassword` |
| Admin authorization | Firebase ID token custom claim `admin: true` |
| Claimless account handling | Immediate sign-out and access block |
| Admin hardcoded password | Removed |
| Firestore collection rename | Not performed |
| DB migration | Not performed |
| Firestore Rules production deploy | Not performed |

No real admin ID, email, UID, password, service account path, or Firebase project value is recorded in this document.

## Implemented Flow

| Step | Behavior |
|---|---|
| 1 | User opens admin login screen from the login card |
| 2 | Admin enters administrator ID and password |
| 3 | The app normalizes the admin ID to lowercase |
| 4 | The app builds internal Firebase Auth email as `${adminId}@wuerth-admin.exam` |
| 5 | The app calls `signInWithEmailAndPassword(auth, adminEmail, password)` |
| 6 | The app calls `getIdTokenResult(user, true)` |
| 7 | If `claims.admin === true`, the app enters `admin-dash` |
| 8 | If claim is missing, the app calls `signOut(auth)` and shows an authorization error |

Representative implementation shape:

```ts
const adminEmail = `${normalizedAdminId}@wuerth-admin.exam`;
const credential = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
const token = await getIdTokenResult(credential.user, true);

if (token.claims.admin !== true) {
  await signOut(auth);
  throw new Error('ADMIN_CLAIM_REQUIRED');
}
```

## Actual Code References

| Area | File | Current Role |
|---|---|---|
| Auth imports | `src/App.tsx` | Uses Firebase Auth sign-in/sign-out/token functions |
| Admin login state | `src/App.tsx` | Holds admin ID/password form values |
| Admin login handler | `src/App.tsx` | Performs Firebase Auth login and claim check |
| Admin access recheck | `src/App.tsx` | Revalidates claim for existing session |
| Admin data subscription | `src/App.tsx` | Runs only when `isAdmin && isAdminView` |
| Firestore Rules policy | `firestore.rules` | Uses `request.auth.token.admin == true` |

## Student Flow Impact

| Student Flow | Current State |
|---|---|
| Employee ID input | Preserved |
| Student pseudo email | Preserved |
| Student registration/login | Preserved |
| Student shared credential | Still unresolved |
| Employee ID validation | Still unresolved external dependency |

The admin login separation intentionally did not change student onboarding or student authentication in this step.

## Firebase Operations Required

The operator has created one admin Firebase Auth account and granted `admin: true` custom claim for the current test account. For future admin accounts, repeat this policy:

| Requirement | Policy |
|---|---|
| Account creation | Firebase Authentication user must exist first |
| Email rule | `${adminId}@wuerth-admin.exam` |
| Password | Managed only through Firebase Auth/secure channel |
| Claim | `admin: true` |
| Claim propagation | Re-login or token refresh required |
| Revocation | Remove `admin` claim and force re-login |

See `docs/operations/ADMIN_CLAIM_SETUP.md` for the operating procedure.

## Remaining Work

| Priority | Work | Reason |
|---|---|---|
| P0 | Replace student shared credential | Current student auth still allows impersonation risk |
| P0 | Define employee ID validation source | Fake employee IDs are not blocked by current code |
| P0 | Deploy Firestore Rules only after staging/preview checks | Repository rules are not active in production until deployed |
| P1 | Split auth logic into service/hook | Current logic still lives in `App.tsx` |
| P1 | Add clearer auth/loading/error states | Claim failure and network failure need better UX |

# Employee ID Auth Review

## Current Status

The student login and registration UX still uses employee ID based entry. This flow is intentionally unchanged in the current admin-security work.

| Item | Current State |
|---|---|
| Student login UX | Preserved |
| Employee ID format validation | Basic client validation only |
| Real employee registry check | Not implemented |
| Name and employee ID matching | Not implemented |
| Student shared credential | Still present as unresolved security issue |
| Admin login | Now separated from student employee ID flow |
| Firestore Rules | Draft limits data access after auth, but cannot validate real employee identity |

No real employee IDs, passwords, or internal personnel data are recorded in this document.

## Current Flow

| Step | Current Behavior |
|---|---|
| 1 | Student enters employee ID and name |
| 2 | App validates basic employee ID shape |
| 3 | App creates a pseudo Firebase Auth email for the student flow |
| 4 | App signs in or creates an account with the existing student credential mechanism |
| 5 | App creates/loads a user profile document |
| 6 | Student-specific data queries start after auth/profile is available |

## Answers To Key Questions

| Question | Current Answer |
|---|---|
| Is employee ID checked against a real staff list? | No |
| Is name matched to employee ID? | No |
| Can a fake correctly shaped employee ID be attempted? | Yes |
| Can another person's employee ID be attempted? | Yes |
| Does Firestore Rules solve identity proof? | No |
| Does admin claim solve student validation? | No, it only protects admin access |
| Is student shared credential still a risk? | Yes |

## Scenario Analysis

| Scenario | Current Code Flow | Result | Risk |
|---|---|---|---|
| Real employee ID | Basic validation passes, auth/profile flow proceeds | Login/register can proceed | Medium |
| Fake correctly shaped employee ID | Basic validation can pass | Account attempt can proceed | Critical |
| Existing employee ID | Existing Firebase Auth/profile behavior applies | Depends on account state | High |
| Another person's employee ID | No identity proof exists | Possible impersonation attempt | Critical |
| Different name with same employee ID | Name is not matched to registry | Possible inconsistent profile | High |
| Admin ID guessed through student flow | Admin login namespace is now separated | Admin claim still required | Medium |
| Signed-out access | Sensitive Firestore subscriptions removed | Data exposure reduced | Medium |
| Firebase Auth user without profile | App attempts profile handling based on current logic | Edge-case UX still needs hardening | Medium |

## Security Risk Summary

| Severity | Risk | Impact | Recommended Action |
|---|---|---|---|
| Critical | Fake employee ID registration | Unauthorized user can enter student flow | Add server-side/admin-controlled validation |
| Critical | Employee ID impersonation | One user can attempt another identity | Replace shared credential and verify identity |
| Critical | Student shared credential | Compromise affects all students | Move to per-user auth or controlled registration |
| High | No name/ID match | Data quality and accountability risk | Validate against authoritative roster |
| Medium | Profile field role confusion | Client profile data must not be authority | Use Auth claims/Rules for authority |

## Why Employee Validation Is External

The app does not contain an authoritative employee directory. A real fix requires one of the following external inputs:

| Required Input | Owner |
|---|---|
| Approved employee roster | Business/HR/system owner |
| Registration allowlist | Administrator/operator |
| One-time registration code policy | Business owner/operator |
| Company email/SSO policy | IT/identity team |
| Server-side verification endpoint | Backend/platform owner |

Hardcoding a staff list in the client bundle is not acceptable because it exposes internal personnel data and can be inspected by users.

## Recommended First Improvement

For an internal training web app that wants to keep employee-ID-based UX:

1. Keep the employee ID input UX.
2. Stop using a shared student credential.
3. Add server-side or admin-controlled registration validation.
4. Allow only verified employee IDs to create or sign into student accounts.
5. Keep admin authorization separate through Firebase Auth admin custom claims.

Practical near-term options:

| Option | Fit |
|---|---|
| Admin pre-registration | Good first operational control |
| One-time registration code | Good if admins can distribute codes |
| Vercel/Firebase Function validation | Best technical direction |
| Company SSO/email | Best long-term identity solution |

## Current Recommendation

Do not implement a fake client-side employee allowlist. Continue with current admin claim work, then prioritize student credential removal and employee validation design with the system owner.

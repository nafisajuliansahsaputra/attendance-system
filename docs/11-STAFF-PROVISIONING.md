# Staff Provisioning Runbook

This runbook describes how to create Attendance System staff accounts without committing credentials to GitHub.

## Security rules

- There is **no public staff sign-up** in the current MVP.
- Supabase Auth stores the login identity; application roles and class scope live in `profiles` and `homeroom_assignments`.
- Never place a real password, `SUPABASE_SECRET_KEY`, or service-role credential in GitHub, screenshots, documentation, or browser code.
- `.env.local` is ignored by Git and is the preferred local input file for this bootstrap workflow.
- The very first application profile must be `SYSTEM_ADMIN`.
- After the first admin exists, every later staff provisioning request must identify an existing active System Admin through `ACTOR_USER_ID`.
- A failed profile/assignment step causes the provisioning script to delete the Auth user it just created, avoiding an orphaned login account.

## 1. Prepare local environment

Copy `.env.example` to `.env.local` on the trusted development machine and populate the real Attendance System Supabase values there.

For the first System Admin, add these local-only values:

```dotenv
SUPABASE_URL=<attendance-system-project-url>
SUPABASE_SECRET_KEY=<server-secret-key>

STAFF_EMAIL=<admin-email>
STAFF_PASSWORD=<strong-password>
STAFF_FULL_NAME=<admin-full-name>
STAFF_ROLE=SYSTEM_ADMIN
INSTITUTION_ID=<institution-uuid>
```

Do **not** set `ACTOR_USER_ID` for the first bootstrap. The database permits actor-less bootstrap only while there are zero profiles, and only for `SYSTEM_ADMIN`.

Run:

```bash
npm run staff:provision:env
```

The script prints the new Auth user ID and non-secret profile result. It does not print the password or secret key.

## 2. Provision a homeroom teacher

After the first System Admin exists, use that admin's application/Auth user ID as `ACTOR_USER_ID` and provide the target class/year.

```dotenv
STAFF_EMAIL=<teacher-email>
STAFF_PASSWORD=<strong-password>
STAFF_FULL_NAME=<teacher-full-name>
STAFF_ROLE=HOMEROOM_TEACHER
INSTITUTION_ID=<institution-uuid>
ACTOR_USER_ID=<existing-system-admin-user-uuid>
CLASS_ID=<assigned-class-uuid>
ACADEMIC_YEAR_ID=<academic-year-uuid>
```

Then run the same command:

```bash
npm run staff:provision:env
```

The database validates that:

- the actor is an active `SYSTEM_ADMIN`;
- actor and target profile belong to the same institution;
- the class belongs to that institution;
- the academic year belongs to that institution;
- the homeroom assignment is created for the requested class/year.

## 3. Provision an operator

Use:

```dotenv
STAFF_ROLE=OPERATOR
ACTOR_USER_ID=<existing-system-admin-user-uuid>
```

`CLASS_ID` and `ACADEMIC_YEAR_ID` are not required for an operator.

The exact Operator product permissions are still an open product decision. Creating an Operator identity does not automatically grant browser database access.

## 4. Verify login

After provisioning:

1. Start the app with the required Supabase Auth environment variables configured.
2. Open `/login`.
3. Sign in with the staff email/password.
4. A Homeroom Teacher should be routed to `/teacher` and only see assigned classes.
5. A System Admin should be routed to `/dashboard` and may open the homeroom workspace for institution classes.
6. A valid Supabase Auth user without an active application profile must be denied.

## 5. Rotate or revoke access

Do not solve staff access changes by editing browser/JWT user metadata.

Authorization changes belong to canonical application data:

- deactivate or update `profiles` for role/access changes;
- update `homeroom_assignments` for class scope changes;
- manage Supabase Auth credentials/sessions through server-side administrative flows.

A future Admin UI may wrap these operations, but it must preserve the same authorization model.

## 6. Repository safety check

Before every commit involving setup or deployment files:

- confirm `.env.local` and all `.env*` secret files remain ignored;
- confirm no `sb_secret_`/service-role value appears in tracked files;
- confirm no real staff password appears in source, fixtures, docs, tests, or CI logs.

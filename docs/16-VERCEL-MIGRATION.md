# Vercel Migration Runbook

This runbook moves the Attendance System web/API and face-recognition service off Railway while keeping the existing Supabase project unchanged.

## Target architecture

```text
Browser / RFID terminal
        |
        v
Vercel Project A
Next.js Attendance System
        |
        +--------> Supabase
        |
        +--------> Vercel Project B
                   FastAPI + OpenCV
```

The same GitHub repository is used by both Vercel projects.

## Project A — Attendance web/API

Repository:

```text
nafisajuliansahsaputra/attendance-system
```

Settings:

- Root Directory: repository root
- Framework Preset: Next.js
- Production Branch: `main`

Production environment variables copied from the current deployment:

```text
SUPABASE_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY
STAFF_PORTAL_ENABLED
FACE_SERVICE_URL
FACE_SERVICE_SECRET
INSTITUTION_TIMEZONE
```

Do not copy Railway-generated variables such as `RAILWAY_*`.

## Project B — Face service

Use the same repository with:

- Root Directory: `services/face-service`
- Framework/runtime: FastAPI / Python
- Production Branch: `main`
- Required production variable: `FACE_SERVICE_SECRET`

The same secret value must be used by Project A and Project B.

The face project includes `vercel.json`, which downloads and verifies the pinned OpenCV models during the build.

After deployment, verify:

```text
GET https://<face-project>.vercel.app/health
```

Expected readiness:

```json
{
  "status": "ok",
  "detectorModelPresent": true,
  "recognizerModelPresent": true
}
```

Then set Project A:

```text
FACE_SERVICE_URL=https://<face-project>.vercel.app
```

Redeploy Project A after changing the variable.

## Production verification

Verify these routes on Project A:

```text
/api/health
/terminal
/terminal/device
/dashboard
```

`/api/health` should report Supabase and face-service configuration as available.

For the operational terminal, verify in Chrome or Edge desktop:

1. Pair a registered terminal.
2. Allow camera access.
3. Connect the RFID keyboard-wedge reader or Web Serial device.
4. Scan a valid RFID card.
5. Capture a face.
6. Confirm MATCH records attendance exactly once.
7. Confirm MISMATCH does not record attendance.
8. Confirm heartbeat/device online state updates in the dashboard.

## Cutover

Do not delete the Railway project before the Vercel production verification passes.

After Vercel passes end-to-end verification, the Railway web and face-service workloads can remain stopped or be removed. Supabase is not migrated.

## BAST

BAST is a separate Laravel/PHP application. It is intentionally excluded from this Vercel migration because its production runtime should not depend on an unofficial PHP adapter merely to force it onto Vercel. Migrate it separately to a zero-cost PHP/container-capable host.

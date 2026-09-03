# Database workspace

The production data store is locked to **PostgreSQL on a dedicated Supabase project for Attendance System**.

Important:

- Do not reuse the Spall Spill Supabase project, keys, Auth users, Storage buckets, or tables.
- No live Supabase project has been created from this repository yet because project creation requires the owner to explicitly choose the Supabase organization.
- Schema changes will be represented as migrations once the dedicated project is selected and connected.
- Every table exposed through Supabase Data API must use appropriate RLS; server-side attendance truth must not be writable by ordinary browser clients.

Planned first schema slice:

1. institutions / academic years;
2. grades, classes, student enrollments;
3. RFID credentials;
4. session definitions and occurrences;
5. raw attendance events;
6. canonical attendance records;
7. school-day absence confirmations;
8. device registry and audit metadata.

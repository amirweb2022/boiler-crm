# Project guide for coding agents

This is a Persian, right-to-left CRM for periodic testing of steam boilers and pressure vessels. Read [docs/PRD.md](docs/PRD.md) when changing product behavior; it describes the implemented workflows and their known limits. Treat the code and SQL schema as the authority if documentation disagrees with the working tree.

## Find the relevant code

- `app/dashboard/` contains the dashboard, monthly reports, and audit history pages. `components/` holds their client-side interactions; `app/login/` contains the login screen.
- `app/api/` contains the HTTP boundary. Check authorization and input validation in each route before changing a workflow.
- `lib/db/` contains Supabase queries and inspection-cycle operations. `lib/date/shamsi.ts` handles Jalali display, due dates, and annual rollover; `lib/validation.ts` holds shared Zod schemas.
- `lib/certificates/` contains template field coordinates and PDF rendering; `public/certificate-templates/` contains the two template images. Certificate **generation** and certificate **upload** are separate operations.
- `lib/reports/` builds Excel workbooks from `test_history`; `lib/sms/` chooses the mock or Kavenegar sender. `app/api/sms/send-reminders/route.ts` is the externally invoked reminder and certificate-cleanup job.
- `types/index.ts` defines application types. `supabase/schema.sql` defines a fresh database; `supabase/migrations/` contains incremental changes for existing databases. Check both when altering persistence.

## Invariants to preserve

- A company has one current `test_records` row and any number of vessels sharing its due date. Completing a cycle advances that row by one **Jalali** year; `test_history` is a snapshot of actually tested, non-excluded vessels, used for monthly reports.
- A vessel may be marked tested only after its company's due date and while the current cycle is pending. Exclusion requires an admin-supplied reason, counts toward completion for this cycle, and is reset at rollover. An empty vessel list never qualifies.
- Completion requires the due date, every vessel tested or excluded, and a certificate uploaded to the company's current test record. Generating and downloading a vessel PDF records `generated_certificates` metadata but does not upload it or satisfy that prerequisite.
- Database dates are Gregorian ISO values; forms and reports display/select Jalali dates. Preserve conversions at the boundary and the existing Persian/RTL interface.
- `tester` can read companies and toggle vessel test flags. Mutating company/vessel data, exclusions, certificates, reports, region mappings, and audit-log viewing require `admin`. Apply role checks on the server, even when UI controls are hidden.
- Supabase service-role credentials belong on the server. Use `lib/supabase/server.ts` only from server code. Uploaded certificates use the `certificates` Storage bucket; access currently uses public URLs.

## Local workflow

1. Review the affected route, component, repository method, shared types, and SQL before editing. Preserve existing uncommitted changes.
2. For local setup, use `npm install`, copy `.env.example` to `.env.local`, initialize Supabase from `supabase/schema.sql` (or apply migrations to an existing installation), create the `certificates` Storage bucket, and create an admin with `scripts/create-admin.ts`. Keep secrets out of version control. See `README.md` for the exact setup commands.
3. Run `npm run dev` for manual flows and `npm run build` for a production compilation when dependencies and environment are available. The package defines no test script; `npm run lint` invokes `next lint`, with no lint configuration checked into this repository. Report checks that could not run.
4. When changing cycle, certificate, SMS, or report behavior, check both API authorization and the user-visible state. Update the PRD if observed behavior changes. Document any externally scheduled cron configuration separately; the repository supplies its endpoint but no scheduler definition.

The repository contains work in progress in the certificate feature. Do not infer that a README roadmap item is implemented; inspect its route and call path first.

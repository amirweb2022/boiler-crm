# Boiler and Pressure Vessel Inspection CRM

A Persian, right-to-left CRM for companies, inspection vessels, annual test cycles, certificates, reminders, audit history, and monthly Excel reports.

## Architecture

- Next.js 14 App Router runs on Liara Next.js hosting.
- Liara managed PostgreSQL stores application data. The full fresh-install schema is [`database/schema.sql`](database/schema.sql).
- Liara Object Storage stores uploaded certificates through its S3-compatible API.
- `lib/db/postgres.ts` owns server-side PostgreSQL connections and transactions. Feature repositories live in `lib/db/`.
- `lib/storage/certificates.ts` owns certificate object uploads and public URL generation.

Company inspection cycles use Jalali year rollover while database dates remain Gregorian. Completion stores tested-vessel snapshots in `test_history`, archives certificate references, advances the existing test record, and resets cycle-specific vessel flags in one transaction. Uploaded certificates remain separate from generated vessel PDFs.

## Local development

1. Install dependencies and copy `.env.example` to `.env.local`.
2. Create a PostgreSQL database and apply `database/schema.sql`.
3. Create an S3-compatible bucket and configure the `LIARA_OBJECT_STORAGE_*` variables in `.env.local`.
4. Create an administrator:

   ```bash
   npx tsx --env-file=.env.local scripts/create-admin.ts 09121234567 "PasswordStrong123" "Admin name" admin
   ```

5. Start the app with `npm run dev`.

See [`docs/liara-deployment.md`](docs/liara-deployment.md) for Liara provisioning, deployment variables, certificate cleanup scheduling, and PDF runtime requirements. The repository starts with a fresh Liara database; it contains no Supabase data or file import step.

## Operational notes

- Server-side role checks remain in API routes. Keep database and Object Storage credentials out of client bundles and version control.
- Uploaded certificate links are public, matching the existing product behavior. The object key is stored in PostgreSQL alongside the URL.
- Liara's Next.js Cron Job settings must invoke `/api/cron/clear-stale-certificates` daily. Keep `CRON_SECRET` configured and use the authorization header where supported.
- PDF generation needs Puppeteer Chrome and Linux runtime libraries. `PUPPETEER_EXECUTABLE_PATH` can override Puppeteer's default executable path.
- The repository has no automated test suite. Use the PRD acceptance scenarios and Liara staging deployment when validating behavior.

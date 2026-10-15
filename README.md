# Boiler and Pressure Vessel Inspection CRM

A Persian, right-to-left CRM for companies, inspection vessels, annual test cycles, certificates, reminders, audit history, and monthly Excel reports.

## Architecture

- Next.js 14 App Router runs on Liara Next.js hosting.
- Liara managed PostgreSQL stores application data. The full fresh-install schema is [`database/schema.sql`](database/schema.sql).
- Liara Object Storage stores uploaded certificates through its S3-compatible API.
- `lib/db/postgres.ts` owns server-side PostgreSQL connections and transactions. Feature repositories live in `lib/db/`.
- `lib/storage/certificates.ts` owns private certificate object uploads and downloads. The application provides individual public share pages.

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
- Uploaded certificate links open an unlisted public viewer at `/certificates/<random-UUID>.pdf`, without login. The bucket can remain private; the object key and viewer URL are stored in PostgreSQL. There is no public certificate listing.
- Liara's Next.js Cron Job settings must invoke `/api/cron/clear-stale-certificates` daily. Keep `CRON_SECRET` configured and use the authorization header where supported.
- PDF generation and image-to-PDF conversion use Puppeteer's managed Chrome, or installed Google Chrome if the managed browser is unavailable. The runtime needs Chrome's system libraries.
- Run `npm test` for isolated certificate and calendar regression tests. Run `npm run build`, then `npm run test:e2e` with `E2E_ADMIN_PHONE`, `E2E_ADMIN_PASSWORD`, and `E2E_ADMIN_NAME` supplied as process environment variables. The E2E runner uses configured Liara services, starts the production app on port 3107 with mock SMS, retains the admin, and removes only its own marked fixtures and uploaded objects. Outside reminder hours, it also starts a controlled-clock mock-SMS server on port 3108 to verify successful sends and concurrent duplicate suppression. Both ports must be free. It writes `test-results/e2e-report.json`; live checks require reachable services. It does not deploy the application. `scripts/e2e-clock.cjs` is exclusively a test preload and must never be enabled in deployment.

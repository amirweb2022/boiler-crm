# Liara deployment

The production application uses Liara Next.js hosting, Liara managed PostgreSQL, and Liara Object Storage. The CRM starts with an empty database and storage bucket; no Supabase records or objects are imported.

## Create the database and bucket

1. Create a PostgreSQL database in Liara and copy its connection string into the app's server environment as `DATABASE_URL`.
2. Run `database/schema.sql` against the new database using `psql` or Liara's database console.
3. Create a private Object Storage bucket and configure its S3 endpoint, bucket name, and credentials using the `LIARA_OBJECT_STORAGE_*` variables in `.env.example`. Certificate share pages stream the file through the app; no public storage domain is needed.
4. Keep the database URL and storage credentials server-side. Never use `NEXT_PUBLIC_` for these values.

The schema is a complete fresh-install schema. Do not apply the former Supabase migrations; Supabase-specific RLS and Storage statements have been removed.

## Configure and deploy the app

Set these variables in Liara's app settings:

- `DATABASE_URL` for the non-TLS PostgreSQL service.
- `LIARA_OBJECT_STORAGE_ENDPOINT`, `LIARA_OBJECT_STORAGE_REGION`, `LIARA_OBJECT_STORAGE_BUCKET`, `LIARA_OBJECT_STORAGE_ACCESS_KEY`, and `LIARA_OBJECT_STORAGE_SECRET_KEY`.
- `SESSION_SECRET`, `NEXT_PUBLIC_APP_URL`, `SMS_PROVIDER`, and the relevant Kavenegar and report settings.
- `CRON_SECRET` and `CERTIFICATE_CLEAR_NEAR_DUE_DAYS`.

Deploy the repository as a Liara Next.js app. Generated certificates and image-to-PDF uploads require Puppeteer's managed Chrome (or installed Google Chrome) and its runtime libraries in the app container. Set `NEXT_PUBLIC_APP_URL` to the public HTTPS application origin so SMS links open the deployed certificate viewer.

After deployment, create the initial administrator by running `scripts/create-admin.ts` with `DATABASE_URL` configured. The database starts empty.

## Schedule certificate cleanup

In the Liara Next.js app's Cron Job settings, schedule `GET /api/cron/clear-stale-certificates` once daily, at the intended 08:30 Asia/Tehran time. Preserve the route's `CRON_SECRET` check by configuring the request with `Authorization: Bearer <CRON_SECRET>` if the Liara scheduler exposes custom request headers. The route also accepts the secret as a `token` query parameter for schedulers that can only configure a URL; prefer the authorization header when available. Keep the secret out of source control and manual browser bookmarks.

The cleanup route archives certificate references and detaches old-cycle references; it does not delete stored files. The endpoint remains protected for direct requests.

## Local setup

1. Install dependencies and copy `.env.example` to `.env.local`.
2. Create a local or Liara PostgreSQL database and apply `database/schema.sql`.
3. Configure an S3-compatible bucket and the environment variables above.
4. Create an admin with `npx tsx --env-file=.env.local scripts/create-admin.ts ...`.
5. Start the app with `npm run dev`.

Keep the former Supabase project untouched during initial Liara deployment if it is needed as a rollback reference. The application code no longer connects to it.

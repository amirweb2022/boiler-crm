# Liara deployment

The production application uses Liara Next.js hosting, Liara managed PostgreSQL, and Liara Object Storage. The CRM starts with an empty database and storage bucket; no Supabase records or objects are imported.

## Create the database and bucket

1. Create a PostgreSQL database in Liara and copy its connection string into the app's server environment as `DATABASE_URL`.
2. Run `database/schema.sql` against the new database using `psql` or Liara's database console.
3. Create a publicly readable Object Storage bucket named `certificates` to preserve the existing public-link behavior. Configure its S3 endpoint, bucket credentials, and public URL base using the `LIARA_OBJECT_STORAGE_*` variables in `.env.example`.
4. Keep the database URL and storage credentials server-side. Never use `NEXT_PUBLIC_` for these values.

The schema is a complete fresh-install schema. Do not apply the former Supabase migrations; Supabase-specific RLS and Storage statements have been removed.

## Configure and deploy the app

Set these variables in Liara's app settings:

- `DATABASE_URL`; optionally `DATABASE_SSL` and `DATABASE_SSL_REJECT_UNAUTHORIZED` according to the connection settings Liara provides.
- `LIARA_OBJECT_STORAGE_ENDPOINT`, `LIARA_OBJECT_STORAGE_REGION`, `LIARA_OBJECT_STORAGE_BUCKET`, `LIARA_OBJECT_STORAGE_ACCESS_KEY`, `LIARA_OBJECT_STORAGE_SECRET_KEY`, and `LIARA_OBJECT_STORAGE_PUBLIC_BASE_URL`.
- `SESSION_SECRET`, `NEXT_PUBLIC_APP_URL`, `SMS_PROVIDER`, and the relevant Kavenegar and report settings.
- `CRON_SECRET` and `CERTIFICATE_CLEAR_NEAR_DUE_DAYS`.

Deploy the repository as a Liara Next.js app. The app uses the Puppeteer-managed Chrome binary by default; set `PUPPETEER_EXECUTABLE_PATH` only if the Liara runtime uses a different binary path. Generated certificates require Chrome and its Linux runtime libraries to be available in the app container.

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

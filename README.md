# Bar Beats Bingo

The Bar Beats Bingo website and customer portal.

- **Public website**: home, how it works, FAQ and tips, fundraising, host guides and a contact form. Same addresses as the old WordPress site, so existing links keep working.
- **Customer portal** (`/portal`): customers log in and browse **Genre → Playlist → Files**, then preview or download videos, audio, scorecards and host sheets.
- **Admin** (`/admin`): add customers, choose what each one can download (everything, whole genres, or single playlists), set an access end date, upload files, and read contact-form enquiries.

Built with Next.js 16, Neon Postgres (via Drizzle ORM) and S3-compatible file storage (Cloudflare R2 recommended). Runs on Vercel.

---

## 1. Deploy to Vercel

1. In Vercel, **Add New → Project** and import this GitHub repo. Keep the default settings.
2. In the project, open **Storage → Create Database → Neon** and connect it to the project (all environments). This adds `DATABASE_URL`.
3. Under **Settings → Environment Variables**, add:
   - `ADMIN_EMAIL`: the email you'll log in with
   - `ADMIN_PASSWORD`: a temporary password, at least 10 characters
4. **Deployments → Redeploy**. Every build sets up the database tables, adds the starter genres, and creates your admin login if it doesn't exist yet.
5. Go to `https://<your-project>.vercel.app/login` and log in. Change your password from **Customer view → Account**, then you can delete `ADMIN_PASSWORD` from Vercel.

The site works at this point. Uploads and emails switch on with the next two steps.

## 2. Set up file storage (Cloudflare R2)

Neon stores the library's structure; the video files themselves live in R2. R2 doesn't charge for downloads, which matters for large video packs.

1. In Cloudflare, go to **R2 → Create bucket**, e.g. `barbeatsbingo-library`. Keep it private.
2. **R2 → Manage API tokens → Create API token** with **Object Read & Write** for that bucket. Copy the Access Key ID, Secret Access Key and the S3 endpoint (`https://<account-id>.r2.cloudflarestorage.com`).
3. In the bucket's **Settings → CORS policy**, paste this (add your `.vercel.app` address too):

   ```json
   [
     {
       "AllowedOrigins": ["https://www.barbeatsbingo.com", "https://barbeatsbingo.com", "https://YOUR-PROJECT.vercel.app"],
       "AllowedMethods": ["GET", "PUT", "HEAD"],
       "AllowedHeaders": ["*"],
       "ExposeHeaders": ["ETag"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

4. Add these in Vercel and redeploy:

   | Variable | Value |
   | --- | --- |
   | `S3_ENDPOINT` | `https://<account-id>.r2.cloudflarestorage.com` |
   | `S3_REGION` | `auto` |
   | `S3_BUCKET` | your bucket name |
   | `S3_ACCESS_KEY_ID` | from the API token |
   | `S3_SECRET_ACCESS_KEY` | from the API token |

Files upload straight from your browser to R2, so size isn't limited by Vercel. Anything over 100 MB goes up in parts automatically. Keep the page open until the upload bar finishes.

**Not ready for R2 yet?** In any playlist, use **Add a link instead** with a Dropbox or Google Drive share link. Dropbox and Google Drive links are turned into direct downloads automatically.

## 3. Turn on emails (optional)

Without email, everything still works: when a customer forgets their password, you open their page in Admin and click **Send a password reset link**, which gives you a link to send them yourself.

To send emails automatically (password resets, customer invites, enquiry notifications):

1. Create a [Resend](https://resend.com) account and verify the `barbeatsbingo.com` domain.
2. Add `RESEND_API_KEY`, `EMAIL_FROM` (e.g. `Bar Beats Bingo <hello@barbeatsbingo.com>`) and `CONTACT_EMAIL` (where enquiries go) in Vercel, then redeploy.

## 4. Bring the photos across

The new pages use the photos from the old site. Until they're copied into this repo, they're loaded from the old WordPress server, which stops working once the domain moves.

**Before switching the domain:** in GitHub, open **Actions → Copy photos from the old website → Run workflow**. It downloads the photos into `public/images/` and commits them.

You can also add or replace photos by uploading files into `public/images/<year>/<month>/` with the same names. The list is in `src/lib/site.ts`.

The logo in `public/brand/logo.png` was cut from a screenshot. For the sharpest result, replace it with the original logo file (transparent PNG, same name).

## 5. Point barbeatsbingo.com at Vercel

In Vercel, **Settings → Domains → Add** `barbeatsbingo.com` and `www.barbeatsbingo.com`, then update the DNS records where the domain is registered as Vercel shows. Set `APP_URL=https://www.barbeatsbingo.com` so email links use the right address.

---

## Using the admin area

**Library → genre → Add a playlist**, then upload files on the playlist page. Use **Group** (e.g. `Round 1`, `Printables`) to put files under headings, and the **Order** number to sort them. New playlists start hidden so you can upload first; tick **Visible to customers** when it's ready.

**Customers → Add a customer**, then choose what they can download:

- **Everything**: includes anything added later.
- **A whole genre**: includes playlists added to that genre later.
- **Single playlists**: just those.

Set **Access ends** for subscriptions; after that date they can still log in but see a renewal message instead of files. Switch an account off to block logins without deleting it.

Customer downloads are logged and shown on the overview and each customer's page.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in DATABASE_URL (a Neon branch works well) and ADMIN_*
npm run db:migrate
npm run dev
```

After changing `src/db/schema.ts`, run `npm run db:generate` to create a migration in `drizzle/`. It's applied on the next build.

## Environment variables

| Variable | Needed for |
| --- | --- |
| `DATABASE_URL` | Everything (Neon) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Creating the first admin |
| `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | Uploads and downloads of stored files |
| `RESEND_API_KEY`, `EMAIL_FROM`, `CONTACT_EMAIL` | Emails (optional) |
| `APP_URL` | Links in emails (optional) |
| `LEGACY_ASSET_ORIGIN` | Fallback address for photos not yet copied (optional) |

## How it fits together

```
src/app/(site)       public pages
src/app/(auth)       login, forgot password, choose password
src/app/portal       customer library
src/app/admin        admin area
src/app/api          file downloads and upload signing
src/lib              auth, access rules, storage, email
src/db/schema.ts     database tables
scripts/migrate.mjs  runs before each build: migrations, starter genres, first admin
```

Security notes: passwords are hashed with scrypt; sessions are random tokens stored hashed in the database; login is rate-limited per email; every page, action and download re-checks who is logged in and what they can access; download links are signed and expire after 15 minutes.

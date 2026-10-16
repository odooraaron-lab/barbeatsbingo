# Bar Beats Bingo

The Bar Beats Bingo website and customer portal.

- **Public website**: home, how it works, FAQ and tips, fundraising, host guides and a contact form. Same addresses as the old WordPress site, so existing links keep working.
- **Customer portal** (`/portal`): customers log in and go **Category → Show**, then download the show's three files (show file, scorecards, track list). The library shows every category: the ones they can play are lit up, the rest are greyed out (locked, with a one-tap "Ask to add", or "Coming soon" when empty).
- **Show page**: the call list (track list PDF) is drawn on the page next to a player for the show's sound. The song that's playing lights up, tapping a song jumps there, and **Check a bingo** lists the songs played so far by letter (and checks card numbers once a show's cards are stored: 1, 2 or 3 lines, where a line is a row across, the cross and blackout).
- **Phone app**: customers can add the portal to their home screen and open it like an app.
- **Admin** (`/admin`): add customers, choose what each one can download (everything, whole categories, or single shows), set an access end date, paste each show's Zoho WorkDrive links, and read contact-form enquiries.

Built with Next.js 16 and Neon Postgres (via Drizzle ORM). Files are linked from Zoho WorkDrive; uploading to S3-compatible storage (e.g. Cloudflare R2) is also supported. Runs on Vercel.

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

## 2. Set up file storage (optional)

Skip this if all your files come from Zoho WorkDrive links. It's only needed if you want to upload files directly in the admin area (under **More ways to add files**). Cloudflare R2 is recommended because it doesn't charge for downloads.

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

**Adding a show**

1. **Library →** open the category **→ Add a show** (e.g. `Show 01`).
2. In Zoho WorkDrive, open the show's folder. For each of the four files: right-click → **Share → External share link**, make sure **downloads are allowed**, and copy the link.
3. Paste the links into **Show files from Zoho**: the show file, the scorecards PDF, the track list PDF and the MP3 for the player, then **Save show files**.
4. When saving, each link is checked and the real file name is picked up from Zoho. If a link opens a Zoho page instead of the file (for example, you shared the folder rather than the file), you'll see a warning saying which one.
5. Tick **Visible to customers** under Show settings when it's ready. New shows start hidden.

Customers see three download buttons, and the track list PDF is drawn on the page so they can read it without downloading. Rename a file or change its order under **Files**.

After saving, the track list box says how many songs were read from the call list (e.g. "75 songs read"). That's what lets the call list follow the player: it needs the call list PDF with the letter, number, time and "Artist - Title" on each line.

**Importing lots of shows at once**

**Library → Import shows from a spreadsheet**. Download the template, fill in one row per show (category, show name, and the four Zoho links; description and visible are optional), then save it as CSV and choose the file, or copy the rows out of Excel or Google Sheets and paste them in. The page shows what will be added or updated and flags rows with problems before you import. Shows that already exist (same name in the same category) get their links updated; blank cells leave what's there alone. New categories can be created on the way.

**MP3s for the player (makes it start fast and work on phones)**

The player on each show page can play straight from the show video, but that means streaming the whole video (around 670 MB) just to hear it, so it's slow to start and to skip around. A small MP3 of the show is about 30 times smaller (roughly 1 MB per minute).

1. Make the MP3s with `tools/make_previews.py` on your computer. It needs Python and ffmpeg; the easy way to get ffmpeg is `pip install imageio-ffmpeg`. Then run:

   ```
   python tools/make_previews.py "D:\path\to\your\shows" --only "Play Now"
   ```

   It writes `<video name> - Preview.mp3` next to each show video, lists what it found and asks before starting. It skips shows that already have a preview, so run it again whenever you add shows. `--only` limits it to the show videos if the folder also holds individual music videos.
2. Upload the MP3s to WorkDrive (or let WorkDrive sync them), share each with an external link, and paste it into the show's **MP3 for the player** box.

The player uses the MP3 whenever a show has one, and the video otherwise. Customers don't see the MP3 as a download. Keep the whole show in the MP3, intro included: the player skips the first 28 seconds itself (change `INTRO_SKIP_SECONDS` in `src/lib/show-files.ts` if your intros change).

When you save the link, the site reads the MP3's length (shown under the box), so customers see how long the show runs before anything loads. It also checks whether phones can stream the link directly. iPhones only play audio from links that send the file in pieces and say it's audio; if a link doesn't, the site passes the sound through itself, so it still plays. Videos are never passed through (they're too big), which is another reason to add the MP3.

**Customers → Add a customer**, then choose what they can download:

- **Everything**: includes anything added later.
- **A whole category**: includes shows added to that category later.
- **Single shows**: just those.

Set **Access ends** for subscriptions; after that date they can still log in but see a renewal message instead of files. Switch an account off to block logins without deleting it.

Customer downloads are logged and shown on the overview and each customer's page.

When a customer taps **Ask to add** on a locked category, the request appears under **Enquiries** (and is emailed to `CONTACT_EMAIL` when email is set up).

## Troubleshooting

**Contact form says "couldn't be sent", or logging in fails.** The site can't reach the database. In Vercel, open **Storage → your Neon database → Connect Project**, make sure this project is connected for **Production** (and Preview), then **Deployments → Redeploy**. The app accepts `DATABASE_URL` or a prefixed name such as `STORAGE_DATABASE_URL`. A deploy without a database now stops with this same message in the build log, and the previous version stays live.

**Changed an environment variable?** Vercel only picks it up after a redeploy.

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
| `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | Uploading files directly (optional) |
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

Security notes: passwords are hashed with scrypt; sessions are random tokens stored hashed in the database; login is rate-limited per email; every page, action and download re-checks who is logged in and what they can access. Uploaded files use signed links that expire after 15 minutes. Zoho share links are public, so anyone a customer passes a link to can download that file; the portal controls who sees the links.

# Manual payments and course subscriptions

## Supabase setup

1. In a **new** Supabase project, run `schema.sql` once in the SQL Editor. It
   creates the core tables, private receipt/video buckets, RLS policies, access
   functions, and the four core English course records. For a project that
   already has this schema, do not rerun `schema.sql`.
   Before changing an existing project, take a database backup.
2. Run `add-academic-course-packages.sql`, then `website-update.sql` in the
   SQL Editor. The first script seeds 18 paid grade/system/term packages and
   English lesson outlines for the core courses, without attaching the old
   Arabic lesson videos. The second script:
   - adds private, owner-scoped `ai_conversations` and `ai_messages` tables
     required for signed-in AI chat history;
   - applies the approved-order lesson/video access policy;
   - allows all payment methods currently used by checkout, including Fawry
     and Orange Cash;
   - aligns existing core and package course/lesson content with the English
     site, while preserving prices, orders, roles, and non-legacy video URLs.

   Both scripts are transactional and safe to rerun. At the end of
   `website-update.sql`, the two Arabic-content verification queries should
   return `0`. Grade/system/term fields remain Arabic metadata for the Arabic
   user interface.
3. In your local `.env.local` and the Vercel project's Environment Variables,
   set
   `VITE_SUPABASE_URL`, the public anon/publishable key as
   `VITE_SUPABASE_ANON_KEY`, `VITE_ADMIN_EMAIL` as the email of the admin
   account, and the administration WhatsApp number in
   international digits-only format (for example, `2010...`, without `+`).
   Also set the receiving `VITE_VODAFONE_CASH_NUMBER`,
   `VITE_ETISALAT_CASH_NUMBER`, and `VITE_INSTAPAY_ADDRESS` values for the
   payment methods you intend to offer. Orange Cash uses
   `VITE_ORANGE_CASH_NUMBER` (defaults to `01283865399`), while Fawry uses
   `VITE_FAWRY_PAYMENT_CODE` (defaults to `5078086710757365`). Override them in
   the Vercel project's environment variables if needed, then redeploy.
   Also set the server-only `GEMINI_API_KEY` for the AI chat endpoint. Never
   prefix it with `VITE_`, expose a Supabase service-role key in the browser,
   or commit secret values. Restart the Vite server after changing local
   environment variables; redeploy after changing Vercel variables.
4. Create and confirm the administrator account, then run `promote-admin.sql`
   manually in the Supabase SQL Editor. It checks that the account exists and
   its email is confirmed before changing the profile role. This explicit
   privileged step is intentionally separate from `schema.sql`; public
   registration must never promote an account based only on its email address.
   Existing administrator roles are preserved when `schema.sql` is rerun.
   Authenticated clients cannot update their own role.

5. Sign in as the promoted account and open `/admin`. The dashboard lists
   pending, approved, and rejected orders, displays private receipt links,
   supports searching by student/course, and can approve or reject pending
   orders. Approving an order enables access to that course. Students can
   review their requests at `/dashboard/orders`.
   On the login page, `admin` is an alias for `VITE_ADMIN_EMAIL`; the password
   is the real Supabase Auth password, never a frontend-stored value. Admins
   can change it from the dashboard's **بيانات الدخول** section.
   To enable Google sign-in, configure the Google OAuth client credentials in
   Supabase Authentication > Providers > Google, then add the local and
   production `/auth/callback` URLs and `/reset-password` URLs to the Auth
   redirect URL allow list. The app never stores Google client secrets.
   Password reset email delivery and its sender settings are configured in
   Supabase Authentication > Email.
6. Upload **English** paid-course video files to the private `course-videos` bucket using
   a path whose first directory is the course ID, for example
   `course-sarf/lesson-1.mp4`. Set that path as the lesson's `videoSrc`. The
   lesson page requests a one-hour signed URL; Storage RLS independently checks
   approved subscription access (or the course's free status).
   Do not attach the old Arabic lesson videos to English course records.
   Course access controls the in-app lesson view but cannot make public
   external video links private.

## Student flow

On a paid course page, a signed-in student enters a contact phone number,
selects an enabled payment method (Fawry and Orange Cash are configured by
default), enters the sender wallet number or Fawry transaction reference, and
uploads a JPG, PNG, or WebP receipt (maximum 10 MB). Fawry displays payment
code `5078086710757365`; Orange Cash displays receiving wallet
`01283865399`. The receipt is stored privately, and an order is inserted as
`pending`. If an administration WhatsApp number is configured,
the page provides a link with the student, course, payment method, and payment
reference; otherwise, the student can follow the order at
`/dashboard/orders`. The admin must verify the actual payment and approve the
order in `/admin`; WhatsApp messages alone never grant access.
Fawry and Orange Cash are handled as real manual transfer methods with
receipt-and-review; they are not automated gateway integrations. Verify the
merchant code and receiving wallet are active with their providers before
publishing or accepting payments.

The user-facing app uses only the Supabase anon key. Row-level security binds
orders and receipt uploads to their owner, reserves status changes and course
video management for admins, gives AI chat history owner-only access, and
provides a private `can_access_course` check. Course lesson titles and
descriptions are supplied through a catalog RPC that omits video URLs; direct
lesson-row reads require course access or an admin role. Keep paid course
media in the private Storage bucket: a public external video URL is not
protected by gating a React route.

## Local admin preview

When running Vite on `localhost` or `127.0.0.1` without Supabase variables, a
local-only preview login is available with username `admin` and password
`1234`. Its credentials are stored only in that browser and can be changed in
the dashboard. The preview shows empty data and cannot manage real records. It can display
payment destinations on a paid course but cannot send a real order. A real
student must sign in through Supabase Auth to upload a receipt and create an
order.
Never deploy this preview as an admin account; production admin access always
requires Supabase Auth and the `profiles.role = 'admin'` database check.

# Hareef English Backend

Standalone Next.js API for the existing Vite website. Deploy this folder as a
separate Vercel project; it does not replace the website or change its routes.

## Local development

```powershell
Copy-Item .env.example .env.local
npm install
npm run dev
```

Set real project values in `.env.local`. The Supabase URL and anon key are the
same public project values used by the website. The Gemini key belongs only in
this server-side environment and must never use a `NEXT_PUBLIC_` prefix.

## Vercel deployment

1. Import the repository as a separate Vercel project.
2. Set **Root Directory** to `apps/backend`.
3. Add `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `GEMINI_API_KEY`,
   `GEMINI_MODEL`, and `ALLOWED_ORIGINS` to the backend project's environment.
4. Set `ALLOWED_ORIGINS` to comma-separated origins, with no paths, for example:
   `https://hareef-english.vercel.app,https://appassets.androidplatform.net`.
   Add `http://localhost:5173` for local development.
5. Copy the backend's production origin and set the website's
   `VITE_API_BASE` to that origin, such as `https://hareef-api.vercel.app`.
   Redeploy the website after changing this build-time variable.

The backend does not use or require a Supabase service-role key. It validates
the user's Supabase access token and sends each request to Supabase with that
user's token, so Supabase Row Level Security remains the authorization boundary.
Never put a service-role key in either app's environment variables.

Before using data routes, manually apply the existing database scripts as
documented in `../../supabase/README.md`; this backend never runs migrations or
changes the live Supabase database.

## API

| Method       | Path                                 | Access               | Purpose                                                                        |
| ------------ | ------------------------------------ | -------------------- | ------------------------------------------------------------------------------ |
| GET          | `/api/v1/health`                     | Public               | Health check                                                                   |
| POST         | `/api/v1/ai/chat`                    | Public, rate-limited | Gemini English-learning assistant                                              |
| GET/POST | `/api/v1/ai/conversations` | Supabase user | List/create private AI conversations |
| GET/POST | `/api/v1/ai/conversations/:id/messages` | Supabase user | List/save messages in an owned conversation |
| PATCH/DELETE | `/api/v1/ai/conversations/:id` | Supabase user | Rename/delete an owned conversation |
| GET          | `/api/v1/courses`                    | Public               | Course list and safe lesson catalog (no video URLs)                            |
| GET          | `/api/v1/lessons`                    | Supabase user        | Lessons allowed by database RLS                                                |
| GET          | `/api/v1/lessons/:lessonId`          | Supabase user        | Lesson metadata/video according to course access                               |
| GET          | `/api/v1/me/profile`                 | Supabase user        | Current user's profile                                                         |
| GET/PUT      | `/api/v1/me/progress`                | Supabase user        | Read/save the current user's progress                                          |
| GET/POST     | `/api/v1/me/enrollments`             | Supabase user        | List subscriptions and enroll in a free course                                 |
| GET          | `/api/v1/me/course-access?courseId=` | Supabase user        | Check enrollment/access via the database RPC                                   |
| POST         | `/api/v1/me/video-url`               | Supabase user        | Get a signed video URL subject to storage RLS                                  |
| GET          | `/api/v1/orders`                     | Supabase user        | Current user's orders; optional `?courseId=`                                   |
| POST         | `/api/v1/orders`                     | Supabase user        | Submit manual payment after uploading a receipt to the private Supabase bucket |
| GET/PATCH    | `/api/v1/admin/orders`               | Admin                | List orders by status and approve/reject pending orders                        |
| POST         | `/api/v1/admin/receipt-url`          | Admin                | Create a short-lived receipt URL                                               |
| GET/POST     | `/api/v1/admin/courses`              | Admin                | List/create courses                                                            |
| PATCH/DELETE | `/api/v1/admin/courses/:courseId`    | Admin                | Update/delete a course                                                         |
| GET/POST     | `/api/v1/admin/lessons`              | Admin                | List/create lessons                                                            |
| PATCH/DELETE | `/api/v1/admin/lessons/:lessonId`    | Admin                | Update/delete a lesson                                                         |
| GET          | `/api/v1/admin/overview`             | Admin                | Dashboard source data                                                          |
| GET          | `/api/v1/admin/activity`             | Admin                | Recent admin activity                                                          |
| GET          | `/api/v1/admin/role`                 | Supabase user        | Return the current user's admin status                                         |

All protected routes require `Authorization: Bearer <Supabase access token>`.
The manual payment workflow remains unchanged: students submit a receipt for
review; an admin approves or rejects it. No payment gateway is configured.

The AI rate limit is per running server instance, not a global quota. For
high-volume public traffic, configure a shared rate-limit store before scaling.

## Commands

```bash
npm run dev
npm run typecheck
npm test
npm run build
```

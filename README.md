# AI Natives — Supabase Deploy-Ready Backend

This project has been restructured for deployment with a professional backend layout.

## Structure

```text
public/              Frontend pages, CSS, images and browser JavaScript
src/
  app.js             Express app setup, middleware and route mounting
  server.js          Server entry point
  config/            Environment and Supabase client setup
  middleware/        Auth, roles and error handling
  routes/            Auth, profile, jobs, applications, admin and integrations
  utils/             Passwords, JWTs, CV parsing and helpers
supabase/schema.sql  Database tables for Supabase
uploads/             Uploaded CV files at runtime
.env.example         Safe environment template
```

## Setup

1. Create a Supabase project.
2. Open `supabase/schema.sql` and run it in Supabase SQL Editor.
3. Copy `.env.example` to `.env`.
4. Fill in your own values:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_new_secret_key
JWT_SECRET=use_a_long_random_secret
PORT=3000
```

5. Install and run:

```bash
npm install
npm start
```

Open `http://localhost:3000`.

## Important security note

Do not deploy the old Supabase secret key that was shared in chat. Regenerate it in Supabase, then put the new key in your hosting provider's environment variables.

## Backend features included

- Real registration and login against Supabase tables
- Hashed passwords using bcrypt
- JWT session cookie authentication
- Role protection for user, employer and admin routes
- User CRUD: add, update, delete, suspend and activate
- Jobs CRUD: add, update, delete, suspend, activate and close
- Applications CRUD/status management
- CV upload and text extraction for PDF, DOCX and TXT
- No seeded/demo jobs in the frontend job list


## Authentication and file uploads added

This version includes:
- JWT login sessions stored in an HTTP-only cookie.
- Server-side page protection for `admin.html`, `employer.html`, and `user.html`.
- Role-based API protection for admin, employer and user routes.
- Supabase Storage upload support for CVs, profile pictures and application documents.
- Signed file download URLs for private storage files.

Before deployment, regenerate your Supabase secret key and set these environment variables on your host:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_new_regenerated_secret_key
JWT_SECRET=use_a_long_random_secret_64_chars_minimum
SUPABASE_STORAGE_BUCKET=ai-natives-files
NODE_ENV=production
```

Run `supabase/schema.sql` again in Supabase SQL Editor. It creates/updates tables and creates the private `ai-natives-files` storage bucket.

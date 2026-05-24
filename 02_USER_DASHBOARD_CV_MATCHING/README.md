# 02_USER_DASHBOARD_CV_MATCHING: User Dashboard and CV Matching

## Your Git branch

```bash
git checkout -b user-cv-matching
```

## Your assigned files

These files are copied inside `FILES_TO_EDIT/` using the same project paths.  
When you edit them, keep the same paths when copying/merging back into the main project.

- `public/user.html`
- `public/app.js`
- `public/user-sql-jobs.js`
- `public/storage-ui.js`
- `public/realtime-dashboard.js`
- `src/routes/profile.routes.js`
- `src/utils/cv.js`
- `src/utils/matching.js`
- `src/utils/storage.js`

## Your tasks

- User dashboard live stats.
- CV upload.
- Read CV text from PDF/DOCX/TXT.
- Match jobs using CV text.
- Show matching jobs on the user side.
- Profile picture upload.

## How to test your part

- Login as user.
- Upload a CV.
- Confirm CV text saves in Supabase profiles table.
- Confirm matching jobs show after an employer posts jobs.

## How to push your work

From the main project folder, not from this small folder, run:

```bash
git status
git add .
git commit -m "Work on User Dashboard and CV Matching"
git push origin user-cv-matching
```

Then create a Pull Request on GitHub into `main`.

## Important

Do not edit `.env`. Use `.env.example` only as a guide.  
Do not push `node_modules`.

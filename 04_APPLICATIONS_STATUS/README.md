# 04_APPLICATIONS_STATUS: Applications and Status Updates

## Your Git branch

```bash
git checkout -b applications-status
```

## Your assigned files

These files are copied inside `FILES_TO_EDIT/` using the same project paths.  
When you edit them, keep the same paths when copying/merging back into the main project.

- `src/routes/applications.routes.js`
- `public/realtime-dashboard.js`
- `public/user.html`
- `public/employer.html`
- `public/admin.html`

## Your tasks

- User applies for jobs.
- Applications save to Supabase.
- Employer sees applicants.
- Employer/admin update application status.
- User dashboard updates when application status changes.

## How to test your part

- User applies for an active job.
- Check Supabase applications table.
- Employer changes application to Accepted or Rejected.
- User dashboard stats update.

## How to push your work

From the main project folder, not from this small folder, run:

```bash
git status
git add .
git commit -m "Work on Applications and Status Updates"
git push origin applications-status
```

Then create a Pull Request on GitHub into `main`.

## Important

Do not edit `.env`. Use `.env.example` only as a guide.  
Do not push `node_modules`.

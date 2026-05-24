# 05_ADMIN_CRUD: Admin Dashboard and CRUD

## Your Git branch

```bash
git checkout -b admin-crud
```

## Your assigned files

These files are copied inside `FILES_TO_EDIT/` using the same project paths.  
When you edit them, keep the same paths when copying/merging back into the main project.

- `public/admin.html`
- `public/admin-sql.js`
- `src/routes/admin.routes.js`
- `src/utils/bootstrapAdmin.js`
- `public/logged-in-user.js`

## Your tasks

- Admin dashboard.
- Add users.
- Update users.
- Delete users.
- Suspend and activate users.
- Manage jobs and applications.
- Remove hardcoded names.

## How to test your part

- Login as admin.
- Add a user.
- Suspend user.
- Activate user.
- Delete test user.
- Check users table in Supabase.

## How to push your work

From the main project folder, not from this small folder, run:

```bash
git status
git add .
git commit -m "Work on Admin Dashboard and CRUD"
git push origin admin-crud
```

Then create a Pull Request on GitHub into `main`.

## Important

Do not edit `.env`. Use `.env.example` only as a guide.  
Do not push `node_modules`.

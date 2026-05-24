# 06_DATABASE_APIS_DEPLOYMENT: Database, APIs, Deployment and Documentation

## Your Git branch

```bash
git checkout -b database-deployment
```

## Your assigned files

These files are copied inside `FILES_TO_EDIT/` using the same project paths.  
When you edit them, keep the same paths when copying/merging back into the main project.

- `supabase/schema.sql`
- `.env.example`
- `README.md`
- `package.json`
- `src/config/env.js`
- `src/config/supabase.js`
- `src/routes/integrations.routes.js`
- `src/server.js`
- `src/app.js`

## Your tasks

- Supabase database schema.
- Storage bucket setup.
- Environment variables.
- Deepgram, OpenRouter, LibreTranslate and Gmail SMTP.
- Deployment instructions.
- Make sure .env is not pushed.
- Make sure npm start works.

## How to test your part

- Run supabase/schema.sql.
- Run npm install.
- Run npm start.
- Open http://localhost:3000.
- Check /api/health if available.

## How to push your work

From the main project folder, not from this small folder, run:

```bash
git status
git add .
git commit -m "Work on Database, APIs, Deployment and Documentation"
git push origin database-deployment
```

Then create a Pull Request on GitHub into `main`.

## Important

Do not edit `.env`. Use `.env.example` only as a guide.  
Do not push `node_modules`.

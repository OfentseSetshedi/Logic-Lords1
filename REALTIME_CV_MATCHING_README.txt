AI Natives real-time Supabase build

Implemented:
- Removed demo dashboard behaviour through a live backend patch.
- User and employer registration only; admin is not available on the register form.
- Default admin is automatically created:
  Email: ainatives09@gmail.com
  Password: @AI NATIVES 05
- Dashboard stats come from Supabase jobs/applications tables.
- Employer posts job -> Supabase jobs table -> user dashboard/jobs list updates.
- User applies -> Supabase applications table -> employer/admin can view it.
- Employer/admin status updates -> user dashboard stats update.
- CV upload reads PDF/DOCX/TXT text, saves it to profile.cv_text, and matches jobs against CV keywords.
- Admin/employer/user greetings use the logged-in user name.
- Startup shows a clear localhost link.
- Existing Deepgram/OpenRouter/LibreTranslate/Gmail routes were left intact.

Run:
1. Run supabase/schema.sql in Supabase SQL Editor.
2. npm install
3. npm start
4. Open http://localhost:3000

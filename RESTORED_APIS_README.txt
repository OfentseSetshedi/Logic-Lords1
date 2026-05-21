AI Natives restored environment/API build

This version keeps the latest Supabase + JWT + Storage backend and restores the original optional API environment variables:
- DEEPGRAM_API_KEY
- OPENROUTER_API_KEY
- OPENROUTER_MODEL
- LIBRETRANSLATE_URL
- LIBRETRANSLATE_API_KEY
- SMTP_HOST
- SMTP_PORT
- SMTP_SECURE
- SMTP_USER
- SMTP_PASS
- SMTP_FROM
- APP_LOGIN_URL

Also restored working backend proxy routes for:
- POST /api/deepgram/transcribe
- POST /api/transcribe
- POST /api/translate
- POST /api/native-assistant
- POST /api/hey-native/chat
- POST /api/assistant/chat

Run:
npm install
npm start

const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  appBaseUrl: process.env.APP_BASE_URL || `http://localhost:${process.env.PORT || 3000}`,
  jwtSecret: process.env.JWT_SECRET || '',
  supabaseUrl: (process.env.SUPABASE_URL || '').trim(),
  supabaseServiceRoleKey: (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(),
  smtp: {
    host: (process.env.SMTP_HOST || '').trim(),
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true',
    user: (process.env.SMTP_USER || '').trim(),
    pass: (process.env.SMTP_PASS || '').trim(),
    from: (process.env.SMTP_FROM || process.env.SMTP_USER || 'AI Natives <no-reply@ainatives.local>').trim()
  },
  deepgramApiKey: (process.env.DEEPGRAM_API_KEY || '').trim(),
  openrouterApiKey: (process.env.OPENROUTER_API_KEY || '').trim(),
  openrouterModel: (process.env.OPENROUTER_MODEL || 'openrouter/free').trim(),
  storageBucket: (process.env.SUPABASE_STORAGE_BUCKET || 'ai-natives-files').trim(),
  libreTranslateUrl: (process.env.LIBRETRANSLATE_URL || 'https://translate.argosopentech.com/translate').trim(),
  libreTranslateApiKey: (process.env.LIBRETRANSLATE_API_KEY || '').trim()
};

function validateEnv() {
  const missing = [];
  if (!env.jwtSecret || env.jwtSecret === 'replace_with_a_long_random_secret') missing.push('JWT_SECRET');
  if (!env.supabaseUrl) missing.push('SUPABASE_URL');
  if (!env.supabaseServiceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (missing.length) {
    console.warn(`Missing environment variables: ${missing.join(', ')}. Backend routes will fail until these are configured.`);
  }
}

module.exports = { env, validateEnv };

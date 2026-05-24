const { createClient } = require('@supabase/supabase-js');
const { env } = require('./env');

let client = null;

function getSupabase() {
  if (!client && env.supabaseUrl && env.supabaseServiceRoleKey) {
    client = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  }
  if (!client) {
    const error = new Error('Supabase is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to .env.');
    error.status = 500;
    throw error;
  }
  return client;
}

function throwIfSupabaseError(error, fallback = 'Database request failed.') {
  if (!error) return;
  const err = new Error(error.message || fallback);
  err.status = 500;
  throw err;
}

module.exports = { getSupabase, throwIfSupabaseError };

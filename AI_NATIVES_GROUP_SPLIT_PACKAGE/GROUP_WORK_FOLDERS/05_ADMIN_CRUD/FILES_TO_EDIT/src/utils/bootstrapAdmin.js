const { getSupabase, throwIfSupabaseError } = require('../config/supabase');
const { hashPassword } = require('./security');

const ADMIN_EMAIL = 'ainatives09@gmail.com';
const ADMIN_PASSWORD = '@AI NATIVES 05';
const ADMIN_NAME = 'AI Natives';

async function ensureDefaultAdmin() {
  const db = getSupabase();
  const found = await db.from('users').select('id, email, role').eq('email', ADMIN_EMAIL).maybeSingle();
  throwIfSupabaseError(found.error);

  const passwordHash = await hashPassword(ADMIN_PASSWORD);

  if (found.data) {
    const updated = await db.from('users').update({
      full_name: ADMIN_NAME,
      role: 'admin',
      status: 'Active',
      password_hash: passwordHash
    }).eq('id', found.data.id);
    throwIfSupabaseError(updated.error);
    await db.from('profiles').upsert({ user_id: found.data.id }, { onConflict: 'user_id' });
    return;
  }

  const created = await db.from('users').insert({
    full_name: ADMIN_NAME,
    email: ADMIN_EMAIL,
    password_hash: passwordHash,
    role: 'admin',
    status: 'Active'
  }).select('id').single();
  throwIfSupabaseError(created.error);
  await db.from('profiles').upsert({ user_id: created.data.id }, { onConflict: 'user_id' });
}

module.exports = { ensureDefaultAdmin, ADMIN_EMAIL };

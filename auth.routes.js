const express = require('express');
const { getSupabase, throwIfSupabaseError } = require('../config/supabase');
const { hashPassword, verifyPassword, createToken, publicUser } = require('../utils/security');
const { auth, setAuthCookie, clearAuthCookie } = require('../middleware/auth');
const { ensureDefaultAdmin } = require('../utils/bootstrapAdmin');

const router = express.Router();

router.post('/register', async (req, res, next) => {
  try {
    const db = getSupabase();
    const fullName = String(req.body.fullName || req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const requestedRole = String(req.body.role || 'user').toLowerCase();
    const role = ['user', 'employer'].includes(requestedRole) ? requestedRole : 'user';
    if (!fullName || !email || password.length < 6) return res.status(400).json({ message: 'Full name, email and a 6+ character password are required.' });
    const found = await db.from('users').select('id').eq('email', email).maybeSingle();
    throwIfSupabaseError(found.error);
    if (found.data) return res.status(409).json({ message: 'That email is already registered.' });
    const passwordHash = await hashPassword(password);
    const created = await db.from('users').insert({ full_name: fullName, email, password_hash: passwordHash, role, status: 'Active' }).select('id, full_name, email, role, status').single();
    throwIfSupabaseError(created.error);
    await db.from('profiles').upsert({ user_id: created.data.id }, { onConflict: 'user_id' });
    const token = createToken(created.data);
    setAuthCookie(res, token);
    res.status(201).json({ message: 'Registration successful.', user: publicUser(created.data) });
  } catch (error) { next(error); }
});

router.post('/login', async (req, res, next) => {
  try {
    await ensureDefaultAdmin();
    const db = getSupabase();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const result = await db.from('users').select('*').eq('email', email).maybeSingle();
    throwIfSupabaseError(result.error);
    if (!result.data || !(await verifyPassword(password, result.data.password_hash))) return res.status(401).json({ message: 'Incorrect email or password.' });
    if (['Suspended', 'Disabled'].includes(result.data.status)) return res.status(403).json({ message: 'This account is suspended or disabled.' });
    const token = createToken(result.data);
    setAuthCookie(res, token);
    res.json({ message: 'Login successful.', user: publicUser(result.data) });
  } catch (error) { next(error); }
});

router.post('/forgot-password', async (req, res, next) => {
  try {
    const db = getSupabase();
    const email = String(req.body.email || '').trim().toLowerCase();
    const role = String(req.body.role || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (!email || password.length < 6) return res.status(400).json({ message: 'Enter an email and a new password of at least 6 characters.' });
    let query = db.from('users').select('id').eq('email', email);
    if (role) query = query.eq('role', role);
    const found = await query.maybeSingle();
    throwIfSupabaseError(found.error);
    if (!found.data) return res.status(404).json({ message: 'No account found for this email and role.' });
    const updated = await db.from('users').update({ password_hash: await hashPassword(password) }).eq('id', found.data.id);
    throwIfSupabaseError(updated.error);
    res.json({ message: 'Password reset successful.' });
  } catch (error) { next(error); }
});

router.get('/me', auth, (req, res) => res.json({ user: { id: req.user.id, name: req.user.name, email: req.user.email, role: req.user.role } }));
router.post('/logout', (_req, res) => { clearAuthCookie(res); res.json({ message: 'Logged out.' }); });

module.exports = router;

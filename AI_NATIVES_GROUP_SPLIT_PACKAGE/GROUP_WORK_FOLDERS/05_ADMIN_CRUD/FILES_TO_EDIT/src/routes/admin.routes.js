const express = require('express');
const { getSupabase, throwIfSupabaseError } = require('../config/supabase');
const { auth, requireRole } = require('../middleware/auth');
const { hashPassword, generateTemporaryPassword, normalizeStatus } = require('../utils/security');
const { jobsWithEmployers, mapJobBody, validateJob, JOB_STATUSES } = require('./jobs.routes');
const { flattenApplication } = require('./applications.routes');

const router = express.Router();
const USER_STATUSES = ['Active', 'Suspended', 'Inactive'];
router.use(auth, requireRole('admin'));

router.get('/users', async (_req, res, next) => {
  try {
    const result = await getSupabase().from('users').select('id, full_name, email, role, phone, status, created_at').order('created_at', { ascending: false });
    throwIfSupabaseError(result.error);
    res.json(result.data || []);
  } catch (error) { next(error); }
});

router.post('/users', async (req, res, next) => {
  try {
    const db = getSupabase();
    const fullName = String(req.body.fullName || req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const role = ['user', 'employer', 'admin'].includes(String(req.body.role).toLowerCase()) ? String(req.body.role).toLowerCase() : 'user';
    const status = normalizeStatus(req.body.status, USER_STATUSES, 'Active');
    const password = String(req.body.password || '').trim() || generateTemporaryPassword();
    if (!fullName || !email) return res.status(400).json({ message: 'Name and email are required.' });
    if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    const found = await db.from('users').select('id').eq('email', email).maybeSingle();
    throwIfSupabaseError(found.error);
    if (found.data) return res.status(409).json({ message: 'Email already exists.' });
    const created = await db.from('users').insert({ full_name: fullName, email, role, phone: req.body.phone || '', status, password_hash: await hashPassword(password) }).select('id, full_name, email, role, phone, status, created_at').single();
    throwIfSupabaseError(created.error);
    await db.from('profiles').upsert({ user_id: created.data.id }, { onConflict: 'user_id' });
    res.status(201).json({ ...created.data, temporaryPassword: password, message: 'User created.' });
  } catch (error) { next(error); }
});

router.put('/users/:id', async (req, res, next) => {
  try {
    const db = getSupabase();
    const fullName = String(req.body.fullName || req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const role = ['user', 'employer', 'admin'].includes(String(req.body.role).toLowerCase()) ? String(req.body.role).toLowerCase() : 'user';
    const status = normalizeStatus(req.body.status, USER_STATUSES, 'Active');
    if (!fullName || !email) return res.status(400).json({ message: 'Name and email are required.' });
    const duplicate = await db.from('users').select('id').eq('email', email).neq('id', req.params.id).maybeSingle();
    throwIfSupabaseError(duplicate.error);
    if (duplicate.data) return res.status(409).json({ message: 'Email already belongs to another user.' });
    const payload = { full_name: fullName, email, role, phone: req.body.phone || '', status };
    if (req.body.password) payload.password_hash = await hashPassword(req.body.password);
    const result = await db.from('users').update(payload).eq('id', req.params.id);
    throwIfSupabaseError(result.error);
    res.json({ message: 'User updated.' });
  } catch (error) { next(error); }
});

router.patch('/users/:id/status', async (req, res, next) => {
  try {
    if (Number(req.params.id) === Number(req.user.id)) return res.status(400).json({ message: 'You cannot suspend/disable your own admin account.' });
    const status = normalizeStatus(req.body.status, USER_STATUSES, 'Active');
    const result = await getSupabase().from('users').update({ status }).eq('id', req.params.id);
    throwIfSupabaseError(result.error);
    res.json({ message: `User status changed to ${status}.`, status });
  } catch (error) { next(error); }
});

router.delete('/users/:id', async (req, res, next) => {
  try {
    if (Number(req.params.id) === Number(req.user.id)) return res.status(400).json({ message: 'You cannot delete your own admin account.' });
    const result = await getSupabase().from('users').delete().eq('id', req.params.id);
    throwIfSupabaseError(result.error);
    res.json({ message: 'User deleted.' });
  } catch (error) { next(error); }
});

router.get('/jobs', async (_req, res, next) => {
  try { res.json(await jobsWithEmployers(getSupabase())); } catch (error) { next(error); }
});

router.post('/jobs', async (req, res, next) => {
  try {
    const payload = mapJobBody(req.body, req.user.id);
    const invalid = validateJob(payload);
    if (invalid) return res.status(400).json({ message: invalid });
    const result = await getSupabase().from('jobs').insert(payload).select('*').single();
    throwIfSupabaseError(result.error);
    res.status(201).json(result.data);
  } catch (error) { next(error); }
});

router.put('/jobs/:id', async (req, res, next) => {
  try {
    const payload = mapJobBody(req.body, req.user.id);
    delete payload.employer_id;
    const invalid = validateJob(payload);
    if (invalid) return res.status(400).json({ message: invalid });
    const result = await getSupabase().from('jobs').update(payload).eq('id', req.params.id).select('*').single();
    throwIfSupabaseError(result.error);
    res.json({ message: 'Job updated.', job: result.data });
  } catch (error) { next(error); }
});

router.patch('/jobs/:id/status', async (req, res, next) => {
  try {
    const status = normalizeStatus(req.body.status, JOB_STATUSES, 'Active');
    const result = await getSupabase().from('jobs').update({ status }).eq('id', req.params.id);
    throwIfSupabaseError(result.error);
    res.json({ message: `Job status changed to ${status}.`, status });
  } catch (error) { next(error); }
});

router.delete('/jobs/:id', async (req, res, next) => {
  try {
    const result = await getSupabase().from('jobs').delete().eq('id', req.params.id);
    throwIfSupabaseError(result.error);
    res.json({ message: 'Job deleted.' });
  } catch (error) { next(error); }
});

router.get('/applications', async (_req, res, next) => {
  try {
    const result = await getSupabase().from('applications').select('*, jobs(title, company_name, employer:users(full_name)), users(full_name, email)').order('created_at', { ascending: false });
    throwIfSupabaseError(result.error);
    res.json((result.data || []).map(flattenApplication));
  } catch (error) { next(error); }
});

router.delete('/applications/:id', async (req, res, next) => {
  try {
    const result = await getSupabase().from('applications').delete().eq('id', req.params.id);
    throwIfSupabaseError(result.error);
    res.json({ message: 'Application deleted.' });
  } catch (error) { next(error); }
});

module.exports = router;

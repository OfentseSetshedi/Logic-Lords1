const express = require('express');
const { getSupabase, throwIfSupabaseError } = require('../config/supabase');
const { auth, requireRole } = require('../middleware/auth');
const { normalizeStatus } = require('../utils/security');
const { sortMatchedJobs } = require('../utils/matching');

const router = express.Router();
const JOB_STATUSES = ['Active', 'Suspended', 'Closed', 'Draft'];

function mapJobBody(body, employerId) {
  return {
    employer_id: body.employerId || body.employer_id || employerId || null,
    title: String(body.title || '').trim(),
    company_name: String(body.companyName || body.company_name || body.company || '').trim(),
    location: String(body.location || '').trim(),
    job_type: String(body.jobType || body.job_type || body.type || '').trim(),
    work_mode: String(body.workMode || body.work_mode || body.mode || '').trim(),
    department: String(body.department || '').trim(),
    salary: String(body.salary || '').trim(),
    experience_level: String(body.experienceLevel || body.experience_level || body.experience || '').trim(),
    closing_date: body.closingDate || body.closing_date || null,
    contact_email: String(body.contactEmail || body.contact_email || body.email || '').trim(),
    description: String(body.description || '').trim(),
    requirements: String(body.requirements || '').trim(),
    benefits: String(body.benefits || '').trim(),
    status: normalizeStatus(body.status, JOB_STATUSES, 'Active')
  };
}

function validateJob(job) {
  if (!job.title || !job.company_name) return 'Job title and company name are required.';
  return null;
}

function normalizeJob(row) {
  return {
    ...row,
    companyName: row.company_name,
    jobType: row.job_type,
    workMode: row.work_mode,
    experienceLevel: row.experience_level,
    closingDate: row.closing_date,
    contactEmail: row.contact_email,
    employerName: row.employer?.full_name || row.users?.full_name || row.employerName || ''
  };
}

async function jobsWithEmployers(db, filters = {}) {
  let query = db.from('jobs').select('*, employer:users(full_name, email)').order('created_at', { ascending: false });
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.employerId) query = query.eq('employer_id', filters.employerId);
  const result = await query;
  throwIfSupabaseError(result.error);
  return (result.data || []).map(normalizeJob);
}

router.get('/', auth, async (req, res, next) => {
  try {
    const db = getSupabase();
    const jobs = await jobsWithEmployers(db, { status: req.query.all === '1' ? null : 'Active' });
    if (req.user.role === 'user') {
      const profile = await db.from('profiles').select('cv_text').eq('user_id', req.user.id).maybeSingle();
      throwIfSupabaseError(profile.error);
      const cvText = profile.data?.cv_text || '';
      return res.json(cvText ? sortMatchedJobs(jobs, cvText) : jobs.map(j => ({ ...j, matchScore: 0, matchedKeywords: [] })));
    }
    res.json(jobs);
  } catch (error) { next(error); }
});

router.get('/mine', auth, requireRole('employer', 'admin'), async (req, res, next) => {
  try {
    const filters = req.user.role === 'admin' ? {} : { employerId: req.user.id };
    res.json(await jobsWithEmployers(getSupabase(), filters));
  } catch (error) { next(error); }
});

router.get('/stats', auth, async (req, res, next) => {
  try {
    const db = getSupabase();

    const activeJobs = await db.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'Active');
    throwIfSupabaseError(activeJobs.error);

    let applicationsQuery = db.from('applications').select('id,status,job_id,jobs!inner(employer_id)', { count: 'exact' });
    if (req.user.role === 'user') applicationsQuery = applicationsQuery.eq('user_id', req.user.id);
    if (req.user.role === 'employer') applicationsQuery = applicationsQuery.eq('jobs.employer_id', req.user.id);
    const apps = await applicationsQuery;
    throwIfSupabaseError(apps.error);

    const applications = apps.data || [];
    const countStatus = (names) => applications.filter(a => names.includes(a.status)).length;
    const stats = {
      activeJobs: activeJobs.count || 0,
      applications: apps.count || 0,
      interviews: countStatus(['Interview','Shortlisted','Reviewed']),
      accepted: countStatus(['Accepted']),
      rejected: countStatus(['Rejected']),
      pending: countStatus(['Pending']),
      matchScore: 0
    };

    if (req.user.role === 'user') {
      const profile = await db.from('profiles').select('cv_text').eq('user_id', req.user.id).maybeSingle();
      throwIfSupabaseError(profile.error);
      const jobs = await jobsWithEmployers(db, { status: 'Active' });
      const matched = profile.data?.cv_text ? sortMatchedJobs(jobs, profile.data.cv_text) : [];
      stats.matchingJobs = matched.filter(j => (j.matchScore || 0) > 0).length || jobs.length;
      stats.matchScore = matched.length ? Math.round(matched.slice(0, 5).reduce((a,b)=>a+(b.matchScore||0),0) / Math.min(5, matched.length)) : 0;
    } else if (req.user.role === 'employer') {
      const myJobs = await db.from('jobs').select('id', { count: 'exact', head: true }).eq('employer_id', req.user.id);
      throwIfSupabaseError(myJobs.error);
      stats.myJobs = myJobs.count || 0;
    }

    res.json(stats);
  } catch (error) { next(error); }
});

router.post('/', auth, requireRole('employer', 'admin'), async (req, res, next) => {
  try {
    const payload = mapJobBody(req.body, req.user.id);
    const invalid = validateJob(payload);
    if (invalid) return res.status(400).json({ message: invalid });
    const result = await getSupabase().from('jobs').insert(payload).select('*').single();
    throwIfSupabaseError(result.error);
    res.status(201).json(normalizeJob(result.data));
  } catch (error) { next(error); }
});

router.put('/:id', auth, requireRole('employer', 'admin'), async (req, res, next) => {
  try {
    const db = getSupabase();
    if (req.user.role === 'employer') {
      const owner = await db.from('jobs').select('employer_id').eq('id', req.params.id).maybeSingle();
      throwIfSupabaseError(owner.error);
      if (!owner.data || Number(owner.data.employer_id) !== Number(req.user.id)) return res.status(403).json({ message: 'You can only update your own jobs.' });
    }
    const payload = mapJobBody(req.body, req.user.id);
    if (req.user.role !== 'admin') delete payload.employer_id;
    const invalid = validateJob(payload);
    if (invalid) return res.status(400).json({ message: invalid });
    const result = await db.from('jobs').update(payload).eq('id', req.params.id).select('*').single();
    throwIfSupabaseError(result.error);
    res.json({ message: 'Job updated.', job: normalizeJob(result.data) });
  } catch (error) { next(error); }
});

router.patch('/:id/status', auth, requireRole('employer', 'admin'), async (req, res, next) => {
  try {
    const db = getSupabase();
    if (req.user.role === 'employer') {
      const owner = await db.from('jobs').select('employer_id').eq('id', req.params.id).maybeSingle();
      throwIfSupabaseError(owner.error);
      if (!owner.data || Number(owner.data.employer_id) !== Number(req.user.id)) return res.status(403).json({ message: 'You can only change your own jobs.' });
    }
    const status = normalizeStatus(req.body.status, JOB_STATUSES, 'Active');
    const result = await db.from('jobs').update({ status }).eq('id', req.params.id);
    throwIfSupabaseError(result.error);
    res.json({ message: `Job status changed to ${status}.`, status });
  } catch (error) { next(error); }
});

router.delete('/:id', auth, requireRole('employer', 'admin'), async (req, res, next) => {
  try {
    const db = getSupabase();
    if (req.user.role === 'employer') {
      const owner = await db.from('jobs').select('employer_id').eq('id', req.params.id).maybeSingle();
      throwIfSupabaseError(owner.error);
      if (!owner.data || Number(owner.data.employer_id) !== Number(req.user.id)) return res.status(403).json({ message: 'You can only delete your own jobs.' });
    }
    const result = await db.from('jobs').delete().eq('id', req.params.id);
    throwIfSupabaseError(result.error);
    res.json({ message: 'Job deleted.' });
  } catch (error) { next(error); }
});

module.exports = { router, jobsWithEmployers, mapJobBody, validateJob, JOB_STATUSES };

const express = require('express');
const multer = require('multer');
const path = require('path');
const { getSupabase, throwIfSupabaseError } = require('../config/supabase');
const { auth, requireRole } = require('../middleware/auth');
const { normalizeStatus } = require('../utils/security');
const { uploadBuffer, signedUrl, removeFile } = require('../utils/storage');
const { extractCvText } = require('../utils/cv');

const router = express.Router();
const APP_STATUSES = ['Pending', 'Reviewed', 'Shortlisted', 'Interview', 'Accepted', 'Rejected'];

const uploadDocument = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = ['.pdf', '.doc', '.docx', '.txt', '.jpg', '.jpeg', '.png', '.webp'];
    const ok = allowed.includes(ext);
    cb(ok ? null : new Error('Only PDF, DOC, DOCX, TXT or image application documents are allowed.'), ok);
  },
  limits: { fileSize: 10 * 1024 * 1024 }
});

function flattenApplication(row) {
  const job = Array.isArray(row.jobs) ? row.jobs[0] : row.jobs;
  const user = Array.isArray(row.users) ? row.users[0] : row.users;
  return {
    ...row,
    jobTitle: job?.title || '',
    companyName: job?.company_name || '',
    employerId: job?.employer_id || null,
    applicantName: user?.full_name || '',
    applicantEmail: user?.email || ''
  };
}

async function addSignedUrls(row) {
  return {
    ...row,
    cvDownloadUrl: await signedUrl(row.cv_file_path),
    documentDownloadUrl: await signedUrl(row.document_file_path)
  };
}

async function canManageApplication(db, applicationId, user) {
  if (user.role === 'admin') return true;
  const result = await db.from('applications').select('id, jobs(employer_id)').eq('id', applicationId).maybeSingle();
  throwIfSupabaseError(result.error);
  return result.data && Number(result.data.jobs?.employer_id) === Number(user.id);
}

router.get('/', auth, async (req, res, next) => {
  try {
    const db = getSupabase();
    let query = db.from('applications').select('*, jobs(title, company_name, employer_id), users(full_name, email)').order('created_at', { ascending: false });
    if (req.user.role === 'user') query = query.eq('user_id', req.user.id);
    if (req.user.role === 'employer') query = query.eq('jobs.employer_id', req.user.id);
    const result = await query;
    throwIfSupabaseError(result.error);
    const rows = await Promise.all((result.data || []).map(flattenApplication).map(addSignedUrls));
    res.json(rows);
  } catch (error) { next(error); }
});

router.get('/mine', auth, async (req, res, next) => {
  try {
    const result = await getSupabase().from('applications').select('*, jobs(title, company_name, employer_id), users(full_name, email)').eq('user_id', req.user.id).order('created_at', { ascending: false });
    throwIfSupabaseError(result.error);
    const rows = await Promise.all((result.data || []).map(flattenApplication).map(addSignedUrls));
    res.json(rows);
  } catch (error) { next(error); }
});

router.post('/', auth, requireRole('user', 'admin'), uploadDocument.single('document'), async (req, res, next) => {
  try {
    const db = getSupabase();
    const jobId = Number(req.body.jobId || req.body.job_id);
    if (!jobId) return res.status(400).json({ message: 'Job ID is required.' });

    const job = await db.from('jobs').select('id,status').eq('id', jobId).maybeSingle();
    throwIfSupabaseError(job.error);
    if (!job.data || job.data.status !== 'Active') return res.status(404).json({ message: 'This job is not available for applications.' });

    const profile = await db.from('profiles').select('cv_file_path, cv_text').eq('user_id', req.user.id).maybeSingle();
    throwIfSupabaseError(profile.error);

    let documentFilePath = null;
    let documentText = '';
    if (req.file) {
      documentFilePath = await uploadBuffer({ userId: req.user.id, folder: 'application-documents', file: req.file });
      try { documentText = await extractCvText(req.file); } catch {}
    }

    const payload = {
      user_id: req.user.id,
      job_id: jobId,
      cv_file_path: profile.data?.cv_file_path || null,
      cv_text: profile.data?.cv_text || documentText || '',
      document_file_path: documentFilePath,
      cover_note: String(req.body.coverNote || req.body.cover_note || '').trim(),
      status: 'Pending'
    };

    const created = await db.from('applications').insert(payload).select('*, jobs(title, company_name, employer_id), users(full_name, email)').single();
    throwIfSupabaseError(created.error);
    res.status(201).json({ message: 'Application submitted.', application: await addSignedUrls(flattenApplication(created.data)) });
  } catch (error) {
    if (String(error.message || '').includes('duplicate key')) return res.status(409).json({ message: 'You have already applied for this job.' });
    next(error);
  }
});

router.patch('/:id/status', auth, requireRole('employer', 'admin'), async (req, res, next) => {
  try {
    const db = getSupabase();
    if (!(await canManageApplication(db, req.params.id, req.user))) return res.status(403).json({ message: 'You cannot update this application.' });
    const status = normalizeStatus(req.body.status, APP_STATUSES, 'Pending');
    const result = await db.from('applications').update({ status, comment: req.body.comment || null }).eq('id', req.params.id).select('*').single();
    throwIfSupabaseError(result.error);
    res.json({ message: `Application status changed to ${status}.`, application: result.data });
  } catch (error) { next(error); }
});

router.delete('/:id', auth, async (req, res, next) => {
  try {
    const db = getSupabase();
    let allowed = req.user.role === 'admin';
    const existing = await db.from('applications').select('id,user_id,document_file_path,jobs(employer_id)').eq('id', req.params.id).maybeSingle();
    throwIfSupabaseError(existing.error);
    if (!existing.data) return res.status(404).json({ message: 'Application not found.' });
    if (Number(existing.data.user_id) === Number(req.user.id)) allowed = true;
    if (req.user.role === 'employer' && Number(existing.data.jobs?.employer_id) === Number(req.user.id)) allowed = true;
    if (!allowed) return res.status(403).json({ message: 'You cannot delete this application.' });
    if (existing.data.document_file_path) await removeFile(existing.data.document_file_path);
    const result = await db.from('applications').delete().eq('id', req.params.id);
    throwIfSupabaseError(result.error);
    res.json({ message: 'Application deleted.' });
  } catch (error) { next(error); }
});

module.exports = { router, flattenApplication, APP_STATUSES };

const express = require('express');
const multer = require('multer');
const path = require('path');
const { getSupabase, throwIfSupabaseError } = require('../config/supabase');
const { auth } = require('../middleware/auth');
const { hashPassword, verifyPassword } = require('../utils/security');
const { extractCvText, wordCount } = require('../utils/cv');
const { uploadBuffer, signedUrl, removeFile } = require('../utils/storage');

const router = express.Router();

function fileFilterFactory(kind) {
  return (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const cvAllowed = ['.pdf', '.doc', '.docx', '.txt'];
    const imageAllowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const allowed = kind === 'image' ? imageAllowed : cvAllowed;
    const ok = allowed.includes(ext);
    cb(ok ? null : new Error(kind === 'image' ? 'Only JPG, PNG and WEBP images are allowed.' : 'Only PDF, DOC, DOCX and TXT files are allowed.'), ok);
  };
}

const uploadCv = multer({ storage: multer.memoryStorage(), fileFilter: fileFilterFactory('cv'), limits: { fileSize: 10 * 1024 * 1024 } });
const uploadImage = multer({ storage: multer.memoryStorage(), fileFilter: fileFilterFactory('image'), limits: { fileSize: 5 * 1024 * 1024 } });

async function upsertProfile(userId, fields = {}) {
  const result = await getSupabase().from('profiles').upsert({ user_id: userId, ...fields, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  throwIfSupabaseError(result.error);
}

router.get('/', auth, async (req, res, next) => {
  try {
    const result = await getSupabase().from('users').select('id, full_name, email, role, phone, accessibility_needs, profiles(bio, skills, education, experience, cv_file_path, cv_text, profile_picture_path, accessibility_preferences)').eq('id', req.user.id).single();
    throwIfSupabaseError(result.error);
    const profile = Array.isArray(result.data.profiles) ? result.data.profiles[0] : result.data.profiles;
    delete result.data.profiles;
    const response = { ...result.data, ...(profile || {}) };
    response.cvDownloadUrl = await signedUrl(response.cv_file_path);
    response.profilePictureUrl = await signedUrl(response.profile_picture_path);
    res.json(response);
  } catch (error) { next(error); }
});

router.put('/', auth, async (req, res, next) => {
  try {
    const db = getSupabase();
    const userUpdate = { full_name: req.body.fullName || req.body.full_name || req.user.name, phone: req.body.phone || '', accessibility_needs: req.body.accessibilityNeeds || req.body.accessibility_needs || '' };
    const result = await db.from('users').update(userUpdate).eq('id', req.user.id);
    throwIfSupabaseError(result.error);
    await upsertProfile(req.user.id, { bio: req.body.bio || '', skills: req.body.skills || '', education: req.body.education || '', experience: req.body.experience || '', accessibility_preferences: req.body.accessibilityPreferences || req.body.accessibility_preferences || '' });
    res.json({ message: 'Profile updated.' });
  } catch (error) { next(error); }
});

router.post('/upload-cv', auth, uploadCv.single('cv'), async (req, res, next) => {
  try {
    const pastedText = String(req.body.cvText || '').trim();
    if (!req.file && !pastedText) return res.status(400).json({ message: 'Upload a PDF/DOC/DOCX/TXT CV or paste CV text first.' });
    const extracted = req.file ? await extractCvText(req.file) : '';
    const finalText = [extracted, pastedText].filter(Boolean).join('\n\n').trim();
    if (!finalText || wordCount(finalText) < 8) return res.status(400).json({ message: 'CV uploaded, but not enough readable text was found.' });
    const existing = await getSupabase().from('profiles').select('cv_file_path').eq('user_id', req.user.id).maybeSingle();
    throwIfSupabaseError(existing.error);
    const filePath = req.file ? await uploadBuffer({ userId: req.user.id, folder: 'cvs', file: req.file }) : existing.data?.cv_file_path || null;
    if (req.file && existing.data?.cv_file_path) await removeFile(existing.data.cv_file_path);
    await upsertProfile(req.user.id, { cv_file_path: filePath, cv_text: finalText });
    res.json({ message: 'CV uploaded to Supabase Storage and saved for job matching.', cvFilePath: filePath, cvDownloadUrl: await signedUrl(filePath), cvTextSaved: true, extractedWords: wordCount(finalText) });
  } catch (error) { next(error); }
});

router.post('/upload-profile-picture', auth, uploadImage.single('profilePicture'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Choose a JPG, PNG or WEBP profile picture first.' });
    const existing = await getSupabase().from('profiles').select('profile_picture_path').eq('user_id', req.user.id).maybeSingle();
    throwIfSupabaseError(existing.error);
    const filePath = await uploadBuffer({ userId: req.user.id, folder: 'profile-pictures', file: req.file });
    if (existing.data?.profile_picture_path) await removeFile(existing.data.profile_picture_path);
    await upsertProfile(req.user.id, { profile_picture_path: filePath });
    res.json({ message: 'Profile picture uploaded.', profilePicturePath: filePath, profilePictureUrl: await signedUrl(filePath) });
  } catch (error) { next(error); }
});

router.delete('/profile-picture', auth, async (req, res, next) => {
  try {
    const existing = await getSupabase().from('profiles').select('profile_picture_path').eq('user_id', req.user.id).maybeSingle();
    throwIfSupabaseError(existing.error);
    if (existing.data?.profile_picture_path) await removeFile(existing.data.profile_picture_path);
    await upsertProfile(req.user.id, { profile_picture_path: null });
    res.json({ message: 'Profile picture removed.' });
  } catch (error) { next(error); }
});

router.get('/settings', auth, async (req, res, next) => {
  try {
    const result = await getSupabase().from('user_settings').select('settings_json').eq('user_id', req.user.id).maybeSingle();
    throwIfSupabaseError(result.error);
    res.json({ scope: req.user.role, settings: result.data?.settings_json || {} });
  } catch (error) { next(error); }
});

router.put('/settings', auth, async (req, res, next) => {
  try {
    const settings = req.body && typeof req.body.settings === 'object' ? req.body.settings : req.body;
    const result = await getSupabase().from('user_settings').upsert({ user_id: req.user.id, settings_json: settings || {}, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    throwIfSupabaseError(result.error);
    res.json({ message: 'Settings saved.', settings });
  } catch (error) { next(error); }
});

router.put('/password', auth, async (req, res, next) => {
  try {
    const currentPassword = String(req.body.currentPassword || '');
    const newPassword = String(req.body.newPassword || '');
    if (newPassword.length < 6) return res.status(400).json({ message: 'New password must be at least 6 characters.' });
    const db = getSupabase();
    const user = await db.from('users').select('password_hash').eq('id', req.user.id).single();
    throwIfSupabaseError(user.error);
    if (!(await verifyPassword(currentPassword, user.data.password_hash))) return res.status(401).json({ message: 'Current password is incorrect.' });
    const result = await db.from('users').update({ password_hash: await hashPassword(newPassword) }).eq('id', req.user.id);
    throwIfSupabaseError(result.error);
    res.json({ message: 'Password changed successfully.' });
  } catch (error) { next(error); }
});

router.post('/data-removal', auth, async (req, res, next) => {
  try {
    const result = await getSupabase().from('data_removal_requests').insert({ user_id: req.user.id, reason: String(req.body.reason || '').slice(0, 500), status: 'Pending' });
    throwIfSupabaseError(result.error);
    res.json({ message: 'Data removal request saved.', status: 'Pending' });
  } catch (error) { next(error); }
});

router.get('/export', auth, async (req, res, next) => {
  try {
    const db = getSupabase();
    const [user, profile, settings, requests] = await Promise.all([
      db.from('users').select('id, full_name, email, role, phone, status, accessibility_needs, created_at').eq('id', req.user.id).maybeSingle(),
      db.from('profiles').select('bio, skills, education, experience, cv_file_path, profile_picture_path, accessibility_preferences, updated_at').eq('user_id', req.user.id).maybeSingle(),
      db.from('user_settings').select('settings_json, updated_at').eq('user_id', req.user.id).maybeSingle(),
      db.from('data_removal_requests').select('reason, status, created_at').eq('user_id', req.user.id).order('created_at', { ascending: false })
    ]);
    [user, profile, settings, requests].forEach(r => throwIfSupabaseError(r.error));
    res.json({ exportedAt: new Date().toISOString(), user: user.data, profile: profile.data, settings: settings.data?.settings_json || {}, dataRemovalRequests: requests.data || [] });
  } catch (error) { next(error); }
});

module.exports = router;

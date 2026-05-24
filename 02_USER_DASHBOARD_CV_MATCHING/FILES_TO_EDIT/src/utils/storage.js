const path = require('path');
const { env } = require('../config/env');
const { getSupabase } = require('../config/supabase');

function safeName(name = 'file') {
  const ext = path.extname(name).toLowerCase();
  const base = path.basename(name, ext).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80) || 'file';
  return `${base}${ext}`;
}

function storagePath(userId, folder, originalName) {
  return `${folder}/user-${userId}/${Date.now()}-${safeName(originalName)}`;
}

async function uploadBuffer({ userId, folder, file }) {
  if (!file || !file.buffer) return null;
  const db = getSupabase();
  const bucket = env.storageBucket;
  const key = storagePath(userId, folder, file.originalname);
  const uploaded = await db.storage.from(bucket).upload(key, file.buffer, {
    contentType: file.mimetype || 'application/octet-stream',
    upsert: false
  });
  if (uploaded.error) {
    const err = new Error(uploaded.error.message || 'File upload failed.');
    err.status = 500;
    throw err;
  }
  return key;
}

async function signedUrl(filePath, expiresIn = 60 * 60) {
  if (!filePath) return null;
  const result = await getSupabase().storage.from(env.storageBucket).createSignedUrl(filePath, expiresIn);
  if (result.error) return null;
  return result.data?.signedUrl || null;
}

async function removeFile(filePath) {
  if (!filePath) return;
  await getSupabase().storage.from(env.storageBucket).remove([filePath]);
}

module.exports = { uploadBuffer, signedUrl, removeFile };

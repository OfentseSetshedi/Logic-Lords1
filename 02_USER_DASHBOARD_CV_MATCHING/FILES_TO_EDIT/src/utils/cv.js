const path = require('path');
const fs = require('fs/promises');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

async function fileBuffer(file) {
  if (file.buffer) return file.buffer;
  if (file.path) return fs.readFile(file.path);
  return Buffer.alloc(0);
}

async function extractCvText(file) {
  const ext = path.extname(file.originalname || file.path || '').toLowerCase();
  const buffer = await fileBuffer(file);
  if (ext === '.pdf') {
    const parsed = await pdfParse(buffer);
    return parsed.text || '';
  }
  if (ext === '.docx') {
    const result = await mammoth.extractRawText({ buffer });
    return result.value || '';
  }
  if (ext === '.doc') {
    return '';
  }
  return buffer.toString('utf8');
}

function wordCount(text) {
  return String(text || '').trim().split(/\s+/).filter(Boolean).length;
}

module.exports = { extractCvText, wordCount };

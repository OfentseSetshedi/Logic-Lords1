const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { env } = require('../config/env');

async function hashPassword(password) {
  return bcrypt.hash(String(password), 10);
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(String(password), String(hash || ''));
}

function createToken(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.full_name || user.name }, env.jwtSecret || 'dev-only-secret', { expiresIn: '8h' });
}

function generateTemporaryPassword() {
  return `AI-${crypto.randomBytes(4).toString('hex').toUpperCase()}!`;
}

function publicUser(user) {
  return { id: user.id, name: user.full_name || user.name, full_name: user.full_name || user.name, email: user.email, role: user.role, status: user.status };
}

function normalizeStatus(value, allowed, fallback) {
  const clean = String(value || '').trim();
  return allowed.includes(clean) ? clean : fallback;
}

module.exports = { hashPassword, verifyPassword, createToken, generateTemporaryPassword, publicUser, normalizeStatus };

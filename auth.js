const jwt = require('jsonwebtoken');
const { env } = require('../config/env');

function setAuthCookie(res, token) {
  res.cookie('ai_natives_token', token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: env.nodeEnv === 'production',
    path: '/',
    maxAge: 8 * 60 * 60 * 1000
  });
}

function clearAuthCookie(res) {
  res.clearCookie('ai_natives_token', { path: '/' });
}

function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : '';
  const token = req.cookies?.ai_natives_token || bearer;
  if (!token) return res.status(401).json({ message: 'Please login first.' });
  try {
    req.user = jwt.verify(token, env.jwtSecret || 'dev-only-secret');
    next();
  } catch {
    res.status(401).json({ message: 'Session expired. Please login again.' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => roles.includes(req.user?.role) ? next() : res.status(403).json({ message: 'You are not allowed to access this action.' });
}

module.exports = { auth, requireRole, setAuthCookie, clearAuthCookie };

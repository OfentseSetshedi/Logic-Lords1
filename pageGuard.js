const path = require('path');
const jwt = require('jsonwebtoken');
const { env } = require('../config/env');

const protectedPages = {
  '/user.html': ['user', 'admin'],
  '/employer.html': ['employer', 'admin'],
  '/admin.html': ['admin']
};

function extractToken(req) {
  const header = req.headers.authorization || '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : '';
  return req.cookies?.ai_natives_token || bearer;
}

function protectedPageGuard(publicDir) {
  return (req, res, next) => {
    const pathname = req.path;
    const roles = protectedPages[pathname];
    if (!roles) return next();
    const token = extractToken(req);
    if (!token) return res.redirect('/index.html?login=required');
    try {
      const user = jwt.verify(token, env.jwtSecret || 'dev-only-secret');
      if (!roles.includes(user.role)) return res.redirect('/index.html?login=role');
      return res.sendFile(path.join(publicDir, pathname));
    } catch {
      return res.redirect('/index.html?login=expired');
    }
  };
}

module.exports = { protectedPageGuard };

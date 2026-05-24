const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const { env } = require('./config/env');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { ensureDefaultAdmin } = require('./utils/bootstrapAdmin');
const { protectedPageGuard } = require('./middleware/pageGuard');

const authRoutes = require('./routes/auth.routes');
const profileRoutes = require('./routes/profile.routes');
const { router: jobRoutes } = require('./routes/jobs.routes');
const { router: applicationRoutes } = require('./routes/applications.routes');
const adminRoutes = require('./routes/admin.routes');
const integrationRoutes = require('./routes/integrations.routes');

const app = express();
const publicDir = path.resolve(process.cwd(), 'public');
const uploadsDir = path.resolve(process.cwd(), 'uploads');

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 500, standardHeaders: true, legacyHeaders: false }));
app.use('/uploads', express.static(uploadsDir));
app.use(protectedPageGuard(publicDir));
app.use(express.static(publicDir));

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/settings', profileRoutes);
app.use('/api/account', profileRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/public/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', integrationRoutes);

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.use('/api', notFound);
app.use(errorHandler);

module.exports = app;

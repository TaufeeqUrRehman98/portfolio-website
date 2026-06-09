require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const csrf = require('csurf');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Security Headers via Helmet ──────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net", "https://unpkg.com"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  frameguard: { action: 'deny' },
}));

// ─── CORS ─────────────────────────────────────────────────
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || `http://localhost:${PORT}`,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
}));

// ─── Body Parsing ──────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// ─── Global Rate Limiter ───────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' }
});
app.use(globalLimiter);

// ─── Static Assets ─────────────────────────────────────────
app.use('/assets', express.static(path.join(__dirname, '../assets'), { maxAge: '7d', etag: true }));
app.use('/data', express.static(path.join(__dirname, '../data'), {
  maxAge: '0',
  setHeaders: (res) => { res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate'); }
}));

// ─── CSRF Protection ───────────────────────────────────────
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }
});

app.get('/api/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// ─── Admin Routes ──────────────────────────────────────────
app.use('/api/admin', csrfProtection, adminRoutes);

// ─── Contact Form ──────────────────────────────────────────
const { body, validationResult } = require('express-validator');

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many messages sent. Try again in an hour.' }
});

app.post('/api/contact', contactLimiter, csrfProtection, [
  body('name').trim().notEmpty().isLength({ min: 2, max: 100 }).escape(),
  body('email').trim().isEmail().normalizeEmail(),
  body('subject').trim().notEmpty().isLength({ max: 200 }).escape(),
  body('message').trim().notEmpty().isLength({ min: 10, max: 2000 }).escape(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  const { name, email, subject, message } = req.body;
  console.log(`[CONTACT ${new Date().toISOString()}] From: ${name} <${email}> — Subject: ${subject}`);
  res.json({ success: true, message: 'Message received! I will get back to you shortly.' });
});

// ─── Frontend ──────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '../frontend'), { maxAge: '1h', etag: true }));

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/admin.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ─── Error Handler ─────────────────────────────────────────
app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({ success: false, message: 'Invalid CSRF token.' });
  }
  console.error(`[ERROR ${new Date().toISOString()}]`, err.message);
  res.status(500).json({ success: false, message: 'Internal server error.' });
});

// ─── Start ─────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Resume Website running at http://localhost:${PORT}`);
  console.log(`🔒 Admin panel at http://localhost:${PORT}/admin`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}\n`);
});

module.exports = app;

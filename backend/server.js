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
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://cdnjs.cloudflare.com",
        "https://cdn.jsdelivr.net",
        "https://unpkg.com"
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://fonts.googleapis.com",
        "https://cdnjs.cloudflare.com"
      ],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  frameguard: { action: 'deny' },
}));

// ─── CORS ────────────────────────────────────────────────
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || `http://localhost:${PORT}`,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
}));

// ─── Body Parsing ─────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// ─── Global Rate Limiter ──────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: (parseInt(process.env.RATE_LIMIT_WINDOW_MINUTES) || 15) * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' }
});
app.use(globalLimiter);

// ─── Static Assets ────────────────────────────────────────
app.use('/assets', express.static(path.join(__dirname, '../assets'), {
  maxAge: '7d',
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.pdf')) {
      res.setHeader('Content-Disposition', 'attachment');
    }
  }
}));

app.use('/data', express.static(path.join(__dirname, '../data'), {
  maxAge: '0',
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  }
}));

// ─── CSRF Protection (for POST/PUT/DELETE) ────────────────
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }
});

// CSRF token endpoint (frontend fetches this first)
app.get('/api/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// ─── API Routes ───────────────────────────────────────────
app.use('/api/admin', csrfProtection, adminRoutes);

// ─── Contact Form (public, with CSRF) ────────────────────
const { body, validationResult } = require('express-validator');

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
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
  const timestamp = new Date().toISOString();
  
  // Log contact messages (in production, send via email/notification)
  console.log(`[CONTACT ${timestamp}] From: ${name} <${email}> — Subject: ${subject}`);
  
  // In a real deployment, integrate with nodemailer or similar here
  
  res.json({ success: true, message: 'Message received! I will get back to you shortly.' });
});

// ─── Frontend (SPA) ───────────────────────────────────────
app.use(express.static(path.join(__dirname, '../frontend'), {
  maxAge: '1h',
  etag: true,
}));

// Admin panel HTML
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/admin.html'));
});

// Catch-all → index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ─── Error Handler ────────────────────────────────────────
app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({ success: false, message: 'Invalid CSRF token. Request blocked.' });
  }
  console.error(`[ERROR ${new Date().toISOString()}]`, err.message);
  res.status(500).json({ success: false, message: 'Internal server error.' });
});

// ─── Start Server ─────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Resume Website running at http://localhost:${PORT}`);
  console.log(`🔒 Admin panel at http://localhost:${PORT}/admin`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}\n`);
});

module.exports = app;

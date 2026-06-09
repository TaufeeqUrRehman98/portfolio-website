require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const csrf = require('csurf');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const { body, validationResult } = require('express-validator');

const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Security Headers ──────────────────────────────────────
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

// ─── CORS ──────────────────────────────────────────────────
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
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
}));

// ─── Static Files ──────────────────────────────────────────
app.use('/assets', express.static(path.join(__dirname, '../assets'), { maxAge: '7d' }));
app.use('/data', express.static(path.join(__dirname, '../data'), {
  setHeaders: (res) => res.setHeader('Cache-Control', 'no-cache')
}));

// ─── CSRF ──────────────────────────────────────────────────
const csrfProtection = csrf({
  cookie: { httpOnly: true, secure: false, sameSite: 'lax' }
});

app.get('/api/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// ─── Admin Routes ──────────────────────────────────────────
app.use('/api/admin', csrfProtection, adminRoutes);

// ─── Nodemailer Transporter ────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ─── Contact Form ──────────────────────────────────────────
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many messages sent. Try again in an hour.' }
});

app.post('/api/contact', contactLimiter, csrfProtection, [
  body('name').trim().notEmpty().isLength({ min: 2, max: 100 }).escape(),
  body('email').trim().isEmail().normalizeEmail(),
  body('subject').trim().optional().isLength({ max: 200 }).escape(),
  body('message').trim().notEmpty().isLength({ min: 10, max: 2000 }).escape(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { name, email, subject, message } = req.body;
  const timestamp = new Date().toISOString();
  console.log(`[CONTACT ${timestamp}] From: ${name} <${email}> Subject: ${subject}`);

  // Send email via Gmail
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    try {
      await transporter.sendMail({
        from: `"Portfolio Contact" <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_TO || process.env.EMAIL_USER,
        replyTo: email,
        subject: `Portfolio Contact: ${subject}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f4f4;padding:20px;border-radius:10px">
            <div style="background:#070d14;padding:25px;border-radius:8px;text-align:center;margin-bottom:20px">
              <h1 style="color:#00ff88;margin:0;font-size:1.5rem">New Contact Message</h1>
              <p style="color:#8ba8c0;margin:5px 0 0">From your Portfolio Website</p>
            </div>
            <div style="background:#ffffff;padding:25px;border-radius:8px;margin-bottom:15px">
              <table style="width:100%;border-collapse:collapse">
                <tr style="border-bottom:1px solid #eee">
                  <td style="padding:10px 0;font-weight:bold;color:#555;width:80px">Name:</td>
                  <td style="padding:10px 0;color:#111">${name}</td>
                </tr>
                <tr style="border-bottom:1px solid #eee">
                  <td style="padding:10px 0;font-weight:bold;color:#555">Email:</td>
                  <td style="padding:10px 0"><a href="mailto:${email}" style="color:#0066cc">${email}</a></td>
                </tr>
                <tr style="border-bottom:1px solid #eee">
                  <td style="padding:10px 0;font-weight:bold;color:#555">Subject:</td>
                  <td style="padding:10px 0;color:#111">${subject}</td>
                </tr>
                <tr>
                  <td style="padding:10px 0;font-weight:bold;color:#555;vertical-align:top">Message:</td>
                  <td style="padding:10px 0;color:#111;line-height:1.6">${message.replace(/\n/g, '<br>')}</td>
                </tr>
              </table>
            </div>
            <div style="background:#070d14;padding:15px;border-radius:8px;text-align:center">
              <a href="mailto:${email}" style="background:#00ff88;color:#070d14;padding:10px 25px;border-radius:5px;text-decoration:none;font-weight:bold;display:inline-block">Reply to ${name}</a>
            </div>
            <p style="text-align:center;color:#999;font-size:0.75rem;margin-top:15px">Sent from Taufeeq Portfolio — ${timestamp}</p>
          </div>
        `,
      });
      console.log(`[EMAIL SENT] To: ${process.env.EMAIL_TO || process.env.EMAIL_USER}`);
    } catch (emailErr) {
      console.error('[EMAIL ERROR]', emailErr.message);
    }
  }

  res.json({ success: true, message: 'Message received! I will get back to you shortly.' });
});

// ─── Frontend ──────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '../frontend'), { maxAge: '1h' }));

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
  console.error(`[ERROR]`, err.message);
  res.status(500).json({ success: false, message: 'Internal server error.' });
});

// ─── Start ─────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Portfolio running at http://localhost:${PORT}`);
  console.log(`🔒 Admin panel at http://localhost:${PORT}/admin`);
  console.log(`📧 Email: ${process.env.EMAIL_USER ? '✅ Configured' : '❌ Not configured — add EMAIL_USER/EMAIL_PASS to .env'}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}\n`);
});

module.exports = app;

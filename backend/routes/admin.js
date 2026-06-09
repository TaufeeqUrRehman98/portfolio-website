const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const authMiddleware = require('../middleware/auth');

// ─── Login Rate Limiter ───────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.LOGIN_RATE_LIMIT_MAX) || 5,
  message: { success: false, message: 'Too many login attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Ensure upload directories exist on startup ──────────
const docsDir   = path.join(__dirname, '../../assets/docs');
const imagesDir = path.join(__dirname, '../../assets/images');
if (!fs.existsSync(docsDir))   fs.mkdirSync(docsDir,   { recursive: true });
if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });

const MAX_SIZE = (parseInt(process.env.MAX_FILE_SIZE_MB) || 5) * 1024 * 1024;

// ─── Image Upload (multer) ────────────────────────────────
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => { cb(null, imagesDir); },
  filename:    (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, 'profile-' + uuidv4() + ext);
  }
});

const imageUpload = multer({
  storage: imageStorage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) {
      return cb(new Error('Only JPG, PNG, WEBP images are allowed.'));
    }
    cb(null, true);
  }
});

// ─── CV/PDF Upload (multer) ───────────────────────────────
// Note: PDF MIME type varies by OS/browser, so we check by extension only
const docStorage = multer.diskStorage({
  destination: (req, file, cb) => { cb(null, docsDir); },
  filename:    (req, file, cb) => { cb(null, 'cv-' + uuidv4() + '.pdf'); }
});

const docUpload = multer({
  storage: docStorage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.pdf') {
      return cb(new Error('Only PDF files are allowed.'));
    }
    cb(null, true);
  }
});

// ─── Admin Login ──────────────────────────────────────────
router.post('/login', loginLimiter, [
  body('username').trim().notEmpty().isLength({ max: 50 }).escape(),
  body('password').notEmpty().isLength({ min: 12, max: 128 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Invalid credentials format.' });
  }

  const { username, password } = req.body;
  const ip = req.ip;
  const timestamp = new Date().toISOString();

  if (username !== process.env.ADMIN_USERNAME) {
    console.warn(`[${timestamp}] Failed login — wrong username — IP: ${ip}`);
    return res.status(401).json({ success: false, message: 'Invalid credentials.' });
  }

  const passwordHash = process.env.ADMIN_PASSWORD_HASH;
  if (!passwordHash) {
    return res.status(500).json({ success: false, message: 'Server configuration error. Set ADMIN_PASSWORD_HASH in .env' });
  }

  const isValid = await bcrypt.compare(password, passwordHash);
  if (!isValid) {
    console.warn(`[${timestamp}] Failed login — wrong password — IP: ${ip}`);
    return res.status(401).json({ success: false, message: 'Invalid credentials.' });
  }

  const token = jwt.sign(
    { username, lastActivity: Math.floor(Date.now() / 1000) },
    process.env.JWT_SECRET,
    { expiresIn: '2h' }
  );

  res.cookie('adminToken', token, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: 2 * 60 * 60 * 1000
  });

  console.log(`[${timestamp}] Admin login successful — IP: ${ip}`);
  res.json({ success: true, message: 'Login successful.' });
});

// ─── Logout ───────────────────────────────────────────────
router.post('/logout', authMiddleware, (req, res) => {
  res.clearCookie('adminToken');
  res.json({ success: true, message: 'Logged out.' });
});

// ─── Verify Session ───────────────────────────────────────
router.get('/verify', authMiddleware, (req, res) => {
  res.json({ success: true, message: 'Session valid.' });
});

// ─── Upload Profile Photo ─────────────────────────────────
router.post('/upload/photo', authMiddleware, (req, res) => {
  imageUpload.single('photo')(req, res, (err) => {
    if (err) {
      console.error('Photo upload error:', err.message);
      return res.status(400).json({ success: false, message: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file received. Please select a file.' });
    }

    const relPath = '/assets/images/' + req.file.filename;
    const dataPath = path.join(__dirname, '../../data/resume.json');

    try {
      const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
      data.photo = relPath;
      fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
    } catch (e) {
      console.error('Failed to update resume.json:', e.message);
      return res.status(500).json({ success: false, message: 'File uploaded but failed to update resume data.' });
    }

    res.json({ success: true, message: 'Photo updated successfully.', path: relPath });
  });
});

// ─── Upload CV PDF ────────────────────────────────────────
router.post('/upload/cv', authMiddleware, (req, res) => {
  docUpload.single('cv')(req, res, (err) => {
    if (err) {
      console.error('CV upload error:', err.message);
      return res.status(400).json({ success: false, message: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file received. Please select a PDF file.' });
    }

    const relPath = '/assets/docs/' + req.file.filename;
    const dataPath = path.join(__dirname, '../../data/resume.json');

    try {
      const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
      data.cv = relPath;
      fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
    } catch (e) {
      console.error('Failed to update resume.json:', e.message);
      return res.status(500).json({ success: false, message: 'File uploaded but failed to update resume data.' });
    }

    console.log('CV uploaded:', req.file.filename);
    res.json({ success: true, message: 'CV uploaded successfully.', path: relPath });
  });
});

// ─── Get Resume Data ──────────────────────────────────────
router.get('/resume', authMiddleware, (req, res) => {
  const dataPath = path.join(__dirname, '../../data/resume.json');
  try {
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to read resume.' });
  }
});

// ─── Update Resume Data ───────────────────────────────────
router.put('/resume', authMiddleware, [
  body('name').optional().trim().isLength({ min: 2, max: 100 }).escape(),
  body('title').optional().trim().isLength({ max: 150 }).escape(),
  body('email').optional().trim().isEmail().normalizeEmail(),
  body('phone').optional().trim().isLength({ max: 20 }).escape(),
  body('about').optional().trim().isLength({ max: 2000 }),
  body('location').optional().trim().isLength({ max: 100 }).escape(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const dataPath = path.join(__dirname, '../../data/resume.json');
  try {
    const existing = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    const allowed = ['name','title','tagline','email','phone','linkedin','github','location','about','aboutBullets'];
    allowed.forEach(field => {
      if (req.body[field] !== undefined) existing[field] = req.body[field];
    });
    fs.writeFileSync(dataPath, JSON.stringify(existing, null, 2));
    res.json({ success: true, message: 'Resume updated successfully.' });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to update resume.' });
  }
});

module.exports = router;

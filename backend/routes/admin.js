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

// ─── Multer Configuration ────────────────────────────────
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_DOC_TYPES = ['application/pdf'];
const MAX_SIZE = (parseInt(process.env.MAX_FILE_SIZE_MB) || 5) * 1024 * 1024;

const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../assets/images');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `profile-${uuidv4()}${ext}`);
  }
});

const docStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../assets/docs');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `cv-${uuidv4()}.pdf`);
  }
});

const imageUpload = multer({
  storage: imageStorage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (req, file, cb) => {
    const allowedExts = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype) || !allowedExts.includes(ext)) {
      return cb(new Error('Only JPG, PNG, WEBP images are allowed.'));
    }
    cb(null, true);
  }
});

const docUpload = multer({
  storage: docStorage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_DOC_TYPES.includes(file.mimetype) || ext !== '.pdf') {
      return cb(new Error('Only PDF files are allowed.'));
    }
    cb(null, true);
  }
});

// ─── Admin Login ─────────────────────────────────────────
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

  // Validate username
  if (username !== process.env.ADMIN_USERNAME) {
    console.warn(`[${timestamp}] Failed login attempt — username: "${username}" — IP: ${ip}`);
    return res.status(401).json({ success: false, message: 'Invalid credentials.' });
  }

  // Validate password against stored hash
  const passwordHash = process.env.ADMIN_PASSWORD_HASH;
  if (!passwordHash) {
    return res.status(500).json({ success: false, message: 'Server configuration error.' });
  }

  const isValid = await bcrypt.compare(password, passwordHash);
  if (!isValid) {
    console.warn(`[${timestamp}] Failed login attempt — wrong password — IP: ${ip}`);
    return res.status(401).json({ success: false, message: 'Invalid credentials.' });
  }

  // Issue JWT in HttpOnly cookie
  const token = jwt.sign(
    { username, lastActivity: Math.floor(Date.now() / 1000) },
    process.env.JWT_SECRET,
    { expiresIn: '2h' }
  );

  res.cookie('adminToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
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

// ─── Upload Profile Photo ─────────────────────────────────
router.post('/upload/photo', authMiddleware, (req, res) => {
  imageUpload.single('photo')(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });

    const relPath = `/assets/images/${req.file.filename}`;

    // Update resume.json
    const dataPath = path.join(__dirname, '../../data/resume.json');
    try {
      const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
      data.photo = relPath;
      fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
    } catch (e) {
      return res.status(500).json({ success: false, message: 'Failed to update resume data.' });
    }

    res.json({ success: true, message: 'Photo updated.', path: relPath });
  });
});

// ─── Upload CV PDF ────────────────────────────────────────
router.post('/upload/cv', authMiddleware, (req, res) => {
  docUpload.single('cv')(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });

    const relPath = `/assets/docs/${req.file.filename}`;

    const dataPath = path.join(__dirname, '../../data/resume.json');
    try {
      const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
      data.cv = relPath;
      fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
    } catch (e) {
      return res.status(500).json({ success: false, message: 'Failed to update resume data.' });
    }

    res.json({ success: true, message: 'CV updated.', path: relPath });
  });
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
    const allowedFields = ['name', 'title', 'tagline', 'email', 'phone', 'linkedin', 'github', 'location', 'about', 'aboutBullets'];
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        existing[field] = req.body[field];
      }
    });

    fs.writeFileSync(dataPath, JSON.stringify(existing, null, 2));
    res.json({ success: true, message: 'Resume updated successfully.' });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to update resume.' });
  }
});

// ─── Get Resume Data (for admin panel pre-fill) ───────────
router.get('/resume', authMiddleware, (req, res) => {
  const dataPath = path.join(__dirname, '../../data/resume.json');
  try {
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to read resume.' });
  }
});

// ─── Verify session still active ─────────────────────────
router.get('/verify', authMiddleware, (req, res) => {
  res.json({ success: true, message: 'Session valid.' });
});

module.exports = router;

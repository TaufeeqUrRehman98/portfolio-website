# 🛡️ Taufeeq Ur Rehman — Portfolio Website

A professional, security-hardened portfolio website for **Taufeeq Ur Rehman** — Web Developer & Pentester.

Built with Vanilla HTML/CSS/JS, Three.js, GSAP, Node.js + Express.

---

## 📁 Project Structure

```
resume-website/
├── frontend/
│   ├── index.html          ← Main portfolio page
│   ├── admin.html          ← Admin panel UI
│   ├── css/
│   │   └── style.css       ← Full responsive styles + dark/light mode
│   └── js/
│       ├── main.js         ← GSAP animations, scroll effects, theme toggle
│       └── three-scene.js  ← Three.js cybersecurity particle hero
├── backend/
│   ├── server.js           ← Express + all security middleware
│   ├── routes/
│   │   └── admin.js        ← Admin API routes (login, upload, edit)
│   └── middleware/
│       └── auth.js         ← JWT auth middleware
├── assets/
│   ├── images/             ← Profile photo (stored here)
│   └── docs/               ← CV PDF (stored here)
├── data/
│   └── resume.json         ← Single source of truth for all content
├── .env.example            ← Environment variable template
├── .gitignore
├── package.json
└── README.md
```

---

## ⚡ Quick Setup

### 1. Install Dependencies

```bash
cd resume-website
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Open `.env` and fill in:

```env
PORT=3000
NODE_ENV=development
JWT_SECRET=your_very_long_random_secret_min_64_chars
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=<generate below>
```

### 3. Generate Admin Password Hash

Run this once to hash your admin password:

```bash
node -e "
const bcrypt = require('bcryptjs');
const password = 'YourSecurePassword123!@#';
bcrypt.hash(password, 12).then(hash => {
  console.log('ADMIN_PASSWORD_HASH=' + hash);
});
"
```

Copy the output hash into your `.env` file as `ADMIN_PASSWORD_HASH`.

> **Password Requirements:** Minimum 12 characters, include uppercase, number, and special character.

### 4. Start the Server

```bash
# Development (auto-restart on file changes)
npm run dev

# Production
npm start
```

### 5. Open in Browser

- **Portfolio:** http://localhost:3000
- **Admin Panel:** http://localhost:3000/admin

---

## 🔒 Security Features

| Feature | Implementation |
|---|---|
| HTTP Security Headers | Helmet.js (CSP, HSTS, X-Frame-Options, etc.) |
| Rate Limiting | express-rate-limit (100 req/15min global, 5 login attempts/15min) |
| Input Sanitization | express-validator on all inputs |
| CSRF Protection | csurf middleware on all POST/PUT routes |
| JWT Auth | HttpOnly, Secure, SameSite=Strict cookies |
| Password Hashing | bcryptjs (cost factor 12) |
| File Upload Security | MIME + extension whitelist, UUID rename, 5MB max |
| XSS Prevention | Input validation + sanitization |
| SQL Injection | Parameterized file system operations only |
| Failed Login Logging | Timestamp + IP logged to console |

---

## 🎨 Frontend Features

- **Three.js** cybersecurity particle network hero
- **GSAP + ScrollTrigger** smooth scroll animations throughout
- **Day/Night mode** toggle (stored in localStorage)
- **Font size controls** (A+ / A-) stored in localStorage
- **Typing effect** hero tagline
- **3D tilt effect** on project cards (CSS perspective)
- **Animated skill bars** with intersection observer
- **Fully responsive** from 320px to 1920px

---

## 📋 Admin Panel Features

Login at `/admin` with your credentials.

- **Upload profile photo** (replaces photo displayed on portfolio)
- **Upload CV PDF** (updates the download button)
- **Edit resume fields** (name, title, email, about, links — live updates)
- **Session expires** after 30 minutes of inactivity

---

## 🚀 Deployment

### Update `.env` for production:

```env
NODE_ENV=production
ALLOWED_ORIGIN=https://yourdomain.com
```

### Recommended: Use PM2 for process management

```bash
npm install -g pm2
pm2 start backend/server.js --name taufeeq-portfolio
pm2 save
pm2 startup
```

### Nginx reverse proxy example:

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 📞 Contact

**Taufeeq Ur Rehman**
- Email: taufeequrrehman98@gmail.com
- WhatsApp: +92 315 2438034
- GitHub: [TaufeeqUrRehman98](https://github.com/TaufeeqUrRehman98)
- Location: Karachi, Pakistan

---

*Built with ❤️ and a security-first mindset.*

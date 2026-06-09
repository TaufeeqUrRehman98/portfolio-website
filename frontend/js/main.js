/**
 * Main JS — Taufeeq Ur Rehman Portfolio
 * GSAP animations, ScrollTrigger, theme toggle, contact form
 */
(function () {
  'use strict';

  // ─── Wait for GSAP to load, then init ────────────────────
  function waitForGSAP(callback) {
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
      callback();
    } else {
      setTimeout(() => waitForGSAP(callback), 100);
    }
  }

  // ─── DOM Ready ────────────────────────────────────────────
  window.addEventListener('load', function () {
    initTheme();
    initFontSize();
    initNavbar();
    initTypingEffect();
    initSkillBars();
    initProjectTilt();
    initContactForm();
    initMobileMenu();
    initParticleText();
    loadResumeData();
    // Wait for GSAP CDN to finish loading
    waitForGSAP(initScrollAnimations);
  });

  // ─── Load Resume JSON ─────────────────────────────────────
  async function loadResumeData() {
    try {
      const res = await fetch('/data/resume.json');
      const data = await res.json();
      populatePage(data);
    } catch (e) {
      console.warn('Could not load resume.json, using static content.');
    }
  }

  function populatePage(d) {
    safeSet('#hero-name', d.name);
    safeSet('#hero-title', d.title);
    safeSet('#about-text', d.about);
    safeSet('#contact-email-link', d.email, 'href', 'mailto:' + d.email);
    safeSet('#contact-phone-link', d.phone, 'href', 'tel:' + d.phone);
    safeSet('#nav-github', null, 'href', d.github);

    if (d.photo) {
      const img = document.getElementById('profile-photo');
      if (img) img.src = d.photo;
    }

    if (d.cv) {
      const cvBtn = document.getElementById('cv-download-btn');
      if (cvBtn) cvBtn.href = d.cv;
    }
  }

  function safeSet(selector, text, attr, attrVal) {
    const el = document.querySelector(selector);
    if (!el) return;
    if (text !== null && text !== undefined) el.textContent = text;
    if (attr && attrVal) el.setAttribute(attr, attrVal);
  }

  // ─── Theme Toggle ─────────────────────────────────────────
  function initTheme() {
    const toggle = document.getElementById('theme-toggle');
    const saved = localStorage.getItem('theme') || 'dark';
    applyTheme(saved);

    if (toggle) {
      toggle.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        localStorage.setItem('theme', next);
      });
    }
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const toggle = document.getElementById('theme-toggle');
    if (toggle) toggle.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
    if (typeof window.updateThreeTheme === 'function') {
      window.updateThreeTheme(theme === 'dark');
    }
  }

  // ─── Font Size Controls ───────────────────────────────────
  function initFontSize() {
    let size = parseInt(localStorage.getItem('fontSize')) || 16;
    document.documentElement.style.fontSize = size + 'px';

    document.getElementById('font-increase')?.addEventListener('click', () => {
      size = Math.min(22, size + 1);
      document.documentElement.style.fontSize = size + 'px';
      localStorage.setItem('fontSize', size);
    });

    document.getElementById('font-decrease')?.addEventListener('click', () => {
      size = Math.max(14, size - 1);
      document.documentElement.style.fontSize = size + 'px';
      localStorage.setItem('fontSize', size);
    });
  }

  // ─── Navbar ───────────────────────────────────────────────
  function initNavbar() {
    const navbar = document.getElementById('navbar');
    if (!navbar) return;

    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 50);
    });

    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          navLinks.forEach(l => l.classList.remove('active'));
          const active = document.querySelector(`.nav-link[href="#${entry.target.id}"]`);
          if (active) active.classList.add('active');
        }
      });
    }, { threshold: 0.4 });

    sections.forEach(s => observer.observe(s));
  }

  // ─── Mobile Menu ──────────────────────────────────────────
  function initMobileMenu() {
    const burger = document.getElementById('burger');
    const mobileMenu = document.getElementById('mobile-menu');
    if (!burger || !mobileMenu) return;

    burger.addEventListener('click', () => {
      const open = mobileMenu.classList.toggle('open');
      burger.setAttribute('aria-expanded', open);
    });

    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // ─── Typing Effect ────────────────────────────────────────
  function initTypingEffect() {
    const el = document.getElementById('typing-text');
    if (!el) return;

    const phrases = [
      'Web Developer',
      'Pentester',
      'Security Enthusiast',
      'WordPress Expert',
      'Shopify Developer',
      'OWASP Practitioner',
    ];

    let phraseIdx = 0, charIdx = 0, deleting = false;

    function tick() {
      const phrase = phrases[phraseIdx];
      if (!deleting) {
        el.textContent = phrase.substring(0, ++charIdx);
        if (charIdx === phrase.length) {
          deleting = true;
          setTimeout(tick, 2000);
          return;
        }
      } else {
        el.textContent = phrase.substring(0, --charIdx);
        if (charIdx === 0) {
          deleting = false;
          phraseIdx = (phraseIdx + 1) % phrases.length;
        }
      }
      setTimeout(tick, deleting ? 60 : 90);
    }
    tick();
  }

  // ─── GSAP Scroll Animations ───────────────────────────────
  function initScrollAnimations() {
    // Double-check elements exist before animating
    const heroName  = document.querySelector('#hero-name');
    const heroTitle = document.querySelector('.hero-title-wrap');

    gsap.registerPlugin(ScrollTrigger);

    // Hero entrance — only animate if elements exist
    if (heroName)  gsap.from('#hero-name',       { opacity: 0, y: 50, duration: 1,   delay: 0.2, ease: 'power3.out' });
    if (heroTitle) gsap.from('.hero-title-wrap',  { opacity: 0, y: 30, duration: 1,   delay: 0.5, ease: 'power3.out' });

    if (document.querySelector('.hero-subtitle'))
      gsap.from('.hero-subtitle', { opacity: 0, y: 20, duration: 1, delay: 0.8, ease: 'power3.out' });

    if (document.querySelector('.hero-cta'))
      gsap.from('.hero-cta', { opacity: 0, y: 20, duration: 1, delay: 1.0, ease: 'power3.out', stagger: 0.15 });

    if (document.querySelector('.hero-badge'))
      gsap.from('.hero-badge', { opacity: 0, scale: 0.8, duration: 0.8, delay: 1.2, ease: 'back.out(1.7)', stagger: 0.1 });

    // Section headings
    gsap.utils.toArray('.section-heading').forEach(el => {
      gsap.from(el, {
        scrollTrigger: { trigger: el, start: 'top 85%' },
        opacity: 0, y: 40, duration: 0.8, ease: 'power3.out'
      });
    });

    // About
    if (document.querySelector('.about-image-wrap')) {
      gsap.from('.about-image-wrap', {
        scrollTrigger: { trigger: '#about', start: 'top 75%' },
        opacity: 0, x: -60, duration: 1, ease: 'power3.out'
      });
    }
    if (document.querySelector('.about-content')) {
      gsap.from('.about-content', {
        scrollTrigger: { trigger: '#about', start: 'top 75%' },
        opacity: 0, x: 60, duration: 1, ease: 'power3.out'
      });
    }

    gsap.utils.toArray('.about-bullet').forEach((el, i) => {
      gsap.from(el, {
        scrollTrigger: { trigger: el, start: 'top 90%' },
        opacity: 0, x: 30, duration: 0.6, delay: i * 0.05, ease: 'power2.out'
      });
    });

    // Skills
    gsap.utils.toArray('.skill-category').forEach((el, i) => {
      gsap.from(el, {
        scrollTrigger: { trigger: el, start: 'top 80%' },
        opacity: 0, y: 40, duration: 0.7, delay: i * 0.1, ease: 'power3.out'
      });
    });

    // Timeline
    gsap.utils.toArray('.timeline-item').forEach((el, i) => {
      gsap.from(el, {
        scrollTrigger: { trigger: el, start: 'top 85%' },
        opacity: 0, x: -50, duration: 0.8, ease: 'power3.out'
      });
    });

    // Projects
    gsap.utils.toArray('.project-card').forEach((el, i) => {
      gsap.from(el, {
        scrollTrigger: { trigger: el, start: 'top 88%' },
        opacity: 0, y: 50, duration: 0.7, delay: i * 0.1, ease: 'power3.out'
      });
    });

    // Education
    if (document.querySelector('.education-card')) {
      gsap.from('.education-card', {
        scrollTrigger: { trigger: '#education', start: 'top 80%' },
        opacity: 0, scale: 0.95, duration: 0.8, ease: 'back.out(1.4)'
      });
    }

    // Contact
    if (document.querySelector('.contact-info')) {
      gsap.from('.contact-info', {
        scrollTrigger: { trigger: '#contact', start: 'top 80%' },
        opacity: 0, x: -40, duration: 0.8, ease: 'power3.out'
      });
    }
    if (document.querySelector('.contact-form')) {
      gsap.from('.contact-form', {
        scrollTrigger: { trigger: '#contact', start: 'top 80%' },
        opacity: 0, x: 40, duration: 0.8, ease: 'power3.out'
      });
    }

    // Stats counter
    gsap.utils.toArray('.stat-number').forEach(el => {
      const target = parseInt(el.getAttribute('data-target'));
      if (!target) return;
      ScrollTrigger.create({
        trigger: el,
        start: 'top 85%',
        onEnter: () => animateCounter(el, target)
      });
    });
  }

  function animateCounter(el, target) {
    let count = 0;
    const step = Math.ceil(target / 60);
    const suffix = el.dataset.suffix || '';
    const timer = setInterval(() => {
      count = Math.min(count + step, target);
      el.textContent = count + suffix;
      if (count >= target) clearInterval(timer);
    }, 25);
  }

  // ─── Skill Progress Bars ──────────────────────────────────
  function initSkillBars() {
    const bars = document.querySelectorAll('.skill-bar-fill');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const bar = entry.target;
          const level = bar.getAttribute('data-level');
          bar.style.width = level + '%';
          observer.unobserve(bar);
        }
      });
    }, { threshold: 0.3 });

    bars.forEach(b => observer.observe(b));
  }

  // ─── Project Card 3D Tilt ─────────────────────────────────
  function initProjectTilt() {
    document.querySelectorAll('.project-card').forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        card.style.transform = `perspective(800px) rotateY(${x * 12}deg) rotateX(${-y * 12}deg) scale(1.03)`;
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(800px) rotateY(0) rotateX(0) scale(1)';
      });
    });
  }

  // ─── Contact Form ─────────────────────────────────────────
  function initContactForm() {
    const form = document.getElementById('contact-form');
    if (!form) return;

    let csrfToken = '';
    fetch('/api/csrf-token')
      .then(r => r.json())
      .then(d => { csrfToken = d.csrfToken; })
      .catch(() => {});

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('.form-submit-btn');
      const status = document.getElementById('form-status');

      const data = {
        name:    form.querySelector('[name="name"]').value.trim(),
        email:   form.querySelector('[name="email"]').value.trim(),
        subject: form.querySelector('[name="subject"]').value.trim(),
        message: form.querySelector('[name="message"]').value.trim(),
      };

      if (!data.name || !data.email || !data.message) {
        showStatus(status, 'Please fill in all required fields.', 'error');
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Sending...';

      try {
        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
          body: JSON.stringify(data),
        });
        const result = await res.json();
        if (result.success) {
          showStatus(status, '✅ Message sent! I\'ll get back to you soon.', 'success');
          form.reset();
        } else {
          showStatus(status, result.message || 'Something went wrong.', 'error');
        }
      } catch {
        showStatus(status, 'Network error. Please try again later.', 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Send Message';
      }
    });
  }

  function showStatus(el, msg, type) {
    if (!el) return;
    el.textContent = msg;
    el.className = 'form-status ' + type;
    setTimeout(() => { el.textContent = ''; el.className = 'form-status'; }, 6000);
  }

  // ─── Floating orbs animation ──────────────────────────────
  function initParticleText() {
    document.querySelectorAll('.orb-bg').forEach(orb => {
      const speed = parseFloat(orb.dataset.speed) || 1;
      let start = null;
      function animOrb(ts) {
        if (!start) start = ts;
        const t = (ts - start) * 0.001 * speed;
        orb.style.transform = `translate(${Math.sin(t * 0.7) * 20}px, ${Math.cos(t * 0.5) * 15}px)`;
        requestAnimationFrame(animOrb);
      }
      requestAnimationFrame(animOrb);
    });
  }

  // ─── Smooth scroll ────────────────────────────────────────
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

})();

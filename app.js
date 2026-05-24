/* ================================================================
   POWDER COATING® — app.js
   Full interactive layer: spray scroll animation, Three.js, AOS,
   cursor, nav, tabs, gallery, color picker, counters, testimonials
   ================================================================ */

'use strict';

// ────────────────────────────────────────────────────────────────
// CONSTANTS & STATE
// ────────────────────────────────────────────────────────────────
const FRAME_COUNT = 80;
const sprayFrames = new Array(FRAME_COUNT).fill(null);
let framesLoaded = 0;
let currentFrame = 0;

// ────────────────────────────────────────────────────────────────
// PRELOADER
// ────────────────────────────────────────────────────────────────
function initPreloader() {
  const preloader = document.getElementById('preloader');
  if (!preloader) return;

  const bar = document.getElementById('preloaderProgress');

  function setProgress(pct) {
    if (bar) bar.style.width = (pct * 100).toFixed(1) + '%';
  }

  function done() {
    preloader.classList.add('hidden');
    setTimeout(() => preloader.remove(), 700);
    revealHero();
  }

  if (document.getElementById('sprayCanvas')) {
    preloadFrames(setProgress, done);
  } else {
    setProgress(1);
    setTimeout(done, 500);
  }
}

// ────────────────────────────────────────────────────────────────
// FRAME PRE-LOADER
// ────────────────────────────────────────────────────────────────
function preloadFrames(onProgress, onComplete) {
  for (let i = 0; i < FRAME_COUNT; i++) {
    const img = new Image();
    const num = String(i + 1).padStart(3, '0');
    img.src = `assets/spray/frame-${num}.png`;
    sprayFrames[i] = img;
    img.onload = img.onerror = () => {
      framesLoaded++;
      onProgress(framesLoaded / FRAME_COUNT);
      if (framesLoaded === FRAME_COUNT) onComplete();
    };
  }
}

// ────────────────────────────────────────────────────────────────
// SPRAY GUN SCROLL ANIMATION
// ────────────────────────────────────────────────────────────────
function initSprayAnimation() {
  const canvas = document.getElementById('sprayCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const heroSection = document.getElementById('heroSection');

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    drawFrame(currentFrame);
  }

  function drawFrame(index) {
    const img = sprayFrames[Math.max(0, Math.min(FRAME_COUNT - 1, index))];
    if (!img || !img.complete || !img.naturalWidth) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const scale = Math.max(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
    const x = (canvas.width - img.naturalWidth * scale) / 2;
    const y = (canvas.height - img.naturalHeight * scale) / 2;
    ctx.drawImage(img, x, y, img.naturalWidth * scale, img.naturalHeight * scale);
  }

  function onScroll() {
    if (!heroSection) return;
    const scrollable = heroSection.offsetHeight - window.innerHeight;
    const progress = Math.max(0, Math.min(1, window.scrollY / scrollable));
    currentFrame = Math.round(progress * (FRAME_COUNT - 1));
    drawFrame(currentFrame);

    // Fade out hero content as user scrolls
    const heroContent = document.getElementById('heroContent');
    if (heroContent) {
      const fade = Math.max(0, 1 - progress * 3);
      heroContent.style.opacity = fade;
      heroContent.style.transform = `translate(-50%, calc(-50% + ${progress * -60}px))`;
    }

    const scrollIndicator = document.getElementById('scrollIndicator');
    if (scrollIndicator) {
      scrollIndicator.style.opacity = Math.max(0, 1 - progress * 6);
    }

    const heroOverlay = document.querySelector('.hero-overlay');
    if (heroOverlay) {
      heroOverlay.style.opacity = Math.max(0.4, 1 - progress * 0.6);
    }
  }

  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('scroll', onScroll, { passive: true });
  drawFrame(0);
}

// ────────────────────────────────────────────────────────────────
// THREE.JS — POWDER PARTICLE BACKGROUND
// ────────────────────────────────────────────────────────────────
function initThreeJS() {
  const canvas = document.getElementById('threeCanvas');
  if (!canvas || typeof THREE === 'undefined') return;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 55;

  // Powder particle cloud
  const GEO = new THREE.BufferGeometry();
  const COUNT = 4000;
  const positions = new Float32Array(COUNT * 3);
  const colors = new Float32Array(COUNT * 3);
  const sizes = new Float32Array(COUNT);

  const palette = [
    new THREE.Color('#B91C1C'),
    new THREE.Color('#DC2626'),
    new THREE.Color('#F59E0B'),
    new THREE.Color('#ffffff'),
    new THREE.Color('#991B1B'),
  ];

  for (let i = 0; i < COUNT; i++) {
    positions[i * 3]     = (Math.random() - 0.5) * 140;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 90;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 70;
    const c = palette[Math.floor(Math.random() * palette.length)];
    colors[i * 3]     = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
    sizes[i] = Math.random() * 0.8 + 0.2;
  }

  GEO.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  GEO.setAttribute('color',    new THREE.BufferAttribute(colors,    3));
  GEO.setAttribute('size',     new THREE.BufferAttribute(sizes,     1));

  const MAT = new THREE.PointsMaterial({
    size: 0.35,
    vertexColors: true,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });

  const particles = new THREE.Points(GEO, MAT);
  scene.add(particles);

  let mouseX = 0, mouseY = 0;
  let targetRotX = 0, targetRotY = 0;

  window.addEventListener('mousemove', e => {
    mouseX = (e.clientX / window.innerWidth  - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });

  const pos = GEO.attributes.position.array;
  const originalY = Float32Array.from(pos).filter((_, i) => i % 3 === 1);
  let t = 0;

  (function animate() {
    requestAnimationFrame(animate);
    t += 0.008;

    targetRotY += (mouseX * 0.003 - targetRotY) * 0.05;
    targetRotX += (mouseY * 0.002 - targetRotX) * 0.05;
    particles.rotation.y = targetRotY + t * 0.04;
    particles.rotation.x = targetRotX;

    // Gentle float
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3 + 1] = originalY[i] + Math.sin(t + i * 0.3) * 0.6;
    }
    GEO.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
  })();
}

// ────────────────────────────────────────────────────────────────
// HERO REVEAL
// ────────────────────────────────────────────────────────────────
function revealHero() {
  const els = [
    document.querySelector('.hero-badge'),
    document.querySelector('.hero-line:first-child'),
    document.querySelector('.hero-line:last-child'),
    document.querySelector('.hero-subtitle'),
    document.querySelector('.hero-actions'),
  ].filter(Boolean);

  els.forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(28px)';
    el.style.transition = `opacity 0.75s ease ${i * 0.14}s, transform 0.75s ease ${i * 0.14}s`;
    requestAnimationFrame(() => {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    });
  });
}

// ────────────────────────────────────────────────────────────────
// CUSTOM CURSOR
// ────────────────────────────────────────────────────────────────
function initCursor() {
  const dot  = document.getElementById('cursorDot');
  const ring = document.getElementById('cursorRing');
  if (!dot || !ring) return;

  let mx = 0, my = 0, rx = 0, ry = 0;

  document.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    dot.style.left = mx + 'px';
    dot.style.top  = my + 'px';
  });

  (function lerpRing() {
    rx += (mx - rx) * 0.13;
    ry += (my - ry) * 0.13;
    ring.style.left = rx + 'px';
    ring.style.top  = ry + 'px';
    requestAnimationFrame(lerpRing);
  })();

  document.querySelectorAll('a, button, [role="button"]').forEach(el => {
    el.addEventListener('mouseenter', () => ring.classList.add('hovering'));
    el.addEventListener('mouseleave', () => ring.classList.remove('hovering'));
  });
}

// ────────────────────────────────────────────────────────────────
// NAVIGATION
// ────────────────────────────────────────────────────────────────
function initNav() {
  const nav = document.getElementById('mainNav');
  if (!nav) return;

  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 60);
  }, { passive: true });

  // Set active link based on current page
  const page = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('active', link.getAttribute('href') === page);
  });
  document.querySelectorAll('.mobile-link').forEach(link => {
    link.classList.toggle('active', link.getAttribute('href') === page);
  });
}

// ────────────────────────────────────────────────────────────────
// MOBILE MENU
// ────────────────────────────────────────────────────────────────
function initMobileMenu() {
  const burger  = document.getElementById('navHamburger');
  const overlay = document.getElementById('mobileMenuOverlay');
  if (!burger || !overlay) return;

  function close() {
    burger.classList.remove('active');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  burger.addEventListener('click', () => {
    const open = overlay.classList.toggle('active');
    burger.classList.toggle('active', open);
    document.body.style.overflow = open ? 'hidden' : '';
  });

  overlay.querySelectorAll('.mobile-link, .mobile-cta').forEach(l => l.addEventListener('click', close));
}

// ────────────────────────────────────────────────────────────────
// AOS — scroll-reveal
// ────────────────────────────────────────────────────────────────
function initAOS() {
  const items = document.querySelectorAll('[data-aos]');
  if (!items.length) return;

  items.forEach(el => {
    const type  = el.dataset.aos;
    const delay = el.dataset.delay ? `${el.dataset.delay}ms` : '0ms';
    el.style.opacity = '0';
    el.style.transitionDelay = delay;
    el.style.transition = 'opacity 0.7s ease, transform 0.7s ease';
    if (type === 'fade-up')    el.style.transform = 'translateY(40px)';
    if (type === 'fade-right') el.style.transform = 'translateX(-40px)';
    if (type === 'fade-left')  el.style.transform = 'translateX(40px)';
  });

  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.style.opacity = '1';
        e.target.style.transform = 'none';
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });

  items.forEach(el => io.observe(el));
}

// ────────────────────────────────────────────────────────────────
// COUNTERS
// ────────────────────────────────────────────────────────────────
function initCounters() {
  const els = document.querySelectorAll('.counter');
  if (!els.length) return;

  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      const target = parseInt(e.target.dataset.target);
      let cur = 0;
      const step = target / 60;
      const timer = setInterval(() => {
        cur = Math.min(cur + step, target);
        e.target.textContent = Math.floor(cur);
        if (cur >= target) clearInterval(timer);
      }, 16);
    });
  }, { threshold: 0.5 });

  els.forEach(el => io.observe(el));
}

// ────────────────────────────────────────────────────────────────
// PROCESS CARDS stagger
// ────────────────────────────────────────────────────────────────
function initProcessCards() {
  const cards = document.querySelectorAll('.process-card');
  if (!cards.length) return;

  cards.forEach((card, i) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(48px)';
    card.style.transition = `opacity 0.65s ease ${i * 0.15}s, transform 0.65s ease ${i * 0.15}s`;
  });

  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.style.opacity = '1';
        e.target.style.transform = 'none';
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.2 });

  cards.forEach(card => io.observe(card));
}

// ────────────────────────────────────────────────────────────────
// 3D TILT on cards
// ────────────────────────────────────────────────────────────────
function initTilt() {
  document.querySelectorAll('.feature-card, .mv-card, .stat-item').forEach(card => {
    card.addEventListener('mousemove', e => {
      const r  = card.getBoundingClientRect();
      const x  = ((e.clientX - r.left) / r.width  - 0.5) * 18;
      const y  = ((e.clientY - r.top)  / r.height - 0.5) * -18;
      card.style.transform = `perspective(700px) rotateX(${y}deg) rotateY(${x}deg) scale(1.04)`;
      card.style.transition = 'transform 0.1s';
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
      card.style.transition = 'transform 0.5s ease';
    });
  });
}

// ────────────────────────────────────────────────────────────────
// TESTIMONIALS SLIDER
// ────────────────────────────────────────────────────────────────
function initTestimonialSlider() {
  const slider = document.getElementById('testimonialsSlider');
  if (!slider) return;

  const cards = Array.from(slider.querySelectorAll('.testimonial-card'));
  if (cards.length < 2) return;

  let current = 0;

  // Set wrapper to relative + fixed height
  slider.style.position = 'relative';
  const firstCard = cards[0];
  cards.forEach((card, i) => {
    if (i > 0) {
      card.style.position = 'absolute';
      card.style.top = '0'; card.style.left = '0'; card.style.right = '0';
    }
    card.style.transition = 'opacity 0.65s ease, transform 0.65s ease';
    card.style.opacity = i === 0 ? '1' : '0';
    card.style.transform = i === 0 ? 'translateX(0) scale(1)' : 'translateX(60px) scale(0.95)';
    card.style.pointerEvents = i === 0 ? 'auto' : 'none';
  });

  function show(idx) {
    cards[current].style.opacity = '0';
    cards[current].style.transform = 'translateX(-40px) scale(0.96)';
    cards[current].style.pointerEvents = 'none';
    current = idx;
    cards[current].style.opacity = '1';
    cards[current].style.transform = 'translateX(0) scale(1)';
    cards[current].style.pointerEvents = 'auto';
  }

  setInterval(() => show((current + 1) % cards.length), 4200);
}

// ────────────────────────────────────────────────────────────────
// SERVICE TABS
// ────────────────────────────────────────────────────────────────
function initServiceTabs() {
  const tabs   = document.querySelectorAll('.service-tab-btn');
  const panels = document.querySelectorAll('.service-panel');
  if (!tabs.length) return;

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t   => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const panel = document.getElementById(`panel-${tab.dataset.tab}`);
      if (panel) panel.classList.add('active');
    });
  });
}

// ────────────────────────────────────────────────────────────────
// COLOR PICKER
// ────────────────────────────────────────────────────────────────
function initColorPicker() {
  const swatchContainer = document.getElementById('colorSwatches');
  if (!swatchContainer) return;

  const previewSurface = document.getElementById('colorPreviewSurface');
  const nameEl         = document.getElementById('colorName');
  const codeEl         = document.getElementById('colorCode');

  const palette = [
    { name: 'Crimson Red',     code: 'RAL 3002', hex: '#C0392B' },
    { name: 'Signal Orange',   code: 'RAL 2009', hex: '#E65100' },
    { name: 'Safety Yellow',   code: 'RAL 1003', hex: '#F5A623' },
    { name: 'Pure White',      code: 'RAL 9010', hex: '#F5F5F0' },
    { name: 'Jet Black',       code: 'RAL 9005', hex: '#0D0D0D' },
    { name: 'Graphite Grey',   code: 'RAL 7024', hex: '#474A51' },
    { name: 'Sky Blue',        code: 'RAL 5015', hex: '#2980B9' },
    { name: 'Steel Blue',      code: 'RAL 5011', hex: '#234E70' },
    { name: 'Forest Green',    code: 'RAL 6001', hex: '#2E7D32' },
    { name: 'Olive Drab',      code: 'RAL 6003', hex: '#7A8450' },
    { name: 'Sandstone Beige', code: 'RAL 1015', hex: '#E8D5A3' },
    { name: 'Bronze Metallic', code: 'Special',  hex: '#8C5523' },
    { name: 'Champagne Gold',  code: 'Special',  hex: '#D4AF70' },
    { name: 'Satin Silver',    code: 'Special',  hex: '#B8BFBE' },
    { name: 'Copper Rush',     code: 'Special',  hex: '#B87333' },
    { name: 'Pearl Ivory',     code: 'Special',  hex: '#F3EAD3' },
  ];

  function select(color, swatch) {
    swatchContainer.querySelectorAll('.c-swatch').forEach(s => s.style.outline = '');
    swatch.style.outline = '3px solid #fff';
    swatch.style.outlineOffset = '2px';
    if (previewSurface) {
      previewSurface.style.background = `linear-gradient(135deg, ${color.hex} 0%, ${color.hex}aa 100%)`;
      previewSurface.style.boxShadow  = `0 0 40px ${color.hex}66`;
    }
    if (nameEl) nameEl.textContent = color.name;
    if (codeEl) codeEl.textContent = color.code;
  }

  palette.forEach((color, i) => {
    const swatch = document.createElement('div');
    swatch.className = 'c-swatch';
    swatch.title = `${color.name} — ${color.code}`;
    swatch.style.cssText = `
      width: 42px; height: 42px; border-radius: 50%;
      background: ${color.hex}; cursor: none;
      border: 2px solid rgba(255,255,255,0.15);
      transition: transform 0.25s, outline 0.2s;
      flex-shrink: 0;
    `;
    swatch.addEventListener('mouseenter', () => { swatch.style.transform = 'scale(1.2)'; });
    swatch.addEventListener('mouseleave', () => { swatch.style.transform = ''; });
    swatch.addEventListener('click', () => select(color, swatch));
    swatchContainer.appendChild(swatch);
    if (i === 0) select(color, swatch);
  });
}

// ────────────────────────────────────────────────────────────────
// GALLERY
// ────────────────────────────────────────────────────────────────
function initGallery() {
  const grid = document.getElementById('galleryGrid');
  if (!grid) return;

  const items = [
    { cat: 'industrial', label: 'Steel Structures',      icon: 'fa-industry',       color: '#1a2a3a', accent: '#2980b9' },
    { cat: 'industrial', label: 'Cable Trays',           icon: 'fa-network-wired',  color: '#0d1f2d', accent: '#1e8bc3' },
    { cat: 'industrial', label: 'Electrical Enclosures', icon: 'fa-bolt',           color: '#2c2000', accent: '#f59e0b' },
    { cat: 'industrial', label: 'Utility Equipment',     icon: 'fa-cogs',           color: '#1c1c2e', accent: '#9b59b6' },
    { cat: 'industrial', label: 'Power Towers',          icon: 'fa-tower-broadcast',color: '#001a33', accent: '#3498db' },
    { cat: 'industrial', label: 'Pipe Supports',         icon: 'fa-pipe-section',   color: '#1a1a1a', accent: '#95a5a6' },
    { cat: 'automotive', label: 'Wheel Rims',            icon: 'fa-circle-dot',     color: '#2c0000', accent: '#e74c3c' },
    { cat: 'automotive', label: 'Chassis Parts',         icon: 'fa-car',            color: '#1a0000', accent: '#c0392b' },
    { cat: 'automotive', label: 'Roll Bars',             icon: 'fa-shield-alt',     color: '#3d0000', accent: '#e53935' },
    { cat: 'custom',     label: 'Custom Fabrication',    icon: 'fa-paint-brush',    color: '#001a2c', accent: '#0288d1' },
    { cat: 'custom',     label: 'Architectural Metal',   icon: 'fa-building',       color: '#0a2010', accent: '#27ae60' },
    { cat: 'decor',      label: 'Garden Furniture',      icon: 'fa-chair',          color: '#0d2b0d', accent: '#2ecc71' },
    { cat: 'decor',      label: 'Lighting Fixtures',     icon: 'fa-lightbulb',      color: '#1a1400', accent: '#f1c40f' },
    { cat: 'decor',      label: 'Staircase Railings',    icon: 'fa-stairs',         color: '#1a0a00', accent: '#e67e22' },
    { cat: 'custom',     label: 'Security Gates',        icon: 'fa-door-closed',    color: '#0a0a20', accent: '#8e44ad' },
    { cat: 'automotive', label: 'Motorcycle Frames',     icon: 'fa-motorcycle',     color: '#1a0a00', accent: '#d35400' },
  ];

  items.forEach(item => {
    const div = document.createElement('div');
    div.className = 'gallery-item';
    div.dataset.category = item.cat;
    div.innerHTML = `
      <div class="gallery-card" style="
        background: linear-gradient(135deg, ${item.color} 60%, ${item.accent}33 100%);
        border: 1px solid ${item.accent}44;
        border-radius: 16px;
        aspect-ratio: 4/3;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        position: relative;
        overflow: hidden;
        transition: transform 0.35s, box-shadow 0.35s;
        cursor: pointer;
      ">
        <div style="
          width: 80px; height: 80px;
          background: ${item.accent}22;
          border: 1px solid ${item.accent}55;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 16px;
          transition: transform 0.3s;
        " class="gi-icon-wrap">
          <i class="fas ${item.icon}" style="font-size: 2rem; color: ${item.accent};"></i>
        </div>
        <span style="color: rgba(255,255,255,0.9); font-weight: 600; font-size: 0.95rem; text-align:center; padding: 0 12px;">${item.label}</span>
        <div style="
          position: absolute; inset:0;
          background: linear-gradient(135deg, ${item.accent}0a, ${item.accent}22);
          opacity: 0; transition: opacity 0.3s;
        " class="gi-hover"></div>
      </div>`;

    const card = div.querySelector('.gallery-card');
    const wrap = div.querySelector('.gi-icon-wrap');
    const hover = div.querySelector('.gi-hover');
    card.addEventListener('mouseenter', () => {
      card.style.transform = 'translateY(-8px) scale(1.02)';
      card.style.boxShadow = `0 24px 48px ${item.accent}44`;
      wrap.style.transform = 'scale(1.15) rotate(5deg)';
      hover.style.opacity = '1';
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
      card.style.boxShadow = '';
      wrap.style.transform = '';
      hover.style.opacity = '0';
    });
    card.addEventListener('click', () => {
      if (typeof window.openLightbox === 'function') window.openLightbox(item);
    });

    grid.appendChild(div);
  });

  // Filter
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;
      grid.querySelectorAll('.gallery-item').forEach(item => {
        const match = filter === 'all' || item.dataset.category === filter;
        item.style.opacity = match ? '1' : '0';
        item.style.transform = match ? '' : 'scale(0.9)';
        item.style.pointerEvents = match ? 'auto' : 'none';
        item.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        item.style.display = 'block';
      });
    });
  });
}

// ────────────────────────────────────────────────────────────────
// CONTACT FORM
// ────────────────────────────────────────────────────────────────
function initContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;

  form.addEventListener('submit', e => {
    e.preventDefault();
    const btn = form.querySelector('[type="submit"]');
    btn.innerHTML = '<span>Sending…</span> <i class="fas fa-spinner fa-spin"></i>';
    btn.disabled = true;
    setTimeout(() => {
      btn.innerHTML = '<span>Message Sent!</span> <i class="fas fa-check"></i>';
      btn.style.background = 'linear-gradient(135deg, #27ae60, #2ecc71)';
      form.reset();
      setTimeout(() => {
        btn.innerHTML = '<span>Send Message</span> <i class="fas fa-paper-plane"></i>';
        btn.style.background = '';
        btn.disabled = false;
      }, 3500);
    }, 1500);
  });
}

// ────────────────────────────────────────────────────────────────
// BACK TO TOP
// ────────────────────────────────────────────────────────────────
function initBackToTop() {
  const btn = document.getElementById('backToTop');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 500);
  }, { passive: true });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

// ────────────────────────────────────────────────────────────────
// MARQUEE duplicate for seamless loop
// ────────────────────────────────────────────────────────────────
function initMarquee() {
  const content = document.querySelector('.marquee-content');
  if (!content) return;
  content.parentElement.appendChild(content.cloneNode(true));
}

// ────────────────────────────────────────────────────────────────
// SMOOTH PAGE TRANSITIONS (View Transitions API)
// ────────────────────────────────────────────────────────────────
function initPageTransitions() {
  if (!document.startViewTransition) return;
  document.querySelectorAll('a[href$=".html"]').forEach(link => {
    link.addEventListener('click', e => {
      const href = link.getAttribute('href');
      if (!href || link.target === '_blank') return;
      e.preventDefault();
      document.startViewTransition(() => {
        window.location.href = href;
      });
    });
  });
}

// ────────────────────────────────────────────────────────────────
// MAIN INIT
// ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initPreloader();
  initCursor();
  initNav();
  initMobileMenu();
  initAOS();
  initBackToTop();
  initTilt();
  initMarquee();
  initPageTransitions();

  if (document.getElementById('sprayCanvas')) {
    initSprayAnimation();
    initThreeJS();
    initCounters();
    initProcessCards();
    initTestimonialSlider();
  }
  if (document.getElementById('colorSwatches')) {
    initColorPicker();
    initServiceTabs();
  }
  if (document.getElementById('galleryGrid')) {
    initGallery();
  }
  if (document.getElementById('contactForm')) {
    initContactForm();
  }
  if (document.querySelector('.counter') && !document.getElementById('sprayCanvas')) {
    initCounters();
  }
});

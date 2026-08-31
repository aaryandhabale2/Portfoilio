'use strict';

// Helper shortcuts
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

/* ═══════════════════════════════════════════════════════════
   0. PRELOADER
   ═══════════════════════════════════════════════════════════ */
window.addEventListener('load', () => {
  const loader = $('#loader');
  if (loader) {
    setTimeout(() => {
      loader.classList.add('loaded');
    }, 350);
  }
});

/* ═══════════════════════════════════════════════════════════
   1. NAVIGATION & SCROLL SPY
   ═══════════════════════════════════════════════════════════ */
(function initNav() {
  const navbar = $('#navbar');
  const navLinks = $$('.nav-link');
  const sections = $$('section[id]');
  const hamburger = $('#hamburger');
  const navMenu = $('#nav-links');

  // Sticky navbar
  window.addEventListener('scroll', () => {
    if (navbar) {
      navbar.classList.toggle('scrolled', window.scrollY > 25);
    }
  }, { passive: true });

  // Scroll spy
  if (sections.length && navLinks.length) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          navLinks.forEach(link => {
            link.classList.remove('active-link');
            if (link.getAttribute('href') === `#${entry.target.id}`) {
              link.classList.add('active-link');
            }
          });
        }
      });
    }, { rootMargin: '-30% 0px -60% 0px' });

    sections.forEach(sec => observer.observe(sec));
  }

  // Hamburger toggle
  if (hamburger && navMenu) {
    hamburger.addEventListener('click', () => {
      const open = navMenu.classList.toggle('open');
      hamburger.setAttribute('aria-expanded', open);
      const spans = $$('span', hamburger);
      if (open) {
        spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
        spans[1].style.opacity = '0';
        spans[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
      } else {
        spans.forEach(s => { s.style.transform = ''; s.style.opacity = ''; });
      }
    });

    // Close on link click
    $$('.nav-link', navMenu).forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
        $$('span', hamburger).forEach(s => { s.style.transform = ''; s.style.opacity = ''; });
      });
    });
  }
})();

/* ═══════════════════════════════════════════════════════════
   2. HERO 3D WIREFRAME GLOBE (Three.js - White & Violet)
   ═══════════════════════════════════════════════════════════ */
(function initHeroGlobe() {
  if (typeof THREE === 'undefined') return;
  const canvas = $('#globe-canvas');
  if (!canvas) return;

  const container = $('#globe-container');
  const getW = () => (container ? container.clientWidth : 450);
  const getH = () => (container ? container.clientHeight : 450);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, getW() / getH(), 0.1, 1000);
  camera.position.z = 24;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(getW(), getH());

  const globeGroup = new THREE.Group();
  scene.add(globeGroup);

  // Core Wireframe Sphere
  const sphereGeo = new THREE.SphereGeometry(7.5, 24, 24);
  const sphereMat = new THREE.MeshBasicMaterial({
    color: 0x7c3aed,
    wireframe: true,
    transparent: true,
    opacity: 0.28
  });
  const sphere = new THREE.Mesh(sphereGeo, sphereMat);
  globeGroup.add(sphere);

  // Inner Core Icosahedron
  const icoGeo = new THREE.IcosahedronGeometry(5.2, 1);
  const icoMat = new THREE.MeshBasicMaterial({
    color: 0x4f46e5,
    wireframe: true,
    transparent: true,
    opacity: 0.35
  });
  const innerIco = new THREE.Mesh(icoGeo, icoMat);
  globeGroup.add(innerIco);

  // Surface Node Points
  const particleCount = 280;
  const pGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(particleCount * 3);
  const pColors = new Float32Array(particleCount * 3);
  const color1 = new THREE.Color(0x7c3aed); // Violet
  const color2 = new THREE.Color(0x4f46e5); // Indigo
  const color3 = new THREE.Color(0xd946ef); // Fuchsia

  for (let i = 0; i < particleCount; i++) {
    const phi = Math.acos(-1 + (2 * i) / particleCount);
    const theta = Math.sqrt(particleCount * Math.PI) * phi;
    const r = 7.6 + (Math.random() - 0.5) * 0.4;

    const x = r * Math.cos(theta) * Math.sin(phi);
    const y = r * Math.sin(theta) * Math.sin(phi);
    const z = r * Math.cos(phi);

    pPos[i * 3] = x;
    pPos[i * 3 + 1] = y;
    pPos[i * 3 + 2] = z;

    const mixed = Math.random() > 0.6 ? color3 : (Math.random() > 0.3 ? color1 : color2);
    pColors[i * 3] = mixed.r;
    pColors[i * 3 + 1] = mixed.g;
    pColors[i * 3 + 2] = mixed.b;
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute('color', new THREE.BufferAttribute(pColors, 3));

  const pMat = new THREE.PointsMaterial({
    size: 0.42,
    vertexColors: true,
    transparent: true,
    opacity: 0.95
  });
  const nodes = new THREE.Points(pGeo, pMat);
  globeGroup.add(nodes);

  // Rotating rings
  const ringGeo = new THREE.RingGeometry(9.8, 10.0, 64);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x7c3aed,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.32
  });
  const ring1 = new THREE.Mesh(ringGeo, ringMat);
  ring1.rotation.x = Math.PI / 2.3;
  globeGroup.add(ring1);

  // Interactive mouse drag & parallax
  let isDragging = false;
  let prevMouseX = 0, prevMouseY = 0;
  let targetRotX = 0.2, targetRotY = 0;

  canvas.addEventListener('mousedown', e => {
    isDragging = true;
    prevMouseX = e.clientX;
    prevMouseY = e.clientY;
  });

  window.addEventListener('mouseup', () => { isDragging = false; });

  window.addEventListener('mousemove', e => {
    if (isDragging) {
      const deltaX = e.clientX - prevMouseX;
      const deltaY = e.clientY - prevMouseY;
      targetRotY += deltaX * 0.008;
      targetRotX += deltaY * 0.008;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    }
  });

  // Touch support
  canvas.addEventListener('touchstart', e => {
    if (e.touches.length === 1) {
      isDragging = true;
      prevMouseX = e.touches[0].clientX;
      prevMouseY = e.touches[0].clientY;
    }
  }, { passive: true });

  window.addEventListener('touchend', () => { isDragging = false; });

  window.addEventListener('touchmove', e => {
    if (isDragging && e.touches.length === 1) {
      const deltaX = e.touches[0].clientX - prevMouseX;
      const deltaY = e.touches[0].clientY - prevMouseY;
      targetRotY += deltaX * 0.008;
      targetRotX += deltaY * 0.008;
      prevMouseX = e.touches[0].clientX;
      prevMouseY = e.touches[0].clientY;
    }
  }, { passive: true });

  // Animation Loop
  const clock = new THREE.Clock();
  (function animate() {
    requestAnimationFrame(animate);

    if (!isDragging) {
      targetRotY += 0.006;
      targetRotX = Math.sin(clock.getElapsedTime() * 0.5) * 0.2;
    }

    globeGroup.rotation.y += (targetRotY - globeGroup.rotation.y) * 0.08;
    globeGroup.rotation.x += (targetRotX - globeGroup.rotation.x) * 0.08;
    innerIco.rotation.y -= 0.009;
    innerIco.rotation.z += 0.004;

    renderer.render(scene, camera);
  })();

  // Responsive resize
  window.addEventListener('resize', () => {
    if (!container) return;
    const w = getW();
    const h = getH();
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });
})();

/* ═══════════════════════════════════════════════════════════
   3. SKILLS 3D CONSTELLATION SPHERE (Three.js - White & Violet)
   ═══════════════════════════════════════════════════════════ */
(function initSkillsSphere() {
  if (typeof THREE === 'undefined') return;
  const canvas = $('#skills-canvas');
  if (!canvas) return;

  const wrap = $('#skills-sphere-wrap');
  const getW = () => (wrap ? wrap.clientWidth : 400);
  const getH = () => (wrap ? wrap.clientHeight : 400);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, getW() / getH(), 0.1, 500);
  camera.position.z = 20;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(getW(), getH());

  const sphereGroup = new THREE.Group();
  scene.add(sphereGroup);

  // Outer wireframe octahedron
  const octGeo = new THREE.OctahedronGeometry(6.8, 2);
  const octMat = new THREE.MeshBasicMaterial({
    color: 0x7c3aed,
    wireframe: true,
    transparent: true,
    opacity: 0.3
  });
  const octMesh = new THREE.Mesh(octGeo, octMat);
  sphereGroup.add(octMesh);

  // Connecting lines
  const count = 36;
  const pts = [];
  for (let i = 0; i < count; i++) {
    const phi = Math.acos(-1 + (2 * i) / count);
    const theta = Math.sqrt(count * Math.PI) * phi;
    const r = 6.2 + (Math.random() - 0.5) * 0.8;
    pts.push(new THREE.Vector3(
      r * Math.cos(theta) * Math.sin(phi),
      r * Math.sin(theta) * Math.sin(phi),
      r * Math.cos(phi)
    ));
  }

  // Constellation connecting lines
  const lineMat = new THREE.LineBasicMaterial({
    color: 0x4f46e5,
    transparent: true,
    opacity: 0.35
  });
  const lineGeo = new THREE.BufferGeometry();
  const linePos = [];
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      if (pts[i].distanceTo(pts[j]) < 4.2) {
        linePos.push(pts[i].x, pts[i].y, pts[i].z);
        linePos.push(pts[j].x, pts[j].y, pts[j].z);
      }
    }
  }
  lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePos, 3));
  const lineMesh = new THREE.LineSegments(lineGeo, lineMat);
  sphereGroup.add(lineMesh);

  // Glow points
  const pGeo = new THREE.BufferGeometry().setFromPoints(pts);
  const pMat = new THREE.PointsMaterial({
    color: 0x7c3aed,
    size: 0.55,
    transparent: true,
    opacity: 0.95
  });
  const pMesh = new THREE.Points(pGeo, pMat);
  sphereGroup.add(pMesh);

  // Interaction
  let isDragging = false;
  let prevX = 0, prevY = 0;
  let targetRotX = 0, targetRotY = 0;

  canvas.addEventListener('mousedown', e => {
    isDragging = true;
    prevX = e.clientX;
    prevY = e.clientY;
  });
  window.addEventListener('mouseup', () => { isDragging = false; });
  window.addEventListener('mousemove', e => {
    if (isDragging) {
      targetRotY += (e.clientX - prevX) * 0.008;
      targetRotX += (e.clientY - prevY) * 0.008;
      prevX = e.clientX;
      prevY = e.clientY;
    }
  });

  (function animate() {
    requestAnimationFrame(animate);
    if (!isDragging) {
      targetRotY += 0.008;
      targetRotX += 0.003;
    }
    sphereGroup.rotation.y += (targetRotY - sphereGroup.rotation.y) * 0.07;
    sphereGroup.rotation.x += (targetRotX - sphereGroup.rotation.x) * 0.07;
    renderer.render(scene, camera);
  })();

  window.addEventListener('resize', () => {
    if (!wrap) return;
    const w = getW();
    const h = getH();
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });
})();

/* ═══════════════════════════════════════════════════════════
   4. PROJECTS CAROUSEL & FILTERING
   ═══════════════════════════════════════════════════════════ */
(function initProjects() {
  const trackWrap = $('.projects-track-wrap');
  const prevBtn = $('#proj-prev');
  const nextBtn = $('#proj-next');
  const filterBtns = $$('.filter-btn');
  const projectCards = $$('.project-card');

  // Carousel Next/Prev buttons
  if (trackWrap && prevBtn && nextBtn) {
    const scrollAmount = 380;
    prevBtn.addEventListener('click', () => {
      trackWrap.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    });
    nextBtn.addEventListener('click', () => {
      trackWrap.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    });
  }

  // Category Filtering
  if (filterBtns.length && projectCards.length) {
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const filter = btn.getAttribute('data-filter');

        projectCards.forEach(card => {
          const category = card.getAttribute('data-category');
          const isMatch = filter === 'all' || category === filter;

          if (isMatch) {
            card.style.display = 'flex';
            requestAnimationFrame(() => {
              card.style.opacity = '1';
              card.style.transform = 'scale(1)';
            });
          } else {
            card.style.opacity = '0';
            card.style.transform = 'scale(0.9)';
            setTimeout(() => {
              if (card.style.opacity === '0') {
                card.style.display = 'none';
              }
            }, 300);
          }
        });
      });
    });
  }

  // 3D Tilt effect on project cards
  projectCards.forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `perspective(800px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg) translateY(-6px)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(800px) rotateY(0deg) rotateX(0deg) translateY(0)';
    });
  });
})();

/* ═══════════════════════════════════════════════════════════
   5. DIGITAL UNIVERSE / SOLAR SYSTEM INTERACTION
   ═══════════════════════════════════════════════════════════ */
(function initUniverse() {
  const solarSystem = $('#solar-system');
  const tooltip = $('#planet-tooltip');
  const planets = $$('.planet');

  if (!solarSystem || !tooltip) return;

  planets.forEach(planet => {
    const label = planet.getAttribute('data-label');
    if (!label) return;

    planet.addEventListener('mouseenter', e => {
      tooltip.textContent = label;
      tooltip.classList.add('visible');
      const orbit = planet.closest('.planet-orbit');
      if (orbit) orbit.style.animationPlayState = 'paused';
    });

    planet.addEventListener('mousemove', e => {
      const rect = solarSystem.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      tooltip.style.left = `${x}px`;
      tooltip.style.top = `${y - 15}px`;
    });

    planet.addEventListener('mouseleave', () => {
      tooltip.classList.remove('visible');
      const orbit = planet.closest('.planet-orbit');
      if (orbit) orbit.style.animationPlayState = 'running';
    });
  });
})();

/* ═══════════════════════════════════════════════════════════
   6. GITHUB CONTRIBUTION HEATMAP GENERATOR
   ═══════════════════════════════════════════════════════════ */
(function initGithubChart() {
  const chart = $('#github-chart');
  if (!chart) return;
  chart.innerHTML = '';

  // Generate 80 realistic activity cells (4 rows x 20 cols)
  const cellCount = 80;
  for (let i = 0; i < cellCount; i++) {
    const cell = document.createElement('div');
    cell.className = 'gh-cell';

    const rand = Math.random();
    if (rand > 0.85) {
      cell.classList.add('gh-lvl-4');
    } else if (rand > 0.65) {
      cell.classList.add('gh-lvl-3');
    } else if (rand > 0.45) {
      cell.classList.add('gh-lvl-2');
    } else if (rand > 0.25) {
      cell.classList.add('gh-lvl-1');
    }

    chart.appendChild(cell);
  }
})();

/* ═══════════════════════════════════════════════════════════
   7. ANIMATED COUNTERS & PROGRESS BARS
   ═══════════════════════════════════════════════════════════ */
(function initCountersAndBars() {
  // Stat numbers count-up
  const counterObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.getAttribute('data-target'), 10);
        if (!isNaN(target)) {
          let current = 0;
          const duration = 1400;
          const stepTime = 20;
          const step = Math.max(1, Math.floor(target / (duration / stepTime)));

          const timer = setInterval(() => {
            current = Math.min(current + step, target);
            el.textContent = current;
            if (current >= target) {
              clearInterval(timer);
            }
          }, stepTime);
        }
        counterObserver.unobserve(el);
      }
    });
  }, { threshold: 0.3 });

  $$('.stat-num[data-target], .big-num[data-target], .lc-num[data-target]').forEach(el => {
    counterObserver.observe(el);
  });

  // Expertise & Language progress bars fill
  const barObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const bar = entry.target;
        const width = bar.getAttribute('data-width');
        if (width) {
          bar.style.width = `${width}%`;
        }
        barObserver.unobserve(bar);
      }
    });
  }, { threshold: 0.3 });

  $$('.exp-fill[data-width], .lang-bar[data-width]').forEach(b => barObserver.observe(b));
})();

/* ═══════════════════════════════════════════════════════════
   8. SCROLL REVEAL OBSERVER
   ═══════════════════════════════════════════════════════════ */
(function initScrollReveal() {
  const revealElements = $$('.reveal-up, .reveal-left, .reveal-right');
  if (!revealElements.length) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  revealElements.forEach(el => observer.observe(el));
})();

/* ═══════════════════════════════════════════════════════════
   9. CONTACT FORM SUBMISSION
   ═══════════════════════════════════════════════════════════ */
(function initContactForm() {
  const form = $('#contact-form');
  const btn = $('#contact-submit-btn');
  const success = $('#form-success');

  if (!form || !btn) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const originalText = btn.querySelector('.btn-text').textContent;
    btn.disabled = true;
    btn.querySelector('.btn-text').textContent = 'Sending…';
    btn.style.opacity = '0.75';

    // Simulate async network request
    await new Promise(resolve => setTimeout(resolve, 1000));

    btn.querySelector('.btn-text').textContent = originalText;
    btn.disabled = false;
    btn.style.opacity = '1';
    form.reset();

    if (success) {
      success.classList.add('visible');
      setTimeout(() => {
        success.classList.remove('visible');
      }, 5000);
    }
  });
})();

/* ═══════════════════════════════════════════════════════════
   10. CUSTOM MAGNETIC CURSOR
   ═══════════════════════════════════════════════════════════ */
(function initCursor() {
  if (window.matchMedia('(pointer: coarse)').matches) return;
  const cursor = $('#cursor');
  const outer = $('#cursor-outer');
  if (!cursor || !outer) return;

  let mouseX = -100, mouseY = -100;
  let outerX = -100, outerY = -100;

  document.addEventListener('mousemove', e => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    cursor.style.left = `${mouseX}px`;
    cursor.style.top = `${mouseY}px`;
  }, { passive: true });

  (function renderCursor() {
    outerX += (mouseX - outerX) * 0.15;
    outerY += (mouseY - outerY) * 0.15;
    outer.style.left = `${outerX}px`;
    outer.style.top = `${outerY}px`;
    requestAnimationFrame(renderCursor);
  })();

  const hoverables = $$('a, button, input, textarea, canvas, .project-card, .planet, .skill-tag, .filter-btn');
  hoverables.forEach(el => {
    el.addEventListener('mouseenter', () => {
      cursor.classList.add('hover');
      outer.classList.add('hover');
    });
    el.addEventListener('mouseleave', () => {
      cursor.classList.remove('hover');
      outer.classList.remove('hover');
    });
  });
})();

console.log('%c✨ Aaryan Dhabale Portfolio — White & Violet Edition Initialized', 'color:#7c3aed;font-family:monospace;font-weight:bold;font-size:13px;');

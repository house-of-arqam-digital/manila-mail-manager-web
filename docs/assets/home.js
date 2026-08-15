const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const hasObserver = 'IntersectionObserver' in window;

// Runs `onEnter` the first time each matching element scrolls into view, or
// `fallback` on every element when IntersectionObserver is unavailable.
function onFirstIntersection(selector, threshold, onEnter, fallback = onEnter) {
  const elements = document.querySelectorAll(selector);

  if (!hasObserver) {
    elements.forEach(fallback);
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);
      onEnter(entry.target);
    });
  }, { threshold });

  elements.forEach(el => observer.observe(el));
}

const addVisibleClass = el => el.classList.add('visible');
const counterTarget = el => Number(el.dataset.target) || 0;

// Scroll reveal animation
onFirstIntersection('.reveal', 0.15, addVisibleClass);

// Animated counters
onFirstIntersection('.counter', 0.5, (el) => {
  const target = counterTarget(el);
  if (reduceMotion) {
    el.textContent = target;
    return;
  }
  const duration = 1200;
  const start = performance.now();
  const animate = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(target * eased);
    if (progress < 1) requestAnimationFrame(animate);
  };
  requestAnimationFrame(animate);
}, el => { el.textContent = counterTarget(el); });

// Scroll progress bar
const progressEl = document.getElementById('scroll-progress');
let progressQueued = false;

function updateScrollProgress() {
  progressQueued = false;
  const scrollTop = document.documentElement.scrollTop;
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const progress = scrollable > 0
    ? Math.min(100, Math.max(0, (scrollTop / scrollable) * 100))
    : 0;
  progressEl.style.width = progress + '%';
}

function queueScrollProgress() {
  if (progressQueued) return;
  progressQueued = true;
  requestAnimationFrame(updateScrollProgress);
}

window.addEventListener('scroll', queueScrollProgress, { passive: true });
window.addEventListener('resize', queueScrollProgress, { passive: true });
updateScrollProgress();

// Typing effect
const typingEl = document.getElementById('typing-line');
const phrases = [
  'No more hunting for tiny "unsubscribe" links.',
  'Reclaim control of your inbox.',
  'See every subscription in one place.',
  'One click to clean up years of clutter.'
];
const typingText = document.createTextNode('');
const typingCursor = document.createElement('span');
typingCursor.className = 'typing-cursor';
typingEl.append(typingText, typingCursor);

let phraseIndex = 0;
let charIndex = 0;
let isDeleting = false;
let typingTimer = null;

function type() {
  const current = phrases[phraseIndex];
  let typingDelay;

  if (!isDeleting) {
    charIndex++;
    if (charIndex >= current.length) {
      charIndex = current.length;
      isDeleting = true;
      typingDelay = 2000;
    } else {
      typingDelay = 40 + Math.random() * 40;
    }
  } else {
    charIndex--;
    if (charIndex <= 0) {
      charIndex = 0;
      isDeleting = false;
      phraseIndex = (phraseIndex + 1) % phrases.length;
      typingDelay = 400;
    } else {
      typingDelay = 25;
    }
  }

  typingText.nodeValue = current.substring(0, charIndex);
  typingTimer = setTimeout(type, typingDelay);
}

function stopTyping() {
  clearTimeout(typingTimer);
  typingTimer = null;
}

if (reduceMotion) {
  typingText.nodeValue = phrases[0];
  typingCursor.remove();
} else {
  typingTimer = setTimeout(type, 1000);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopTyping();
    else if (!typingTimer) typingTimer = setTimeout(type, 400);
  });
}

// Staggered pricing features
onFirstIntersection('.pricing-features', 0.3, addVisibleClass);

// FAQ accordion
document.querySelectorAll('.faq-question').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.parentElement;
    const wasOpen = item.classList.contains('open');
    // Close all
    document.querySelectorAll('.faq-item').forEach(i => {
      i.classList.remove('open');
      i.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
    });
    // Toggle clicked
    if (!wasOpen) {
      item.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
    }
  });
});

// Rolling number animation
const roller = document.getElementById('hero-roller');
const rollerNumbers = [47, 52, 38, 61, 43, 55, 34, 49, 58, 41];
let rollerIndex = 0;

function clearRoller() {
  while (roller.firstChild) roller.removeChild(roller.firstChild);
}

function createRollerDigit() {
  const d = document.createElement('span');
  d.className = 'roller-digit';
  const strip = document.createElement('span');
  strip.className = 'roller-strip';
  for (let i = 0; i <= 9; i++) {
    const s = document.createElement('span');
    s.textContent = i;
    strip.appendChild(s);
  }
  d.appendChild(strip);
  return d;
}

function setRollerValue(num) {
  const digits = String(num).split('');
  while (roller.children.length < digits.length) roller.appendChild(createRollerDigit());
  while (roller.children.length > digits.length) roller.removeChild(roller.lastChild);
  digits.forEach((d, i) => {
    const strip = roller.children[i].querySelector('.roller-strip');
    strip.style.transitionDelay = (i * 0.12) + 's';
    strip.style.transform = 'translateY(-' + (parseInt(d) * 1.15) + 'em)';
  });
}

if (!reduceMotion) {
  clearRoller();
  setRollerValue(rollerNumbers[0]);
  setInterval(() => {
    rollerIndex = (rollerIndex + 1) % rollerNumbers.length;
    setRollerValue(rollerNumbers[rollerIndex]);
  }, 3000);
}

// Show nav CTA after hero button scrolls out of view
const navCta = document.getElementById('nav-cta');
const heroCta = document.querySelector('.hero .hero-cta');
if (navCta && heroCta && hasObserver) {
  const heroObserver = new IntersectionObserver(([entry]) => {
    const hidden = entry.isIntersecting;
    navCta.style.opacity = hidden ? '0' : '1';
    navCta.style.visibility = hidden ? 'hidden' : 'visible';
    navCta.style.pointerEvents = hidden ? 'none' : 'auto';
    navCta.setAttribute('aria-hidden', String(hidden));
    navCta.tabIndex = hidden ? -1 : 0;
  });
  heroObserver.observe(heroCta);
}

// Pricing period toggle — the card shows one price at a time instead of
// cramming both into the sub-line.
const monthlyBtn = document.getElementById('billing-monthly');
const yearlyBtn = document.getElementById('billing-yearly');
const priceEl = document.getElementById('pricing-price');
const periodEl = document.getElementById('pricing-period');
const priceDescEl = document.getElementById('pricing-desc');

const PLANS = {
  monthly: {
    amount: '$4.99',
    period: '/month',
    desc: 'Billed monthly · switch to yearly and pay half'
  },
  yearly: {
    amount: '$29.99',
    period: '/year',
    desc: 'Works out to $2.50/month, billed once a year'
  }
};

function showPlan(name) {
  const plan = PLANS[name];
  priceEl.firstChild.nodeValue = plan.amount + ' ';
  periodEl.textContent = plan.period;
  priceDescEl.textContent = plan.desc;
  monthlyBtn.setAttribute('aria-pressed', String(name === 'monthly'));
  yearlyBtn.setAttribute('aria-pressed', String(name === 'yearly'));
}

if (monthlyBtn && yearlyBtn) {
  monthlyBtn.addEventListener('click', () => showPlan('monthly'));
  yearlyBtn.addEventListener('click', () => showPlan('yearly'));
  showPlan('yearly');
}

// Nav: shadow once the page is scrolled, and highlight the section in view
const navEl = document.querySelector('nav');
const sectionLinks = Array.from(document.querySelectorAll('.nav-links a[href^="#"]'));
const sections = sectionLinks
  .map(link => document.querySelector(link.getAttribute('href')))
  .filter(Boolean);

function markActiveSection() {
  let activeId = '';
  sections.forEach(section => {
    if (section.getBoundingClientRect().top <= 140) activeId = section.id;
  });
  sectionLinks.forEach(link => {
    link.classList.toggle('active', link.getAttribute('href') === '#' + activeId);
  });
}

function updateNavState() {
  navEl.classList.toggle('scrolled', document.documentElement.scrollTop > 8);
  markActiveSection();
}

window.addEventListener('scroll', updateNavState, { passive: true });
updateNavState();

// Mobile nav toggle
const navToggle = document.getElementById('nav-toggle');
const navLinks = document.getElementById('nav-links');

function setNavOpen(open) {
  navLinks.classList.toggle('open', open);
  navToggle.setAttribute('aria-expanded', String(open));
}

navToggle.addEventListener('click', () => {
  setNavOpen(!navLinks.classList.contains('open'));
});
navLinks.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => setNavOpen(false));
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && navLinks.classList.contains('open')) {
    setNavOpen(false);
    navToggle.focus();
  }
});
document.addEventListener('click', (e) => {
  if (navLinks.classList.contains('open') && !e.target.closest('nav')) setNavOpen(false);
});

// Runs `onEnter` the first time each matching element scrolls into view.
function onFirstIntersection(selector, threshold, onEnter) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);
      onEnter(entry.target);
    });
  }, { threshold });

  document.querySelectorAll(selector).forEach(el => observer.observe(el));
}

const addVisibleClass = el => el.classList.add('visible');

// Scroll reveal animation
onFirstIntersection('.reveal', 0.15, addVisibleClass);

// Animated counters
onFirstIntersection('.counter', 0.5, (el) => {
  const target = parseInt(el.dataset.target);
  const duration = 1200;
  const start = performance.now();
  const animate = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(target * eased);
    if (progress < 1) requestAnimationFrame(animate);
  };
  requestAnimationFrame(animate);
});

// Scroll progress bar
window.addEventListener('scroll', () => {
  const scrollTop = document.documentElement.scrollTop;
  const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
  const progress = (scrollTop / scrollHeight) * 100;
  document.getElementById('scroll-progress').style.width = progress + '%';
});

// Typing effect
const typingEl = document.getElementById('typing-line');
const phrases = [
  'No more hunting for tiny "unsubscribe" links.',
  'Reclaim control of your inbox.',
  'See every subscription in one place.',
  'One click to clean up years of clutter.'
];
let phraseIndex = 0;
let charIndex = 0;
let isDeleting = false;
let typingDelay = 50;

function type() {
  const current = phrases[phraseIndex];
  typingEl.innerHTML = current.substring(0, charIndex) + '<span class="typing-cursor"></span>';
  if (!isDeleting) {
    charIndex++;
    if (charIndex > current.length) {
      isDeleting = true;
      typingDelay = 2000;
    } else {
      typingDelay = 40 + Math.random() * 40;
    }
  } else {
    charIndex--;
    if (charIndex < 0) {
      isDeleting = false;
      phraseIndex = (phraseIndex + 1) % phrases.length;
      charIndex = 0;
      typingDelay = 400;
    } else {
      typingDelay = 25;
    }
  }
  setTimeout(type, typingDelay);
}
setTimeout(type, 1000);

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

setRollerValue(rollerNumbers[0]);
setInterval(() => {
  rollerIndex = (rollerIndex + 1) % rollerNumbers.length;
  setRollerValue(rollerNumbers[rollerIndex]);
}, 3000);

// Show nav CTA after hero button scrolls out of view
const navCta = document.getElementById('nav-cta');
const heroCta = document.querySelector('.hero .hero-cta');
if (navCta && heroCta) {
  const heroObserver = new IntersectionObserver(([entry]) => {
    navCta.style.opacity = entry.isIntersecting ? '0' : '1';
    navCta.style.pointerEvents = entry.isIntersecting ? 'none' : 'auto';
  });
  heroObserver.observe(heroCta);
}

// Mobile nav toggle
const navToggle = document.getElementById('nav-toggle');
const navLinks = document.getElementById('nav-links');
navToggle.addEventListener('click', () => {
  navLinks.classList.toggle('open');
});
navLinks.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => navLinks.classList.remove('open'));
});

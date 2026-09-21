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

// Nav: highlight the section in view
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

window.addEventListener('scroll', markActiveSection, { passive: true });
markActiveSection();

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

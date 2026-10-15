// רכיבים משותפים: כותרת, פוטר, אייקונים, עזרי תצוגה
const ICONS = {
  yin: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="32" cy="32" r="26"/><path d="M32 6a13 13 0 0 1 0 26 13 13 0 0 0 0 26" /><circle cx="32" cy="19" r="3" fill="currentColor"/><circle cx="32" cy="45" r="3"/></svg>`,
  wave: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M32 8c-9 0-15 7-15 15 0 6 3 9 3 14 0 8 5 19 12 19s12-11 12-19c0-5 3-8 3-14 0-8-6-15-15-15Z"/><path d="M24 26c3 2 13 2 16 0M23 35c4 2 14 2 18 0M25 44c3 2 11 2 14 0"/></svg>`,
  bloom: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="32" cy="18" r="7"/><path d="M26 27c-6 4-9 11-7 18 2 6 8 9 14 9s12-4 12-11c0-6-4-10-9-10"/><path d="M36 33c-3 0-6 3-6 6 0 4 3 6 6 6"/></svg>`,
  hand: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 34V18a3 3 0 0 1 6 0v12M26 28V13a3 3 0 0 1 6 0v15M32 28V15a3 3 0 0 1 6 0v15M38 30v-9a3 3 0 0 1 6 0v17c0 10-6 18-15 18-6 0-10-3-13-8l-6-10a3 3 0 0 1 5-3l4 5"/></svg>`,
  leaf: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M12 52C10 30 24 12 54 10c2 28-16 44-38 42Z"/><path d="M12 52 40 24"/></svg>`,
  arrow: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>`,
  whatsapp: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2c0 1.3.9 2.5 1 2.7.1.2 1.8 2.8 4.4 3.9 1.6.7 2.3.8 3.1.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.6-.3Z"/></svg>`,
};

const LEAF_SVG = `<svg viewBox="0 0 100 100" fill="none"><path d="M10 90C6 50 34 14 92 8c4 52-30 84-82 82Z" fill="#dfe8e0" stroke="#8aa592" stroke-width="1.5"/><path d="M10 90 64 36" stroke="#8aa592" stroke-width="1.5"/></svg>`;

const WAVE = (fill) =>
  `<svg class="wave" viewBox="0 0 1440 70" preserveAspectRatio="none"><path d="M0 40C240 80 480 0 720 20s480 50 720 10V70H0Z" fill="${fill}"/></svg>`;

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const fmtDate = (d) => new Date(d).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' });

// Markdown בסיסי: ## כותרות, **מודגש**, *נטוי*, רשימות, קישורים ותמונות
function renderMarkdown(md) {
  const inline = (t) =>
    esc(t)
      .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img src="$2" alt="$1">')
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>');
  const out = [];
  let list = null;
  const flush = () => { if (list) { out.push(`<ul>${list.join('')}</ul>`); list = null; } };
  String(md || '').split(/\r?\n/).forEach((line) => {
    if (/^\s*$/.test(line)) return flush();
    let m;
    if ((m = /^###\s+(.*)/.exec(line))) { flush(); out.push(`<h3>${inline(m[1])}</h3>`); }
    else if ((m = /^##\s+(.*)/.exec(line))) { flush(); out.push(`<h2>${inline(m[1])}</h2>`); }
    else if ((m = /^\s*[-*]\s+(.*)/.exec(line))) { (list ||= []).push(`<li>${inline(m[1])}</li>`); }
    else { flush(); out.push(`<p>${inline(line)}</p>`); }
  });
  flush();
  return out.join('\n');
}

async function api(path, opts = {}) {
  const res = await fetch('/api/' + path, opts);
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
  return res.json();
}

function waLink(settings, text = 'שלום, אשמח לקבוע תור 🙂') {
  return `https://wa.me/${settings.whatsapp}?text=${encodeURIComponent(text)}`;
}

function renderHeader(settings, services) {
  const path = location.pathname;
  const el = document.getElementById('site-header');
  el.className = 'site-header';
  el.innerHTML = `
    <div class="container nav">
      <a class="brand" href="/">
        <svg class="brand-mark" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="22" fill="#dfe8e0"/><path d="M24 8c-6 6-8 11-8 16a8 8 0 0 0 16 0c0-5-2-10-8-16Z" fill="#8aa592"/><path d="M24 14v20" stroke="#fbf8f3" stroke-width="1.5" stroke-linecap="round"/></svg>
        <span class="brand-text"><strong>${esc(settings.clinicName)}</strong><span>${esc(settings.tagline)}</span></span>
      </a>
      <button class="menu-btn" aria-label="תפריט"><span></span><span></span><span></span></button>
      <ul class="nav-links">
        <li><a href="/" class="${path === '/' ? 'active' : ''}">בית</a></li>
        <li class="dropdown">
          <button class="dropdown-toggle ${path.startsWith('/tipulim') ? 'active' : ''}">טיפולים ▾</button>
          <ul class="dropdown-menu">
            ${services.map((s) => `<li><a href="/tipulim/${s.slug}">${esc(s.title)}</a></li>`).join('')}
          </ul>
        </li>
        <li><a href="/#about">אודות</a></li>
        <li><a href="/blog" class="${path.startsWith('/blog') ? 'active' : ''}">בלוג</a></li>
        <li><a href="#contact">צור קשר</a></li>
      </ul>
      <a class="btn btn-primary nav-cta" href="${waLink(settings)}" target="_blank" rel="noopener">לקביעת תור</a>
    </div>`;
  el.querySelector('.menu-btn').addEventListener('click', () => document.body.classList.toggle('nav-open'));
  el.querySelectorAll('.nav-links a').forEach((a) => a.addEventListener('click', () => document.body.classList.remove('nav-open')));
}

function renderFooter(settings, services) {
  const el = document.getElementById('site-footer');
  el.className = 'site-footer';
  el.id = 'contact';
  el.innerHTML = `
    <div class="container">
      <div class="footer-grid">
        <div>
          <h4>${esc(settings.clinicName)}</h4>
          <p>${esc(settings.tagline)} — מרחב שקט לטיפול אישי, קשוב ומותאם.</p>
          <p>${esc(settings.hours)}</p>
        </div>
        <div>
          <h4>טיפולים</h4>
          <ul>${services.map((s) => `<li><a href="/tipulim/${s.slug}">${esc(s.title)}</a></li>`).join('')}<li><a href="/blog">בלוג</a></li></ul>
        </div>
        <div>
          <h4>יצירת קשר</h4>
          <ul>
            <li><a href="tel:${esc(settings.phone)}">📞 ${esc(settings.phone)}</a></li>
            <li><a href="${waLink(settings)}" target="_blank" rel="noopener">💬 וואטסאפ</a></li>
            <li><a href="mailto:${esc(settings.email)}">✉️ ${esc(settings.email)}</a></li>
            <li>📍 ${esc(settings.address)}</li>
          </ul>
        </div>
      </div>
      <div class="copy"><span>© ${new Date().getFullYear()} ${esc(settings.clinicName)}. כל הזכויות שמורות.</span><span>המידע באתר אינו מהווה תחליף לייעוץ רפואי.</span></div>
    </div>`;
  const wa = document.createElement('a');
  wa.className = 'wa-float';
  wa.href = waLink(settings);
  wa.target = '_blank';
  wa.rel = 'noopener';
  wa.setAttribute('aria-label', 'וואטסאפ');
  wa.innerHTML = ICONS.whatsapp;
  document.body.appendChild(wa);
}

function ctaBlock(settings, title = 'מוכנים לרגע של שקט?', text = 'אשמח לשמוע מכם, לענות על כל שאלה ולמצוא יחד את הטיפול המתאים.') {
  return `
    <div class="cta-box reveal">
      <h2>${esc(title)}</h2>
      <p>${esc(text)}</p>
      <div class="cta-actions">
        <a class="btn btn-primary" href="${waLink(settings)}" target="_blank" rel="noopener">קביעת תור בוואטסאפ</a>
        <a class="btn btn-ghost" href="tel:${esc(settings.phone)}">${esc(settings.phone)}</a>
      </div>
    </div>`;
}

function postCard(p) {
  const cover = p.cover
    ? `<img src="${esc(p.cover)}" alt="" loading="lazy">`
    : `<div class="ph">${ICONS.leaf}</div>`;
  return `
    <a class="post-card reveal" href="/blog/${encodeURIComponent(p.slug)}">
      <div class="post-cover">${cover}</div>
      <div class="post-body">
        <div class="post-meta">${p.category ? `<span class="tag">${esc(p.category)}</span>` : ''}<span>${fmtDate(p.date)}</span></div>
        <h3>${esc(p.title)}</h3>
        <p>${esc(p.excerpt)}</p>
        <span class="more">להמשך קריאה ${ICONS.arrow}</span>
      </div>
    </a>`;
}

function observeReveal() {
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }),
    { threshold: 0.12 }
  );
  document.querySelectorAll('.reveal:not(.in)').forEach((el) => io.observe(el));
}

// טוען הגדרות ותחומי טיפול ומרנדר את מסגרת העמוד
async function initLayout() {
  const [settings, services] = await Promise.all([api('settings'), api('services')]);
  services.sort((a, b) => (a.order || 0) - (b.order || 0));
  renderHeader(settings, services);
  renderFooter(settings, services);
  return { settings, services };
}

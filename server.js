// שרת פשוט ללא תלויות: מגיש את האתר ושומר תוכן בקובץ JSON
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = 'Giti123456';
const PUBLIC_DIR = path.join(__dirname, 'public');
const UPLOADS_DIR = path.join(PUBLIC_DIR, 'uploads');
const DB_FILE = path.join(__dirname, 'data', 'db.json');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
};

// ניתובים "יפים" -> קובץ HTML
const PAGE_ROUTES = [
  [/^\/$/, 'index.html'],
  [/^\/tipulim\/[\w-]+\/?$/, 'service.html'],
  [/^\/blog\/?$/, 'blog.html'],
  [/^\/blog\/[^/]+\/?$/, 'post.html'],
  [/^\/admin\/?$/, 'admin.html'],
];

function readDb() {
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function writeDb(db) {
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), 'utf8');
  fs.renameSync(tmp, DB_FILE);
}

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

function readBody(req, limit = 8 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(new Error('הקובץ גדול מדי'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {});
      } catch {
        reject(new Error('JSON לא תקין'));
      }
    });
    req.on('error', reject);
  });
}

function isAdmin(req) {
  const key = req.headers['x-admin-key'] || '';
  const a = Buffer.from(String(key));
  const b = Buffer.from(ADMIN_PASSWORD);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function slugify(text) {
  const s = String(text)
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return s || 'post-' + Date.now();
}

function uniqueSlug(posts, base, ignoreId) {
  let slug = base;
  let i = 2;
  while (posts.some((p) => p.slug === slug && p.id !== ignoreId)) slug = `${base}-${i++}`;
  return slug;
}

async function handleApi(req, res, url) {
  const parts = url.pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  const method = req.method;
  const db = readDb();
  const admin = isAdmin(req);

  // אימות סיסמת מנהל
  if (parts[0] === 'login' && method === 'POST') {
    return admin ? send(res, 200, { ok: true }) : send(res, 401, { error: 'סיסמה שגויה' });
  }

  // הגדרות כלליות של האתר
  if (parts[0] === 'settings') {
    if (method === 'GET') return send(res, 200, db.settings);
    if (method === 'PUT') {
      if (!admin) return send(res, 401, { error: 'נדרשת הרשאת מנהל' });
      db.settings = { ...db.settings, ...(await readBody(req)) };
      writeDb(db);
      return send(res, 200, db.settings);
    }
  }

  // תחומי טיפול
  if (parts[0] === 'services') {
    if (method === 'GET' && !parts[1]) return send(res, 200, db.services);
    if (method === 'GET' && parts[1]) {
      const s = db.services.find((x) => x.slug === parts[1]);
      return s ? send(res, 200, s) : send(res, 404, { error: 'לא נמצא' });
    }
    if (method === 'PUT' && parts[1]) {
      if (!admin) return send(res, 401, { error: 'נדרשת הרשאת מנהל' });
      const idx = db.services.findIndex((x) => x.slug === parts[1]);
      if (idx < 0) return send(res, 404, { error: 'לא נמצא' });
      const body = await readBody(req);
      delete body.slug;
      db.services[idx] = { ...db.services[idx], ...body };
      writeDb(db);
      return send(res, 200, db.services[idx]);
    }
  }

  // בלוג
  if (parts[0] === 'posts') {
    if (method === 'GET' && !parts[1]) {
      const list = db.posts
        .filter((p) => admin || p.published)
        .sort((a, b) => b.date.localeCompare(a.date));
      return send(res, 200, list);
    }
    if (method === 'GET' && parts[1]) {
      const p = db.posts.find((x) => x.slug === parts[1] || x.id === parts[1]);
      if (!p || (!p.published && !admin)) return send(res, 404, { error: 'לא נמצא' });
      return send(res, 200, p);
    }
    if (!admin) return send(res, 401, { error: 'נדרשת הרשאת מנהל' });

    if (method === 'POST' && !parts[1]) {
      const body = await readBody(req);
      if (!body.title) return send(res, 400, { error: 'חסרה כותרת' });
      const id = crypto.randomUUID();
      const post = {
        id,
        title: body.title,
        slug: uniqueSlug(db.posts, slugify(body.slug || body.title), id),
        excerpt: body.excerpt || '',
        content: body.content || '',
        cover: body.cover || '',
        category: body.category || '',
        published: !!body.published,
        date: body.date || new Date().toISOString().slice(0, 10),
      };
      db.posts.push(post);
      writeDb(db);
      return send(res, 201, post);
    }
    if (method === 'PUT' && parts[1]) {
      const idx = db.posts.findIndex((x) => x.id === parts[1]);
      if (idx < 0) return send(res, 404, { error: 'לא נמצא' });
      const body = await readBody(req);
      const merged = { ...db.posts[idx], ...body, id: db.posts[idx].id };
      merged.slug = uniqueSlug(db.posts, slugify(merged.slug || merged.title), merged.id);
      merged.published = !!merged.published;
      db.posts[idx] = merged;
      writeDb(db);
      return send(res, 200, merged);
    }
    if (method === 'DELETE' && parts[1]) {
      const before = db.posts.length;
      db.posts = db.posts.filter((x) => x.id !== parts[1]);
      if (db.posts.length === before) return send(res, 404, { error: 'לא נמצא' });
      writeDb(db);
      return send(res, 200, { ok: true });
    }
  }

  // העלאת תמונה (base64)
  if (parts[0] === 'upload' && method === 'POST') {
    if (!admin) return send(res, 401, { error: 'נדרשת הרשאת מנהל' });
    const { dataUrl } = await readBody(req);
    const m = /^data:image\/(png|jpe?g|webp|gif);base64,(.+)$/.exec(dataUrl || '');
    if (!m) return send(res, 400, { error: 'פורמט תמונה לא נתמך' });
    const ext = m[1] === 'jpeg' ? 'jpg' : m[1];
    const name = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    fs.writeFileSync(path.join(UPLOADS_DIR, name), Buffer.from(m[2], 'base64'));
    return send(res, 201, { url: `/uploads/${name}` });
  }

  return send(res, 404, { error: 'נתיב לא קיים' });
}

function serveFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) return send(res, 404, '<h1>404</h1>', 'text/html; charset=utf-8');
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);

    const route = PAGE_ROUTES.find(([re]) => re.test(url.pathname));
    if (route) return serveFile(res, path.join(PUBLIC_DIR, route[1]));

    const filePath = path.normalize(path.join(PUBLIC_DIR, decodeURIComponent(url.pathname)));
    if (!filePath.startsWith(PUBLIC_DIR)) return send(res, 403, 'Forbidden', 'text/plain');
    return serveFile(res, filePath);
  } catch (e) {
    return send(res, 400, { error: e.message });
  }
});

server.listen(PORT, () => {
  console.log(`האתר רץ בכתובת http://localhost:${PORT}`);
  console.log(`ניהול תוכן: http://localhost:${PORT}/admin`);
});

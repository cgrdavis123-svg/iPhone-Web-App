require('dotenv').config();

const path = require('path');
const express = require('express');
const session = require('express-session');
const expressLayouts = require('express-ejs-layouts');
const bcrypt = require('bcryptjs');

const db = require('./db');
const { requireAuth, attachUser } = require('./middleware/auth');
const utils = require('./utils');

// Convenience: if no admin user exists yet but ADMIN_EMAIL/ADMIN_PASSWORD are
// set in the environment, seed one automatically on boot.
(function ensureAdminUser() {
  const userCount = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
  if (userCount > 0) return;
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.warn('No admin user exists yet. Set ADMIN_EMAIL and ADMIN_PASSWORD in .env and restart, or run `npm run seed`.');
    return;
  }
  const hash = bcrypt.hashSync(password, 12);
  db.prepare('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)').run(email, hash, process.env.ADMIN_NAME || 'Admin');
  console.log(`Seeded admin user: ${email}`);
})();

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.set('trust proxy', 1);

app.use(session({
  secret: process.env.SESSION_SECRET || 'change-me-please-in-.env',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'false',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days — stay logged in on your phone
  },
}));

app.use(attachUser(db));

// Make a couple of helpers available in every view.
app.use((req, res, next) => {
  res.locals.currentPath = req.path;
  res.locals.appName = process.env.APP_NAME || 'Syndicate Client Hub';
  res.locals.query = req.query;
  Object.assign(res.locals, utils);
  next();
});

app.use('/', require('./routes/auth'));

app.use(requireAuth);

app.use('/', require('./routes/dashboard'));
app.use('/', require('./routes/clients'));
app.use('/', require('./routes/projects'));
app.use('/', require('./routes/tasks'));
app.use('/', require('./routes/notes'));
app.use('/', require('./routes/invoices'));
app.use('/', require('./routes/files'));

app.use((req, res) => {
  res.status(404).render('404');
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('500', { message: process.env.NODE_ENV === 'production' ? null : err.message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Syndicate Client Hub running on http://localhost:${PORT}`);
});

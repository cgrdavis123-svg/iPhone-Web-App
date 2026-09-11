require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./db');

const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
const name = process.env.ADMIN_NAME || 'Admin';

if (!email || !password) {
  console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD in your .env file before seeding.');
  process.exit(1);
}

const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
const hash = bcrypt.hashSync(password, 12);

if (existing) {
  db.prepare('UPDATE users SET password_hash = ?, name = ? WHERE id = ?').run(hash, name, existing.id);
  console.log(`Updated password for existing admin user: ${email}`);
} else {
  db.prepare('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)').run(email, hash, name);
  console.log(`Created admin user: ${email}`);
}

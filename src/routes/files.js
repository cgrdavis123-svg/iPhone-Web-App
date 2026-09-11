const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const db = require('../db');

const router = express.Router();

const uploadsDir = path.join(__dirname, '..', '..', 'data', 'uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).slice(0, 20);
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
});

router.post('/clients/:clientId/files', upload.single('file'), (req, res) => {
  const client = db.prepare('SELECT id FROM clients WHERE id = ?').get(req.params.clientId);
  if (!client) return res.status(404).render('404');

  if (!req.file) {
    return res.redirect(`/clients/${client.id}?err=` + encodeURIComponent('No file selected.'));
  }

  db.prepare(`
    INSERT INTO files (client_id, filename, original_name, mime_type, size)
    VALUES (?, ?, ?, ?, ?)
  `).run(client.id, req.file.filename, req.file.originalname, req.file.mimetype, req.file.size);

  res.redirect(`/clients/${client.id}?ok=` + encodeURIComponent('File uploaded.'));
});

router.get('/files/:id/download', (req, res) => {
  const file = db.prepare('SELECT * FROM files WHERE id = ?').get(req.params.id);
  if (!file) return res.status(404).render('404');

  const filePath = path.join(uploadsDir, file.filename);
  if (!fs.existsSync(filePath)) return res.status(404).render('404');

  res.download(filePath, file.original_name);
});

router.post('/files/:id/delete', (req, res) => {
  const file = db.prepare('SELECT * FROM files WHERE id = ?').get(req.params.id);
  if (!file) return res.status(404).render('404');

  const filePath = path.join(uploadsDir, file.filename);
  fs.unlink(filePath, () => {}); // best-effort; ignore if already gone

  db.prepare('DELETE FROM files WHERE id = ?').run(file.id);
  res.redirect(`/clients/${file.client_id}?ok=` + encodeURIComponent('File deleted.'));
});

module.exports = router;

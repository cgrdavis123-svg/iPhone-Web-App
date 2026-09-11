const express = require('express');
const db = require('../db');

const router = express.Router();

router.post('/clients/:clientId/notes', (req, res) => {
  const client = db.prepare('SELECT id FROM clients WHERE id = ?').get(req.params.clientId);
  if (!client) return res.status(404).render('404');

  const body = (req.body.body || '').trim();
  if (!body) return res.redirect(`/clients/${client.id}?err=` + encodeURIComponent('Note cannot be empty.'));

  db.prepare('INSERT INTO notes (client_id, body) VALUES (?, ?)').run(client.id, body);
  res.redirect(`/clients/${client.id}?ok=` + encodeURIComponent('Note added.'));
});

router.post('/notes/:id/delete', (req, res) => {
  const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id);
  if (!note) return res.status(404).render('404');
  db.prepare('DELETE FROM notes WHERE id = ?').run(note.id);
  res.redirect(`/clients/${note.client_id}?ok=` + encodeURIComponent('Note deleted.'));
});

module.exports = router;

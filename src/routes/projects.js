const express = require('express');
const db = require('../db');

const router = express.Router();

const STATUSES = ['planning', 'in_progress', 'review', 'complete', 'on_hold'];

router.post('/clients/:clientId/projects', (req, res) => {
  const client = db.prepare('SELECT id FROM clients WHERE id = ?').get(req.params.clientId);
  if (!client) return res.status(404).render('404');

  const b = req.body;
  if (!b.type) {
    return res.redirect(`/clients/${client.id}?err=` + encodeURIComponent('Project type is required.'));
  }

  db.prepare(`
    INSERT INTO projects (client_id, type, title, price, billing_type, due_date)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(client.id, b.type, b.title || null, parseFloat(b.price) || 0, b.billing_type === 'monthly' ? 'monthly' : 'one_time', b.due_date || null);

  res.redirect(`/clients/${client.id}?ok=` + encodeURIComponent('Project added.'));
});

router.post('/projects/:id/status', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).render('404');
  const status = STATUSES.includes(req.body.status) ? req.body.status : project.status;
  db.prepare('UPDATE projects SET status = ? WHERE id = ?').run(status, project.id);
  res.redirect(`/clients/${project.client_id}?ok=` + encodeURIComponent('Project updated.'));
});

router.post('/projects/:id/delete', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).render('404');
  db.prepare('DELETE FROM projects WHERE id = ?').run(project.id);
  res.redirect(`/clients/${project.client_id}?ok=` + encodeURIComponent('Project deleted.'));
});

module.exports = router;

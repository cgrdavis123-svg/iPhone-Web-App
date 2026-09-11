const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/tasks', (req, res) => {
  const filter = req.query.filter || 'open';

  let sql = `
    SELECT tasks.*, clients.business_name AS client_name
    FROM tasks LEFT JOIN clients ON clients.id = tasks.client_id
    WHERE 1=1
  `;
  if (filter === 'open') sql += ' AND tasks.completed = 0';
  if (filter === 'done') sql += ' AND tasks.completed = 1';

  sql += ` ORDER BY tasks.completed ASC, (tasks.due_date IS NULL), tasks.due_date ASC, tasks.created_at DESC`;

  const tasks = db.prepare(sql).all();

  res.render('tasks/index', { title: 'Tasks', tasks, filter });
});

router.post('/clients/:clientId/tasks', (req, res) => {
  const client = db.prepare('SELECT id FROM clients WHERE id = ?').get(req.params.clientId);
  if (!client) return res.status(404).render('404');

  const title = (req.body.title || '').trim();
  if (!title) return res.redirect(`/clients/${client.id}?err=` + encodeURIComponent('Task title is required.'));

  db.prepare('INSERT INTO tasks (client_id, title, due_date) VALUES (?, ?, ?)')
    .run(client.id, title, req.body.due_date || null);

  res.redirect(`/clients/${client.id}?ok=` + encodeURIComponent('Task added.'));
});

router.post('/tasks', (req, res) => {
  const title = (req.body.title || '').trim();
  if (!title) return res.redirect('/tasks?err=' + encodeURIComponent('Task title is required.'));

  db.prepare('INSERT INTO tasks (title, due_date) VALUES (?, ?)').run(title, req.body.due_date || null);
  res.redirect('/tasks?ok=' + encodeURIComponent('Task added.'));
});

router.post('/tasks/:id/toggle', (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).render('404');

  const completed = task.completed ? 0 : 1;
  db.prepare("UPDATE tasks SET completed = ?, completed_at = ? WHERE id = ?")
    .run(completed, completed ? new Date().toISOString() : null, task.id);

  if (req.get('X-Requested-With') === 'fetch') {
    return res.status(200).json({ completed: !!completed });
  }

  const back = req.get('Referer') || (task.client_id ? `/clients/${task.client_id}` : '/tasks');
  res.redirect(back);
});

router.post('/tasks/:id/delete', (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).render('404');
  db.prepare('DELETE FROM tasks WHERE id = ?').run(task.id);
  const back = task.client_id ? `/clients/${task.client_id}?ok=Task deleted.` : '/tasks?ok=Task deleted.';
  res.redirect(back);
});

module.exports = router;

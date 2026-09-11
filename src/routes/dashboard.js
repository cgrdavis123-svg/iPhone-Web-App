const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const clientCounts = db.prepare(`
    SELECT status, COUNT(*) AS n FROM clients GROUP BY status
  `).all();
  const counts = Object.fromEntries(clientCounts.map((r) => [r.status, r.n]));
  const totalClients = db.prepare('SELECT COUNT(*) AS n FROM clients').get().n;

  const openTasks = db.prepare(`
    SELECT tasks.*, clients.business_name AS client_name
    FROM tasks LEFT JOIN clients ON clients.id = tasks.client_id
    WHERE tasks.completed = 0
    ORDER BY (tasks.due_date IS NULL), tasks.due_date ASC, tasks.created_at DESC
    LIMIT 6
  `).all();

  const openTaskCount = db.prepare('SELECT COUNT(*) AS n FROM tasks WHERE completed = 0').get().n;

  const unpaidTotal = db.prepare(`
    SELECT COALESCE(SUM(ii.quantity * ii.unit_price), 0) AS total
    FROM invoices i JOIN invoice_items ii ON ii.invoice_id = i.id
    WHERE i.status IN ('draft', 'sent', 'overdue')
  `).get().total;

  const monthlyRecurring = db.prepare(`
    SELECT COALESCE(SUM(monthly_value), 0) AS total FROM clients WHERE status = 'active'
  `).get().total;

  const recentNotes = db.prepare(`
    SELECT notes.*, clients.business_name AS client_name
    FROM notes JOIN clients ON clients.id = notes.client_id
    ORDER BY notes.created_at DESC LIMIT 5
  `).all();

  res.render('dashboard', {
    title: 'Home',
    counts,
    totalClients,
    openTasks,
    openTaskCount,
    unpaidTotal,
    monthlyRecurring,
    recentNotes,
  });
});

module.exports = router;

const express = require('express');
const db = require('../db');

const router = express.Router();

const STATUSES = ['lead', 'active', 'on_hold', 'past'];
const INDUSTRIES = ['Restaurant', 'Retail', 'Home Services', 'Health & Wellness', 'Professional Services', 'Real Estate', 'Nonprofit', 'Other'];
const SOURCES = ['Referral', 'Cold Outreach', 'Networking Event', 'Inbound / Website', 'Social Media', 'Other'];

router.get('/clients', (req, res) => {
  const q = (req.query.q || '').trim();
  const status = req.query.status || '';

  let sql = 'SELECT * FROM clients WHERE 1=1';
  const params = [];

  if (q) {
    sql += ' AND (business_name LIKE ? OR contact_name LIKE ? OR email LIKE ?)';
    const like = `%${q}%`;
    params.push(like, like, like);
  }
  if (status && STATUSES.includes(status)) {
    sql += ' AND status = ?';
    params.push(status);
  }
  sql += ' ORDER BY business_name COLLATE NOCASE ASC';

  const clients = db.prepare(sql).all(...params);

  res.render('clients/list', { title: 'Clients', clients, q, status, STATUSES });
});

router.get('/clients/new', (req, res) => {
  res.render('clients/form', {
    title: 'New Client',
    clientRecord: null,
    STATUSES,
    INDUSTRIES,
    SOURCES,
  });
});

router.post('/clients', (req, res) => {
  const b = req.body;
  if (!b.business_name || !b.business_name.trim()) {
    return res.redirect('/clients/new?err=' + encodeURIComponent('Business name is required.'));
  }

  const info = db.prepare(`
    INSERT INTO clients (business_name, contact_name, email, phone, address, website, industry, status, source, monthly_value, notes)
    VALUES (@business_name, @contact_name, @email, @phone, @address, @website, @industry, @status, @source, @monthly_value, @notes)
  `).run({
    business_name: b.business_name.trim(),
    contact_name: b.contact_name || null,
    email: b.email || null,
    phone: b.phone || null,
    address: b.address || null,
    website: b.website || null,
    industry: b.industry || null,
    status: STATUSES.includes(b.status) ? b.status : 'lead',
    source: b.source || null,
    monthly_value: parseFloat(b.monthly_value) || 0,
    notes: b.notes || null,
  });

  res.redirect(`/clients/${info.lastInsertRowid}?ok=${encodeURIComponent('Client created.')}`);
});

router.get('/clients/:id', (req, res) => {
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
  if (!client) return res.status(404).render('404');

  const projects = db.prepare('SELECT * FROM projects WHERE client_id = ? ORDER BY created_at DESC').all(client.id);
  const tasks = db.prepare('SELECT * FROM tasks WHERE client_id = ? ORDER BY completed ASC, (due_date IS NULL), due_date ASC, created_at DESC').all(client.id);
  const notes = db.prepare('SELECT * FROM notes WHERE client_id = ? ORDER BY created_at DESC').all(client.id);
  const invoices = db.prepare('SELECT * FROM invoices WHERE client_id = ? ORDER BY created_at DESC').all(client.id);
  const files = db.prepare('SELECT * FROM files WHERE client_id = ? ORDER BY created_at DESC').all(client.id);

  const invoiceTotals = db.prepare(`
    SELECT i.id, COALESCE(SUM(ii.quantity * ii.unit_price), 0) AS total
    FROM invoices i LEFT JOIN invoice_items ii ON ii.invoice_id = i.id
    WHERE i.client_id = ?
    GROUP BY i.id
  `).all(client.id);
  const totalsById = Object.fromEntries(invoiceTotals.map((r) => [r.id, r.total]));

  res.render('clients/show', {
    title: client.business_name,
    clientRecord: client,
    projects,
    tasks,
    notes,
    invoices,
    files,
    totalsById,
  });
});

router.get('/clients/:id/edit', (req, res) => {
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
  if (!client) return res.status(404).render('404');
  res.render('clients/form', {
    title: `Edit ${client.business_name}`,
    clientRecord: client,
    STATUSES,
    INDUSTRIES,
    SOURCES,
  });
});

router.post('/clients/:id/edit', (req, res) => {
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
  if (!client) return res.status(404).render('404');

  const b = req.body;
  if (!b.business_name || !b.business_name.trim()) {
    return res.redirect(`/clients/${client.id}/edit?err=` + encodeURIComponent('Business name is required.'));
  }

  db.prepare(`
    UPDATE clients SET
      business_name = @business_name, contact_name = @contact_name, email = @email, phone = @phone,
      address = @address, website = @website, industry = @industry, status = @status, source = @source,
      monthly_value = @monthly_value, notes = @notes, updated_at = datetime('now')
    WHERE id = @id
  `).run({
    id: client.id,
    business_name: b.business_name.trim(),
    contact_name: b.contact_name || null,
    email: b.email || null,
    phone: b.phone || null,
    address: b.address || null,
    website: b.website || null,
    industry: b.industry || null,
    status: STATUSES.includes(b.status) ? b.status : client.status,
    source: b.source || null,
    monthly_value: parseFloat(b.monthly_value) || 0,
    notes: b.notes || null,
  });

  res.redirect(`/clients/${client.id}?ok=${encodeURIComponent('Client updated.')}`);
});

router.post('/clients/:id/delete', (req, res) => {
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
  if (!client) return res.status(404).render('404');
  db.prepare('DELETE FROM clients WHERE id = ?').run(client.id);
  res.redirect('/clients?ok=' + encodeURIComponent('Client deleted.'));
});

module.exports = router;

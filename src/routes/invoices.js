const express = require('express');
const db = require('../db');

const router = express.Router();

const STATUSES = ['draft', 'sent', 'paid', 'overdue', 'void'];

function nextInvoiceNumber() {
  const year = new Date().getFullYear();
  const count = db.prepare("SELECT COUNT(*) AS n FROM invoices WHERE invoice_number LIKE ?").get(`INV-${year}-%`).n;
  return `INV-${year}-${String(count + 1).padStart(3, '0')}`;
}

function totalsFor(invoiceId) {
  const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY id ASC').all(invoiceId);
  const total = items.reduce((sum, it) => sum + it.quantity * it.unit_price, 0);
  return { items, total };
}

router.get('/invoices', (req, res) => {
  const status = req.query.status || '';
  let sql = `
    SELECT invoices.*, clients.business_name AS client_name
    FROM invoices JOIN clients ON clients.id = invoices.client_id
    WHERE 1=1
  `;
  const params = [];
  if (status && STATUSES.includes(status)) {
    sql += ' AND invoices.status = ?';
    params.push(status);
  }
  sql += ' ORDER BY invoices.created_at DESC';

  const invoices = db.prepare(sql).all(...params);
  const withTotals = invoices.map((inv) => ({ ...inv, total: totalsFor(inv.id).total }));

  res.render('invoices/index', { title: 'Invoices', invoices: withTotals, status, STATUSES });
});

router.get('/clients/:clientId/invoices/new', (req, res) => {
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.clientId);
  if (!client) return res.status(404).render('404');
  res.render('invoices/new', { title: 'New Invoice', clientRecord: client, suggestedNumber: nextInvoiceNumber() });
});

router.post('/clients/:clientId/invoices', (req, res) => {
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.clientId);
  if (!client) return res.status(404).render('404');

  const b = req.body;
  const invoiceNumber = (b.invoice_number || '').trim() || nextInvoiceNumber();

  const info = db.prepare(`
    INSERT INTO invoices (client_id, invoice_number, issue_date, due_date, notes)
    VALUES (?, ?, ?, ?, ?)
  `).run(client.id, invoiceNumber, b.issue_date || new Date().toISOString().slice(0, 10), b.due_date || null, b.notes || null);

  const invoiceId = info.lastInsertRowid;

  const descriptions = [].concat(b.item_description || []);
  const quantities = [].concat(b.item_quantity || []);
  const prices = [].concat(b.item_price || []);

  const insertItem = db.prepare('INSERT INTO invoice_items (invoice_id, description, quantity, unit_price) VALUES (?, ?, ?, ?)');
  descriptions.forEach((desc, idx) => {
    if (!desc || !desc.trim()) return;
    insertItem.run(invoiceId, desc.trim(), parseFloat(quantities[idx]) || 1, parseFloat(prices[idx]) || 0);
  });

  res.redirect(`/invoices/${invoiceId}?ok=` + encodeURIComponent('Invoice created.'));
});

router.get('/invoices/:id', (req, res) => {
  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
  if (!invoice) return res.status(404).render('404');
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(invoice.client_id);
  const { items, total } = totalsFor(invoice.id);

  res.render('invoices/show', { title: `Invoice ${invoice.invoice_number}`, invoice, clientRecord: client, items, total, STATUSES });
});

router.post('/invoices/:id/items', (req, res) => {
  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
  if (!invoice) return res.status(404).render('404');

  const description = (req.body.description || '').trim();
  if (!description) return res.redirect(`/invoices/${invoice.id}?err=` + encodeURIComponent('Item description is required.'));

  db.prepare('INSERT INTO invoice_items (invoice_id, description, quantity, unit_price) VALUES (?, ?, ?, ?)')
    .run(invoice.id, description, parseFloat(req.body.quantity) || 1, parseFloat(req.body.unit_price) || 0);

  res.redirect(`/invoices/${invoice.id}?ok=` + encodeURIComponent('Item added.'));
});

router.post('/invoice-items/:id/delete', (req, res) => {
  const item = db.prepare('SELECT * FROM invoice_items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).render('404');
  db.prepare('DELETE FROM invoice_items WHERE id = ?').run(item.id);
  res.redirect(`/invoices/${item.invoice_id}?ok=` + encodeURIComponent('Item removed.'));
});

router.post('/invoices/:id/status', (req, res) => {
  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
  if (!invoice) return res.status(404).render('404');
  const status = STATUSES.includes(req.body.status) ? req.body.status : invoice.status;
  db.prepare('UPDATE invoices SET status = ? WHERE id = ?').run(status, invoice.id);
  res.redirect(`/invoices/${invoice.id}?ok=` + encodeURIComponent('Invoice updated.'));
});

router.post('/invoices/:id/delete', (req, res) => {
  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
  if (!invoice) return res.status(404).render('404');
  db.prepare('DELETE FROM invoices WHERE id = ?').run(invoice.id);
  res.redirect(`/clients/${invoice.client_id}?ok=` + encodeURIComponent('Invoice deleted.'));
});

module.exports = router;

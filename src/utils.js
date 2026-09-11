function money(n) {
  const num = Number(n) || 0;
  return num.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function shortDate(str) {
  if (!str) return '';
  const d = new Date(str.length <= 10 ? `${str}T00:00:00` : str);
  if (Number.isNaN(d.getTime())) return str;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function relativeTime(str) {
  if (!str) return '';
  const d = new Date(`${str.replace(' ', 'T')}Z`);
  if (Number.isNaN(d.getTime())) return str;
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return shortDate(str);
}

function statusLabel(status) {
  return String(status || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function isOverdue(dueDate, completed) {
  if (!dueDate || completed) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${dueDate}T00:00:00`);
  return due < today;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

module.exports = { money, shortDate, relativeTime, statusLabel, isOverdue, todayISO };

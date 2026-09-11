// Small progressive enhancements — the app works fully without JS too.

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-confirm]');
  if (el && !window.confirm(el.getAttribute('data-confirm'))) {
    e.preventDefault();
  }
});

// Instant task-complete toggle (falls back to normal form submit if fetch fails).
document.addEventListener('click', async (e) => {
  const check = e.target.closest('.task-row__check');
  if (!check) return;
  e.preventDefault();
  const form = check.closest('form');
  if (!form) return;

  check.classList.toggle('is-done');
  const title = form.closest('.task-row')?.querySelector('.task-row__title');
  if (title) title.classList.toggle('is-done');

  try {
    const res = await fetch(form.action, { method: 'POST', headers: { 'X-Requested-With': 'fetch' } });
    if (!res.ok) throw new Error('toggle failed');
  } catch (err) {
    // Fall back to a real navigation if the fetch failed.
    form.submit();
  }
});

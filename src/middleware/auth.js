function requireAuth(req, res, next) {
  if (req.session && req.session.userId) return next();
  req.session.returnTo = req.originalUrl;
  return res.redirect('/login');
}

function attachUser(db) {
  return (req, res, next) => {
    if (req.session && req.session.userId) {
      const user = db.prepare('SELECT id, email, name FROM users WHERE id = ?').get(req.session.userId);
      res.locals.currentUser = user || null;
    } else {
      res.locals.currentUser = null;
    }
    next();
  };
}

module.exports = { requireAuth, attachUser };

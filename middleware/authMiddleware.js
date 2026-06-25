function ensureAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }

  req.session.error = 'Please login first.';
  return res.redirect('/login');
}

function redirectIfAuthenticated(req, res, next) {
  if (!req.session || !req.session.user) {
    return next();
  }

  const { role } = req.session.user;
  if (role === 'admin') return res.redirect('/admin/dashboard');
  if (role === 'teacher') return res.redirect('/teacher/dashboard');
  if (role === 'parent') return res.redirect('/parent/dashboard');

  return next();
}

module.exports = {
  ensureAuthenticated,
  redirectIfAuthenticated
};

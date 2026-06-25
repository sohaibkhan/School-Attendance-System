function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      req.session.error = 'Please login first.';
      return res.redirect('/login');
    }

    if (!allowedRoles.includes(req.session.user.role)) {
      return res.status(403).render('error', {
        message: 'Access denied. You are not allowed to open this page.'
      });
    }

    return next();
  };
}

module.exports = authorizeRoles;

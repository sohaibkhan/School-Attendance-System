const bcrypt = require('bcrypt');
const db = require('../config/db');

exports.showLogin = (req, res) => {
  res.render('login');
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      req.session.error = 'Email and password are required.';
      return res.redirect('/login');
    }

    const [users] = await db.query(
      'SELECT id, name, email, password, role, status FROM users WHERE email = ? LIMIT 1',
      [email]
    );

    if (users.length === 0) {
      req.session.error = 'Invalid email or password.';
      return res.redirect('/login');
    }

    const user = users[0];

    if (user.status !== 'active') {
      req.session.error = 'Your account is inactive. Please contact admin.';
      return res.redirect('/login');
    }

    const passwordMatched = await bcrypt.compare(password, user.password);
    if (!passwordMatched) {
      req.session.error = 'Invalid email or password.';
      return res.redirect('/login');
    }

    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    if (user.role === 'admin') return res.redirect('/admin/dashboard');
    if (user.role === 'teacher') return res.redirect('/teacher/dashboard');
    if (user.role === 'parent') return res.redirect('/parent/dashboard');

    return res.redirect('/login');
  } catch (error) {
    console.error(error);
    req.session.error = 'Something went wrong during login.';
    return res.redirect('/login');
  }
};

exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
};

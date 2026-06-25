require('dotenv').config();

const express = require('express');
const path = require('path');
const session = require('express-session');

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const parentRoutes = require('./routes/parentRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'school_attendance_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 4
    }
  })
);

// Global values available in all EJS views
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.success = req.session.success || null;
  res.locals.error = req.session.error || null;
  delete req.session.success;
  delete req.session.error;

  res.locals.formatDate = (dateValue) => {
    if (!dateValue) return '';
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return dateValue;
    return date.toISOString().slice(0, 10);
  };

  next();
});

app.get('/', (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  if (req.session.user.role === 'admin') return res.redirect('/admin/dashboard');
  if (req.session.user.role === 'teacher') return res.redirect('/teacher/dashboard');
  if (req.session.user.role === 'parent') return res.redirect('/parent/dashboard');

  return res.redirect('/login');
});

app.use('/', authRoutes);
app.use('/admin', adminRoutes);
app.use('/teacher', teacherRoutes);
app.use('/parent', parentRoutes);

app.use((req, res) => {
  res.status(404).render('error', { message: 'Page not found' });
});

app.listen(PORT, () => {
  console.log(`Smart School Attendance app running on http://localhost:${PORT}`);
});

const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;

const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);

const sessionStore = new MySQLStore({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === 'true'
    ? { rejectUnauthorized: true }
    : undefined
});

app.use(session({
  key: 'school_attendance_session',
  secret: process.env.SESSION_SECRET,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24
  }
}));

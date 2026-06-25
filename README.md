# Smart School Attendance & Parent Notification System

Database-based School Attendance Management and Parent Notification Portal built with:

- Node.js
- Express.js
- MySQL
- EJS
- Bootstrap
- JavaScript
- express-session
- bcrypt
- mysql2
- dotenv

## Main Features

### Admin
- Dashboard summary cards
- Manage teachers
- Manage parents
- Manage students
- Manage classes
- Attendance reports with filters

### Teacher
- Teacher dashboard
- View assigned classes only
- Mark attendance for assigned class only
- Update attendance if it already exists for same student, class, and date
- Automatically create parent notification when student is marked Absent
- View previous attendance records for assigned classes only

### Parent
- Parent dashboard
- View linked children only
- View child attendance history
- View unread notification count
- Mark notifications as read

## Setup Instructions

### 1. Install dependencies

```bash
npm install
```

Recommended Node version: Node.js 20 LTS.

If `bcrypt` fails to install on your system, install build tools or switch to Node 20 LTS. `bcrypt` is a native package and sometimes fails on unsupported Node versions.

### 2. Configure environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

The provided Aiven MySQL credentials are already placed in `.env.example` and `.env` for your testing.

### 3. Import MySQL database

Import this SQL file into your Aiven database:

```bash
mysql --host=mysql-3c1331f4-mk-564b.h.aivencloud.com \
  --port=10637 \
  --user=avnadmin \
  --password \
  --ssl-mode=REQUIRED \
  defaultdb < school_attendance_schema_seed.sql
```

### 4. Run project

```bash
npm run dev
```

or

```bash
npm start
```

Open:

```text
http://localhost:3000
```

## Demo Users

All demo user passwords are:

```text
password
```

- Admin: `admin@school.com`
- Teacher: `teacher@school.com`
- Parent: `parent@school.com`

## Important Security Notes

- Do not commit `.env` to GitHub.
- Change `SESSION_SECRET` before production use.
- For production Aiven SSL, download the CA certificate from Aiven and use strict certificate verification.
- Email, SMS, WhatsApp, PDF export, homework, quiz, result portal and fee management are future features and are not part of this MVP.

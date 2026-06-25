const bcrypt = require('bcrypt');
const db = require('../config/db');

function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

async function getActiveTeachers() {
  const [rows] = await db.query(
    "SELECT id, name, email FROM users WHERE role = 'teacher' AND status = 'active' ORDER BY name"
  );
  return rows;
}

async function getActiveParents() {
  const [rows] = await db.query(
    "SELECT id, name, email FROM users WHERE role = 'parent' AND status = 'active' ORDER BY name"
  );
  return rows;
}

async function getClasses() {
  const [rows] = await db.query(
    `SELECT c.*, u.name AS teacher_name
     FROM classes c
     LEFT JOIN users u ON u.id = c.teacher_id
     ORDER BY c.name, c.section`
  );
  return rows;
}

function validateUserInput({ name, email, password }, requirePassword = true) {
  if (!name || !email) return 'Name and email are required.';
  if (requirePassword && !password) return 'Password is required.';
  if (!email.includes('@')) return 'Please enter a valid email address.';
  if (password && password.length < 6) return 'Password must be at least 6 characters.';
  return null;
}

exports.dashboard = async (req, res) => {
  try {
    const [[teachers]] = await db.query("SELECT COUNT(*) AS total FROM users WHERE role = 'teacher'");
    const [[parents]] = await db.query("SELECT COUNT(*) AS total FROM users WHERE role = 'parent'");
    const [[students]] = await db.query('SELECT COUNT(*) AS total FROM students');
    const [[classes]] = await db.query('SELECT COUNT(*) AS total FROM classes');
    const [[attendance]] = await db.query('SELECT COUNT(*) AS total FROM attendances');

    res.render('admin/dashboard', {
      counts: {
        teachers: teachers.total,
        parents: parents.total,
        students: students.total,
        classes: classes.total,
        attendance: attendance.total
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { message: 'Unable to load admin dashboard.' });
  }
};

exports.listTeachers = async (req, res) => {
  try {
    const [teachers] = await db.query(
      "SELECT id, name, email, status, created_at FROM users WHERE role = 'teacher' ORDER BY id DESC"
    );
    res.render('admin/teachers', { teachers, editTeacher: null });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { message: 'Unable to load teachers.' });
  }
};

exports.createTeacher = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const validationError = validateUserInput({ name, email, password }, true);
    if (validationError) {
      req.session.error = validationError;
      return res.redirect('/admin/teachers');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.query(
      "INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, 'teacher', 'active')",
      [name, email, hashedPassword]
    );

    req.session.success = 'Teacher added successfully.';
    return res.redirect('/admin/teachers');
  } catch (error) {
    console.error(error);
    req.session.error = error.code === 'ER_DUP_ENTRY' ? 'Email already exists.' : 'Unable to add teacher.';
    return res.redirect('/admin/teachers');
  }
};

exports.editTeacherForm = async (req, res) => {
  try {
    const [teachers] = await db.query(
      "SELECT id, name, email, status, created_at FROM users WHERE role = 'teacher' ORDER BY id DESC"
    );
    const [editRows] = await db.query(
      "SELECT id, name, email, status FROM users WHERE id = ? AND role = 'teacher' LIMIT 1",
      [req.params.id]
    );

    if (editRows.length === 0) {
      req.session.error = 'Teacher not found.';
      return res.redirect('/admin/teachers');
    }

    return res.render('admin/teachers', { teachers, editTeacher: editRows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { message: 'Unable to load teacher edit form.' });
  }
};

exports.updateTeacher = async (req, res) => {
  try {
    const { name, email, password, status } = req.body;
    const validationError = validateUserInput({ name, email, password }, false);
    if (validationError) {
      req.session.error = validationError;
      return res.redirect(`/admin/teachers/${req.params.id}/edit`);
    }

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await db.query(
        "UPDATE users SET name = ?, email = ?, password = ?, status = ? WHERE id = ? AND role = 'teacher'",
        [name, email, hashedPassword, status, req.params.id]
      );
    } else {
      await db.query(
        "UPDATE users SET name = ?, email = ?, status = ? WHERE id = ? AND role = 'teacher'",
        [name, email, status, req.params.id]
      );
    }

    req.session.success = 'Teacher updated successfully.';
    return res.redirect('/admin/teachers');
  } catch (error) {
    console.error(error);
    req.session.error = error.code === 'ER_DUP_ENTRY' ? 'Email already exists.' : 'Unable to update teacher.';
    return res.redirect(`/admin/teachers/${req.params.id}/edit`);
  }
};

exports.deleteTeacher = async (req, res) => {
  try {
    await db.query("DELETE FROM users WHERE id = ? AND role = 'teacher'", [req.params.id]);
    req.session.success = 'Teacher deleted successfully.';
    return res.redirect('/admin/teachers');
  } catch (error) {
    console.error(error);
    req.session.error = 'Unable to delete teacher.';
    return res.redirect('/admin/teachers');
  }
};

exports.toggleTeacherStatus = async (req, res) => {
  try {
    await db.query(
      "UPDATE users SET status = IF(status = 'active', 'inactive', 'active') WHERE id = ? AND role = 'teacher'",
      [req.params.id]
    );
    req.session.success = 'Teacher status updated.';
    return res.redirect('/admin/teachers');
  } catch (error) {
    console.error(error);
    req.session.error = 'Unable to update teacher status.';
    return res.redirect('/admin/teachers');
  }
};

exports.listParents = async (req, res) => {
  try {
    const [parents] = await db.query(
      "SELECT id, name, email, status, created_at FROM users WHERE role = 'parent' ORDER BY id DESC"
    );
    res.render('admin/parents', { parents, editParent: null });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { message: 'Unable to load parents.' });
  }
};

exports.createParent = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const validationError = validateUserInput({ name, email, password }, true);
    if (validationError) {
      req.session.error = validationError;
      return res.redirect('/admin/parents');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.query(
      "INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, 'parent', 'active')",
      [name, email, hashedPassword]
    );

    req.session.success = 'Parent added successfully.';
    return res.redirect('/admin/parents');
  } catch (error) {
    console.error(error);
    req.session.error = error.code === 'ER_DUP_ENTRY' ? 'Email already exists.' : 'Unable to add parent.';
    return res.redirect('/admin/parents');
  }
};

exports.editParentForm = async (req, res) => {
  try {
    const [parents] = await db.query(
      "SELECT id, name, email, status, created_at FROM users WHERE role = 'parent' ORDER BY id DESC"
    );
    const [editRows] = await db.query(
      "SELECT id, name, email, status FROM users WHERE id = ? AND role = 'parent' LIMIT 1",
      [req.params.id]
    );

    if (editRows.length === 0) {
      req.session.error = 'Parent not found.';
      return res.redirect('/admin/parents');
    }

    return res.render('admin/parents', { parents, editParent: editRows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { message: 'Unable to load parent edit form.' });
  }
};

exports.updateParent = async (req, res) => {
  try {
    const { name, email, password, status } = req.body;
    const validationError = validateUserInput({ name, email, password }, false);
    if (validationError) {
      req.session.error = validationError;
      return res.redirect(`/admin/parents/${req.params.id}/edit`);
    }

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await db.query(
        "UPDATE users SET name = ?, email = ?, password = ?, status = ? WHERE id = ? AND role = 'parent'",
        [name, email, hashedPassword, status, req.params.id]
      );
    } else {
      await db.query(
        "UPDATE users SET name = ?, email = ?, status = ? WHERE id = ? AND role = 'parent'",
        [name, email, status, req.params.id]
      );
    }

    req.session.success = 'Parent updated successfully.';
    return res.redirect('/admin/parents');
  } catch (error) {
    console.error(error);
    req.session.error = error.code === 'ER_DUP_ENTRY' ? 'Email already exists.' : 'Unable to update parent.';
    return res.redirect(`/admin/parents/${req.params.id}/edit`);
  }
};

exports.deleteParent = async (req, res) => {
  try {
    await db.query("DELETE FROM users WHERE id = ? AND role = 'parent'", [req.params.id]);
    req.session.success = 'Parent deleted successfully.';
    return res.redirect('/admin/parents');
  } catch (error) {
    console.error(error);
    req.session.error = 'Unable to delete parent.';
    return res.redirect('/admin/parents');
  }
};

exports.toggleParentStatus = async (req, res) => {
  try {
    await db.query(
      "UPDATE users SET status = IF(status = 'active', 'inactive', 'active') WHERE id = ? AND role = 'parent'",
      [req.params.id]
    );
    req.session.success = 'Parent status updated.';
    return res.redirect('/admin/parents');
  } catch (error) {
    console.error(error);
    req.session.error = 'Unable to update parent status.';
    return res.redirect('/admin/parents');
  }
};

exports.listStudents = async (req, res) => {
  try {
    const [students] = await db.query(
      `SELECT s.*, c.name AS class_name, c.section,
              GROUP_CONCAT(u.name ORDER BY u.name SEPARATOR ', ') AS parent_names
       FROM students s
       LEFT JOIN classes c ON c.id = s.class_id
       LEFT JOIN parent_student ps ON ps.student_id = s.id
       LEFT JOIN users u ON u.id = ps.parent_id
       GROUP BY s.id
       ORDER BY s.id DESC`
    );
    res.render('admin/students', {
      students,
      classes: await getClasses(),
      parents: await getActiveParents(),
      editStudent: null,
      selectedParentIds: []
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { message: 'Unable to load students.' });
  }
};

exports.createStudent = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { name, roll_number, class_id, status } = req.body;
    const parentIds = toArray(req.body.parent_ids);

    if (!name || !roll_number || !class_id) {
      req.session.error = 'Student name, roll number, and class are required.';
      return res.redirect('/admin/students');
    }

    await connection.beginTransaction();

    const [result] = await connection.query(
      'INSERT INTO students (name, roll_number, class_id, status) VALUES (?, ?, ?, ?)',
      [name, roll_number, class_id, status || 'active']
    );

    for (const parentId of parentIds) {
      await connection.query(
        'INSERT IGNORE INTO parent_student (parent_id, student_id) VALUES (?, ?)',
        [parentId, result.insertId]
      );
    }

    await connection.commit();
    req.session.success = 'Student added successfully.';
    return res.redirect('/admin/students');
  } catch (error) {
    await connection.rollback();
    console.error(error);
    req.session.error = error.code === 'ER_DUP_ENTRY' ? 'Roll number already exists for this class.' : 'Unable to add student.';
    return res.redirect('/admin/students');
  } finally {
    connection.release();
  }
};

exports.editStudentForm = async (req, res) => {
  try {
    const [students] = await db.query(
      `SELECT s.*, c.name AS class_name, c.section,
              GROUP_CONCAT(u.name ORDER BY u.name SEPARATOR ', ') AS parent_names
       FROM students s
       LEFT JOIN classes c ON c.id = s.class_id
       LEFT JOIN parent_student ps ON ps.student_id = s.id
       LEFT JOIN users u ON u.id = ps.parent_id
       GROUP BY s.id
       ORDER BY s.id DESC`
    );
    const [editRows] = await db.query('SELECT * FROM students WHERE id = ? LIMIT 1', [req.params.id]);
    if (editRows.length === 0) {
      req.session.error = 'Student not found.';
      return res.redirect('/admin/students');
    }

    const [parentRows] = await db.query('SELECT parent_id FROM parent_student WHERE student_id = ?', [req.params.id]);
    const selectedParentIds = parentRows.map((row) => Number(row.parent_id));

    return res.render('admin/students', {
      students,
      classes: await getClasses(),
      parents: await getActiveParents(),
      editStudent: editRows[0],
      selectedParentIds
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { message: 'Unable to load student edit form.' });
  }
};

exports.updateStudent = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { name, roll_number, class_id, status } = req.body;
    const parentIds = toArray(req.body.parent_ids);

    if (!name || !roll_number || !class_id) {
      req.session.error = 'Student name, roll number, and class are required.';
      return res.redirect(`/admin/students/${req.params.id}/edit`);
    }

    await connection.beginTransaction();

    await connection.query(
      'UPDATE students SET name = ?, roll_number = ?, class_id = ?, status = ? WHERE id = ?',
      [name, roll_number, class_id, status || 'active', req.params.id]
    );

    await connection.query('DELETE FROM parent_student WHERE student_id = ?', [req.params.id]);

    for (const parentId of parentIds) {
      await connection.query(
        'INSERT IGNORE INTO parent_student (parent_id, student_id) VALUES (?, ?)',
        [parentId, req.params.id]
      );
    }

    await connection.commit();
    req.session.success = 'Student updated successfully.';
    return res.redirect('/admin/students');
  } catch (error) {
    await connection.rollback();
    console.error(error);
    req.session.error = error.code === 'ER_DUP_ENTRY' ? 'Roll number already exists for this class.' : 'Unable to update student.';
    return res.redirect(`/admin/students/${req.params.id}/edit`);
  } finally {
    connection.release();
  }
};

exports.deleteStudent = async (req, res) => {
  try {
    await db.query('DELETE FROM students WHERE id = ?', [req.params.id]);
    req.session.success = 'Student deleted successfully.';
    return res.redirect('/admin/students');
  } catch (error) {
    console.error(error);
    req.session.error = 'Unable to delete student.';
    return res.redirect('/admin/students');
  }
};

exports.listClasses = async (req, res) => {
  try {
    const classes = await getClasses();
    res.render('admin/classes', {
      classes,
      teachers: await getActiveTeachers(),
      editClass: null
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { message: 'Unable to load classes.' });
  }
};

exports.createClass = async (req, res) => {
  try {
    const { name, section, teacher_id } = req.body;

    if (!name || !section || !teacher_id) {
      req.session.error = 'Class name, section, and teacher are required.';
      return res.redirect('/admin/classes');
    }

    await db.query('INSERT INTO classes (name, section, teacher_id) VALUES (?, ?, ?)', [name, section, teacher_id]);
    req.session.success = 'Class added successfully.';
    return res.redirect('/admin/classes');
  } catch (error) {
    console.error(error);
    req.session.error = error.code === 'ER_DUP_ENTRY' ? 'This class and section already exists.' : 'Unable to add class.';
    return res.redirect('/admin/classes');
  }
};

exports.editClassForm = async (req, res) => {
  try {
    const classes = await getClasses();
    const [editRows] = await db.query('SELECT * FROM classes WHERE id = ? LIMIT 1', [req.params.id]);
    if (editRows.length === 0) {
      req.session.error = 'Class not found.';
      return res.redirect('/admin/classes');
    }

    return res.render('admin/classes', {
      classes,
      teachers: await getActiveTeachers(),
      editClass: editRows[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { message: 'Unable to load class edit form.' });
  }
};

exports.updateClass = async (req, res) => {
  try {
    const { name, section, teacher_id } = req.body;

    if (!name || !section || !teacher_id) {
      req.session.error = 'Class name, section, and teacher are required.';
      return res.redirect(`/admin/classes/${req.params.id}/edit`);
    }

    await db.query('UPDATE classes SET name = ?, section = ?, teacher_id = ? WHERE id = ?', [
      name,
      section,
      teacher_id,
      req.params.id
    ]);

    req.session.success = 'Class updated successfully.';
    return res.redirect('/admin/classes');
  } catch (error) {
    console.error(error);
    req.session.error = error.code === 'ER_DUP_ENTRY' ? 'This class and section already exists.' : 'Unable to update class.';
    return res.redirect(`/admin/classes/${req.params.id}/edit`);
  }
};

exports.deleteClass = async (req, res) => {
  try {
    await db.query('DELETE FROM classes WHERE id = ?', [req.params.id]);
    req.session.success = 'Class deleted successfully.';
    return res.redirect('/admin/classes');
  } catch (error) {
    console.error(error);
    req.session.error = 'Unable to delete class.';
    return res.redirect('/admin/classes');
  }
};

exports.reports = async (req, res) => {
  try {
    const { class_id, student_id, attendance_date, status } = req.query;
    const conditions = [];
    const params = [];

    if (class_id) {
      conditions.push('a.class_id = ?');
      params.push(class_id);
    }
    if (student_id) {
      conditions.push('a.student_id = ?');
      params.push(student_id);
    }
    if (attendance_date) {
      conditions.push('a.attendance_date = ?');
      params.push(attendance_date);
    }
    if (status) {
      conditions.push('a.status = ?');
      params.push(status);
    }

    const whereSql = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [records] = await db.query(
      `SELECT a.*, s.name AS student_name, s.roll_number,
              c.name AS class_name, c.section,
              u.name AS teacher_name
       FROM attendances a
       JOIN students s ON s.id = a.student_id
       LEFT JOIN classes c ON c.id = a.class_id
       LEFT JOIN users u ON u.id = a.teacher_id
       ${whereSql}
       ORDER BY a.attendance_date DESC, c.name, s.roll_number`,
      params
    );

    const [students] = await db.query('SELECT id, name, roll_number FROM students ORDER BY name');

    res.render('admin/reports', {
      records,
      classes: await getClasses(),
      students,
      filters: { class_id, student_id, attendance_date, status }
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { message: 'Unable to load attendance reports.' });
  }
};

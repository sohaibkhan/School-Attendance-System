const db = require('../config/db');

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

async function teacherOwnsClass(teacherId, classId) {
  const [rows] = await db.query('SELECT id, name, section FROM classes WHERE id = ? AND teacher_id = ? LIMIT 1', [
    classId,
    teacherId
  ]);
  return rows[0] || null;
}

async function getTeacherClasses(teacherId) {
  const [classes] = await db.query('SELECT * FROM classes WHERE teacher_id = ? ORDER BY name, section', [teacherId]);
  return classes;
}

exports.dashboard = async (req, res) => {
  try {
    const teacherId = req.session.user.id;

    const [[classes]] = await db.query('SELECT COUNT(*) AS total FROM classes WHERE teacher_id = ?', [teacherId]);
    const [[students]] = await db.query(
      `SELECT COUNT(*) AS total
       FROM students s
       JOIN classes c ON c.id = s.class_id
       WHERE c.teacher_id = ?`,
      [teacherId]
    );
    const [[attendance]] = await db.query('SELECT COUNT(*) AS total FROM attendances WHERE teacher_id = ?', [teacherId]);
    const [[absent]] = await db.query(
      "SELECT COUNT(*) AS total FROM attendances WHERE teacher_id = ? AND status = 'Absent'",
      [teacherId]
    );

    res.render('teacher/dashboard', {
      counts: {
        classes: classes.total,
        students: students.total,
        attendance: attendance.total,
        absent: absent.total
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { message: 'Unable to load teacher dashboard.' });
  }
};

exports.classes = async (req, res) => {
  try {
    const [classes] = await db.query(
      `SELECT c.*, COUNT(s.id) AS total_students
       FROM classes c
       LEFT JOIN students s ON s.class_id = c.id
       WHERE c.teacher_id = ?
       GROUP BY c.id
       ORDER BY c.name, c.section`,
      [req.session.user.id]
    );

    res.render('teacher/classes', { classes });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { message: 'Unable to load assigned classes.' });
  }
};

exports.attendanceForm = async (req, res) => {
  try {
    const teacherId = req.session.user.id;
    const classes = await getTeacherClasses(teacherId);
    const selectedClassId = req.query.class_id || '';
    const attendanceDate = req.query.attendance_date || todayDate();
    let students = [];
    let selectedClass = null;

    if (selectedClassId) {
      selectedClass = await teacherOwnsClass(teacherId, selectedClassId);
      if (!selectedClass) {
        return res.status(403).render('error', {
          message: 'You are not allowed to take attendance for this class.'
        });
      }

      const [rows] = await db.query(
        `SELECT s.id, s.name, s.roll_number,
                COALESCE(a.status, 'Present') AS attendance_status,
                a.id AS attendance_id
         FROM students s
         LEFT JOIN attendances a
           ON a.student_id = s.id
          AND a.class_id = s.class_id
          AND a.attendance_date = ?
         WHERE s.class_id = ? AND s.status = 'active'
         ORDER BY s.roll_number, s.name`,
        [attendanceDate, selectedClassId]
      );
      students = rows;
    }

    res.render('teacher/attendance', {
      classes,
      students,
      selectedClassId,
      selectedClass,
      attendanceDate
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { message: 'Unable to load attendance form.' });
  }
};

exports.submitAttendance = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const teacherId = req.session.user.id;
    const { class_id, attendance_date } = req.body;

    if (!class_id || !attendance_date) {
      req.session.error = 'Class and attendance date are required.';
      return res.redirect('/teacher/attendance');
    }

    const selectedClass = await teacherOwnsClass(teacherId, class_id);
    if (!selectedClass) {
      return res.status(403).render('error', {
        message: 'You are not allowed to submit attendance for this class.'
      });
    }

    const [students] = await connection.query(
      "SELECT id, name FROM students WHERE class_id = ? AND status = 'active' ORDER BY roll_number, name",
      [class_id]
    );

    await connection.beginTransaction();

    for (const student of students) {
      const status = req.body[`status_${student.id}`];
      if (!['Present', 'Absent'].includes(status)) continue;

      await connection.query(
        `INSERT INTO attendances (student_id, class_id, teacher_id, attendance_date, status)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           teacher_id = VALUES(teacher_id),
           status = VALUES(status),
           updated_at = CURRENT_TIMESTAMP`,
        [student.id, class_id, teacherId, attendance_date, status]
      );

      const [attendanceRows] = await connection.query(
        'SELECT id FROM attendances WHERE student_id = ? AND class_id = ? AND attendance_date = ? LIMIT 1',
        [student.id, class_id, attendance_date]
      );

      const attendanceId = attendanceRows[0].id;

      if (status === 'Absent') {
        const [parents] = await connection.query(
          `SELECT u.id, u.name, u.email
           FROM parent_student ps
           JOIN users u ON u.id = ps.parent_id
           WHERE ps.student_id = ? AND u.role = 'parent' AND u.status = 'active'`,
          [student.id]
        );

        for (const parent of parents) {
          const [existingNotification] = await connection.query(
            'SELECT id FROM notifications WHERE parent_id = ? AND attendance_id = ? LIMIT 1',
            [parent.id, attendanceId]
          );

          if (existingNotification.length === 0) {
            await connection.query(
              `INSERT INTO notifications (parent_id, student_id, attendance_id, title, message, is_read)
               VALUES (?, ?, ?, ?, ?, 0)`,
              [
                parent.id,
                student.id,
                attendanceId,
                'Attendance Alert',
                `Your child ${student.name} was marked Absent on ${attendance_date}.`
              ]
            );
          }
        }
      }
    }

    await connection.commit();
    req.session.success = 'Attendance saved successfully.';
    return res.redirect(`/teacher/attendance?class_id=${class_id}&attendance_date=${attendance_date}`);
  } catch (error) {
    await connection.rollback();
    console.error(error);
    req.session.error = 'Unable to submit attendance.';
    return res.redirect('/teacher/attendance');
  } finally {
    connection.release();
  }
};

exports.records = async (req, res) => {
  try {
    const teacherId = req.session.user.id;
    const { class_id, attendance_date, status } = req.query;

    const conditions = ['c.teacher_id = ?'];
    const params = [teacherId];

    if (class_id) {
      conditions.push('a.class_id = ?');
      params.push(class_id);
    }
    if (attendance_date) {
      conditions.push('a.attendance_date = ?');
      params.push(attendance_date);
    }
    if (status) {
      conditions.push('a.status = ?');
      params.push(status);
    }

    const [records] = await db.query(
      `SELECT a.*, s.name AS student_name, s.roll_number,
              c.name AS class_name, c.section
       FROM attendances a
       JOIN students s ON s.id = a.student_id
       JOIN classes c ON c.id = a.class_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY a.attendance_date DESC, c.name, s.roll_number`,
      params
    );

    res.render('teacher/records', {
      records,
      classes: await getTeacherClasses(teacherId),
      filters: { class_id, attendance_date, status }
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { message: 'Unable to load attendance records.' });
  }
};

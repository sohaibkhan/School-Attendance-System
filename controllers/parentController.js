const db = require('../config/db');

async function getLinkedChildren(parentId) {
  const [children] = await db.query(
    `SELECT s.id, s.name, s.roll_number, s.status,
            c.name AS class_name, c.section
     FROM parent_student ps
     JOIN students s ON s.id = ps.student_id
     LEFT JOIN classes c ON c.id = s.class_id
     WHERE ps.parent_id = ?
     ORDER BY s.name`,
    [parentId]
  );
  return children;
}

exports.dashboard = async (req, res) => {
  try {
    const parentId = req.session.user.id;

    const children = await getLinkedChildren(parentId);
    const [[unread]] = await db.query(
      'SELECT COUNT(*) AS total FROM notifications WHERE parent_id = ? AND is_read = 0',
      [parentId]
    );
    const [recentNotifications] = await db.query(
      `SELECT n.*, s.name AS student_name
       FROM notifications n
       JOIN students s ON s.id = n.student_id
       WHERE n.parent_id = ?
       ORDER BY n.created_at DESC
       LIMIT 5`,
      [parentId]
    );

    res.render('parent/dashboard', {
      children,
      unreadCount: unread.total,
      recentNotifications
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { message: 'Unable to load parent dashboard.' });
  }
};

exports.attendance = async (req, res) => {
  try {
    const parentId = req.session.user.id;
    const { student_id, attendance_date, status } = req.query;

    const conditions = ['ps.parent_id = ?'];
    const params = [parentId];

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

    const [records] = await db.query(
      `SELECT a.*, s.name AS student_name, s.roll_number,
              c.name AS class_name, c.section,
              u.name AS teacher_name
       FROM attendances a
       JOIN students s ON s.id = a.student_id
       JOIN parent_student ps ON ps.student_id = s.id
       LEFT JOIN classes c ON c.id = a.class_id
       LEFT JOIN users u ON u.id = a.teacher_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY a.attendance_date DESC`,
      params
    );

    res.render('parent/attendance', {
      children: await getLinkedChildren(parentId),
      records,
      filters: { student_id, attendance_date, status }
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { message: 'Unable to load attendance history.' });
  }
};

exports.notifications = async (req, res) => {
  try {
    const parentId = req.session.user.id;
    const [[unread]] = await db.query(
      'SELECT COUNT(*) AS total FROM notifications WHERE parent_id = ? AND is_read = 0',
      [parentId]
    );
    const [notifications] = await db.query(
      `SELECT n.*, s.name AS student_name, a.attendance_date, a.status AS attendance_status
       FROM notifications n
       JOIN students s ON s.id = n.student_id
       LEFT JOIN attendances a ON a.id = n.attendance_id
       WHERE n.parent_id = ?
       ORDER BY n.created_at DESC`,
      [parentId]
    );

    res.render('parent/notifications', {
      notifications,
      unreadCount: unread.total
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { message: 'Unable to load notifications.' });
  }
};

exports.markNotificationRead = async (req, res) => {
  try {
    await db.query('UPDATE notifications SET is_read = 1 WHERE id = ? AND parent_id = ?', [
      req.params.id,
      req.session.user.id
    ]);
    req.session.success = 'Notification marked as read.';
    return res.redirect('/parent/notifications');
  } catch (error) {
    console.error(error);
    req.session.error = 'Unable to update notification.';
    return res.redirect('/parent/notifications');
  }
};

exports.markAllNotificationsRead = async (req, res) => {
  try {
    await db.query('UPDATE notifications SET is_read = 1 WHERE parent_id = ?', [req.session.user.id]);
    req.session.success = 'All notifications marked as read.';
    return res.redirect('/parent/notifications');
  } catch (error) {
    console.error(error);
    req.session.error = 'Unable to update notifications.';
    return res.redirect('/parent/notifications');
  }
};

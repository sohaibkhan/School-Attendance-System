const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacherController');
const { ensureAuthenticated } = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');

router.use(ensureAuthenticated, authorizeRoles('teacher'));

router.get('/dashboard', teacherController.dashboard);
router.get('/classes', teacherController.classes);
router.get('/attendance', teacherController.attendanceForm);
router.post('/attendance', teacherController.submitAttendance);
router.get('/records', teacherController.records);

module.exports = router;

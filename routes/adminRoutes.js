const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { ensureAuthenticated } = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');

router.use(ensureAuthenticated, authorizeRoles('admin'));

router.get('/dashboard', adminController.dashboard);

router.get('/teachers', adminController.listTeachers);
router.post('/teachers', adminController.createTeacher);
router.get('/teachers/:id/edit', adminController.editTeacherForm);
router.post('/teachers/:id/update', adminController.updateTeacher);
router.post('/teachers/:id/delete', adminController.deleteTeacher);
router.post('/teachers/:id/toggle', adminController.toggleTeacherStatus);

router.get('/parents', adminController.listParents);
router.post('/parents', adminController.createParent);
router.get('/parents/:id/edit', adminController.editParentForm);
router.post('/parents/:id/update', adminController.updateParent);
router.post('/parents/:id/delete', adminController.deleteParent);
router.post('/parents/:id/toggle', adminController.toggleParentStatus);

router.get('/students', adminController.listStudents);
router.post('/students', adminController.createStudent);
router.get('/students/:id/edit', adminController.editStudentForm);
router.post('/students/:id/update', adminController.updateStudent);
router.post('/students/:id/delete', adminController.deleteStudent);

router.get('/classes', adminController.listClasses);
router.post('/classes', adminController.createClass);
router.get('/classes/:id/edit', adminController.editClassForm);
router.post('/classes/:id/update', adminController.updateClass);
router.post('/classes/:id/delete', adminController.deleteClass);

router.get('/reports', adminController.reports);

module.exports = router;

const express = require('express');
const router = express.Router();
const parentController = require('../controllers/parentController');
const { ensureAuthenticated } = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');

router.use(ensureAuthenticated, authorizeRoles('parent'));

router.get('/dashboard', parentController.dashboard);
router.get('/attendance', parentController.attendance);
router.get('/notifications', parentController.notifications);
router.post('/notifications/:id/read', parentController.markNotificationRead);
router.post('/notifications/read-all', parentController.markAllNotificationsRead);

module.exports = router;

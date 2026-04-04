const express = require('express');
const { requireAuth } = require('../middleware/auth');
const {
  getMyNotifications,
  markNotificationRead,
} = require('../controllers/notificationController');

const router = express.Router();

router.get('/', requireAuth, getMyNotifications);
router.patch('/:id/read', requireAuth, markNotificationRead);

module.exports = router;

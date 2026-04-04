const { supabaseAdmin } = require('../services/supabaseAdmin');

async function getMyNotifications(req, res) {
  try {
    const userId = req.user.id;

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('id, type, title, message, action_url, is_read, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const unreadCount = (data || []).filter((item) => !item.is_read).length;

    return res.json({ notifications: data || [], unreadCount });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to load notifications' });
  }
}

async function markNotificationRead(req, res) {
  try {
    const notificationId = Number(req.params.id);

    if (!notificationId || Number.isNaN(notificationId) || notificationId <= 0) {
      return res.status(400).json({ error: 'Invalid notification id' });
    }

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', req.user.id)
      .select('id, is_read')
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    return res.json({ success: true, notification: data });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to update notification' });
  }
}

module.exports = {
  getMyNotifications,
  markNotificationRead,
};

const { supabaseAdmin } = require('./supabaseAdmin');

async function createNotification({ userId, type = 'general', title, message, actionUrl = null }) {
  if (!userId || !title || !message) {
    return { data: null, error: new Error('Missing notification fields') };
  }

  const payload = {
    user_id: userId,
    type,
    title,
    message,
    action_url: actionUrl,
    is_read: false,
  };

  const { data, error } = await supabaseAdmin
    .from('notifications')
    .insert(payload)
    .select('*')
    .single();

  return { data, error };
}

module.exports = {
  createNotification,
};

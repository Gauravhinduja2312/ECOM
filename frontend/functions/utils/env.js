const functions = require('firebase-functions');

function readFunctionsConfig(key) {
  try {
    const [scope, name] = key.split('.');
    const cfg = functions.config();
    return cfg?.[scope]?.[name];
  } catch (_error) {
    return undefined;
  }
}

function getEnv(key, fallback = '') {
  if (process.env[key]) {
    return process.env[key];
  }

  const mapping = {
    SUPABASE_URL: 'app.supabase_url',
    SUPABASE_ANON_KEY: 'app.supabase_anon_key',
    SUPABASE_SERVICE_ROLE_KEY: 'app.supabase_service_role_key',
    RAZORPAY_KEY_ID: 'app.razorpay_key_id',
    RAZORPAY_KEY_SECRET: 'app.razorpay_key_secret',
    FRONTEND_URL: 'app.frontend_url',
  };

  const mappedKey = mapping[key];
  if (!mappedKey) {
    return fallback;
  }

  return readFunctionsConfig(mappedKey) || fallback;
}

module.exports = { getEnv };

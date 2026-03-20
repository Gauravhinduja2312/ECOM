const { createClient } = require('@supabase/supabase-js');
const { getEnv } = require('../utils/env');

const supabaseAdmin = createClient(
  getEnv('SUPABASE_URL'),
  getEnv('SUPABASE_SERVICE_ROLE_KEY'),
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

module.exports = { supabaseAdmin };

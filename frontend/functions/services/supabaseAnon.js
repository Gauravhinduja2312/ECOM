const { createClient } = require('@supabase/supabase-js');
const { getEnv } = require('../utils/env');

const supabaseAnon = createClient(
  getEnv('SUPABASE_URL'),
  getEnv('SUPABASE_ANON_KEY')
);

module.exports = { supabaseAnon };

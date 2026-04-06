require('dotenv').config({ path: '../.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkUsers() {
  const { data, error } = await supabase.from('users').select('*').limit(5);
  console.log(JSON.stringify(data, null, 2));
}

checkUsers();

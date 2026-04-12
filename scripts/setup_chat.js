require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setup() {
  console.log('--- Initializing Chat Schema Update ---');
  
  // 1. Add pseudonym column if it doesn't exist
  // Since we can't run raw SQL easily without an RPC, 
  // we'll try to update profiles and see if it fails
  
  const { error } = await supabase
    .from('users')
    .select('pseudonym')
    .limit(1);

  if (error && error.code === '42703') {
    console.log('Pseudonym column missing. Please run the following SQL in your Supabase Dashboard:');
    console.log(`
      ALTER TABLE public.users ADD COLUMN pseudonym text;
      UPDATE public.users SET pseudonym = 'Student #' || substring(id::text, 1, 4) WHERE pseudonym IS NULL;
    `);
  } else {
    console.log('Pseudonym column detected or already exists.');
  }

  console.log('--- Setup Script Finished ---');
}

setup();

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function test() {
  const { data, error } = await supabase
      .from('users')
      .select('id, email, role, full_name, phone, loyalty_points, loyalty_tier')
      .limit(1);
      
  console.log('Data:', data);
  console.log('Error:', error);
}

test();

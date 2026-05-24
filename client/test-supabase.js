import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
    console.log("Fetching users...");
    const { data, error } = await supabase.from('users').select('*');
    console.log("Data:", data);
    console.log("Error:", error);
}

test();

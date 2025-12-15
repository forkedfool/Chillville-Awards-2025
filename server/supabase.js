import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Service role key для админ-операций

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Отсутствуют переменные окружения SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY');
}

// Клиент для серверных операций (с service role key - обходит RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Клиент для клиентских операций (будет использоваться на фронтенде)
export function createSupabaseClient(accessToken) {
  return createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY || '', {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  });
}

export default supabaseAdmin;


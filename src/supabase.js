import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase не настроен. Проверьте переменные окружения VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || ''
);

// Экспортируем для использования в api.js
if (typeof window !== 'undefined') {
  window.supabase = supabase;
}


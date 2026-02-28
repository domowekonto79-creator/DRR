import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

export const initSupabase = (url: string, key: string): SupabaseClient => {
  supabaseInstance = createClient(url, key);
  localStorage.setItem('SUPABASE_URL', url);
  localStorage.setItem('SUPABASE_KEY', key);
  return supabaseInstance;
};

export const getSupabase = (): SupabaseClient | null => {
  if (supabaseInstance) return supabaseInstance;
  
  const url = localStorage.getItem('SUPABASE_URL');
  const key = localStorage.getItem('SUPABASE_KEY');
  
  if (url && key) {
    supabaseInstance = createClient(url, key);
    return supabaseInstance;
  }
  
  return null;
};

export const clearSupabaseConfig = () => {
  localStorage.removeItem('SUPABASE_URL');
  localStorage.removeItem('SUPABASE_KEY');
  supabaseInstance = null;
};

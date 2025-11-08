import { createClient } from '@supabase/supabase-js';

// Replace these with your actual Supabase credentials
const supabaseUrl = 'https://vadjlvizszjowihzznen.supabase.co'; // e.g., https://xxxxx.supabase.co
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhZGpsdml6c3pqb3dpaHp6bmVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0NDIyOTksImV4cCI6MjA3ODAxODI5OX0.U_kCWFySvcBNM1r5enYAu4-Y6uWDdl8Nv0g0dmwOGFs'; // Long string from step 3

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Check if we're online
export const isOnline = () => {
  if (typeof window === 'undefined') return false;
  return navigator.onLine;
};
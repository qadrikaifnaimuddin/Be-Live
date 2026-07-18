import { createClient } from "@supabase/supabase-js";

const metaEnv = (import.meta as any).env || {};
const supabaseUrl = metaEnv.VITE_SUPABASE_URL || "";
const supabaseAnonKey = metaEnv.VITE_SUPABASE_ANON_KEY || "";

// Verify if the credentials have been configured with actual Supabase keys
const isSupabaseConfigured = 
  !!supabaseUrl && 
  supabaseUrl !== "https://your-project-id.supabase.co" &&
  !!supabaseAnonKey &&
  supabaseAnonKey !== "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";

if (!isSupabaseConfigured) {
  console.warn(
    "⚠️ [Supabase] Production credentials are not configured in your .env file. " +
    "The client will run in local-first mock fallback mode."
  );
}

// Export the singleton supabase client connection
export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export { isSupabaseConfigured };

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://imtavscjpdmrfnicgqrl.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltdGF2c2NqcGRtcmZuaWNncXJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyMjk2NzMsImV4cCI6MjA5OTgwNTY3M30.RZm7IK1P68aVbcsY7n8CxpOXvxezY9o0FkPwxW5uWSE";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkLounge() {
  const { data, error } = await supabase.from('lounge_rooms').select('*').limit(1);
  if (error) {
    console.log("lounge_rooms check failed:", error);
  } else {
    console.log("lounge_rooms check succeeded! Data:", data);
  }
}

checkLounge();

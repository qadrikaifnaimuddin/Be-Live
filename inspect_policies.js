import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://imtavscjpdmrfnicgqrl.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltdGF2c2NqcGRtcmZuaWNncXJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyMjk2NzMsImV4cCI6MjA5OTgwNTY3M30.RZm7IK1P68aVbcsY7n8CxpOXvxezY9o0FkPwxW5uWSE";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectPolicies() {
  const { data, error } = await supabase.rpc('get_policies'); // If RPC doesn't exist, we will try running a query on a generic system view
  if (error) {
    console.log("RPC get_policies failed, trying direct select on information_schema or pg_policies (might fail due to lack of permission via anon key, but let's see):", error);
    
    // Let's try inserting a dummy room to see if it throws a permission error!
    console.log("\nAttempting to insert a mock chat room...");
    const { data: inserted, error: insertError } = await supabase
      .from('chat_rooms')
      .insert({
        name: "Test Room",
        type: "direct",
        members: ["d5f6bf8a-aff8-4798-bee5-024c7db1e552", "e8e98c07-eb06-4eb9-bc70-7e8cd816266a"]
      })
      .select();
    
    console.log("Insert room result:", inserted);
    console.log("Insert room error:", insertError);
  } else {
    console.log("Policies:", data);
  }
}

inspectPolicies();

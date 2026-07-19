import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://imtavscjpdmrfnicgqrl.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltdGF2c2NqcGRtcmZuaWNncXJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyMjk2NzMsImV4cCI6MjA5OTgwNTY3M30.RZm7IK1P68aVbcsY7n8CxpOXvxezY9o0FkPwxW5uWSE";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectWen() {
  const { data: wen, error: wenErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', 'wen')
    .maybeSingle();

  if (wenErr) {
    console.error("Error fetching wen profile:", wenErr);
  } else {
    console.log("Wen Profile:", JSON.stringify(wen, null, 2));
  }

  if (wen) {
    const { data: stories, error: storiesErr } = await supabase
      .from('stories')
      .select('*')
      .eq('user_id', wen.id);
    
    console.log(`\nStories count: ${stories?.length || 0}`);
    console.log(JSON.stringify(stories, null, 2));

    const { data: highlights, error: hErr } = await supabase
      .from('story_highlights')
      .select('*')
      .eq('user_id', wen.id);

    console.log(`\nHighlights count: ${highlights?.length || 0}`);
    console.log(JSON.stringify(highlights, null, 2));
  }
}

inspectWen();

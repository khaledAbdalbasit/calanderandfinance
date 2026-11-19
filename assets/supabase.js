import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const supabase = createClient(
  "https://uqdmcptrfobkwxhjekle.supabase.co",
  "sb_publishable_PW71iQwW5Xlx3UljAyk13Q_xzqHK8t0",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce"
    }
  }
);

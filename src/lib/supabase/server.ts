import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://wothbxlykxslueihlcir.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvdGhieGx5a3hzbHVlaWhsY2lyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTEyNDkwMCwiZXhwIjoyMTAwNzAwOTAwfQ.waVHpR3WlmUmsbpmzqH2I01N5J6TsC4WgAEXRvknX3k";

// Server-only client with service role key — never expose to client
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

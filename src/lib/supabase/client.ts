import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://wothbxlykxslueihlcir.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvdGhieGx5a3hzbHVlaWhsY2lyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxMjQ5MDAsImV4cCI6MjEwMDcwMDkwMH0.Rg8ljr-5GzHUuixAzKwAQxytxTyETVBtkNt0lHrEYjM";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

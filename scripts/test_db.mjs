import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://wothbxlykxslueihlcir.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvdGhieGx5a3hzbHVlaWhsY2lyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxMjQ5MDAsImV4cCI6MjEwMDcwMDkwMH0.Rg8ljr-5GzHUuixAzKwAQxytxTyETVBtkNt0lHrEYjM";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTable(name) {
  const start = Date.now();
  const { count, error } = await supabase.from(name).select("*", { count: "exact", head: true });
  const end = Date.now();
  if (error) {
    console.error(`Error on ${name}:`, error.message);
  } else {
    console.log(`Table "${name}": ${count} rows (took ${end - start}ms)`);
  }
}

async function testFetch() {
  console.log("Checking row counts...");
  await checkTable("debtors");
  await checkTable("loans");
  await checkTable("payments");
  await checkTable("settings");
  await checkTable("bank_accounts");
  await checkTable("lenders");

  console.log("\nTiming raw select * on payments...");
  const start = Date.now();
  const { data, error } = await supabase.from("payments").select("*");
  const end = Date.now();
  if (error) {
    console.error("Select * payments failed:", error.message);
  } else {
    console.log(`Select * payments: returned ${data.length} rows in ${end - start}ms`);
  }
}

testFetch();

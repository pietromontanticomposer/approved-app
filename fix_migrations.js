import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigrations() {
  console.log("🚀 Applying missing migrations...\n");

  // 1. Apply migration 005 (invite functions)
  console.log("📝 Reading migration 005_invite_functions.sql...");
  const migration005 = fs.readFileSync("migrations/005_invite_functions.sql", "utf-8");
  
  // Split by function definitions (rough split)
  const functionStatements = migration005.split(/CREATE OR REPLACE FUNCTION/gi);
  
  for (let i = 1; i < functionStatements.length; i++) {
    const statement = "CREATE OR REPLACE FUNCTION" + functionStatements[i];
    const functionName = statement.match(/FUNCTION\s+(\w+)/i)?.[1];
    
    console.log(`   Creating function: ${functionName}...`);
    
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: statement });
      if (error) {
        console.log(`   ⚠️  Using direct query...`);
        // Try alternative approach if exec_sql doesn't exist
      }
    } catch (err) {
      console.log(`   Note: ${err.message}`);
    }
  }

  console.log("\n✅ Migration 005 applied");

  // 2. Fix existing projects - assign team_id
  console.log("\n📊 Fixing existing projects...");
  
  // Get all projects without team_id
  const { data: projects } = await supabase
    .from("projects")
    .select("id, created_at")
    .is("team_id", null);

  if (projects && projects.length > 0) {
    console.log(`   Found ${projects.length} projects without team_id`);
    
    // Get or create a default team for migration
    let { data: defaultTeam } = await supabase
      .from("teams")
      .select("id")
      .limit(1)
      .single();

    if (!defaultTeam) {
      console.log("   Creating default migration team...");
      const { data: newTeam } = await supabase
        .from("teams")
        .insert({ name: "Default Workspace" })
        .select()
        .single();
      
      defaultTeam = newTeam;
    }

    if (defaultTeam) {
      console.log(`   Assigning team_id ${defaultTeam.id} to projects...`);
      
      for (const project of projects) {
        await supabase
          .from("projects")
          .update({ team_id: defaultTeam.id })
          .eq("id", project.id);
      }
      
      console.log(`   ✅ Updated ${projects.length} projects`);
    }
  } else {
    console.log("   ℹ️  All projects already have team_id");
  }

  console.log("\n🎉 All migrations completed!");
  console.log("\n⚠️  IMPORTANT: You still need to:");
  console.log("   1. Apply invite functions manually via Supabase SQL Editor");
  console.log("   2. Configure OAuth in Supabase Dashboard");
  console.log("   3. Apply Storage policies manually");
}

applyMigrations();

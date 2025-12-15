import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  console.log("🔍 Checking database state...\n");

  try {
    // Check teams table
    const { data: teams, error: teamsError } = await supabase
      .from("teams")
      .select("count");
    
    if (teamsError) {
      console.log("❌ Table 'teams': NOT FOUND");
      console.log("   Error:", teamsError.message);
    } else {
      console.log("✅ Table 'teams': EXISTS");
    }

    // Check team_members table
    const { data: members, error: membersError } = await supabase
      .from("team_members")
      .select("count");
    
    if (membersError) {
      console.log("❌ Table 'team_members': NOT FOUND");
      console.log("   Error:", membersError.message);
    } else {
      console.log("✅ Table 'team_members': EXISTS");
    }

    // Check invites table
    const { data: invites, error: invitesError } = await supabase
      .from("invites")
      .select("count");
    
    if (invitesError) {
      console.log("❌ Table 'invites': NOT FOUND");
      console.log("   Error:", invitesError.message);
    } else {
      console.log("✅ Table 'invites': EXISTS");
    }

    // Check if projects has team_id
    console.log("\n--- Checking projects table ---");
    const { data: projects, error: projectsError } = await supabase
      .from("projects")
      .select("id, team_id")
      .limit(1);
    
    if (projectsError) {
      console.log("❌ Projects query failed:", projectsError.message);
    } else if (projects && projects.length > 0) {
      if (projects[0].team_id) {
        console.log("✅ Column 'team_id' EXISTS in projects");
      } else {
        console.log("⚠️  Column 'team_id' is NULL (migration needed)");
      }
    } else {
      console.log("ℹ️  No projects in database");
    }

    // Try to call RPC functions
    console.log("\n--- Checking RPC Functions ---");
    
    const testToken = "00000000-0000-0000-0000-000000000000";
    const { data: inviteData, error: inviteError } = await supabase
      .rpc("get_invite_details", { invite_token: testToken });
    
    if (inviteError && inviteError.message.includes("function")) {
      console.log("❌ Function 'get_invite_details': NOT FOUND");
    } else {
      console.log("✅ Function 'get_invite_details': EXISTS");
    }

    console.log("\n===================");
    console.log("MIGRATION STATUS:");
    console.log("===================");
    
    if (teamsError || membersError || invitesError) {
      console.log("❌ Multi-tenant tables NOT CREATED");
      console.log("   👉 Need to apply migrations 003, 004, 005");
    } else {
      console.log("✅ Multi-tenant tables exist!");
    }

  } catch (error) {
    console.error("❌ Unexpected error:", error);
  }
}

checkDatabase();

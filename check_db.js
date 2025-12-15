#!/usr/bin/env node
import dotenv from "dotenv";
import pg from "pg";

dotenv.config({ path: ".env.local" });

const { Client } = pg;
const dbUrl = process.env.SUPABASE_DB_URL;

async function checkTables() {
  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("✅ Connected to database\n");

    // Check if multi-tenant tables exist
    const tables = ['teams', 'team_members', 'invites'];
    
    for (const table of tables) {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `, [table]);
      
      const exists = result.rows[0].exists;
      console.log(`${exists ? '✅' : '❌'} Table '${table}': ${exists ? 'EXISTS' : 'NOT FOUND'}`);
    }

    // Check if functions exist
    console.log("\n--- Functions ---");
    const functions = ['get_invite_details', 'accept_invite', 'create_invite', 'revoke_invite'];
    
    for (const func of functions) {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM pg_proc 
          WHERE proname = $1
        );
      `, [func]);
      
      const exists = result.rows[0].exists;
      console.log(`${exists ? '✅' : '❌'} Function '${func}': ${exists ? 'EXISTS' : 'NOT FOUND'}`);
    }

    // Check if trigger exists
    console.log("\n--- Triggers ---");
    const triggerResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM pg_trigger 
        WHERE tgname = 'on_auth_user_created'
      );
    `);
    
    const triggerExists = triggerResult.rows[0].exists;
    console.log(`${triggerExists ? '✅' : '❌'} Trigger 'on_auth_user_created': ${triggerExists ? 'EXISTS' : 'NOT FOUND'}`);

  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    await client.end();
  }
}

checkTables();

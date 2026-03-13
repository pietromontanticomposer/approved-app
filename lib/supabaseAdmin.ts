import "server-only";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

// Export a variable and assign it below to avoid `export` inside conditionals
export let supabaseAdmin: any = null;

const FAKE_OWNER_ID = '11111111-1111-4111-8111-111111111111';
const FAKE_USER_ID = '22222222-2222-4222-8222-222222222222';
const FAKE_TEAM_ID = '33333333-3333-4333-8333-333333333333';
const FAKE_PROJECT_ID = '44444444-4444-4444-8444-444444444444';

// If real env vars are present, use real client. Otherwise, if testing is enabled,
// provide a lightweight in-memory fake client to allow local tests without secrets.
if (supabaseUrl && supabaseServiceKey) {
  // Admin client — use only on the server
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
} else if (process.env.APP_ALLOW_FAKE_SUPABASE === '1') {
  // Simple in-memory fake DB with minimal API surface used by the server routes.
  type Row = Record<string, any>;
  const db: Record<string, Row[]> = {
    projects: [
      { id: FAKE_PROJECT_ID, team_id: FAKE_TEAM_ID, owner_id: FAKE_OWNER_ID, name: 'Test Project' },
    ],
    share_links: [],
    project_members: [],
    team_members: [ { team_id: FAKE_TEAM_ID, user_id: FAKE_OWNER_ID, role: 'owner' } ],
    audit_logs: [],
  };

  const { v4: uuidv4 } = require('uuid');
  const clone = (obj: any) => JSON.parse(JSON.stringify(obj));

  const createFrom = (tableName: string) => {
    const q: any = {
      _table: tableName,
      _select: '*',
      _where: [] as Array<{k:string,v:any}>,
      _limit: null as number | null,
      select(cols?: string) { q._select = cols || '*'; return q; },
      eq(k: string, v: any) { q._where.push({k,v}); return q; },
      limit(n: number) { q._limit = n; return q; },
      maybeSingle: async () => {
        const rows = db[tableName] || [];
        const filtered = rows.filter(r => q._where.every(w => String(r[w.k]) === String(w.v)));
        return { data: filtered.length>0 ? clone(filtered[0]) : null, error: null };
      },
      insert: (payload: any) => {
        const rows = db[tableName] || (db[tableName] = []);
        const toInsert = Array.isArray(payload) ? payload : [payload];
        const inserted = toInsert.map((p: any) => {
          const row = Object.assign({}, p);
          if (!row.id) row.id = uuidv4();
          row.created_at = new Date().toISOString();
          rows.push(row);
          return row;
        });
        return {
          data: inserted,
          error: null,
          select: () => ({
            single: async () => ({ data: inserted[0], error: null })
          })
        };
      },
      update: (payload: any) => {
        const rows = db[tableName] || [];
        const eqWhere = [...q._where];
        const ltWhere: Array<{ k: string; v: any }> = [];
        const matches = (row: any) =>
          eqWhere.every(w => String(row[w.k]) === String(w.v)) &&
          ltWhere.every(w => Number(row[w.k]) < Number(w.v));

        const chain: any = {
          eq(k: string, v: any) {
            eqWhere.push({ k, v });
            return chain;
          },
          lt(k: string, v: any) {
            ltWhere.push({ k, v });
            return chain;
          },
          async select() {
            const updatedRows: any[] = [];
            for (const row of rows) {
              if (!matches(row)) continue;
              Object.assign(row, payload);
              updatedRows.push(clone(row));
            }
            return { data: updatedRows, error: null };
          }
        };

        return chain;
      },
      upsert: async (payload: any, _opts?: any) => {
        const rows = db[tableName] || (db[tableName] = []);
        // naive onConflict by project_id,member_id
        const existing = rows.find(r => r.project_id === payload.project_id && r.member_id === payload.member_id);
        if (existing) {
          Object.assign(existing, payload);
          return { data: [existing], error: null };
        }
        const row = Object.assign({}, payload);
        if (!row.id) row.id = uuidv4();
        rows.push(row);
        return { data: [row], error: null };
      },
      single: async () => {
        const rows = db[tableName] || [];
        const filtered = rows.filter(r => q._where.every(w => String(r[w.k]) === String(w.v)));
        return { data: filtered[0] || null, error: null };
      }
    };
    return q;
  };

  // Fake auth users store
  const fakeAuthUsers: Record<string, any> = {
    [FAKE_OWNER_ID]: { id: FAKE_OWNER_ID, email: 'owner@test.com', user_metadata: { full_name: 'Test Owner' } },
    [FAKE_USER_ID]: { id: FAKE_USER_ID, email: 'user@test.com', user_metadata: { full_name: 'Test Collaborator' } },
  };

  const fakeAdmin = {
    from: (table: string) => createFrom(table),
    auth: {
      admin: {
        getUserById: async (id: string) => {
          const user = fakeAuthUsers[id];
          return { data: user ? { user } : null, error: user ? null : { message: 'User not found' } };
        },
        listUsers: async (_opts?: any) => {
          return { data: { users: Object.values(fakeAuthUsers) }, error: null };
        },
        createUser: async (opts: any) => {
          const id = uuidv4();
          const user = { id, email: opts.email, user_metadata: opts.user_metadata || {} };
          fakeAuthUsers[id] = user;
          return { data: { user }, error: null };
        },
        generateLink: async (_opts: any) => {
          return { data: { properties: { action_link: 'http://localhost/fake-link' } }, error: null };
        },
      },
      getUser: async (_token: string) => {
        const token = String(_token || '').trim();
        const user = fakeAuthUsers[token] || fakeAuthUsers[FAKE_OWNER_ID];
        return { data: { user }, error: null };
      },
    },
    storage: {
      from: (_bucket: string) => ({
        createSignedUploadUrl: async (path: string) => {
          return {
            data: { path, token: 'fake-token', signedUrl: `http://localhost/storage/${path}?token=fake` },
            error: null,
          };
        },
        createSignedUrl: async (path: string, _expiresIn: number) => {
          return { data: { signedUrl: `http://localhost/storage/${path}?signed=true` }, error: null };
        },
        getPublicUrl: (path: string) => {
          return { data: { publicUrl: `http://localhost/storage/${path}` } };
        },
      }),
    },
  };

  supabaseAdmin = fakeAdmin as any;
} else {
  throw new Error(
    "Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment. Set APP_ALLOW_FAKE_SUPABASE=1 to enable a local fake client for tests."
  );
}

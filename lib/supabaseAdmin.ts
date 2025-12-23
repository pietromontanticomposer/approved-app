import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Export a variable and assign it below to avoid `export` inside conditionals
export let supabaseAdmin: any = null;

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
      { id: 'p1', team_id: 't1', owner_id: 'owner-1', name: 'Test Project' },
    ],
    share_links: [],
    project_members: [],
    team_members: [ { team_id: 't1', user_id: 'owner-1', role: 'owner' } ],
    audit_logs: [],
  };

  const { v4: uuidv4 } = require('uuid');
  const clone = (obj: any) => JSON.parse(JSON.stringify(obj));

  const createFrom = (tableName: string) => {
    const q: any = {
      _table: tableName,
      _select: '*',
      _where: [] as Array<{k:string,v:any,op:'eq'|'in'}>,
      _order: [] as Array<{k:string,ascending:boolean}>,
      _limit: null as number | null,
      select(cols?: string) { q._select = cols || '*'; return q; },
      eq(k: string, v: any) { q._where.push({k,v,op:'eq'}); return q; },
      in(k: string, v: any[]) { q._where.push({k,v,op:'in'}); return q; },
      order(k: string, opts?: { ascending?: boolean }) {
        q._order.push({ k, ascending: opts?.ascending !== false });
        return q;
      },
      limit(n: number) { q._limit = n; return q; },
      _matchesWhere: (r: Row) => q._where.every(w => {
        if (w.op === 'eq') return String(r[w.k]) === String(w.v);
        if (!Array.isArray(w.v)) return false;
        return w.v.map(String).includes(String(r[w.k]));
      }),
      _applyFilters: (rows: Row[]) => {
        const filtered = rows.filter(r => q._matchesWhere(r));
        if (q._order.length === 0) return filtered;
        const ordered = [...filtered];
        ordered.sort((a, b) => {
          for (const rule of q._order) {
            const av = a[rule.k];
            const bv = b[rule.k];
            if (av === bv) continue;
            const cmp = av > bv ? 1 : -1;
            return rule.ascending ? cmp : -cmp;
          }
          return 0;
        });
        return ordered;
      },
      _applySelect: (rows: Row[]) => {
        if (q._select === '*' || !q._select) return rows.map(clone);
        const cols = q._select.split(',').map((c: string) => c.trim()).filter(Boolean);
        return rows.map((r: Row) => {
          const out: Row = {};
          for (const c of cols) out[c] = r[c];
          return out;
        });
      },
      _executeSelect: () => {
        const rows = db[tableName] || [];
        const filtered = q._applyFilters(rows);
        const limited = q._limit ? filtered.slice(0, q._limit) : filtered;
        return { data: q._applySelect(limited), error: null };
      },
      then: (resolve: any, reject: any) => {
        try {
          const res = q._executeSelect();
          return Promise.resolve(res).then(resolve, reject);
        } catch (err) {
          return Promise.reject(err).then(resolve, reject);
        }
      },
      maybeSingle: async () => {
        const rows = db[tableName] || [];
        const filtered = q._applyFilters(rows);
        const row = filtered.length > 0 ? filtered[0] : null;
        const selected = row ? q._applySelect([row])[0] : null;
        return { data: selected, error: null };
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
        // return chainable object supporting .eq(k,v)
        return {
          eq: async (k: string, v: any) => {
            const rows = db[tableName] || [];
            let updatedCount = 0;
            for (const r of rows) {
              if (q._matchesWhere(r) && String(r[k]) === String(v)) {
                Object.assign(r, payload);
                updatedCount++;
              }
            }
            return { data: updatedCount>0 ? rows.filter(r => (q._matchesWhere(r) && String(r[k]) === String(v))) : [], error: null };
          }
        };
      },
      upsert: async (payload: any, opts?: any) => {
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
        const filtered = q._applyFilters(rows);
        const row = filtered[0] || null;
        const selected = row ? q._applySelect([row])[0] : null;
        return { data: selected, error: null };
      }
    };
    return q;
  };

  const fakeAdmin = {
    from: (table: string) => createFrom(table),
  };

  supabaseAdmin = fakeAdmin as any;
} else {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment. Set APP_ALLOW_FAKE_SUPABASE=1 to enable a local fake client for tests."
  );
}

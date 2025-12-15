module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/node:crypto [external] (node:crypto, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:crypto", () => require("node:crypto"));

module.exports = mod;
}),
"[project]/lib/supabaseAdmin.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "supabaseAdmin",
    ()=>supabaseAdmin
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$esm$2f$wrapper$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@supabase/supabase-js/dist/esm/wrapper.mjs [app-route] (ecmascript)");
;
const supabaseUrl = ("TURBOPACK compile-time value", "https://waaigankcctijalvlppk.supabase.co");
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
let supabaseAdmin = null;
// If real env vars are present, use real client. Otherwise, if testing is enabled,
// provide a lightweight in-memory fake client to allow local tests without secrets.
if (supabaseUrl && supabaseServiceKey) {
    // Admin client — use only on the server
    supabaseAdmin = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$esm$2f$wrapper$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createClient"])(supabaseUrl, supabaseServiceKey, {
        auth: {
            persistSession: false
        }
    });
} else if (process.env.APP_ALLOW_FAKE_SUPABASE === '1') {
    const db = {
        projects: [
            {
                id: 'p1',
                team_id: 't1',
                owner_id: 'owner-1',
                name: 'Test Project'
            }
        ],
        share_links: [],
        project_members: [],
        team_members: [
            {
                team_id: 't1',
                user_id: 'owner-1',
                role: 'owner'
            }
        ],
        audit_logs: []
    };
    const { v4: uuidv4 } = __turbopack_context__.r("[project]/node_modules/uuid/dist-node/index.js [app-route] (ecmascript)");
    function clone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }
    function createFrom(tableName) {
        let q = {
            _table: tableName,
            _select: '*',
            _where: [],
            _limit: null,
            select (cols) {
                q._select = cols || '*';
                return q;
            },
            eq (k, v) {
                q._where.push({
                    k,
                    v
                });
                return q;
            },
            limit (n) {
                q._limit = n;
                return q;
            },
            maybeSingle: async ()=>{
                const rows = db[tableName] || [];
                const filtered = rows.filter((r)=>q._where.every((w)=>String(r[w.k]) === String(w.v)));
                return {
                    data: filtered.length > 0 ? clone(filtered[0]) : null,
                    error: null
                };
            },
            insert: (payload)=>{
                const rows = db[tableName] || (db[tableName] = []);
                const toInsert = Array.isArray(payload) ? payload : [
                    payload
                ];
                const inserted = toInsert.map((p)=>{
                    const row = Object.assign({}, p);
                    if (!row.id) row.id = uuidv4();
                    row.created_at = new Date().toISOString();
                    rows.push(row);
                    return row;
                });
                return {
                    data: inserted,
                    error: null,
                    select: ()=>({
                            single: async ()=>({
                                    data: inserted[0],
                                    error: null
                                })
                        })
                };
            },
            update: (payload)=>{
                // return chainable object supporting .eq(k,v)
                return {
                    eq: async (k, v)=>{
                        const rows = db[tableName] || [];
                        let updatedCount = 0;
                        for (let r of rows){
                            if (q._where.every((w)=>String(r[w.k]) === String(w.v)) && String(r[k]) === String(v)) {
                                Object.assign(r, payload);
                                updatedCount++;
                            }
                        }
                        return {
                            data: updatedCount > 0 ? rows.filter((r)=>q._where.every((w)=>String(r[w.k]) === String(w.v)) && String(r[k]) === String(v)) : [],
                            error: null
                        };
                    }
                };
            },
            upsert: async (payload, opts)=>{
                const rows = db[tableName] || (db[tableName] = []);
                // naive onConflict by project_id,member_id
                const existing = rows.find((r)=>r.project_id === payload.project_id && r.member_id === payload.member_id);
                if (existing) {
                    Object.assign(existing, payload);
                    return {
                        data: [
                            existing
                        ],
                        error: null
                    };
                }
                const row = Object.assign({}, payload);
                if (!row.id) row.id = uuidv4();
                rows.push(row);
                return {
                    data: [
                        row
                    ],
                    error: null
                };
            },
            single: async ()=>{
                const rows = db[tableName] || [];
                const filtered = rows.filter((r)=>q._where.every((w)=>String(r[w.k]) === String(w.v)));
                return {
                    data: filtered[0] || null,
                    error: null
                };
            }
        };
        return q;
    }
    const fakeAdmin = {
        from: (table)=>createFrom(table)
    };
    supabaseAdmin = fakeAdmin;
} else {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment. Set APP_ALLOW_FAKE_SUPABASE=1 to enable a local fake client for tests.");
}
}),
"[externals]/crypto [external] (crypto, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("crypto", () => require("crypto"));

module.exports = mod;
}),
"[project]/app/api/share/details/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabaseAdmin.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/crypto [external] (crypto, cjs)");
;
;
;
async function GET(req) {
    try {
        const url = new URL(req.url);
        const shareId = url.searchParams.get('share_id') || '';
        const token = url.searchParams.get('token') || '';
        if (!shareId || !token) return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: 'share_id and token required'
        }, {
            status: 400
        });
        const { data: linkData, error: linkErr } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from('share_links').select('*, projects(name)').eq('id', shareId).maybeSingle();
        if (linkErr) {
            console.warn('[GET /api/share/details] supabase error', linkErr);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Share link not found'
            }, {
                status: 404
            });
        }
        if (!linkData) return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: 'Share link not found'
        }, {
            status: 404
        });
        if (linkData.revoked_at) return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: 'Share link revoked'
        }, {
            status: 410
        });
        if (linkData.expires_at && new Date(linkData.expires_at) < new Date()) return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: 'Share link expired'
        }, {
            status: 410
        });
        const tokenHash = __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["default"].createHash('sha256').update(token).digest('hex');
        if (tokenHash !== linkData.token_hash) return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: 'Invalid token'
        }, {
            status: 403
        });
        // return minimal details for the client
        const resp = {
            found: true,
            share_id: linkData.id,
            project_id: linkData.project_id,
            project_name: linkData.project_name || linkData.projects?.name || null,
            role: linkData.role || 'view',
            expires_at: linkData.expires_at || null
        };
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(resp, {
            status: 200
        });
    } catch (err) {
        console.error('[GET /api/share/details] Error', err);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: err?.message || 'Unexpected error'
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__7c2ef42b._.js.map
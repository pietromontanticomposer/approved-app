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
        const q = {
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
                        for (const r of rows){
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
"[project]/lib/supabaseClient.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// lib/supabaseClient.ts
__turbopack_context__.s([
    "getSupabaseClient",
    ()=>getSupabaseClient,
    "supabase",
    ()=>supabase
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$esm$2f$wrapper$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@supabase/supabase-js/dist/esm/wrapper.mjs [app-route] (ecmascript)");
;
const url = ("TURBOPACK compile-time value", "https://waaigankcctijalvlppk.supabase.co");
const anon = ("TURBOPACK compile-time value", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhYWlnYW5rY2N0aWphbHZscHBrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NzUzNjIsImV4cCI6MjA4MDQ1MTM2Mn0.qDbrFUNFLj_i7YDzRM48uxCS1weMSYM3b4CvR_xyRFg");
if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
;
// CRITICAL: This must work in browser AND server contexts
// Server-side: just for type exports, won't actually use auth
// Client-side: full auth with localStorage persistence
let supabaseInstance = null;
function getSupabaseClient() {
    // Only initialize on browser
    if ("TURBOPACK compile-time truthy", 1) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$esm$2f$wrapper$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createClient"])(url, anon);
    }
    //TURBOPACK unreachable
    ;
}
const supabase = getSupabaseClient();
}),
"[project]/lib/auth.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// lib/auth.ts
__turbopack_context__.s([
    "canAccessProject",
    ()=>canAccessProject,
    "canModifyProject",
    ()=>canModifyProject,
    "getCurrentUser",
    ()=>getCurrentUser,
    "getUserDefaultTeam",
    ()=>getUserDefaultTeam,
    "getUserTeams",
    ()=>getUserTeams,
    "requireAuth",
    ()=>requireAuth,
    "verifyAuth",
    ()=>verifyAuth
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabaseClient.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabaseAdmin.ts [app-route] (ecmascript)");
;
;
async function getCurrentUser() {
    const { data: { user }, error } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabase"].auth.getUser();
    if (error || !user) {
        return null;
    }
    return user;
}
async function verifyAuth(req) {
    try {
        // Extract Bearer token from Authorization header
        const authHeader = req.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.log('[Auth] No valid authorization header found');
            return null;
        }
        const token = authHeader.substring(7); // Remove "Bearer " prefix
        if (!token) {
            console.log('[Auth] Empty token');
            return null;
        }
        // Verify token with Supabase
        const { data, error } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].auth.getUser(token);
        if (error || !data.user) {
            console.log('[Auth] Token verification failed:', error?.message);
            return null;
        }
        return {
            userId: data.user.id,
            email: data.user.email || '',
            isAuthenticated: true
        };
    } catch (err) {
        console.error('[Auth] Unexpected error during auth verification:', err);
        return null;
    }
}
async function requireAuth(req) {
    const auth = await verifyAuth(req);
    if (!auth) {
        throw new Error('UNAUTHORIZED');
    }
    return auth.userId;
}
async function canAccessProject(userId, projectId) {
    try {
        // Check if user owns the project
        const { data: project, error: projectError } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from('projects').select('owner_id, team_id').eq('id', projectId).single();
        if (projectError || !project) {
            return false;
        }
        // User is owner
        if (project.owner_id === userId) {
            return true;
        }
        // Check if user is in project_members
        const { data: member } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from('project_members').select('id').eq('project_id', projectId).eq('member_id', userId).maybeSingle();
        if (member) {
            return true;
        }
        // Check if user is in team
        if (project.team_id) {
            const { data: teamMember } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from('team_members').select('id').eq('team_id', project.team_id).eq('user_id', userId).maybeSingle();
            if (teamMember) {
                return true;
            }
        }
        return false;
    } catch (err) {
        console.error('[Auth] Error checking project access:', err);
        return false;
    }
}
async function canModifyProject(userId, projectId) {
    try {
        const { data: project } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from('projects').select('owner_id, team_id').eq('id', projectId).single();
        if (!project) {
            return false;
        }
        // Only owner can modify
        if (project.owner_id === userId) {
            return true;
        }
        // Check if user is admin in team
        if (project.team_id) {
            const { data: teamMember } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from('team_members').select('role').eq('team_id', project.team_id).eq('user_id', userId).maybeSingle();
            if (teamMember && teamMember.role === 'admin') {
                return true;
            }
        }
        return false;
    } catch (err) {
        console.error('[Auth] Error checking modify permission:', err);
        return false;
    }
}
async function getUserDefaultTeam(userId) {
    const { data, error } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabase"].from("team_members").select("team_id, role, teams(id, name)").eq("user_id", userId).order("joined_at", {
        ascending: true
    }).limit(1).single();
    if (error || !data) {
        return null;
    }
    return {
        teamId: data.team_id,
        role: data.role,
        teamName: data.teams?.name || "My Workspace"
    };
}
async function getUserTeams(userId) {
    const { data, error } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabase"].from("team_members").select("team_id, role, joined_at, teams(id, name, description)").eq("user_id", userId).order("joined_at", {
        ascending: true
    });
    if (error || !data) {
        return [];
    }
    return data.map((tm)=>({
            teamId: tm.team_id,
            role: tm.role,
            joinedAt: tm.joined_at,
            team: tm.teams
        }));
}
}),
"[project]/app/api/comments/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// app/api/comments/route.ts
/**
 * Comments API Route
 *
 * Secure implementation with:
 * - Server-side authentication verification
 * - Proper authorization checks (user can only edit/delete own comments)
 * - Input validation
 * - Error handling
 * - Type safety
 */ __turbopack_context__.s([
    "DELETE",
    ()=>DELETE,
    "GET",
    ()=>GET,
    "PATCH",
    ()=>PATCH,
    "POST",
    ()=>POST
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$uuid$2f$dist$2d$node$2f$v4$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__default__as__v4$3e$__ = __turbopack_context__.i("[project]/node_modules/uuid/dist-node/v4.js [app-route] (ecmascript) <export default as v4>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabaseAdmin.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/auth.ts [app-route] (ecmascript)");
;
;
;
;
// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
const isUuid = (value)=>typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
/**
 * Get user display name from auth metadata
 */ async function getUserDisplayName(userId) {
    try {
        const { data: userData } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].auth.admin.getUserById(userId);
        if (!userData?.user?.user_metadata) {
            return null;
        }
        const meta = userData.user.user_metadata;
        const first = meta.first_name || meta.firstName || meta.first || '';
        const last = meta.last_name || meta.lastName || meta.last || '';
        const display = meta.display_name || meta.full_name || `${first} ${last}`.trim();
        return display || null;
    } catch (err) {
        console.warn('[Comments] Error fetching user metadata:', err);
        return null;
    }
}
async function GET(req) {
    try {
        console.log('[GET /api/comments] Request started');
        // SECURITY: Verify authentication
        const auth = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["verifyAuth"])(req);
        if (!auth) {
            console.log('[GET /api/comments] Unauthorized request');
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Unauthorized - authentication required'
            }, {
                status: 401
            });
        }
        const url = new URL(req.url);
        const versionId = url.searchParams.get('versionId');
        if (!versionId) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'versionId query parameter is required'
            }, {
                status: 400
            });
        }
        if (!isUuid(versionId)) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'versionId must be a valid UUID'
            }, {
                status: 400
            });
        }
        // Fetch comments
        const { data: comments, error } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("comments").select('*').eq("version_id", versionId).order("created_at", {
            ascending: true
        });
        if (error) {
            console.error("[GET /api/comments] Error:", error);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: `Failed to fetch comments: ${error.message}`
            }, {
                status: 500
            });
        }
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            comments: comments || []
        }, {
            status: 200
        });
    } catch (err) {
        console.error("[GET /api/comments] Error:", err);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: err?.message || 'Internal server error'
        }, {
            status: 500
        });
    }
}
async function POST(req) {
    try {
        console.log('[POST /api/comments] Request started');
        // SECURITY: Verify authentication
        const auth = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["verifyAuth"])(req);
        if (!auth) {
            console.log('[POST /api/comments] Unauthorized request');
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Unauthorized - authentication required'
            }, {
                status: 401
            });
        }
        const userId = auth.userId;
        // Parse and validate request body
        let body;
        try {
            body = await req.json();
        } catch (err) {
            console.error('[POST /api/comments] Invalid JSON:', err);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Invalid JSON in request body'
            }, {
                status: 400
            });
        }
        const { version_id, time_seconds, author, text } = body;
        // Validate required fields
        if (!version_id || time_seconds === undefined || !text) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "version_id, time_seconds, and text are required"
            }, {
                status: 400
            });
        }
        if (!isUuid(version_id)) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "version_id must be a valid UUID"
            }, {
                status: 400
            });
        }
        if (typeof time_seconds !== 'number' || time_seconds < 0) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "time_seconds must be a non-negative number"
            }, {
                status: 400
            });
        }
        if (typeof text !== 'string' || text.trim().length === 0) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "text must be a non-empty string"
            }, {
                status: 400
            });
        }
        // Determine author name
        let authorName = typeof author === 'string' ? author.trim() : null;
        if (!authorName) {
            authorName = await getUserDisplayName(userId);
        }
        const comment_id = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$uuid$2f$dist$2d$node$2f$v4$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__default__as__v4$3e$__["v4"])();
        // Insert comment with verified actor_id
        const { data, error: insertError } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("comments").insert({
            id: comment_id,
            version_id,
            time_seconds,
            author: authorName || "User",
            actor_id: userId,
            text: text.trim()
        }).select().single();
        if (insertError) {
            console.error('[POST /api/comments] Error creating comment:', insertError);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: `Failed to create comment: ${insertError.message}`
            }, {
                status: 500
            });
        }
        console.log('[POST /api/comments] Comment created:', comment_id);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            comment: data
        }, {
            status: 201
        });
    } catch (err) {
        console.error("[POST /api/comments] Error:", err);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: err?.message || 'Internal server error'
        }, {
            status: 500
        });
    }
}
async function PATCH(req) {
    try {
        console.log('[PATCH /api/comments] Request started');
        // SECURITY: Verify authentication
        const auth = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["verifyAuth"])(req);
        if (!auth) {
            console.log('[PATCH /api/comments] Unauthorized request');
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Unauthorized - authentication required'
            }, {
                status: 401
            });
        }
        const userId = auth.userId;
        // Parse and validate request body
        let body;
        try {
            body = await req.json();
        } catch (err) {
            console.error('[PATCH /api/comments] Invalid JSON:', err);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Invalid JSON in request body'
            }, {
                status: 400
            });
        }
        const { id, text } = body;
        if (!id || !text) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "id and text are required"
            }, {
                status: 400
            });
        }
        if (!isUuid(id)) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "id must be a valid UUID"
            }, {
                status: 400
            });
        }
        if (typeof text !== 'string' || text.trim().length === 0) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "text must be a non-empty string"
            }, {
                status: 400
            });
        }
        // SECURITY: Fetch comment and check ownership
        const { data: existing, error: fetchErr } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from('comments').select('id, actor_id').eq('id', id).maybeSingle();
        if (fetchErr) {
            console.error('[PATCH /api/comments] Error fetching comment:', fetchErr);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: `Failed to fetch comment: ${fetchErr.message}`
            }, {
                status: 500
            });
        }
        if (!existing) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Comment not found'
            }, {
                status: 404
            });
        }
        // Check if comment has actor_id set
        if (!existing.actor_id) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Comment does not have an actor_id; backfill required to enable editing"
            }, {
                status: 403
            });
        }
        // Check ownership
        if (existing.actor_id !== userId) {
            console.log('[PATCH /api/comments] User not authorized to edit comment');
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Forbidden - you do not have permission to edit this comment'
            }, {
                status: 403
            });
        }
        // Update comment
        const { data, error: updateError } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("comments").update({
            text: text.trim()
        }).eq("id", id).select().single();
        if (updateError) {
            console.error("[PATCH /api/comments] Error updating comment:", updateError);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: `Failed to update comment: ${updateError.message}`
            }, {
                status: 500
            });
        }
        console.log('[PATCH /api/comments] Comment updated:', id);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            comment: data
        }, {
            status: 200
        });
    } catch (err) {
        console.error("[PATCH /api/comments] Error:", err);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: err?.message || 'Internal server error'
        }, {
            status: 500
        });
    }
}
async function DELETE(req) {
    try {
        console.log('[DELETE /api/comments] Request started');
        // SECURITY: Verify authentication
        const auth = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["verifyAuth"])(req);
        if (!auth) {
            console.log('[DELETE /api/comments] Unauthorized request');
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Unauthorized - authentication required'
            }, {
                status: 401
            });
        }
        const userId = auth.userId;
        // Get comment ID from query
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        if (!id) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "id query parameter is required"
            }, {
                status: 400
            });
        }
        if (!isUuid(id)) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "id must be a valid UUID"
            }, {
                status: 400
            });
        }
        // SECURITY: Fetch comment and check ownership
        const { data: existing, error: fetchErr } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from('comments').select('id, actor_id').eq('id', id).maybeSingle();
        if (fetchErr) {
            console.error('[DELETE /api/comments] Error fetching comment:', fetchErr);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: `Failed to fetch comment: ${fetchErr.message}`
            }, {
                status: 500
            });
        }
        if (!existing) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Comment not found'
            }, {
                status: 404
            });
        }
        // Check if comment has actor_id set
        if (!existing.actor_id) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Comment does not have an actor_id; backfill required to enable deletion"
            }, {
                status: 403
            });
        }
        // Check ownership
        if (existing.actor_id !== userId) {
            console.log('[DELETE /api/comments] User not authorized to delete comment');
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Forbidden - you do not have permission to delete this comment'
            }, {
                status: 403
            });
        }
        // Delete comment
        const { error: deleteError } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("comments").delete().eq("id", id);
        if (deleteError) {
            console.error("[DELETE /api/comments] Error deleting comment:", deleteError);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: `Failed to delete comment: ${deleteError.message}`
            }, {
                status: 500
            });
        }
        console.log('[DELETE /api/comments] Comment deleted:', id);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            success: true
        }, {
            status: 200
        });
    } catch (err) {
        console.error("[DELETE /api/comments] Error:", err);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: err?.message || 'Internal server error'
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__e8b58d4d._.js.map
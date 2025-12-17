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
"[project]/app/api/projects/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// app/api/projects/route.ts
/**
 * Projects API Route
 *
 * Secure, professional implementation with:
 * - Server-side authentication verification
 * - Proper authorization checks
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
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabaseAdmin.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/auth.ts [app-route] (ecmascript)");
;
;
;
// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
/**
 * Hydrate projects with team member information
 */ async function hydrateProjectsWithTeamMembers(projects) {
    return Promise.all(projects.map(async (project)=>{
        let teamMembers = [];
        if (project.team_id) {
            try {
                const { data } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from('team_members').select('user_id, role, joined_at').eq('team_id', project.team_id);
                teamMembers = data || [];
            } catch (err) {
                console.warn(`[Projects] Warning loading team_members for project ${project.id}:`, err);
            }
        }
        return {
            ...project,
            team_members: teamMembers
        };
    }));
}
/**
 * Get projects owned by user
 */ async function getOwnedProjects(userId) {
    const { data, error } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from('projects').select('*').eq('owner_id', userId).order('created_at', {
        ascending: false
    });
    if (error) {
        console.error('[Projects] Error loading owned projects:', error);
        throw new Error(`Failed to load owned projects: ${error.message}`);
    }
    return data || [];
}
/**
 * Get projects shared with user
 */ async function getSharedProjects(userId, ownedProjectIds) {
    // Get project IDs from project_members
    const { data: membershipRows, error: membershipError } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from('project_members').select('project_id').eq('member_id', userId);
    if (membershipError) {
        console.error('[Projects] Error loading project memberships:', membershipError);
        throw new Error(`Failed to load project memberships: ${membershipError.message}`);
    }
    const projectIdsFromMembership = (membershipRows || []).map((r)=>r.project_id).filter(Boolean);
    // Get team IDs for user
    const { data: teamRows, error: teamError } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from('team_members').select('team_id').eq('user_id', userId);
    if (teamError) {
        console.error('[Projects] Error loading team memberships:', teamError);
        throw new Error(`Failed to load team memberships: ${teamError.message}`);
    }
    const teamIds = (teamRows || []).map((t)=>t.team_id).filter(Boolean);
    // Get project IDs from teams
    let projectIdsFromTeams = [];
    if (teamIds.length > 0) {
        const { data: teamProjects, error: teamProjectsError } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from('projects').select('id').in('team_id', teamIds);
        if (teamProjectsError) {
            console.error('[Projects] Error loading team projects:', teamProjectsError);
            throw new Error(`Failed to load team projects: ${teamProjectsError.message}`);
        }
        projectIdsFromTeams = (teamProjects || []).map((p)=>p.id).filter(Boolean);
    }
    // Combine and deduplicate, excluding owned projects
    const allSharedIds = new Set([
        ...projectIdsFromMembership,
        ...projectIdsFromTeams
    ]);
    const ownedIdsSet = new Set(ownedProjectIds);
    const finalSharedIds = Array.from(allSharedIds).filter((id)=>!ownedIdsSet.has(id));
    if (finalSharedIds.length === 0) {
        return [];
    }
    // Fetch shared projects
    const { data: sharedProjects, error: sharedError } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from('projects').select('*').in('id', finalSharedIds).order('created_at', {
        ascending: false
    });
    if (sharedError) {
        console.error('[Projects] Error loading shared projects:', sharedError);
        throw new Error(`Failed to load shared projects: ${sharedError.message}`);
    }
    return sharedProjects || [];
}
async function GET(req) {
    try {
        console.log('[GET /api/projects] Request started');
        // SECURITY: Verify authentication
        const auth = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["verifyAuth"])(req);
        if (!auth) {
            console.log('[GET /api/projects] Unauthorized request');
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Unauthorized - authentication required'
            }, {
                status: 401
            });
        }
        const userId = auth.userId;
        console.log('[GET /api/projects] Authenticated user:', userId);
        // Fetch owned projects
        const ownedProjects = await getOwnedProjects(userId);
        console.log('[GET /api/projects] Found', ownedProjects.length, 'owned projects');
        // Fetch shared projects
        const ownedProjectIds = ownedProjects.map((p)=>p.id);
        const sharedProjects = await getSharedProjects(userId, ownedProjectIds);
        console.log('[GET /api/projects] Found', sharedProjects.length, 'shared projects');
        // Hydrate with team member info
        const myProjectsHydrated = await hydrateProjectsWithTeamMembers(ownedProjects);
        const sharedProjectsHydrated = await hydrateProjectsWithTeamMembers(sharedProjects);
        // Combine for backward compatibility
        const allProjects = [
            ...myProjectsHydrated,
            ...sharedProjectsHydrated
        ];
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            my_projects: myProjectsHydrated,
            shared_with_me: sharedProjectsHydrated,
            projects: allProjects
        }, {
            status: 200
        });
    } catch (err) {
        console.error('[GET /api/projects] Error:', err);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: err?.message || 'Internal server error'
        }, {
            status: 500
        });
    }
}
async function POST(req) {
    try {
        console.log('[POST /api/projects] Request started');
        // SECURITY: Verify authentication
        const auth = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["verifyAuth"])(req);
        if (!auth) {
            console.log('[POST /api/projects] Unauthorized request');
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
            console.error('[POST /api/projects] Invalid JSON:', err);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Invalid JSON in request body'
            }, {
                status: 400
            });
        }
        const name = typeof body.name === 'string' ? body.name.trim() : '';
        const description = typeof body.description === 'string' ? body.description.trim() : '';
        let teamId = typeof body.team_id === 'string' ? body.team_id : 'auto';
        // Validate required fields
        if (!name) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Project name is required'
            }, {
                status: 400
            });
        }
        // Handle auto team assignment
        if (teamId === 'auto') {
            console.log('[POST /api/projects] Auto-assigning team');
            // Find user's first team
            const { data: userTeams } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from('team_members').select('team_id').eq('user_id', userId).limit(1).single();
            if (userTeams?.team_id) {
                teamId = userTeams.team_id;
                console.log('[POST /api/projects] Using existing team:', teamId);
            } else {
                // Create personal workspace
                const { data: newTeam, error: teamError } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from('teams').insert({
                    name: 'My Workspace',
                    owner_id: userId
                }).select().single();
                if (teamError) {
                    console.error('[POST /api/projects] Error creating team:', teamError);
                    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                        error: 'Failed to create workspace'
                    }, {
                        status: 500
                    });
                }
                teamId = newTeam.id;
                console.log('[POST /api/projects] Created new team:', teamId);
                // Add user as team member
                await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from('team_members').insert({
                    team_id: teamId,
                    user_id: userId,
                    role: 'admin'
                });
            }
        }
        // Create project
        const { data: project, error: createError } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from('projects').insert({
            name,
            description: description || null,
            team_id: teamId,
            owner_id: userId
        }).select().single();
        if (createError) {
            console.error('[POST /api/projects] Error creating project:', createError);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: `Failed to create project: ${createError.message}`
            }, {
                status: 500
            });
        }
        // Add creator as project member
        try {
            await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from('project_members').upsert({
                project_id: project.id,
                member_id: userId,
                role: 'owner',
                added_by: userId
            }, {
                onConflict: 'project_id,member_id'
            });
        } catch (err) {
            console.warn('[POST /api/projects] Warning adding project membership:', err);
        }
        console.log('[POST /api/projects] Project created:', project.id);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            project
        }, {
            status: 201
        });
    } catch (err) {
        console.error('[POST /api/projects] Error:', err);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: err?.message || 'Internal server error'
        }, {
            status: 500
        });
    }
}
async function PATCH(req) {
    try {
        console.log('[PATCH /api/projects] Request started');
        // SECURITY: Verify authentication
        const auth = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["verifyAuth"])(req);
        if (!auth) {
            console.log('[PATCH /api/projects] Unauthorized request');
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
            console.error('[PATCH /api/projects] Invalid JSON:', err);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Invalid JSON in request body'
            }, {
                status: 400
            });
        }
        const projectId = typeof body.id === 'string' ? body.id.trim() : '';
        const name = typeof body.name === 'string' ? body.name.trim() : null;
        const description = typeof body.description === 'string' ? body.description.trim() : null;
        if (!projectId) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Project ID is required'
            }, {
                status: 400
            });
        }
        // SECURITY: Check if user can modify this project
        const canModify = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["canModifyProject"])(userId, projectId);
        if (!canModify) {
            console.log('[PATCH /api/projects] User not authorized to modify project');
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Forbidden - you do not have permission to modify this project'
            }, {
                status: 403
            });
        }
        // Build update object
        const updates = {};
        if (name !== null) updates.name = name;
        if (description !== null) updates.description = description;
        if (Object.keys(updates).length === 0) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Nothing to update'
            }, {
                status: 400
            });
        }
        // Update project
        const { data: project, error: updateError } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from('projects').update(updates).eq('id', projectId).select().single();
        if (updateError) {
            console.error('[PATCH /api/projects] Error updating project:', updateError);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: `Failed to update project: ${updateError.message}`
            }, {
                status: 500
            });
        }
        console.log('[PATCH /api/projects] Project updated:', projectId);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            project
        }, {
            status: 200
        });
    } catch (err) {
        console.error('[PATCH /api/projects] Error:', err);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: err?.message || 'Internal server error'
        }, {
            status: 500
        });
    }
}
async function DELETE(req) {
    try {
        console.log('[DELETE /api/projects] Request started');
        // SECURITY: Verify authentication
        const auth = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["verifyAuth"])(req);
        if (!auth) {
            console.log('[DELETE /api/projects] Unauthorized request');
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Unauthorized - authentication required'
            }, {
                status: 401
            });
        }
        const userId = auth.userId;
        // Get project ID from query or body
        const url = new URL(req.url);
        let projectId = url.searchParams.get('id') || '';
        if (!projectId) {
            try {
                const body = await req.json();
                projectId = typeof body.id === 'string' ? body.id.trim() : '';
            } catch (err) {
            // Body parsing failed, continue with empty projectId
            }
        }
        if (!projectId) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Project ID is required'
            }, {
                status: 400
            });
        }
        // SECURITY: Check if user can modify this project
        const canModify = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["canModifyProject"])(userId, projectId);
        if (!canModify) {
            console.log('[DELETE /api/projects] User not authorized to delete project');
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Forbidden - you do not have permission to delete this project'
            }, {
                status: 403
            });
        }
        // Delete project (cascade will handle related records)
        const { error: deleteError } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from('projects').delete().eq('id', projectId);
        if (deleteError) {
            console.error('[DELETE /api/projects] Error deleting project:', deleteError);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: `Failed to delete project: ${deleteError.message}`
            }, {
                status: 500
            });
        }
        console.log('[DELETE /api/projects] Project deleted:', projectId);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            success: true
        }, {
            status: 200
        });
    } catch (err) {
        console.error('[DELETE /api/projects] Error:', err);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: err?.message || 'Internal server error'
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__4f2710d3._.js.map
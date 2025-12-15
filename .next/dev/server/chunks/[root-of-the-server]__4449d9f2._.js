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
"[project]/app/api/projects/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// app/api/projects/route.ts
__turbopack_context__.s([
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
;
;
async function GET(req) {
    try {
        console.log('[GET /api/projects] Request started');
        console.log('[GET /api/projects] Fetching projects from Supabase...');
        // If caller provides an actor id (x-actor-id) return two lists: my_projects and shared_with_me
        let actorId = req.headers.get('x-actor-id');
        // If no explicit actor id, try Authorization Bearer token
        if (!actorId) {
            const authHeader = req.headers.get('authorization') || '';
            if (authHeader.toLowerCase().startsWith('bearer ')) {
                const token = authHeader.split(' ')[1];
                try {
                    const { data: verified, error: verifyErr } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].auth.getUser(token);
                    if (!verifyErr && verified?.user?.id) actorId = verified.user.id;
                    else console.warn('[GET /api/projects] auth.getUser failed', verifyErr?.message || verifyErr);
                } catch (e) {
                    console.warn('[GET /api/projects] token verification error', e?.message || e);
                }
            }
        }
        // If still no actorId, try to extract an access token from cookies (common cookie names)
        if (!actorId) {
            try {
                const cookieHeader = req.headers.get('cookie') || '';
                if (cookieHeader) {
                    // Common Supabase cookie names and patterns
                    const keys = [
                        'sb-access-token',
                        'supabase-auth-token',
                        'access_token',
                        'token',
                        'sb:token'
                    ];
                    const pairs = cookieHeader.split(';').map((s)=>s.trim());
                    for (const pair of pairs){
                        const eq = pair.indexOf('=');
                        if (eq === -1) continue;
                        const k = pair.substring(0, eq).trim();
                        const v = pair.substring(eq + 1).trim();
                        if (keys.includes(k) && v) {
                            // cookie may be URL encoded or JSON; try to parse JSON
                            let cand = v;
                            try {
                                cand = decodeURIComponent(v);
                            } catch (e) {}
                            if (cand.startsWith('{')) {
                                try {
                                    const parsed = JSON.parse(cand);
                                    // supabase session shapes may contain access_token
                                    if (parsed?.access_token) {
                                        const { data: verified, error: verifyErr } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].auth.getUser(parsed.access_token);
                                        if (!verifyErr && verified?.user?.id) {
                                            actorId = verified.user.id;
                                            break;
                                        }
                                    }
                                } catch (e) {}
                            } else {
                                // try token-like string
                                const jwtMatch = cand.match(/([A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+)/);
                                const token = jwtMatch ? jwtMatch[1] : cand;
                                try {
                                    const { data: verified, error: verifyErr } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].auth.getUser(token);
                                    if (!verifyErr && verified?.user?.id) {
                                        actorId = verified.user.id;
                                        break;
                                    }
                                } catch (e) {}
                            }
                        }
                    }
                }
            } catch (e) {
            // ignore cookie parsing issues
            }
        }
        if (!actorId) {
            console.log('[GET /api/projects] No actor header or valid token provided — returning public projects list');
        }
        if (actorId) {
            // My projects: where owner_id == actorId
            const { data: myProjects, error: myErr } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from('projects').select('*').eq('owner_id', actorId).order('created_at', {
                ascending: false
            });
            if (myErr) {
                console.error('[GET /api/projects] Error loading my projects:', myErr);
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    error: myErr.message
                }, {
                    status: 500
                });
            }
            // Shared: projects where user is in project_members OR is member of a team that owns the project,
            // excluding projects the user already owns
            // 1) project_members
            const { data: pmRows, error: pmErr } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from('project_members').select('project_id, role').eq('member_id', actorId);
            if (pmErr) {
                console.error('[GET /api/projects] Error loading project_members:', pmErr);
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    error: pmErr.message
                }, {
                    status: 500
                });
            }
            const projectIdsFromMembers = (pmRows || []).map((r)=>r.project_id).filter(Boolean);
            // 2) team_members -> collect team ids
            const { data: tmRows, error: tmErr } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from('team_members').select('team_id').eq('user_id', actorId);
            if (tmErr) {
                console.error('[GET /api/projects] Error loading team_members:', tmErr);
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    error: tmErr.message
                }, {
                    status: 500
                });
            }
            const teamIds = (tmRows || []).map((t)=>t.team_id).filter(Boolean);
            // Collect shared project ids from team membership
            let projectIdsFromTeams = [];
            if (teamIds.length) {
                const { data: projectsFromTeams, error: pftErr } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from('projects').select('id').in('team_id', teamIds);
                if (pftErr) {
                    console.error('[GET /api/projects] Error loading projects for teams:', pftErr);
                    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                        error: pftErr.message
                    }, {
                        status: 500
                    });
                }
                projectIdsFromTeams = (projectsFromTeams || []).map((p)=>p.id).filter(Boolean);
            }
            const sharedIdsSet = new Set([
                ...projectIdsFromMembers,
                ...projectIdsFromTeams
            ]);
            // Remove projects owned by actor
            const ownedIds = new Set((myProjects || []).map((p)=>p.id));
            const finalSharedIds = Array.from(sharedIdsSet).filter((id)=>!ownedIds.has(id));
            let sharedProjects = [];
            if (finalSharedIds.length) {
                const { data: sp, error: spErr } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from('projects').select('*').in('id', finalSharedIds).order('created_at', {
                    ascending: false
                });
                if (spErr) {
                    console.error('[GET /api/projects] Error loading shared projects:', spErr);
                    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                        error: spErr.message
                    }, {
                        status: 500
                    });
                }
                sharedProjects = sp || [];
            }
            // For each project include team_members minimal info
            const hydrate = async (projectsList)=>{
                return Promise.all((projectsList || []).map(async (project)=>{
                    let teamMembersData = [];
                    try {
                        if (project.team_id) {
                            const { data } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from('team_members').select('user_id, role, joined_at').eq('team_id', project.team_id);
                            teamMembersData = data || [];
                        }
                    } catch (e) {
                        console.warn('[GET /api/projects] Warning loading team_members for project', project.id, e?.message || e);
                    }
                    return {
                        ...project,
                        team_members: teamMembersData
                    };
                }));
            };
            const myProjectsHydrated = await hydrate(myProjects || []);
            const sharedHydrated = await hydrate(sharedProjects || []);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                my_projects: myProjectsHydrated,
                shared_with_me: sharedHydrated
            }, {
                status: 200
            });
        }
        // Fallback: return all projects (existing behavior)
        const { data: projectsData, error: projectsError } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from('projects').select('*').order('created_at', {
            ascending: false
        });
        if (projectsError) {
            console.error('[GET /api/projects] Error loading projects:', projectsError);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: projectsError.message,
                code: projectsError.code
            }, {
                status: 500
            });
        }
        const projects = await Promise.all((projectsData || []).map(async (project)=>{
            let teamMembersData = [];
            try {
                if (project.team_id) {
                    const { data } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from('team_members').select('user_id, role, joined_at').eq('team_id', project.team_id);
                    teamMembersData = data || [];
                }
            } catch (e) {
                console.warn('[GET /api/projects] Warning loading team_members for project', project.id, e?.message || e);
            }
            return {
                ...project,
                team_members: teamMembersData
            };
        }));
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            projects
        }, {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    } catch (err) {
        console.error("[GET /api/projects] Exception:", {
            message: err?.message,
            stack: err?.stack
        });
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: err?.message || "Errore imprevisto",
            details: String(err)
        }, {
            status: 500
        });
    }
}
async function POST(req) {
    try {
        const rawBody = await req.text();
        if (!rawBody) {
            console.error("[POST /api/projects] Empty request body");
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Empty request body"
            }, {
                status: 400
            });
        }
        let body;
        try {
            body = JSON.parse(rawBody);
        } catch (err) {
            console.error("[POST /api/projects] JSON parse error", err, "RAW:", rawBody);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Invalid JSON body"
            }, {
                status: 400
            });
        }
        const rawName = typeof body.name === "string" ? body.name : "";
        const rawDescription = typeof body.description === "string" ? body.description : "";
        let teamId = typeof body.team_id === "string" ? body.team_id : "";
        const name = rawName.trim();
        const description = rawDescription.trim();
        if (!name) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Name is required"
            }, {
                status: 400
            });
        }
        // Determine actor (owner) from Authorization or x-actor-id header
        let actorId = req.headers.get('x-actor-id') || null;
        try {
            const authHeader = req.headers.get('authorization') || '';
            if (authHeader.toLowerCase().startsWith('bearer ')) {
                const token = authHeader.split(' ')[1];
                if (token) {
                    const { data: verified, error: verifyErr } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].auth.getUser(token);
                    if (!verifyErr && verified?.user?.id) actorId = verified.user.id;
                    else console.warn('[/api/projects] auth.getUser failed', verifyErr);
                }
            }
        } catch (e) {
            console.warn('[/api/projects] token verification error', e);
        }
        // If team_id is 'auto' or missing, get first team from DB or create one
        if (!teamId || teamId === 'auto') {
            console.log('[POST /api/projects] Auto-creating workspace');
            // Try to find existing team
            const { data: existingTeams } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from('teams').select('id').limit(1);
            if (existingTeams && existingTeams.length > 0) {
                teamId = existingTeams[0].id;
                console.log('[POST /api/projects] Using existing team:', teamId);
            } else {
                // Create new team
                const { data: newTeam, error: teamError } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from('teams').insert({
                    name: 'Personal Workspace',
                    owner_id: actorId || 'system'
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
            }
        }
        // Include owner_id if we determined an actor
        const projectInsert = {
            name,
            description: description || null,
            team_id: teamId
        };
        if (actorId) projectInsert.owner_id = actorId;
        const { data, error } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("projects").insert(projectInsert).select("id, name, description, created_at, team_id, owner_id").single();
        if (error) {
            console.error("[POST /api/projects] Supabase insert error", error);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: error.message || "Errore nella creazione del progetto su Supabase",
                details: error
            }, {
                status: 500
            });
        }
        // If we created the project and we know the owner, add membership row
        try {
            if (actorId && data?.id) {
                await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from('project_members').upsert({
                    project_id: data.id,
                    member_id: actorId,
                    role: 'owner',
                    added_by: actorId
                }, {
                    onConflict: '(project_id, member_id)'
                });
            }
        } catch (e) {
            console.warn('[POST /api/projects] Warning adding project_members for owner', e);
        }
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            project: data
        }, {
            status: 201
        });
    } catch (err) {
        console.error("[POST /api/projects] Unexpected error", err);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: err?.message || "Errore imprevisto nella creazione del progetto",
            details: String(err)
        }, {
            status: 500
        });
    }
}
async function PATCH(req) {
    try {
        const rawBody = await req.text();
        if (!rawBody) {
            console.error("[PATCH /api/projects] Empty request body");
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Empty request body"
            }, {
                status: 400
            });
        }
        let body;
        try {
            body = JSON.parse(rawBody);
        } catch (err) {
            console.error("[PATCH /api/projects] JSON parse error", err, "RAW:", rawBody);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Invalid JSON body"
            }, {
                status: 400
            });
        }
        const id = typeof body.id === "string" ? body.id : "";
        const rawName = typeof body.name === "string" ? body.name : "";
        const rawDescription = typeof body.description === "string" ? body.description : "";
        const deleteCueId = typeof body.deleteCueId === "string" ? body.deleteCueId : "";
        if (!id) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "id is required"
            }, {
                status: 400
            });
        }
        // Handle cue deletion
        if (deleteCueId) {
            console.log("[PATCH /api/projects] Deleting cue:", deleteCueId);
            const { error: deleteError } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("cues").delete().eq("id", deleteCueId).eq("project_id", id);
            if (deleteError) {
                console.error("[PATCH /api/projects] Supabase cue delete error", deleteError);
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    error: deleteError.message || "Errore nella cancellazione della cue",
                    details: deleteError
                }, {
                    status: 500
                });
            }
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                success: true,
                message: "Cue deleted"
            }, {
                status: 200
            });
        }
        const update = {};
        if (rawName.trim()) update.name = rawName.trim();
        if (rawDescription.trim()) update.description = rawDescription.trim();
        if (!Object.keys(update).length) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Nothing to update"
            }, {
                status: 400
            });
        }
        const { data, error } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("projects").update(update).eq("id", id).select("id, name, description, created_at").single();
        if (error) {
            console.error("[PATCH /api/projects] Supabase update error", error);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: error.message || "Errore nell'aggiornamento del progetto",
                details: error
            }, {
                status: 500
            });
        }
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            project: data
        }, {
            status: 200
        });
    } catch (err) {
        console.error("[PATCH /api/projects] Unexpected error", err);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: err?.message || "Errore imprevisto nell'aggiornamento del progetto",
            details: String(err)
        }, {
            status: 500
        });
    }
}
async function DELETE(req) {
    try {
        const url = new URL(req.url);
        const queryId = url.searchParams.get("id") ?? "";
        const rawBody = await req.text();
        let body = null;
        if (rawBody) {
            try {
                body = JSON.parse(rawBody);
            } catch (err) {
                console.error("[DELETE /api/projects] JSON parse error", err, "RAW:", rawBody);
            // Se il body è invalido ma abbiamo queryId, possiamo comunque procedere.
            }
        }
        const bodyId = body && typeof body.id === "string" ? body.id.trim() : "";
        const id = bodyId || queryId;
        if (!id) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "id is required"
            }, {
                status: 400
            });
        }
        const { error } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("projects").delete().eq("id", id);
        if (error) {
            console.error("[DELETE /api/projects] Supabase delete error", error);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: error.message || "Errore nella cancellazione del progetto",
                details: error
            }, {
                status: 500
            });
        }
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            success: true
        }, {
            status: 200
        });
    } catch (err) {
        console.error("[DELETE /api/projects] Unexpected error", err);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: err?.message || "Errore imprevisto nella cancellazione del progetto",
            details: String(err)
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__4449d9f2._.js.map
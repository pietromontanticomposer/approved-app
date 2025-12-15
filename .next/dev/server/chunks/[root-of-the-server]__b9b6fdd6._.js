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
"[project]/app/api/references/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// app/api/references/route.ts
__turbopack_context__.s([
    "DELETE",
    ()=>DELETE,
    "GET",
    ()=>GET,
    "POST",
    ()=>POST
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$uuid$2f$dist$2d$node$2f$v4$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__default__as__v4$3e$__ = __turbopack_context__.i("[project]/node_modules/uuid/dist-node/v4.js [app-route] (ecmascript) <export default as v4>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabaseAdmin.ts [app-route] (ecmascript)");
;
;
;
const SUPABASE_URL = ("TURBOPACK compile-time value", "https://waaigankcctijalvlppk.supabase.co");
const STORAGE_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "media";
const SIGNED_URL_TTL_SECONDS = parseInt(process.env.NEXT_PUBLIC_SUPABASE_SIGNED_TTL || "7200", 10);
const isUuid = (value)=>typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const isAbsoluteUrl = (url)=>!!url && /^https?:\/\//i.test(url);
function normalizeStoragePath(path) {
    if (!path) return null;
    const trimmed = path.replace(/^\/+/, "");
    if (trimmed.startsWith(`${STORAGE_BUCKET}/`)) {
        return trimmed.slice(STORAGE_BUCKET.length + 1);
    }
    return trimmed;
}
function extractPathFromSupabaseUrl(url) {
    try {
        const u = new URL(url);
        const parts = u.pathname.split("/").filter(Boolean);
        const idx = parts.findIndex((p)=>p === "object");
        if (idx >= 0) {
            const after = parts.slice(idx + 1);
            if (after.length >= 2 && after[1] === STORAGE_BUCKET) {
                return after.slice(2).join("/");
            }
            if (after.length >= 3 && after[0] === "sign" && after[2] === STORAGE_BUCKET) {
                return after.slice(3).join("/");
            }
        }
    } catch (err) {
        console.warn("[GET /api/references] Failed to parse Supabase URL", {
            url,
            err
        });
    }
    return null;
}
async function resolveMediaUrl(raw) {
    if (!raw) return null;
    if (isAbsoluteUrl(raw)) {
        const supaPath = ("TURBOPACK compile-time truthy", 1) ? extractPathFromSupabaseUrl(raw) : "TURBOPACK unreachable";
        if (!supaPath) return raw;
        raw = supaPath;
    }
    const cleanPath = normalizeStoragePath(raw);
    if (!cleanPath) return null;
    try {
        const { data, error } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].storage.from(STORAGE_BUCKET).createSignedUrl(cleanPath, SIGNED_URL_TTL_SECONDS);
        if (error) {
            console.error("[GET /api/references] Signed URL error", {
                path: cleanPath,
                error
            });
        }
        if (data?.signedUrl) {
            return data.signedUrl;
        }
    } catch (err) {
        console.error("[GET /api/references] Exception signing URL", err);
    }
    if ("TURBOPACK compile-time truthy", 1) {
        return `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${cleanPath}`;
    }
    //TURBOPACK unreachable
    ;
}
async function GET(req) {
    try {
        const url = new URL(req.url);
        const projectId = url.searchParams.get('projectId');
        if (!projectId) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'projectId required'
            }, {
                status: 400
            });
        }
        const { data: roots, error } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("references_root").select('*').eq("project_id", projectId).order("created_at", {
            ascending: false
        });
        if (error) {
            console.error("[GET /api/references] Error:", error);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: error.message
            }, {
                status: 500
            });
        }
        const rootIds = (roots || []).map((r)=>r.id);
        let versions = [];
        if (rootIds.length) {
            const { data: versionRows, error: versionErr } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("reference_versions").select('*').in("root_id", rootIds).order("created_at", {
                ascending: true
            });
            if (versionErr) {
                console.error("[GET /api/references] Version load error", versionErr);
            } else {
                versions = versionRows || [];
            }
        }
        const versionsByRoot = {};
        for (const v of versions){
            const urlSigned = await resolveMediaUrl(v.url || v.thumbnail_path || null);
            const thumbSigned = await resolveMediaUrl(v.thumbnail_url || v.thumbnail_path || null);
            const prepared = {
                ...v,
                url: urlSigned || v.url,
                thumbnail_url: thumbSigned || v.thumbnail_url
            };
            if (!versionsByRoot[prepared.root_id]) versionsByRoot[prepared.root_id] = [];
            versionsByRoot[prepared.root_id].push(prepared);
        }
        const enriched = (roots || []).map((r)=>({
                ...r,
                versions: versionsByRoot[r.id] || []
            }));
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            references: enriched
        }, {
            status: 200
        });
    } catch (err) {
        console.error("[GET /api/references] Exception:", err);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: err.message
        }, {
            status: 500
        });
    }
}
async function POST(req) {
    try {
        const body = await req.json();
        const { project_id, root_id, name, type, url, size } = body;
        if (!project_id || !name || !url) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "project_id, name, and url are required"
            }, {
                status: 400
            });
        }
        if (!isUuid(project_id)) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "project_id must be a UUID"
            }, {
                status: 400
            });
        }
        // If root_id is provided, add to existing reference root
        if (root_id) {
            if (!isUuid(root_id)) {
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    error: "root_id must be a UUID"
                }, {
                    status: 400
                });
            }
            const version_id = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$uuid$2f$dist$2d$node$2f$v4$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__default__as__v4$3e$__["v4"])();
            const { data, error } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("reference_versions").insert({
                id: version_id,
                root_id,
                name,
                type: type || null,
                url,
                size: size || null
            }).select().single();
            if (error) {
                console.error("[POST /api/references] Supabase error", error);
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    error: error.message
                }, {
                    status: 500
                });
            }
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                version: data
            }, {
                status: 201
            });
        }
        // Create new reference root and version
        const root_id_new = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$uuid$2f$dist$2d$node$2f$v4$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__default__as__v4$3e$__["v4"])();
        const version_id = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$uuid$2f$dist$2d$node$2f$v4$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__default__as__v4$3e$__["v4"])();
        // Insert root
        const { data: rootData, error: rootError } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("references_root").insert({
            id: root_id_new,
            project_id,
            name,
            active_version_index: 0
        }).select().single();
        if (rootError) {
            console.error("[POST /api/references] Root insert error", rootError);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: rootError.message
            }, {
                status: 500
            });
        }
        // Insert version
        const { data: versionData, error: versionError } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("reference_versions").insert({
            id: version_id,
            root_id: root_id_new,
            name,
            type: type || null,
            url,
            size: size || null
        }).select().single();
        if (versionError) {
            console.error("[POST /api/references] Version insert error", versionError);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: versionError.message
            }, {
                status: 500
            });
        }
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            root: rootData,
            version: versionData
        }, {
            status: 201
        });
    } catch (err) {
        console.error("[POST /api/references] Error", err);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: err.message || "Internal error"
        }, {
            status: 500
        });
    }
}
async function DELETE(req) {
    try {
        const body = await req.json();
        const { rootId, versionId } = body;
        if (!rootId) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "rootId is required"
            }, {
                status: 400
            });
        }
        if (!isUuid(rootId)) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "rootId must be a UUID"
            }, {
                status: 400
            });
        }
        // Delete specific version if versionId provided
        if (versionId) {
            if (!isUuid(versionId)) {
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    error: "versionId must be a UUID"
                }, {
                    status: 400
                });
            }
            const { error } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("reference_versions").delete().eq("id", versionId).eq("root_id", rootId);
            if (error) {
                console.error("[DELETE /api/references] Version delete error", error);
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    error: error.message
                }, {
                    status: 500
                });
            }
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                success: true,
                message: "Version deleted"
            }, {
                status: 200
            });
        }
        // Delete entire reference root group (cascade deletes versions)
        const { error } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("references_root").delete().eq("id", rootId);
        if (error) {
            console.error("[DELETE /api/references] Root delete error", error);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: error.message
            }, {
                status: 500
            });
        }
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            success: true,
            message: "Reference group deleted"
        }, {
            status: 200
        });
    } catch (err) {
        console.error("[DELETE /api/references] Error", err);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: err.message || "Internal error"
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__b9b6fdd6._.js.map
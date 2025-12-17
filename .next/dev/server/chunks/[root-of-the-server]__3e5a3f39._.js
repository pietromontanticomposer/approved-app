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
"[project]/app/api/versions/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// app/api/versions/route.ts
__turbopack_context__.s([
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
;
;
;
const isUuid = (value)=>typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const SUPABASE_URL = ("TURBOPACK compile-time value", "https://waaigankcctijalvlppk.supabase.co");
const STORAGE_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "media";
const SIGNED_URL_TTL_SECONDS = parseInt(process.env.NEXT_PUBLIC_SUPABASE_SIGNED_TTL || "7200", 10);
// Simple in-memory cache for signed URLs to avoid calling createSignedUrl on every request
const signedUrlCache = new Map();
function getCachedSignedUrl(path) {
    const entry = signedUrlCache.get(path);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
        signedUrlCache.delete(path);
        return null;
    }
    return entry.url;
}
function setCachedSignedUrl(path, url, ttlSeconds) {
    const expiresAt = Date.now() + Math.max(1000, (ttlSeconds || SIGNED_URL_TTL_SECONDS) * 1000 - 5000);
    signedUrlCache.set(path, {
        url,
        expiresAt
    });
}
function detectMediaType(nameOrPath) {
    if (!nameOrPath) return null;
    const lower = nameOrPath.toLowerCase();
    if (/(\.mp3|\.wav|\.aiff|\.aif|\.flac|\.aac|\.m4a|\.ogg|\.oga|\.opus)$/.test(lower)) {
        return "audio";
    }
    if (/(\.mp4|\.mov|\.mkv|\.webm|\.avi|\.m4v)$/.test(lower)) {
        return "video";
    }
    return null;
}
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
        const pathParts = u.pathname.split("/").filter(Boolean);
        const storageIdx = pathParts.findIndex((p)=>p === "object");
        if (storageIdx >= 0) {
            const afterObject = pathParts.slice(storageIdx + 1); // [public|sign, bucket, ...file]
            // Public URL: /storage/v1/object/public/<bucket>/<path>
            if (afterObject.length >= 2 && afterObject[0] === "public" && afterObject[1] === STORAGE_BUCKET) {
                return afterObject.slice(2).join("/");
            }
            // Signed URL: /storage/v1/object/sign/<bucket>/<path>?token=...
            if (afterObject.length >= 2 && afterObject[0] === "sign" && afterObject[1] === STORAGE_BUCKET) {
                return afterObject.slice(2).join("/");
            }
        }
    } catch (err) {
        console.warn("[GET /api/versions] Failed to parse Supabase URL", {
            url,
            err
        });
    }
    return null;
}
async function resolveMediaUrl(raw) {
    if (!raw) return null;
    // If the stored value is already a data URL, return it directly
    if (raw && raw.startsWith && raw.startsWith("data:")) return raw;
    if (isAbsoluteUrl(raw)) {
        // If the URL already looks signed or is a public URL, return it directly to avoid re-signing cost.
        // Many Supabase signed URLs include '/object/sign/' or a query token parameter.
        try {
            const lower = raw.toLowerCase();
            if (lower.includes('/object/sign/') || lower.includes('?token=') || lower.includes('=token')) {
                return raw;
            }
        } catch (e) {}
        // If it is a Supabase URL without a token, extract the storage path to sign it.
        const supaPath = ("TURBOPACK compile-time truthy", 1) ? extractPathFromSupabaseUrl(raw) : "TURBOPACK unreachable";
        if (!supaPath) return raw;
        raw = supaPath;
    }
    const cleanPath = normalizeStoragePath(raw);
    if (!cleanPath) return null;
    try {
        // Try cache first
        const cached = getCachedSignedUrl(cleanPath);
        if (cached) return cached;
        const t0 = Date.now();
        const { data, error } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].storage.from(STORAGE_BUCKET).createSignedUrl(cleanPath, SIGNED_URL_TTL_SECONDS);
        const took = Date.now() - t0;
        if (error) {
            console.error("[GET /api/versions] Signed URL error", {
                path: cleanPath,
                error,
                took
            });
        } else {
            console.log("[GET /api/versions] Signed URL created", {
                path: cleanPath,
                took
            });
        }
        if (data?.signedUrl) {
            setCachedSignedUrl(cleanPath, data.signedUrl, SIGNED_URL_TTL_SECONDS);
            return data.signedUrl;
        }
    } catch (err) {
        console.error("[GET /api/versions] Exception signing URL", err);
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
        const cueId = url.searchParams.get('cueId');
        if (!cueId) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'cueId required'
            }, {
                status: 400
            });
        }
        const { data: versions, error } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("versions").select('*').eq("cue_id", cueId).order("index_in_cue", {
            ascending: true
        });
        console.log('[GET /api/versions] result', {
            cueId,
            count: versions?.length,
            error
        });
        if (error) {
            console.error("[GET /api/versions] Error:", error);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: error.message
            }, {
                status: 500
            });
        }
        // Costruisci URL pubblici per i media
        const processedVersions = await Promise.all((versions || []).map(async (v)=>{
            const mediaUrl = await resolveMediaUrl(v.media_url || v.media_storage_path || null);
            const thumbUrl = await resolveMediaUrl(v.media_thumbnail_url || v.media_thumbnail_path || null);
            const mediaType = v.media_type || detectMediaType(v.media_original_name || v.media_display_name || v.media_storage_path || v.media_url || "");
            return {
                ...v,
                media_type: mediaType,
                media_url: mediaUrl,
                media_filename: v.media_original_name || v.media_display_name || "Media",
                duration: v.media_duration,
                thumbnail_url: thumbUrl
            };
        }));
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            versions: processedVersions
        }, {
            status: 200
        });
    } catch (err) {
        console.error("[GET /api/versions] Exception:", err);
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
        const { cue_id, version } = body;
        if (!cue_id || !version) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "cue_id and version are required"
            }, {
                status: 400
            });
        }
        if (!isUuid(cue_id)) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "cue_id must be a UUID"
            }, {
                status: 400
            });
        }
        const version_id = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$uuid$2f$dist$2d$node$2f$v4$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__default__as__v4$3e$__["v4"])();
        const { data, error } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("versions").insert({
            id: version_id,
            cue_id,
            index_in_cue: version.index || 0,
            status: version.status || "in-review",
            media_type: version.media_type || null,
            media_storage_path: version.media_storage_path || null,
            media_url: version.media_url || null,
            media_original_name: version.media_original_name || null,
            media_display_name: version.media_display_name || null,
            media_duration: version.media_duration || null,
            media_thumbnail_path: version.media_thumbnail_path || null,
            media_thumbnail_url: version.media_thumbnail_url || null
        }).select().single();
        if (error) {
            console.error("[POST /api/versions] Supabase error", error);
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
    } catch (err) {
        console.error("[POST /api/versions] Error", err);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: err.message
        }, {
            status: 500
        });
    }
}
async function PATCH(req) {
    try {
        const body = await req.json();
        const { id, status } = body;
        if (!id || !status) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "id and status are required"
            }, {
                status: 400
            });
        }
        if (!isUuid(id)) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "id must be a UUID"
            }, {
                status: 400
            });
        }
        const { data, error } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("versions").update({
            status
        }).eq("id", id).select().single();
        if (error) {
            console.error("[PATCH /api/versions] Supabase error", error);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: error.message
            }, {
                status: 500
            });
        }
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            version: data
        }, {
            status: 200
        });
    } catch (err) {
        console.error("[PATCH /api/versions] Error", err);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: err.message
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__3e5a3f39._.js.map
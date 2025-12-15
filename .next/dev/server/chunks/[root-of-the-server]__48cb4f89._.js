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
if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.");
}
const supabaseAdmin = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$esm$2f$wrapper$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createClient"])(supabaseUrl, supabaseServiceKey, {
    auth: {
        persistSession: false
    }
});
}),
"[project]/app/api/media/stream/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET,
    "runtime",
    ()=>runtime
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabaseAdmin.ts [app-route] (ecmascript)");
;
;
const runtime = "nodejs";
const STORAGE_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "media";
const SIGNED_URL_TTL_SECONDS = parseInt(process.env.NEXT_PUBLIC_SUPABASE_SIGNED_TTL || "7200", 10);
function normalizeStoragePath(path) {
    if (!path) return null;
    const trimmed = path.replace(/^\/+/, "");
    // If path includes bucket prefix like "media/...", remove the bucket name
    if (trimmed.startsWith(`${STORAGE_BUCKET}/`)) {
        return trimmed.slice(STORAGE_BUCKET.length + 1);
    }
    return trimmed;
}
async function GET(req) {
    try {
        const url = new URL(req.url);
        const rawPath = url.searchParams.get("path");
        const rawUrl = url.searchParams.get("url");
        let targetUrl = null;
        if (rawUrl) {
            // If caller passes an absolute URL (signed or public), use it directly
            targetUrl = rawUrl;
        } else if (rawPath) {
            const clean = normalizeStoragePath(rawPath);
            if (!clean) return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "invalid path"
            }, {
                status: 400
            });
            // create signed URL server-side
            const { data, error } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].storage.from(STORAGE_BUCKET).createSignedUrl(clean, SIGNED_URL_TTL_SECONDS);
            if (error) {
                console.warn("[GET /api/media/stream] createSignedUrl error", error);
                // fallback to public url
                const { data: pub } = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].storage.from(STORAGE_BUCKET).getPublicUrl(clean);
                targetUrl = pub?.publicUrl || null;
            } else {
                targetUrl = data?.signedUrl || null;
            }
        } else {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "path or url required"
            }, {
                status: 400
            });
        }
        if (!targetUrl) return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: "no target url"
        }, {
            status: 404
        });
        // Fetch the media server-side and stream it back with permissive CORS so the browser
        // can use it from our domain (avoids bucket CORS issues when using signed URLs).
        // Forward Range and related headers so the browser can request partial content
        const forwardedHeaders = {};
        const range = req.headers.get('range');
        const ifRange = req.headers.get('if-range');
        const accept = req.headers.get('accept');
        if (range) forwardedHeaders['range'] = range;
        if (ifRange) forwardedHeaders['if-range'] = ifRange;
        if (accept) forwardedHeaders['accept'] = accept;
        let res;
        try {
            res = await fetch(targetUrl, {
                headers: forwardedHeaders
            });
        } catch (fetchErr) {
            console.error("[GET /api/media/stream] fetch exception", {
                targetUrl,
                fetchErr
            });
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "exception fetching upstream media",
                details: String(fetchErr)
            }, {
                status: 502
            });
        }
        // If upstream returned non-OK (including 4xx/5xx), propagate status and small body snippet
        if (!res.ok) {
            let txt = null;
            try {
                txt = await res.text();
            } catch (e) {
                txt = `<unable to read body: ${String(e)}>`;
            }
            console.error("[GET /api/media/stream] upstream fetch failed", {
                status: res.status,
                statusText: res.statusText,
                bodySnippet: txt && txt.slice ? txt.slice(0, 200) : txt,
                targetUrl
            });
            const errHeaders = new Headers();
            errHeaders.set('Content-Type', 'application/json');
            errHeaders.set('Access-Control-Allow-Origin', '*');
            return new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"](JSON.stringify({
                error: 'upstream fetch failed',
                upstreamStatus: res.status,
                upstreamText: txt && txt.slice ? txt.slice(0, 200) : txt
            }), {
                status: res.status,
                headers: errHeaders
            });
        }
        // Copy relevant headers from upstream and add CORS
        const headers = new Headers();
        const contentType = res.headers.get('content-type');
        if (contentType) headers.set('Content-Type', contentType);
        const contentLength = res.headers.get('content-length');
        if (contentLength) headers.set('Content-Length', contentLength);
        const acceptRanges = res.headers.get('accept-ranges');
        if (acceptRanges) headers.set('Accept-Ranges', acceptRanges);
        const contentRange = res.headers.get('content-range');
        if (contentRange) headers.set('Content-Range', contentRange);
        // Cache control: prefer upstream value if present
        const upstreamCache = res.headers.get('cache-control');
        headers.set('Cache-Control', upstreamCache || 'public, max-age=3600');
        headers.set('Access-Control-Allow-Origin', '*');
        return new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"](res.body, {
            status: res.status,
            headers
        });
    } catch (err) {
        console.error("[GET /api/media/stream] Exception", err);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: String(err)
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__48cb4f89._.js.map
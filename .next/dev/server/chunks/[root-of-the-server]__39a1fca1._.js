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
"[externals]/crypto [external] (crypto, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("crypto", () => require("crypto"));

module.exports = mod;
}),
"[project]/app/api/projects/share/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DELETE",
    ()=>DELETE,
    "POST",
    ()=>POST
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabaseAdmin.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/crypto [external] (crypto, cjs)");
;
;
;
async function POST(req) {
    try {
        const raw = await req.text();
        if (!raw) return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: 'Empty body'
        }, {
            status: 400
        });
        const body = JSON.parse(raw);
        const projectId = typeof body.project_id === 'string' ? body.project_id : '';
        const role = typeof body.role === 'string' ? body.role : 'view';
        const expiresAt = typeof body.expires_at === 'string' ? body.expires_at : null;
        const maxUses = typeof body.max_uses === 'number' ? body.max_uses : null;
        // Prefer server-verified actor via Authorization: Bearer <token>
        let actorId = req.headers.get('x-actor-id');
        try {
            const authHeader = req.headers.get('authorization') || '';
            if (authHeader.toLowerCase().startsWith('bearer ')) {
                const token = authHeader.split(' ')[1];
                if (token) {
                    const { data: verified, error: verifyErr } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].auth.getUser(token);
                    if (!verifyErr && verified?.user?.id) {
                        actorId = verified.user.id;
                    } else {
                        console.warn('[/api/projects/share] auth.getUser failed', verifyErr);
                    }
                }
            }
        } catch (e) {
            console.warn('[/api/projects/share] token verification error', e);
        }
        if (!actorId) return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: 'Missing x-actor-id header or Authorization token'
        }, {
            status: 403
        });
        if (!projectId) return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: 'project_id is required'
        }, {
            status: 400
        });
        // Verify actor is owner or manager of the project
        const { data: proj, error: projErr } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from('projects').select('id, team_id, owner_id').eq('id', projectId).maybeSingle();
        if (projErr || !proj) return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: 'Project not found'
        }, {
            status: 404
        });
        // Simple ownership check: match owner or check project_members
        let isAuthorized = false;
        if (proj.owner_id && proj.owner_id === actorId) isAuthorized = true;
        if (!isAuthorized) {
            const { data: pm } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from('project_members').select('role').eq('project_id', projectId).eq('member_id', actorId).limit(1);
            if (pm && pm.length > 0 && (pm[0].role === 'owner' || pm[0].role === 'manage')) isAuthorized = true;
        }
        // If still not authorized and project has no owner_id set, check the team's owner via team_members
        if (!isAuthorized && !proj.owner_id && proj.team_id) {
            try {
                const { data: teamOwnerRows } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from('team_members').select('user_id, role').eq('team_id', proj.team_id).eq('role', 'owner').limit(1);
                const ownerRow = Array.isArray(teamOwnerRows) ? teamOwnerRows[0] : teamOwnerRows;
                if (ownerRow && ownerRow.user_id === actorId) isAuthorized = true;
            } catch (e) {
                console.warn('[/api/projects/share] team owner lookup failed', e);
            }
        }
        if (!isAuthorized) {
            console.warn('[/api/projects/share] Forbidden: actor not authorized', {
                actorId,
                projectOwner: proj.owner_id
            });
            const { data: pmDebug } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from('project_members').select('member_id,role').eq('project_id', projectId);
            console.warn('[/api/projects/share] project_members for project', projectId, pmDebug || []);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Forbidden'
            }, {
                status: 403
            });
        }
        // Generate token and store only hash
        const token = __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["default"].randomBytes(32).toString('base64url');
        const tokenHash = __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["default"].createHash('sha256').update(token).digest('hex');
        const insert = {
            project_id: projectId,
            role,
            token_hash: tokenHash,
            created_by: actorId,
            expires_at: expiresAt,
            max_uses: maxUses
        };
        const { data, error } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from('share_links').insert(insert).select().single();
        if (error) return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: error.message
        }, {
            status: 500
        });
        // Build safe origin: prefer NEXT_PUBLIC_APP_URL, then Origin header, then x-forwarded-proto + host, then localhost fallback
        const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_ORIGIN || '';
        const originHeader = req.headers.get('origin');
        const forwardedProto = req.headers.get('x-forwarded-proto');
        const hostHeader = req.headers.get('host');
        const fallbackProto = forwardedProto || 'http';
        const computedOrigin = envUrl || originHeader || (hostHeader ? `${fallbackProto}://${hostHeader}` : `http://localhost:3000`);
        const safeOrigin = computedOrigin.replace(/\/+$/, '');
        const cleanToken = String(token || '').trim();
        const link = `${safeOrigin}/share/${data.id}?token=${encodeURIComponent(cleanToken)}`;
        // Log audit
        await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from('audit_logs').insert({
            actor_id: actorId,
            action: 'share_link_created',
            target_type: 'project',
            target_id: projectId,
            meta: {
                share_link_id: data.id,
                role
            }
        });
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            id: data.id,
            link
        }, {
            status: 201
        });
    } catch (err) {
        console.error('[POST /api/projects/share] Error', err);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: err?.message || 'Unexpected error'
        }, {
            status: 500
        });
    }
}
async function DELETE(req) {
    try {
        const raw = await req.text();
        if (!raw) return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: 'Empty body'
        }, {
            status: 400
        });
        const body = JSON.parse(raw);
        const id = typeof body.id === 'string' ? body.id : '';
        const actorId = req.headers.get('x-actor-id');
        if (!actorId) return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: 'Missing x-actor-id header'
        }, {
            status: 403
        });
        if (!id) return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: 'id is required'
        }, {
            status: 400
        });
        // Load share link to get project
        const { data: linkData, error: linkErr } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from('share_links').select('id, project_id, created_by').eq('id', id).maybeSingle();
        if (linkErr || !linkData) return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: 'Share link not found'
        }, {
            status: 404
        });
        // Check actor authorization (owner/manage)
        const { data: proj } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from('projects').select('owner_id').eq('id', linkData.project_id).maybeSingle();
        let isAuthorized = false;
        if (proj?.owner_id === actorId) isAuthorized = true;
        if (!isAuthorized) {
            const { data: pm } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from('project_members').select('role').eq('project_id', linkData.project_id).eq('member_id', actorId).limit(1);
            if (pm && pm.length > 0 && (pm[0].role === 'owner' || pm[0].role === 'manage')) isAuthorized = true;
        }
        if (!isAuthorized) return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: 'Forbidden'
        }, {
            status: 403
        });
        const { error } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from('share_links').update({
            revoked_at: new Date().toISOString()
        }).eq('id', id);
        if (error) return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: error.message
        }, {
            status: 500
        });
        await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["supabaseAdmin"].from('audit_logs').insert({
            actor_id: actorId,
            action: 'share_link_revoked',
            target_type: 'share_link',
            target_id: id,
            meta: null
        });
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            success: true
        }, {
            status: 200
        });
    } catch (err) {
        console.error('[DELETE /api/projects/share] Error', err);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: err?.message || 'Unexpected error'
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__39a1fca1._.js.map
(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/lib/supabaseClient.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// lib/supabaseClient.ts
__turbopack_context__.s([
    "getSupabaseClient",
    ()=>getSupabaseClient,
    "supabase",
    ()=>supabase
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$esm$2f$wrapper$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@supabase/supabase-js/dist/esm/wrapper.mjs [app-client] (ecmascript)");
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
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    if (!supabaseInstance) {
        supabaseInstance = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$esm$2f$wrapper$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createClient"])(url, anon, {
            auth: {
                persistSession: true,
                storageKey: 'approved-auth',
                storage: window.localStorage,
                autoRefreshToken: true,
                detectSessionInUrl: true
            }
        });
        console.log('[SupabaseClient] Initialized with persistence');
        // Make available globally
        window.supabaseClient = supabaseInstance;
    }
    return supabaseInstance;
}
const supabase = getSupabaseClient();
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/app/components/SupabaseSyncBridge.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>SupabaseSyncBridge
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabaseClient.ts [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
"use client";
;
;
function SupabaseSyncBridge() {
    _s();
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "SupabaseSyncBridge.useEffect": ()=>{
            // Expose Supabase client and sync functions to global scope
            window.supabase = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"];
            window.SupabaseSync = {
                async saveProject (project) {
                    try {
                        const { error } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("projects").upsert({
                            id: project.id,
                            name: project.name,
                            description: project.description || null
                        }, {
                            onConflict: "id"
                        });
                        if (error) throw error;
                        console.log("✅ Project saved:", project.id);
                        return true;
                    } catch (err) {
                        console.error("❌ Error saving project:", err);
                        return false;
                    }
                },
                async loadProjects () {
                    try {
                        const { data, error } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("projects").select(`id, name, description, created_at, updated_at, cues(id, project_id, index_in_project, original_name, name, display_name, status, versions(id, cue_id, index_in_cue, status, media_type, media_storage_path, media_url, media_original_name, media_display_name, media_duration, media_thumbnail_path, media_thumbnail_url, media_waveform_data))`).order("created_at", {
                            ascending: true
                        });
                        if (error) throw error;
                        console.log("✅ Projects loaded:", data?.length || 0);
                        return data || [];
                    } catch (err) {
                        console.error("❌ Error loading projects:", err);
                        return [];
                    }
                },
                async saveCue (projectId, cue) {
                    try {
                        const { error } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("cues").upsert({
                            id: cue.id,
                            project_id: projectId,
                            index_in_project: cue.index || cue.indexInProject || 0,
                            original_name: cue.originalName || null,
                            name: cue.name || null,
                            display_name: cue.displayName || null,
                            status: cue.status || "in-review"
                        }, {
                            onConflict: "id"
                        });
                        if (error) throw error;
                        console.log("✅ Cue saved:", cue.id);
                        return true;
                    } catch (err) {
                        console.error("❌ Error saving cue:", err);
                        return false;
                    }
                },
                async saveVersion (cueId, version) {
                    try {
                        const { error } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("versions").upsert({
                            id: version.id,
                            cue_id: cueId,
                            index_in_cue: version.index || version.indexInCue || 0,
                            status: version.status || "in-review",
                            media_type: version.media?.type || null,
                            media_storage_path: version.media?.storagePath || null,
                            media_url: version.media?.url || null,
                            media_original_name: version.media?.originalName || null,
                            media_display_name: version.media?.displayName || null,
                            media_duration: version.media?.duration || null,
                            media_thumbnail_path: version.media?.thumbnailPath || null,
                            media_thumbnail_url: version.media?.thumbnailUrl || null
                        }, {
                            onConflict: "id"
                        });
                        if (error) throw error;
                        console.log("✅ Version saved:", version.id);
                        return true;
                    } catch (err) {
                        console.error("❌ Error saving version:", err);
                        return false;
                    }
                },
                async saveVersionFile (versionId, file) {
                    try {
                        const { error } = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabaseClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("version_files").upsert({
                            id: file.id,
                            version_id: versionId,
                            name: file.name,
                            type: file.type || null,
                            url: file.url || null,
                            size: file.size || null
                        }, {
                            onConflict: "id"
                        });
                        if (error) throw error;
                        console.log("✅ Version file saved:", file.id);
                        return true;
                    } catch (err) {
                        console.error("❌ Error saving version file:", err);
                        return false;
                    }
                }
            };
            console.log("✅ SupabaseSync bridge initialized");
            // Trigger initialization of flow.js if already loaded
            if (window.dispatchEvent) {
                window.dispatchEvent(new Event("supabase-sync-ready"));
            }
        }
    }["SupabaseSyncBridge.useEffect"], []);
    return null;
}
_s(SupabaseSyncBridge, "OD7bBpZva5O2jO+Puf00hKivP7c=");
_c = SupabaseSyncBridge;
var _c;
__turbopack_context__.k.register(_c, "SupabaseSyncBridge");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=_7037c7f3._.js.map
module.exports = [
"[project]/lib/supabaseClient.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// lib/supabaseClient.ts
__turbopack_context__.s([
    "getSupabaseClient",
    ()=>getSupabaseClient,
    "supabase",
    ()=>supabase
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$esm$2f$wrapper$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@supabase/supabase-js/dist/esm/wrapper.mjs [app-ssr] (ecmascript)");
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
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$esm$2f$wrapper$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createClient"])(url, anon);
    }
    //TURBOPACK unreachable
    ;
}
const supabase = getSupabaseClient();
}),
];

//# sourceMappingURL=lib_supabaseClient_ts_510b50af._.js.map
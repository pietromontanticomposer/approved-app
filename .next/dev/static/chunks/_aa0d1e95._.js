(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/app/components/ShareModal.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// app/components/ShareModal.tsx
__turbopack_context__.s([
    "default",
    ()=>ShareModal
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
function ShareModal({ isOpen, onClose, projectId, projectName, teamId }) {
    _s();
    const [email, setEmail] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [role, setRole] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("viewer");
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [message, setMessage] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [linkInvite, setLinkInvite] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [inviteRole, setInviteRole] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("viewer");
    const [activeTab, setActiveTab] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("email");
    const [invites, setInvites] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ShareModal.useEffect": ()=>{
            if (isOpen) {
                loadInvites();
            }
        }
    }["ShareModal.useEffect"], [
        isOpen,
        teamId
    ]);
    const getAuthHeaders = async ()=>{
        try {
            // Prefer flowAuth helper if available
            const win = window;
            if (win.flowAuth && typeof win.flowAuth.getAuthHeaders === 'function') {
                try {
                    const session = win.flowAuth.getSession && win.flowAuth.getSession();
                    // Ignore demo mode from flowAuth (demo token/user) so we don't send a fake Authorization header
                    if (session && session.access_token && session.access_token !== 'demo' && session.user && session.user.id !== 'demo-user') {
                        const headers = win.flowAuth.getAuthHeaders();
                        // Ensure x-actor-id is present when possible
                        if (!headers['x-actor-id'] && session.user && session.user.id) headers['x-actor-id'] = session.user.id;
                        return headers;
                    }
                } catch (e) {
                // fallback to supabase client below
                }
            }
            // Fallback to Supabase client session
            if (win.supabaseClient && win.supabaseClient.auth) {
                try {
                    const res = await win.supabaseClient.auth.getUser();
                    const user = res?.data?.user;
                    if (user && user.id) {
                        const headers = {
                            'x-actor-id': user.id
                        };
                        try {
                            const session = (await win.supabaseClient.auth.getSession())?.data?.session;
                            if (session?.access_token) headers['authorization'] = 'Bearer ' + session.access_token;
                        } catch (e) {}
                        return headers;
                    }
                } catch (e) {
                // ignore
                }
            }
        } catch (e) {
        // ignore
        }
        return {
            'Content-Type': 'application/json'
        };
    };
    const loadInvites = async ()=>{
        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`/api/invites?team_id=${teamId}`, {
                headers
            });
            if (res.ok) {
                const data = await res.json();
                setInvites(data.invites || []);
            }
        } catch (error) {
            console.error("Error loading invites:", error);
        }
    };
    const handleInviteByEmail = async (e)=>{
        e.preventDefault();
        setLoading(true);
        setMessage("");
        try {
            const headers = await getAuthHeaders();
            const res = await fetch("/api/invites", {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                    ...headers
                },
                body: JSON.stringify({
                    team_id: teamId,
                    project_id: projectId,
                    email,
                    role,
                    is_link_invite: false
                })
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Failed to create invite");
            }
            setMessage(`✅ Invito inviato a ${email}`);
            setEmail("");
            loadInvites();
        } catch (error) {
            setMessage(`❌ ${error.message}`);
        } finally{
            setLoading(false);
        }
    };
    const handleGenerateLink = async ()=>{
        setLoading(true);
        setMessage("");
        try {
            const headers = await getAuthHeaders();
            const res = await fetch("/api/invites", {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                    ...headers
                },
                body: JSON.stringify({
                    team_id: teamId,
                    project_id: projectId,
                    role: inviteRole,
                    is_link_invite: true
                })
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Failed to create invite link");
            }
            setLinkInvite(data.invite_url);
            setMessage("✅ Link generato!");
            loadInvites();
        } catch (error) {
            setMessage(`❌ ${error.message}`);
        } finally{
            setLoading(false);
        }
    };
    const copyToClipboard = async ()=>{
        try {
            let toCopy = linkInvite || '';
            if (!toCopy) {
                setMessage('❌ Nessun link disponibile');
                return;
            }
            // Normalize: if relative path or starts with "/invite" or "/share", prepend origin
            if (/^\//.test(toCopy)) {
                toCopy = window.location.origin.replace(/\/+$/, '') + toCopy;
            }
            if (!/^https?:\/\//i.test(toCopy)) {
                // If invite_url sometimes comes as hostless like "localhost:3000/...", ensure protocol
                if (/^[^/:]+:\d+\//.test(toCopy)) {
                    toCopy = 'http://' + toCopy;
                }
            }
            // Prefer modern clipboard API, fallback to textarea+execCommand for older/mobile browsers
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(toCopy);
            } else {
                const ta = document.createElement('textarea');
                ta.value = toCopy;
                ta.setAttribute('readonly', '');
                ta.style.position = 'fixed';
                ta.style.left = '-9999px';
                document.body.appendChild(ta);
                ta.select();
                ta.setSelectionRange(0, ta.value.length);
                const ok = document.execCommand('copy');
                document.body.removeChild(ta);
                if (!ok) throw new Error('execCommand failed');
            }
            setMessage('✅ Link copiato!');
            setTimeout(()=>setMessage(''), 2000);
        } catch (e) {
            console.error('[ShareModal] copy failed', e);
            setMessage('❌ Impossibile copiare — prova a tenere premuto il link e copiare manualmente');
        }
    };
    const revokeInvite = async (inviteId)=>{
        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`/api/invites?invite_id=${inviteId}`, {
                method: "DELETE",
                headers: {
                    ...headers
                }
            });
            if (res.ok) {
                setMessage("✅ Invito revocato");
                loadInvites();
            }
        } catch (error) {
            console.error("Error revoking invite:", error);
        }
    };
    if (!isOpen) return null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        style: {
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000
        },
        onClick: onClose,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            style: {
                background: "#1a1a1a",
                borderRadius: "8px",
                padding: "2rem",
                maxWidth: "600px",
                width: "90%",
                maxHeight: "80vh",
                overflow: "auto",
                border: "1px solid #333"
            },
            onClick: (e)=>e.stopPropagation(),
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "1.5rem"
                    },
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                            style: {
                                margin: 0,
                                color: "#fff"
                            },
                            children: [
                                "Condividi: ",
                                projectName
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/components/ShareModal.tsx",
                            lineNumber: 251,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: onClose,
                            style: {
                                background: "transparent",
                                border: "none",
                                color: "#999",
                                fontSize: "1.5rem",
                                cursor: "pointer",
                                padding: "0.25rem"
                            },
                            children: "×"
                        }, void 0, false, {
                            fileName: "[project]/app/components/ShareModal.tsx",
                            lineNumber: 254,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/components/ShareModal.tsx",
                    lineNumber: 250,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        display: "flex",
                        gap: "0.5rem",
                        marginBottom: "1.5rem",
                        borderBottom: "1px solid #333"
                    },
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: ()=>setActiveTab("email"),
                            style: {
                                padding: "0.75rem 1.5rem",
                                background: "transparent",
                                border: "none",
                                borderBottom: activeTab === "email" ? "2px solid #0066ff" : "2px solid transparent",
                                color: activeTab === "email" ? "#0066ff" : "#999",
                                cursor: "pointer",
                                fontWeight: activeTab === "email" ? "600" : "400"
                            },
                            children: "📧 Via Email"
                        }, void 0, false, {
                            fileName: "[project]/app/components/ShareModal.tsx",
                            lineNumber: 271,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: ()=>setActiveTab("link"),
                            style: {
                                padding: "0.75rem 1.5rem",
                                background: "transparent",
                                border: "none",
                                borderBottom: activeTab === "link" ? "2px solid #0066ff" : "2px solid transparent",
                                color: activeTab === "link" ? "#0066ff" : "#999",
                                cursor: "pointer",
                                fontWeight: activeTab === "link" ? "600" : "400"
                            },
                            children: "🔗 Link Condivisibile"
                        }, void 0, false, {
                            fileName: "[project]/app/components/ShareModal.tsx",
                            lineNumber: 285,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/components/ShareModal.tsx",
                    lineNumber: 270,
                    columnNumber: 9
                }, this),
                activeTab === "email" ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
                    onSubmit: handleInviteByEmail,
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                marginBottom: "1rem"
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    style: {
                                        display: "block",
                                        marginBottom: "0.5rem",
                                        color: "#ccc"
                                    },
                                    children: "Email dell'utente da invitare"
                                }, void 0, false, {
                                    fileName: "[project]/app/components/ShareModal.tsx",
                                    lineNumber: 304,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                    type: "email",
                                    value: email,
                                    onChange: (e)=>setEmail(e.target.value),
                                    required: true,
                                    placeholder: "user@example.com",
                                    style: {
                                        width: "100%",
                                        padding: "0.75rem",
                                        borderRadius: "4px",
                                        border: "1px solid #333",
                                        background: "#0a0a0a",
                                        color: "#fff",
                                        fontSize: "1rem"
                                    }
                                }, void 0, false, {
                                    fileName: "[project]/app/components/ShareModal.tsx",
                                    lineNumber: 307,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/components/ShareModal.tsx",
                            lineNumber: 303,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                marginBottom: "1.5rem"
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    style: {
                                        display: "block",
                                        marginBottom: "0.5rem",
                                        color: "#ccc"
                                    },
                                    children: "Ruolo"
                                }, void 0, false, {
                                    fileName: "[project]/app/components/ShareModal.tsx",
                                    lineNumber: 326,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                    value: role,
                                    onChange: (e)=>setRole(e.target.value),
                                    style: {
                                        width: "100%",
                                        padding: "0.75rem",
                                        borderRadius: "4px",
                                        border: "1px solid #333",
                                        background: "#0a0a0a",
                                        color: "#fff",
                                        fontSize: "1rem"
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                            value: "viewer",
                                            children: "👁️ Visualizzatore (solo lettura)"
                                        }, void 0, false, {
                                            fileName: "[project]/app/components/ShareModal.tsx",
                                            lineNumber: 342,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                            value: "commenter",
                                            children: "💬 Commentatore (può commentare)"
                                        }, void 0, false, {
                                            fileName: "[project]/app/components/ShareModal.tsx",
                                            lineNumber: 343,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                            value: "editor",
                                            children: "✏️ Editor (può modificare)"
                                        }, void 0, false, {
                                            fileName: "[project]/app/components/ShareModal.tsx",
                                            lineNumber: 344,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                            value: "owner",
                                            children: "👑 Proprietario (controllo totale)"
                                        }, void 0, false, {
                                            fileName: "[project]/app/components/ShareModal.tsx",
                                            lineNumber: 345,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/components/ShareModal.tsx",
                                    lineNumber: 329,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/components/ShareModal.tsx",
                            lineNumber: 325,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            type: "submit",
                            disabled: loading,
                            style: {
                                width: "100%",
                                padding: "0.75rem",
                                background: loading ? "#333" : "#0066ff",
                                color: "#fff",
                                border: "none",
                                borderRadius: "4px",
                                fontSize: "1rem",
                                cursor: loading ? "not-allowed" : "pointer",
                                opacity: loading ? 0.6 : 1
                            },
                            children: loading ? "Invio..." : "Invia invito"
                        }, void 0, false, {
                            fileName: "[project]/app/components/ShareModal.tsx",
                            lineNumber: 349,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/components/ShareModal.tsx",
                    lineNumber: 302,
                    columnNumber: 11
                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                marginBottom: "1rem"
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    style: {
                                        display: "block",
                                        marginBottom: "0.5rem",
                                        color: "#ccc"
                                    },
                                    children: "Ruolo per il link"
                                }, void 0, false, {
                                    fileName: "[project]/app/components/ShareModal.tsx",
                                    lineNumber: 370,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                    value: inviteRole,
                                    onChange: (e)=>setInviteRole(e.target.value),
                                    style: {
                                        width: "100%",
                                        padding: "0.75rem",
                                        borderRadius: "4px",
                                        border: "1px solid #333",
                                        background: "#0a0a0a",
                                        color: "#fff",
                                        fontSize: "1rem"
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                            value: "viewer",
                                            children: "👁️ Visualizzatore (solo lettura)"
                                        }, void 0, false, {
                                            fileName: "[project]/app/components/ShareModal.tsx",
                                            lineNumber: 386,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                            value: "commenter",
                                            children: "💬 Commentatore (può commentare)"
                                        }, void 0, false, {
                                            fileName: "[project]/app/components/ShareModal.tsx",
                                            lineNumber: 387,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                            value: "editor",
                                            children: "✏️ Editor (può modificare)"
                                        }, void 0, false, {
                                            fileName: "[project]/app/components/ShareModal.tsx",
                                            lineNumber: 388,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/components/ShareModal.tsx",
                                    lineNumber: 373,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/components/ShareModal.tsx",
                            lineNumber: 369,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: handleGenerateLink,
                            disabled: loading,
                            style: {
                                width: "100%",
                                padding: "0.75rem",
                                background: loading ? "#333" : "#0066ff",
                                color: "#fff",
                                border: "none",
                                borderRadius: "4px",
                                fontSize: "1rem",
                                cursor: loading ? "not-allowed" : "pointer",
                                opacity: loading ? 0.6 : 1,
                                marginBottom: "1rem"
                            },
                            children: loading ? "Generazione..." : "Genera link di invito"
                        }, void 0, false, {
                            fileName: "[project]/app/components/ShareModal.tsx",
                            lineNumber: 392,
                            columnNumber: 13
                        }, this),
                        linkInvite && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                padding: "1rem",
                                background: "#0a0a0a",
                                borderRadius: "4px",
                                border: "1px solid #333"
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        marginBottom: "0.5rem",
                                        color: "#999",
                                        fontSize: "0.85rem"
                                    },
                                    children: "Link generato:"
                                }, void 0, false, {
                                    fileName: "[project]/app/components/ShareModal.tsx",
                                    lineNumber: 420,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        display: "flex",
                                        gap: "0.5rem",
                                        alignItems: "center"
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            type: "text",
                                            value: linkInvite,
                                            readOnly: true,
                                            style: {
                                                flex: 1,
                                                padding: "0.5rem",
                                                background: "#1a1a1a",
                                                border: "1px solid #333",
                                                borderRadius: "4px",
                                                color: "#0066ff",
                                                fontSize: "0.9rem"
                                            }
                                        }, void 0, false, {
                                            fileName: "[project]/app/components/ShareModal.tsx",
                                            lineNumber: 430,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            onClick: copyToClipboard,
                                            style: {
                                                padding: "0.5rem 1rem",
                                                background: "#333",
                                                color: "#fff",
                                                border: "none",
                                                borderRadius: "4px",
                                                cursor: "pointer",
                                                whiteSpace: "nowrap"
                                            },
                                            children: "📋 Copia"
                                        }, void 0, false, {
                                            fileName: "[project]/app/components/ShareModal.tsx",
                                            lineNumber: 444,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/components/ShareModal.tsx",
                                    lineNumber: 423,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/components/ShareModal.tsx",
                            lineNumber: 412,
                            columnNumber: 15
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/components/ShareModal.tsx",
                    lineNumber: 368,
                    columnNumber: 11
                }, this),
                message && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        marginTop: "1rem",
                        padding: "0.75rem",
                        background: message.includes("❌") ? "#4d1a1a" : "#1a4d1a",
                        borderRadius: "4px",
                        color: "#fff",
                        fontSize: "0.9rem"
                    },
                    children: message
                }, void 0, false, {
                    fileName: "[project]/app/components/ShareModal.tsx",
                    lineNumber: 465,
                    columnNumber: 11
                }, this),
                invites.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        marginTop: "2rem",
                        paddingTop: "1.5rem",
                        borderTop: "1px solid #333"
                    },
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                            style: {
                                marginBottom: "1rem",
                                color: "#ccc",
                                fontSize: "0.9rem"
                            },
                            children: [
                                "Inviti attivi (",
                                invites.length,
                                ")"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/components/ShareModal.tsx",
                            lineNumber: 482,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            style: {
                                display: "flex",
                                flexDirection: "column",
                                gap: "0.5rem"
                            },
                            children: invites.map((invite)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    style: {
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        padding: "0.75rem",
                                        background: "#0a0a0a",
                                        borderRadius: "4px",
                                        border: "1px solid #333"
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            style: {
                                                flex: 1
                                            },
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    style: {
                                                        color: "#fff",
                                                        marginBottom: "0.25rem"
                                                    },
                                                    children: invite.email || "🔗 Link pubblico"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/components/ShareModal.tsx",
                                                    lineNumber: 500,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    style: {
                                                        color: "#666",
                                                        fontSize: "0.8rem"
                                                    },
                                                    children: [
                                                        invite.role,
                                                        " · Scade il ",
                                                        new Date(invite.expires_at).toLocaleDateString()
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/components/ShareModal.tsx",
                                                    lineNumber: 503,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/components/ShareModal.tsx",
                                            lineNumber: 499,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            onClick: ()=>revokeInvite(invite.id),
                                            style: {
                                                padding: "0.5rem 1rem",
                                                background: "#4d1a1a",
                                                color: "#ff6b6b",
                                                border: "none",
                                                borderRadius: "4px",
                                                cursor: "pointer",
                                                fontSize: "0.85rem"
                                            },
                                            children: "Revoca"
                                        }, void 0, false, {
                                            fileName: "[project]/app/components/ShareModal.tsx",
                                            lineNumber: 507,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, invite.id, true, {
                                    fileName: "[project]/app/components/ShareModal.tsx",
                                    lineNumber: 487,
                                    columnNumber: 17
                                }, this))
                        }, void 0, false, {
                            fileName: "[project]/app/components/ShareModal.tsx",
                            lineNumber: 485,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/components/ShareModal.tsx",
                    lineNumber: 481,
                    columnNumber: 11
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/app/components/ShareModal.tsx",
            lineNumber: 237,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/app/components/ShareModal.tsx",
        lineNumber: 222,
        columnNumber: 5
    }, this);
}
_s(ShareModal, "JsdWeFBUEB1Z5oN6XMUR3DW/g80=");
_c = ShareModal;
var _c;
__turbopack_context__.k.register(_c, "ShareModal");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/app/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// app/page.tsx
__turbopack_context__.s([
    "default",
    ()=>Page
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$script$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/script.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$components$2f$ShareModal$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/components/ShareModal.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
function Page() {
    _s();
    const [shareModalOpen, setShareModalOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [shareData, setShareData] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Page.useEffect": ()=>{
            console.log("Home page mounted - initializing Supabase client");
            // Reset sign-out flag on fresh page load to allow bootstrap
            window.__isSigningOut = false;
            // Initialize supabase client immediately
            const initSupabase = {
                "Page.useEffect.initSupabase": async ()=>{
                    const { getSupabaseClient } = await __turbopack_context__.A("[project]/lib/supabaseClient.ts [app-client] (ecmascript, async loader)");
                    const client = getSupabaseClient();
                    window.supabaseClient = client;
                    console.log('[HomePage] Supabase client ready:', !!client);
                }
            }["Page.useEffect.initSupabase"];
            initSupabase();
            // Listen for share modal events
            const handleOpenShareModal = {
                "Page.useEffect.handleOpenShareModal": (event)=>{
                    const { projectId, projectName, teamId } = event.detail;
                    setShareData({
                        projectId,
                        projectName,
                        teamId
                    });
                    setShareModalOpen(true);
                }
            }["Page.useEffect.handleOpenShareModal"];
            window.addEventListener('open-share-modal', handleOpenShareModal);
            return ({
                "Page.useEffect": ()=>{
                    window.removeEventListener('open-share-modal', handleOpenShareModal);
                }
            })["Page.useEffect"];
        }
    }["Page.useEffect"], []);
    const html = `<div class="app">
  <aside class="sidebar">
    <div class="logo">Approved</div>
    <button id="newProjectBtn" class="primary-btn full">+ New project</button>

    <div class="sidebar-section">
      <div class="tabs">
        <button class="tab-btn active" data-tab="my-projects">
          I miei progetti
        </button>
        <button class="tab-btn" data-tab="shared-with-me">
          Condivisi con me
        </button>
      </div>

      <div id="my-projects-tab" class="tab-content active">
        <ul id="projectList" class="project-list">
          <li class="project-item empty">
            No projects yet. Click "New project".
          </li>
        </ul>
      </div>

      <div id="shared-with-me-tab" class="tab-content">
        <ul id="sharedProjectList" class="project-list">
          <li class="project-item empty">
            No shared projects yet.
          </li>
        </ul>
      </div>
    </div>
  </aside>

  <main class="main">
    <header class="topbar">
      <div class="project-header-left">
        <div class="project-title-row">
          <div id="projectTitle" class="project-title">No project</div>
          <button
            id="projectMenuBtn"
            class="icon-btn"
            type="button"
            title="Project options"
            style="display: none"
          >
            ⋯
          </button>
        </div>
        <div id="projectMeta" class="project-meta">
          Click "New project" to get started
        </div>
      </div>
      <div class="topbar-actions">
        <button id="accountBtn" class="ghost-btn" onclick="window.location.href='/account'">
          Il mio account
        </button>
      </div>
    </header>

    <section class="upload-strip">
      <div id="globalDropzone" class="dropzone disabled">
        <strong>Drop media here</strong>
        <span>Create a project to start.</span>
      </div>

      <div class="naming-options">
        <label class="rename-toggle">
          <input type="checkbox" id="autoRenameToggle" />
          <span>Auto rename files (composer preset)</span>
        </label>
        <div class="naming-levels">
          <span class="level-label">Scheme:</span>
          <label class="level-option">
            <input type="radio" name="namingLevel" value="media" checked />
            <span>Media</span>
          </label>
          <label class="level-option">
            <input type="radio" name="namingLevel" value="cinema" />
            <span>Cinema</span>
          </label>
        </div>
      </div>
    </section>

    <section class="content">
      <!-- LEFT COLUMN -->
      <div class="left-column">
        <!-- PROJECT REFERENCES -->
        <div class="refs-card">
          <div class="refs-header">
            <div>
              <h2>Project references</h2>
              <div id="refsSubtitle" class="refs-subtitle">
                Upload script, storyboard, temp tracks, brief...
              </div>
            </div>
            <button id="refsToggleBtn" class="ghost-btn tiny">
              Show
            </button>
          </div>

          <div id="refsBody" class="refs-body">
            <div id="refsDropzone" class="refs-dropzone disabled">
              <strong>Drop reference files here</strong>
              <span>PDF, images, audio, video, zip…</span>
            </div>
            <div id="refsList" class="refs-list refs-list-empty">
              No reference files for this project.
            </div>
          </div>
        </div>

        <!-- CUE -->
        <h2>Project cues</h2>
        <div id="cueListSubtitle" class="cue-list-subtitle">
          No project yet. Click "New project".
        </div>
        <div id="cueList" class="cue-list cue-list-empty">
          No project. Click "New project" to get started.
        </div>
      </div>

      <!-- RIGHT COLUMN -->
      <div class="right-column">
        <div class="player-card">
          <div class="player-mode-toggle">
            <button
              id="modeReviewBtn"
              class="ghost-btn tiny player-mode-btn active"
            >
              Review versions
            </button>
            <button
              id="modeRefsBtn"
              class="ghost-btn tiny player-mode-btn"
            >
              Project references
            </button>
          </div>

          <div class="player-title-row">
            <div id="playerTitle" class="player-title">
              No version selected
            </div>
            <span id="playerBadge" class="player-badge" data-status="">
              No media
            </span>
          </div>

          <div id="playerMedia" class="player-preview">
            <div class="player-placeholder">
              Create a project and drop a file to see the player.
            </div>
          </div>

          <div class="player-controls">
            <button id="playPauseBtn" class="primary-btn small" disabled>
              Play
            </button>
            <!-- VOLUME SLIDER AUDIO ONLY -->
            <input
              id="volumeSlider"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value="1"
              class="volume-slider"
            />
            <span id="timeLabel" class="time">--:-- / --:--</span>
          </div>

          <!-- VERSION STATUS BUTTONS -->
          <div class="status-controls">
            <button id="statusInReviewBtn" class="ghost-btn tiny">
              In review
            </button>
            <button id="statusApprovedBtn" class="ghost-btn tiny">
              Approved
            </button>
            <button id="statusChangesBtn" class="ghost-btn tiny">
              Changes requested
            </button>
          </div>
        </div>

        <div class="comments-card">
            <div class="comments-header">
              <h3>Comments</h3>
              <span id="commentsSummary" class="tag small">No comments</span>
            </div>
            <ul id="commentsList" class="comments-list"></ul>

            <div class="comment-input">
              <input
                id="commentInput"
                type="text"
                placeholder="Add a comment (auto timecode)…"
              />
              <button id="addCommentBtn" class="primary-btn small" disabled>
                Send
              </button>
            </div>
          </div>

          <div class="share-card">
            <div class="share-row">
              <div>
                <strong>Client link</strong>
                <div class="share-meta">
                  They can listen, comment and approve without an account.
                </div>
              </div>
              <button id="copyLinkBtn" class="ghost-btn small" disabled>
                Copy demo link
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
  `;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$script$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                id: "initialize-stub",
                strategy: "beforeInteractive",
                dangerouslySetInnerHTML: {
                    __html: `
            // Ensure initializer stubs exist early to avoid race when scripts load
            window.initializeFromSupabase = window.initializeFromSupabase || (async function(){
              console.warn('[InitStub] initializeFromSupabase called before implementation');
            });
            window.safeFetchProjectsFallback = window.safeFetchProjectsFallback || (async function(){
              console.warn('[InitStub] safeFetchProjectsFallback called before implementation');
              try {
                const res = await fetch('/api/projects?debug=1', { credentials: 'same-origin', headers: { 'Accept': 'application/json' } });
                if (res.ok) return res.json();
              } catch (e) {
                console.warn('[InitStub] fallback fetch failed', e);
              }
            });
          `
                }
            }, void 0, false, {
                fileName: "[project]/app/page.tsx",
                lineNumber: 273,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                dangerouslySetInnerHTML: {
                    __html: html
                }
            }, void 0, false, {
                fileName: "[project]/app/page.tsx",
                lineNumber: 294,
                columnNumber: 7
            }, this),
            shareData && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$components$2f$ShareModal$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                isOpen: shareModalOpen,
                onClose: ()=>setShareModalOpen(false),
                projectId: shareData.projectId,
                projectName: shareData.projectName,
                teamId: shareData.teamId
            }, void 0, false, {
                fileName: "[project]/app/page.tsx",
                lineNumber: 298,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$script$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                src: "https://unpkg.com/@supabase/supabase-js@2",
                strategy: "beforeInteractive"
            }, void 0, false, {
                fileName: "[project]/app/page.tsx",
                lineNumber: 307,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$script$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                src: "https://unpkg.com/wavesurfer.js@6",
                strategy: "beforeInteractive"
            }, void 0, false, {
                fileName: "[project]/app/page.tsx",
                lineNumber: 311,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$script$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                src: "/flow-auth.js",
                strategy: "afterInteractive"
            }, void 0, false, {
                fileName: "[project]/app/page.tsx",
                lineNumber: 315,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$script$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                src: "/share-handler.js",
                strategy: "afterInteractive"
            }, void 0, false, {
                fileName: "[project]/app/page.tsx",
                lineNumber: 316,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$script$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                src: "/flow.js",
                strategy: "afterInteractive",
                onLoad: ()=>{
                    console.log('[PageInit] Scripts loaded');
                    // Wait for supabaseClient to be ready, then init auth
                    const waitForSupabase = setInterval(async ()=>{
                        if (window.supabaseClient) {
                            clearInterval(waitForSupabase);
                            console.log('[PageInit] Supabase ready, initializing auth...');
                            if (window.flowAuth && typeof window.flowAuth.initAuth === 'function') {
                                const ready = await window.flowAuth.initAuth();
                                if (!ready) {
                                    console.log('[PageInit] Auth failed - will redirect to login');
                                } else {
                                    console.log('[PageInit] ✅ Auth successful, app loaded');
                                    // If there's a pending share/invite from login redirect, consume it first
                                    try {
                                        const pendingShare = localStorage.getItem('pending_share');
                                        if (pendingShare) {
                                            localStorage.removeItem('pending_share');
                                            try {
                                                const p = JSON.parse(pendingShare);
                                                if (p && p.share_id) {
                                                    const t = p.token ? `?token=${encodeURIComponent(p.token)}` : '';
                                                    window.location.href = `/share/${p.share_id}${t}`;
                                                    return;
                                                }
                                            } catch (e) {
                                                window.location.href = `/share/${pendingShare}`;
                                                return;
                                            }
                                        }
                                        const pendingInvite = localStorage.getItem('pending_invite');
                                        if (pendingInvite) {
                                            localStorage.removeItem('pending_invite');
                                            window.location.href = `/invite/${pendingInvite}`;
                                            return;
                                        }
                                    } catch (e) {
                                        console.warn('[PageInit] Error checking pending share/invite', e);
                                    }
                                    // Defer heavy bootstrap until auth is ready
                                    // Try to call the main initializer; if not present, attempt
                                    // the safe fallback exposed by `flow-init.js`. If neither is
                                    // available yet, wait briefly and retry for robustness.
                                    const callInitOrFallback = async ()=>{
                                        if (typeof window.initializeFromSupabase === 'function') {
                                            console.log('[PageInit] Calling initializeFromSupabase...');
                                            window.initializeFromSupabase();
                                            return;
                                        }
                                        if (typeof window.safeFetchProjectsFallback === 'function') {
                                            console.log('[PageInit] initializeFromSupabase not found - calling safeFetchProjectsFallback');
                                            try {
                                                await window.safeFetchProjectsFallback();
                                                return;
                                            } catch (e) {
                                                console.warn('[PageInit] safeFetchProjectsFallback failed', e);
                                            }
                                        }
                                        // Retry a couple of times in case scripts are still loading
                                        for(let i = 0; i < 6; i++){
                                            await new Promise((r)=>setTimeout(r, 250));
                                            if (typeof window.initializeFromSupabase === 'function') {
                                                console.log('[PageInit] initializeFromSupabase became available - calling it');
                                                window.initializeFromSupabase();
                                                return;
                                            }
                                        }
                                        console.warn('[PageInit] initializeFromSupabase NOT FOUND after retries');
                                    };
                                    callInitOrFallback().catch((e)=>console.error('[PageInit] init/fallback error', e));
                                }
                            } else {
                                console.error('[PageInit] flowAuth.initAuth not found');
                            }
                        }
                    }, 50);
                    // Timeout after 5 seconds
                    setTimeout(()=>{
                        clearInterval(waitForSupabase);
                        if (!window.supabaseClient) {
                            console.error('[PageInit] Supabase client not ready after 5s');
                        }
                    }, 5000);
                }
            }, void 0, false, {
                fileName: "[project]/app/page.tsx",
                lineNumber: 317,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$script$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                src: "/flow-init.js",
                strategy: "afterInteractive"
            }, void 0, false, {
                fileName: "[project]/app/page.tsx",
                lineNumber: 414,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true);
}
_s(Page, "YO8i8Yxym6PI5YEvcGVbCJaJH18=");
_c = Page;
var _c;
__turbopack_context__.k.register(_c, "Page");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/node_modules/next/dist/compiled/react/cjs/react-jsx-dev-runtime.development.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

/**
 * @license React
 * react-jsx-dev-runtime.development.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
"use strict";
"production" !== ("TURBOPACK compile-time value", "development") && function() {
    function getComponentNameFromType(type) {
        if (null == type) return null;
        if ("function" === typeof type) return type.$$typeof === REACT_CLIENT_REFERENCE ? null : type.displayName || type.name || null;
        if ("string" === typeof type) return type;
        switch(type){
            case REACT_FRAGMENT_TYPE:
                return "Fragment";
            case REACT_PROFILER_TYPE:
                return "Profiler";
            case REACT_STRICT_MODE_TYPE:
                return "StrictMode";
            case REACT_SUSPENSE_TYPE:
                return "Suspense";
            case REACT_SUSPENSE_LIST_TYPE:
                return "SuspenseList";
            case REACT_ACTIVITY_TYPE:
                return "Activity";
            case REACT_VIEW_TRANSITION_TYPE:
                return "ViewTransition";
        }
        if ("object" === typeof type) switch("number" === typeof type.tag && console.error("Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue."), type.$$typeof){
            case REACT_PORTAL_TYPE:
                return "Portal";
            case REACT_CONTEXT_TYPE:
                return type.displayName || "Context";
            case REACT_CONSUMER_TYPE:
                return (type._context.displayName || "Context") + ".Consumer";
            case REACT_FORWARD_REF_TYPE:
                var innerType = type.render;
                type = type.displayName;
                type || (type = innerType.displayName || innerType.name || "", type = "" !== type ? "ForwardRef(" + type + ")" : "ForwardRef");
                return type;
            case REACT_MEMO_TYPE:
                return innerType = type.displayName || null, null !== innerType ? innerType : getComponentNameFromType(type.type) || "Memo";
            case REACT_LAZY_TYPE:
                innerType = type._payload;
                type = type._init;
                try {
                    return getComponentNameFromType(type(innerType));
                } catch (x) {}
        }
        return null;
    }
    function testStringCoercion(value) {
        return "" + value;
    }
    function checkKeyStringCoercion(value) {
        try {
            testStringCoercion(value);
            var JSCompiler_inline_result = !1;
        } catch (e) {
            JSCompiler_inline_result = !0;
        }
        if (JSCompiler_inline_result) {
            JSCompiler_inline_result = console;
            var JSCompiler_temp_const = JSCompiler_inline_result.error;
            var JSCompiler_inline_result$jscomp$0 = "function" === typeof Symbol && Symbol.toStringTag && value[Symbol.toStringTag] || value.constructor.name || "Object";
            JSCompiler_temp_const.call(JSCompiler_inline_result, "The provided key is an unsupported type %s. This value must be coerced to a string before using it here.", JSCompiler_inline_result$jscomp$0);
            return testStringCoercion(value);
        }
    }
    function getTaskName(type) {
        if (type === REACT_FRAGMENT_TYPE) return "<>";
        if ("object" === typeof type && null !== type && type.$$typeof === REACT_LAZY_TYPE) return "<...>";
        try {
            var name = getComponentNameFromType(type);
            return name ? "<" + name + ">" : "<...>";
        } catch (x) {
            return "<...>";
        }
    }
    function getOwner() {
        var dispatcher = ReactSharedInternals.A;
        return null === dispatcher ? null : dispatcher.getOwner();
    }
    function UnknownOwner() {
        return Error("react-stack-top-frame");
    }
    function hasValidKey(config) {
        if (hasOwnProperty.call(config, "key")) {
            var getter = Object.getOwnPropertyDescriptor(config, "key").get;
            if (getter && getter.isReactWarning) return !1;
        }
        return void 0 !== config.key;
    }
    function defineKeyPropWarningGetter(props, displayName) {
        function warnAboutAccessingKey() {
            specialPropKeyWarningShown || (specialPropKeyWarningShown = !0, console.error("%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://react.dev/link/special-props)", displayName));
        }
        warnAboutAccessingKey.isReactWarning = !0;
        Object.defineProperty(props, "key", {
            get: warnAboutAccessingKey,
            configurable: !0
        });
    }
    function elementRefGetterWithDeprecationWarning() {
        var componentName = getComponentNameFromType(this.type);
        didWarnAboutElementRef[componentName] || (didWarnAboutElementRef[componentName] = !0, console.error("Accessing element.ref was removed in React 19. ref is now a regular prop. It will be removed from the JSX Element type in a future release."));
        componentName = this.props.ref;
        return void 0 !== componentName ? componentName : null;
    }
    function ReactElement(type, key, props, owner, debugStack, debugTask) {
        var refProp = props.ref;
        type = {
            $$typeof: REACT_ELEMENT_TYPE,
            type: type,
            key: key,
            props: props,
            _owner: owner
        };
        null !== (void 0 !== refProp ? refProp : null) ? Object.defineProperty(type, "ref", {
            enumerable: !1,
            get: elementRefGetterWithDeprecationWarning
        }) : Object.defineProperty(type, "ref", {
            enumerable: !1,
            value: null
        });
        type._store = {};
        Object.defineProperty(type._store, "validated", {
            configurable: !1,
            enumerable: !1,
            writable: !0,
            value: 0
        });
        Object.defineProperty(type, "_debugInfo", {
            configurable: !1,
            enumerable: !1,
            writable: !0,
            value: null
        });
        Object.defineProperty(type, "_debugStack", {
            configurable: !1,
            enumerable: !1,
            writable: !0,
            value: debugStack
        });
        Object.defineProperty(type, "_debugTask", {
            configurable: !1,
            enumerable: !1,
            writable: !0,
            value: debugTask
        });
        Object.freeze && (Object.freeze(type.props), Object.freeze(type));
        return type;
    }
    function jsxDEVImpl(type, config, maybeKey, isStaticChildren, debugStack, debugTask) {
        var children = config.children;
        if (void 0 !== children) if (isStaticChildren) if (isArrayImpl(children)) {
            for(isStaticChildren = 0; isStaticChildren < children.length; isStaticChildren++)validateChildKeys(children[isStaticChildren]);
            Object.freeze && Object.freeze(children);
        } else console.error("React.jsx: Static children should always be an array. You are likely explicitly calling React.jsxs or React.jsxDEV. Use the Babel transform instead.");
        else validateChildKeys(children);
        if (hasOwnProperty.call(config, "key")) {
            children = getComponentNameFromType(type);
            var keys = Object.keys(config).filter(function(k) {
                return "key" !== k;
            });
            isStaticChildren = 0 < keys.length ? "{key: someKey, " + keys.join(": ..., ") + ": ...}" : "{key: someKey}";
            didWarnAboutKeySpread[children + isStaticChildren] || (keys = 0 < keys.length ? "{" + keys.join(": ..., ") + ": ...}" : "{}", console.error('A props object containing a "key" prop is being spread into JSX:\n  let props = %s;\n  <%s {...props} />\nReact keys must be passed directly to JSX without using spread:\n  let props = %s;\n  <%s key={someKey} {...props} />', isStaticChildren, children, keys, children), didWarnAboutKeySpread[children + isStaticChildren] = !0);
        }
        children = null;
        void 0 !== maybeKey && (checkKeyStringCoercion(maybeKey), children = "" + maybeKey);
        hasValidKey(config) && (checkKeyStringCoercion(config.key), children = "" + config.key);
        if ("key" in config) {
            maybeKey = {};
            for(var propName in config)"key" !== propName && (maybeKey[propName] = config[propName]);
        } else maybeKey = config;
        children && defineKeyPropWarningGetter(maybeKey, "function" === typeof type ? type.displayName || type.name || "Unknown" : type);
        return ReactElement(type, children, maybeKey, getOwner(), debugStack, debugTask);
    }
    function validateChildKeys(node) {
        isValidElement(node) ? node._store && (node._store.validated = 1) : "object" === typeof node && null !== node && node.$$typeof === REACT_LAZY_TYPE && ("fulfilled" === node._payload.status ? isValidElement(node._payload.value) && node._payload.value._store && (node._payload.value._store.validated = 1) : node._store && (node._store.validated = 1));
    }
    function isValidElement(object) {
        return "object" === typeof object && null !== object && object.$$typeof === REACT_ELEMENT_TYPE;
    }
    var React = __turbopack_context__.r("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)"), REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element"), REACT_PORTAL_TYPE = Symbol.for("react.portal"), REACT_FRAGMENT_TYPE = Symbol.for("react.fragment"), REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode"), REACT_PROFILER_TYPE = Symbol.for("react.profiler"), REACT_CONSUMER_TYPE = Symbol.for("react.consumer"), REACT_CONTEXT_TYPE = Symbol.for("react.context"), REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref"), REACT_SUSPENSE_TYPE = Symbol.for("react.suspense"), REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list"), REACT_MEMO_TYPE = Symbol.for("react.memo"), REACT_LAZY_TYPE = Symbol.for("react.lazy"), REACT_ACTIVITY_TYPE = Symbol.for("react.activity"), REACT_VIEW_TRANSITION_TYPE = Symbol.for("react.view_transition"), REACT_CLIENT_REFERENCE = Symbol.for("react.client.reference"), ReactSharedInternals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, hasOwnProperty = Object.prototype.hasOwnProperty, isArrayImpl = Array.isArray, createTask = console.createTask ? console.createTask : function() {
        return null;
    };
    React = {
        react_stack_bottom_frame: function(callStackForError) {
            return callStackForError();
        }
    };
    var specialPropKeyWarningShown;
    var didWarnAboutElementRef = {};
    var unknownOwnerDebugStack = React.react_stack_bottom_frame.bind(React, UnknownOwner)();
    var unknownOwnerDebugTask = createTask(getTaskName(UnknownOwner));
    var didWarnAboutKeySpread = {};
    exports.Fragment = REACT_FRAGMENT_TYPE;
    exports.jsxDEV = function(type, config, maybeKey, isStaticChildren) {
        var trackActualOwner = 1e4 > ReactSharedInternals.recentlyCreatedOwnerStacks++;
        if (trackActualOwner) {
            var previousStackTraceLimit = Error.stackTraceLimit;
            Error.stackTraceLimit = 10;
            var debugStackDEV = Error("react-stack-top-frame");
            Error.stackTraceLimit = previousStackTraceLimit;
        } else debugStackDEV = unknownOwnerDebugStack;
        return jsxDEVImpl(type, config, maybeKey, isStaticChildren, debugStackDEV, trackActualOwner ? createTask(getTaskName(type)) : unknownOwnerDebugTask);
    };
}();
}),
"[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
'use strict';
if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
;
else {
    module.exports = __turbopack_context__.r("[project]/node_modules/next/dist/compiled/react/cjs/react-jsx-dev-runtime.development.js [app-client] (ecmascript)");
}
}),
"[project]/node_modules/next/dist/client/request-idle-callback.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
0 && (module.exports = {
    cancelIdleCallback: null,
    requestIdleCallback: null
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    cancelIdleCallback: function() {
        return cancelIdleCallback;
    },
    requestIdleCallback: function() {
        return requestIdleCallback;
    }
});
const requestIdleCallback = typeof self !== 'undefined' && self.requestIdleCallback && self.requestIdleCallback.bind(window) || function(cb) {
    let start = Date.now();
    return self.setTimeout(function() {
        cb({
            didTimeout: false,
            timeRemaining: function() {
                return Math.max(0, 50 - (Date.now() - start));
            }
        });
    }, 1);
};
const cancelIdleCallback = typeof self !== 'undefined' && self.cancelIdleCallback && self.cancelIdleCallback.bind(window) || function(id) {
    return clearTimeout(id);
};
if ((typeof exports.default === 'function' || typeof exports.default === 'object' && exports.default !== null) && typeof exports.default.__esModule === 'undefined') {
    Object.defineProperty(exports.default, '__esModule', {
        value: true
    });
    Object.assign(exports.default, exports);
    module.exports = exports.default;
} //# sourceMappingURL=request-idle-callback.js.map
}),
"[project]/node_modules/next/dist/client/script.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
0 && (module.exports = {
    default: null,
    handleClientScriptLoad: null,
    initScriptLoader: null
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    default: function() {
        return _default;
    },
    handleClientScriptLoad: function() {
        return handleClientScriptLoad;
    },
    initScriptLoader: function() {
        return initScriptLoader;
    }
});
const _interop_require_default = __turbopack_context__.r("[project]/node_modules/@swc/helpers/cjs/_interop_require_default.cjs [app-client] (ecmascript)");
const _interop_require_wildcard = __turbopack_context__.r("[project]/node_modules/@swc/helpers/cjs/_interop_require_wildcard.cjs [app-client] (ecmascript)");
const _jsxruntime = __turbopack_context__.r("[project]/node_modules/next/dist/compiled/react/jsx-runtime.js [app-client] (ecmascript)");
const _reactdom = /*#__PURE__*/ _interop_require_default._(__turbopack_context__.r("[project]/node_modules/next/dist/compiled/react-dom/index.js [app-client] (ecmascript)"));
const _react = /*#__PURE__*/ _interop_require_wildcard._(__turbopack_context__.r("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)"));
const _headmanagercontextsharedruntime = __turbopack_context__.r("[project]/node_modules/next/dist/shared/lib/head-manager-context.shared-runtime.js [app-client] (ecmascript)");
const _setattributesfromprops = __turbopack_context__.r("[project]/node_modules/next/dist/client/set-attributes-from-props.js [app-client] (ecmascript)");
const _requestidlecallback = __turbopack_context__.r("[project]/node_modules/next/dist/client/request-idle-callback.js [app-client] (ecmascript)");
const ScriptCache = new Map();
const LoadCache = new Set();
const insertStylesheets = (stylesheets)=>{
    // Case 1: Styles for afterInteractive/lazyOnload with appDir injected via handleClientScriptLoad
    //
    // Using ReactDOM.preinit to feature detect appDir and inject styles
    // Stylesheets might have already been loaded if initialized with Script component
    // Re-inject styles here to handle scripts loaded via handleClientScriptLoad
    // ReactDOM.preinit handles dedup and ensures the styles are loaded only once
    if (_reactdom.default.preinit) {
        stylesheets.forEach((stylesheet)=>{
            _reactdom.default.preinit(stylesheet, {
                as: 'style'
            });
        });
        return;
    }
    // Case 2: Styles for afterInteractive/lazyOnload with pages injected via handleClientScriptLoad
    //
    // We use this function to load styles when appdir is not detected
    // TODO: Use React float APIs to load styles once available for pages dir
    if (typeof window !== 'undefined') {
        let head = document.head;
        stylesheets.forEach((stylesheet)=>{
            let link = document.createElement('link');
            link.type = 'text/css';
            link.rel = 'stylesheet';
            link.href = stylesheet;
            head.appendChild(link);
        });
    }
};
const loadScript = (props)=>{
    const { src, id, onLoad = ()=>{}, onReady = null, dangerouslySetInnerHTML, children = '', strategy = 'afterInteractive', onError, stylesheets } = props;
    const cacheKey = id || src;
    // Script has already loaded
    if (cacheKey && LoadCache.has(cacheKey)) {
        return;
    }
    // Contents of this script are already loading/loaded
    if (ScriptCache.has(src)) {
        LoadCache.add(cacheKey);
        // It is possible that multiple `next/script` components all have same "src", but has different "onLoad"
        // This is to make sure the same remote script will only load once, but "onLoad" are executed in order
        ScriptCache.get(src).then(onLoad, onError);
        return;
    }
    /** Execute after the script first loaded */ const afterLoad = ()=>{
        // Run onReady for the first time after load event
        if (onReady) {
            onReady();
        }
        // add cacheKey to LoadCache when load successfully
        LoadCache.add(cacheKey);
    };
    const el = document.createElement('script');
    const loadPromise = new Promise((resolve, reject)=>{
        el.addEventListener('load', function(e) {
            resolve();
            if (onLoad) {
                onLoad.call(this, e);
            }
            afterLoad();
        });
        el.addEventListener('error', function(e) {
            reject(e);
        });
    }).catch(function(e) {
        if (onError) {
            onError(e);
        }
    });
    if (dangerouslySetInnerHTML) {
        // Casting since lib.dom.d.ts doesn't have TrustedHTML yet.
        el.innerHTML = dangerouslySetInnerHTML.__html || '';
        afterLoad();
    } else if (children) {
        el.textContent = typeof children === 'string' ? children : Array.isArray(children) ? children.join('') : '';
        afterLoad();
    } else if (src) {
        el.src = src;
        // do not add cacheKey into LoadCache for remote script here
        // cacheKey will be added to LoadCache when it is actually loaded (see loadPromise above)
        ScriptCache.set(src, loadPromise);
    }
    (0, _setattributesfromprops.setAttributesFromProps)(el, props);
    if (strategy === 'worker') {
        el.setAttribute('type', 'text/partytown');
    }
    el.setAttribute('data-nscript', strategy);
    // Load styles associated with this script
    if (stylesheets) {
        insertStylesheets(stylesheets);
    }
    document.body.appendChild(el);
};
function handleClientScriptLoad(props) {
    const { strategy = 'afterInteractive' } = props;
    if (strategy === 'lazyOnload') {
        window.addEventListener('load', ()=>{
            (0, _requestidlecallback.requestIdleCallback)(()=>loadScript(props));
        });
    } else {
        loadScript(props);
    }
}
function loadLazyScript(props) {
    if (document.readyState === 'complete') {
        (0, _requestidlecallback.requestIdleCallback)(()=>loadScript(props));
    } else {
        window.addEventListener('load', ()=>{
            (0, _requestidlecallback.requestIdleCallback)(()=>loadScript(props));
        });
    }
}
function addBeforeInteractiveToCache() {
    const scripts = [
        ...document.querySelectorAll('[data-nscript="beforeInteractive"]'),
        ...document.querySelectorAll('[data-nscript="beforePageRender"]')
    ];
    scripts.forEach((script)=>{
        const cacheKey = script.id || script.getAttribute('src');
        LoadCache.add(cacheKey);
    });
}
function initScriptLoader(scriptLoaderItems) {
    scriptLoaderItems.forEach(handleClientScriptLoad);
    addBeforeInteractiveToCache();
}
/**
 * Load a third-party scripts in an optimized way.
 *
 * Read more: [Next.js Docs: `next/script`](https://nextjs.org/docs/app/api-reference/components/script)
 */ function Script(props) {
    const { id, src = '', onLoad = ()=>{}, onReady = null, strategy = 'afterInteractive', onError, stylesheets, ...restProps } = props;
    // Context is available only during SSR
    let { updateScripts, scripts, getIsSsr, appDir, nonce } = (0, _react.useContext)(_headmanagercontextsharedruntime.HeadManagerContext);
    // if a nonce is explicitly passed to the script tag, favor that over the automatic handling
    nonce = restProps.nonce || nonce;
    /**
   * - First mount:
   *   1. The useEffect for onReady executes
   *   2. hasOnReadyEffectCalled.current is false, but the script hasn't loaded yet (not in LoadCache)
   *      onReady is skipped, set hasOnReadyEffectCalled.current to true
   *   3. The useEffect for loadScript executes
   *   4. hasLoadScriptEffectCalled.current is false, loadScript executes
   *      Once the script is loaded, the onLoad and onReady will be called by then
   *   [If strict mode is enabled / is wrapped in <OffScreen /> component]
   *   5. The useEffect for onReady executes again
   *   6. hasOnReadyEffectCalled.current is true, so entire effect is skipped
   *   7. The useEffect for loadScript executes again
   *   8. hasLoadScriptEffectCalled.current is true, so entire effect is skipped
   *
   * - Second mount:
   *   1. The useEffect for onReady executes
   *   2. hasOnReadyEffectCalled.current is false, but the script has already loaded (found in LoadCache)
   *      onReady is called, set hasOnReadyEffectCalled.current to true
   *   3. The useEffect for loadScript executes
   *   4. The script is already loaded, loadScript bails out
   *   [If strict mode is enabled / is wrapped in <OffScreen /> component]
   *   5. The useEffect for onReady executes again
   *   6. hasOnReadyEffectCalled.current is true, so entire effect is skipped
   *   7. The useEffect for loadScript executes again
   *   8. hasLoadScriptEffectCalled.current is true, so entire effect is skipped
   */ const hasOnReadyEffectCalled = (0, _react.useRef)(false);
    (0, _react.useEffect)(()=>{
        const cacheKey = id || src;
        if (!hasOnReadyEffectCalled.current) {
            // Run onReady if script has loaded before but component is re-mounted
            if (onReady && cacheKey && LoadCache.has(cacheKey)) {
                onReady();
            }
            hasOnReadyEffectCalled.current = true;
        }
    }, [
        onReady,
        id,
        src
    ]);
    const hasLoadScriptEffectCalled = (0, _react.useRef)(false);
    (0, _react.useEffect)(()=>{
        if (!hasLoadScriptEffectCalled.current) {
            if (strategy === 'afterInteractive') {
                loadScript(props);
            } else if (strategy === 'lazyOnload') {
                loadLazyScript(props);
            }
            hasLoadScriptEffectCalled.current = true;
        }
    }, [
        props,
        strategy
    ]);
    if (strategy === 'beforeInteractive' || strategy === 'worker') {
        if (updateScripts) {
            scripts[strategy] = (scripts[strategy] || []).concat([
                {
                    id,
                    src,
                    onLoad,
                    onReady,
                    onError,
                    ...restProps,
                    nonce
                }
            ]);
            updateScripts(scripts);
        } else if (getIsSsr && getIsSsr()) {
            // Script has already loaded during SSR
            LoadCache.add(id || src);
        } else if (getIsSsr && !getIsSsr()) {
            loadScript({
                ...props,
                nonce
            });
        }
    }
    // For the app directory, we need React Float to preload these scripts.
    if (appDir) {
        // Injecting stylesheets here handles beforeInteractive and worker scripts correctly
        // For other strategies injecting here ensures correct stylesheet order
        // ReactDOM.preinit handles loading the styles in the correct order,
        // also ensures the stylesheet is loaded only once and in a consistent manner
        //
        // Case 1: Styles for beforeInteractive/worker with appDir - handled here
        // Case 2: Styles for beforeInteractive/worker with pages dir - Not handled yet
        // Case 3: Styles for afterInteractive/lazyOnload with appDir - handled here
        // Case 4: Styles for afterInteractive/lazyOnload with pages dir - handled in insertStylesheets function
        if (stylesheets) {
            stylesheets.forEach((styleSrc)=>{
                _reactdom.default.preinit(styleSrc, {
                    as: 'style'
                });
            });
        }
        // Before interactive scripts need to be loaded by Next.js' runtime instead
        // of native <script> tags, because they no longer have `defer`.
        if (strategy === 'beforeInteractive') {
            if (!src) {
                // For inlined scripts, we put the content in `children`.
                if (restProps.dangerouslySetInnerHTML) {
                    // Casting since lib.dom.d.ts doesn't have TrustedHTML yet.
                    restProps.children = restProps.dangerouslySetInnerHTML.__html;
                    delete restProps.dangerouslySetInnerHTML;
                }
                return /*#__PURE__*/ (0, _jsxruntime.jsx)("script", {
                    nonce: nonce,
                    dangerouslySetInnerHTML: {
                        __html: `(self.__next_s=self.__next_s||[]).push(${JSON.stringify([
                            0,
                            {
                                ...restProps,
                                id
                            }
                        ])})`
                    }
                });
            } else {
                // @ts-ignore
                _reactdom.default.preload(src, restProps.integrity ? {
                    as: 'script',
                    integrity: restProps.integrity,
                    nonce,
                    crossOrigin: restProps.crossOrigin
                } : {
                    as: 'script',
                    nonce,
                    crossOrigin: restProps.crossOrigin
                });
                return /*#__PURE__*/ (0, _jsxruntime.jsx)("script", {
                    nonce: nonce,
                    dangerouslySetInnerHTML: {
                        __html: `(self.__next_s=self.__next_s||[]).push(${JSON.stringify([
                            src,
                            {
                                ...restProps,
                                id
                            }
                        ])})`
                    }
                });
            }
        } else if (strategy === 'afterInteractive') {
            if (src) {
                // @ts-ignore
                _reactdom.default.preload(src, restProps.integrity ? {
                    as: 'script',
                    integrity: restProps.integrity,
                    nonce,
                    crossOrigin: restProps.crossOrigin
                } : {
                    as: 'script',
                    nonce,
                    crossOrigin: restProps.crossOrigin
                });
            }
        }
    }
    return null;
}
Object.defineProperty(Script, '__nextScript', {
    value: true
});
const _default = Script;
if ((typeof exports.default === 'function' || typeof exports.default === 'object' && exports.default !== null) && typeof exports.default.__esModule === 'undefined') {
    Object.defineProperty(exports.default, '__esModule', {
        value: true
    });
    Object.assign(exports.default, exports);
    module.exports = exports.default;
} //# sourceMappingURL=script.js.map
}),
"[project]/node_modules/next/script.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {

module.exports = __turbopack_context__.r("[project]/node_modules/next/dist/client/script.js [app-client] (ecmascript)");
}),
]);

//# sourceMappingURL=_aa0d1e95._.js.map
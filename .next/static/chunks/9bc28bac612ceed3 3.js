(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,8341,(e,t,i)=>{"use strict";Object.defineProperty(i,"__esModule",{value:!0});var a={cancelIdleCallback:function(){return o},requestIdleCallback:function(){return n}};for(var r in a)Object.defineProperty(i,r,{enumerable:!0,get:a[r]});let n="undefined"!=typeof self&&self.requestIdleCallback&&self.requestIdleCallback.bind(window)||function(e){let t=Date.now();return self.setTimeout(function(){e({didTimeout:!1,timeRemaining:function(){return Math.max(0,50-(Date.now()-t))}})},1)},o="undefined"!=typeof self&&self.cancelIdleCallback&&self.cancelIdleCallback.bind(window)||function(e){return clearTimeout(e)};("function"==typeof i.default||"object"==typeof i.default&&null!==i.default)&&void 0===i.default.__esModule&&(Object.defineProperty(i.default,"__esModule",{value:!0}),Object.assign(i.default,i),t.exports=i.default)},79520,(e,t,i)=>{"use strict";Object.defineProperty(i,"__esModule",{value:!0});var a={default:function(){return y},handleClientScriptLoad:function(){return v},initScriptLoader:function(){return h}};for(var r in a)Object.defineProperty(i,r,{enumerable:!0,get:a[r]});let n=e.r(55682),o=e.r(90809),s=e.r(43476),l=n._(e.r(74080)),d=o._(e.r(71645)),c=e.r(42732),u=e.r(22737),p=e.r(8341),f=new Map,m=new Set,b=e=>{let{src:t,id:i,onLoad:a=()=>{},onReady:r=null,dangerouslySetInnerHTML:n,children:o="",strategy:s="afterInteractive",onError:d,stylesheets:c}=e,p=i||t;if(p&&m.has(p))return;if(f.has(t)){m.add(p),f.get(t).then(a,d);return}let b=()=>{r&&r(),m.add(p)},v=document.createElement("script"),h=new Promise((e,t)=>{v.addEventListener("load",function(t){e(),a&&a.call(this,t),b()}),v.addEventListener("error",function(e){t(e)})}).catch(function(e){d&&d(e)});n?(v.innerHTML=n.__html||"",b()):o?(v.textContent="string"==typeof o?o:Array.isArray(o)?o.join(""):"",b()):t&&(v.src=t,f.set(t,h)),(0,u.setAttributesFromProps)(v,e),"worker"===s&&v.setAttribute("type","text/partytown"),v.setAttribute("data-nscript",s),c&&(e=>{if(l.default.preinit)return e.forEach(e=>{l.default.preinit(e,{as:"style"})});if("undefined"!=typeof window){let t=document.head;e.forEach(e=>{let i=document.createElement("link");i.type="text/css",i.rel="stylesheet",i.href=e,t.appendChild(i)})}})(c),document.body.appendChild(v)};function v(e){let{strategy:t="afterInteractive"}=e;"lazyOnload"===t?window.addEventListener("load",()=>{(0,p.requestIdleCallback)(()=>b(e))}):b(e)}function h(e){e.forEach(v),[...document.querySelectorAll('[data-nscript="beforeInteractive"]'),...document.querySelectorAll('[data-nscript="beforePageRender"]')].forEach(e=>{let t=e.id||e.getAttribute("src");m.add(t)})}function g(e){let{id:t,src:i="",onLoad:a=()=>{},onReady:r=null,strategy:n="afterInteractive",onError:o,stylesheets:u,...f}=e,{updateScripts:v,scripts:h,getIsSsr:g,appDir:y,nonce:w}=(0,d.useContext)(c.HeadManagerContext);w=f.nonce||w;let j=(0,d.useRef)(!1);(0,d.useEffect)(()=>{let e=t||i;j.current||(r&&e&&m.has(e)&&r(),j.current=!0)},[r,t,i]);let x=(0,d.useRef)(!1);if((0,d.useEffect)(()=>{if(!x.current){if("afterInteractive"===n)b(e);else"lazyOnload"===n&&("complete"===document.readyState?(0,p.requestIdleCallback)(()=>b(e)):window.addEventListener("load",()=>{(0,p.requestIdleCallback)(()=>b(e))}));x.current=!0}},[e,n]),("beforeInteractive"===n||"worker"===n)&&(v?(h[n]=(h[n]||[]).concat([{id:t,src:i,onLoad:a,onReady:r,onError:o,...f,nonce:w}]),v(h)):g&&g()?m.add(t||i):g&&!g()&&b({...e,nonce:w})),y){if(u&&u.forEach(e=>{l.default.preinit(e,{as:"style"})}),"beforeInteractive"===n)if(!i)return f.dangerouslySetInnerHTML&&(f.children=f.dangerouslySetInnerHTML.__html,delete f.dangerouslySetInnerHTML),(0,s.jsx)("script",{nonce:w,dangerouslySetInnerHTML:{__html:`(self.__next_s=self.__next_s||[]).push(${JSON.stringify([0,{...f,id:t}])})`}});else return l.default.preload(i,f.integrity?{as:"script",integrity:f.integrity,nonce:w,crossOrigin:f.crossOrigin}:{as:"script",nonce:w,crossOrigin:f.crossOrigin}),(0,s.jsx)("script",{nonce:w,dangerouslySetInnerHTML:{__html:`(self.__next_s=self.__next_s||[]).push(${JSON.stringify([i,{...f,id:t}])})`}});"afterInteractive"===n&&i&&l.default.preload(i,f.integrity?{as:"script",integrity:f.integrity,nonce:w,crossOrigin:f.crossOrigin}:{as:"script",nonce:w,crossOrigin:f.crossOrigin})}return null}Object.defineProperty(g,"__nextScript",{value:!0});let y=g;("function"==typeof i.default||"object"==typeof i.default&&null!==i.default)&&void 0===i.default.__esModule&&(Object.defineProperty(i.default,"__esModule",{value:!0}),Object.assign(i.default,i),t.exports=i.default)},3303,(e,t,i)=>{t.exports=e.r(79520)},31713,e=>{"use strict";var t=e.i(43476),i=e.i(3303),a=e.i(71645);function r({isOpen:e,onClose:i,projectId:r,projectName:n,teamId:o}){let[s,l]=(0,a.useState)(""),[d,c]=(0,a.useState)("viewer"),[u,p]=(0,a.useState)(!1),[f,m]=(0,a.useState)(""),[b,v]=(0,a.useState)(""),[h,g]=(0,a.useState)("viewer"),[y,w]=(0,a.useState)("email"),[j,x]=(0,a.useState)([]);(0,a.useEffect)(()=>{e&&S()},[e,o]);let k=async()=>{try{let e=window;if(e.flowAuth&&"function"==typeof e.flowAuth.getAuthHeaders)try{let t=e.flowAuth.getSession&&e.flowAuth.getSession();if(t&&t.access_token&&"demo"!==t.access_token&&t.user&&"demo-user"!==t.user.id){let i=e.flowAuth.getAuthHeaders();return!i["x-actor-id"]&&t.user&&t.user.id&&(i["x-actor-id"]=t.user.id),i}}catch(e){}if(e.supabaseClient&&e.supabaseClient.auth)try{let t=await e.supabaseClient.auth.getUser(),i=t?.data?.user;if(i&&i.id){let t={"x-actor-id":i.id};try{let i=(await e.supabaseClient.auth.getSession())?.data?.session;i?.access_token&&(t.authorization="Bearer "+i.access_token)}catch(e){}return t}}catch(e){}}catch(e){}return{"Content-Type":"application/json"}},S=async()=>{try{let e=await k(),t=await fetch(`/api/invites?team_id=${o}`,{headers:e});if(t.ok){let e=await t.json();x(e.invites||[])}}catch(e){console.error("Error loading invites:",e)}},I=async e=>{e.preventDefault(),p(!0),m("");try{let e=await k(),t=await fetch("/api/invites",{method:"POST",headers:{"Content-Type":"application/json",...e},body:JSON.stringify({team_id:o,project_id:r,email:s,role:d,is_link_invite:!1})}),i=await t.json();if(!t.ok)throw Error(i.error||"Failed to create invite");m(`✅ Invito inviato a ${s}`),l(""),S()}catch(e){m(`❌ ${e.message}`)}finally{p(!1)}},C=async()=>{p(!0),m("");try{let e=await k(),t=await fetch("/api/invites",{method:"POST",headers:{"Content-Type":"application/json",...e},body:JSON.stringify({team_id:o,project_id:r,role:h,is_link_invite:!0})}),i=await t.json();if(!t.ok)throw Error(i.error||"Failed to create invite link");v(i.invite_url),m("✅ Link generato!"),S()}catch(e){m(`❌ ${e.message}`)}finally{p(!1)}},_=async()=>{try{let e=b||"";if(!e)return void m("❌ Nessun link disponibile");if(/^\//.test(e)&&(e=window.location.origin.replace(/\/+$/,"")+e),!/^https?:\/\//i.test(e)&&/^[^/:]+:\d+\//.test(e)&&(e="http://"+e),navigator.clipboard&&navigator.clipboard.writeText)await navigator.clipboard.writeText(e);else{let t=document.createElement("textarea");t.value=e,t.setAttribute("readonly",""),t.style.position="fixed",t.style.left="-9999px",document.body.appendChild(t),t.select(),t.setSelectionRange(0,t.value.length);let i=document.execCommand("copy");if(document.body.removeChild(t),!i)throw Error("execCommand failed")}m("✅ Link copiato!"),setTimeout(()=>m(""),2e3)}catch(e){console.error("[ShareModal] copy failed",e),m("❌ Impossibile copiare — prova a tenere premuto il link e copiare manualmente")}},P=async e=>{try{let t=await k();(await fetch(`/api/invites?invite_id=${e}`,{method:"DELETE",headers:{...t}})).ok&&(m("✅ Invito revocato"),S())}catch(e){console.error("Error revoking invite:",e)}};return e?(0,t.jsx)("div",{style:{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.8)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1e3},onClick:i,children:(0,t.jsxs)("div",{style:{background:"#1a1a1a",borderRadius:"8px",padding:"2rem",maxWidth:"600px",width:"90%",maxHeight:"80vh",overflow:"auto",border:"1px solid #333"},onClick:e=>e.stopPropagation(),children:[(0,t.jsxs)("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.5rem"},children:[(0,t.jsxs)("h2",{style:{margin:0,color:"#fff"},children:["Condividi: ",n]}),(0,t.jsx)("button",{onClick:i,style:{background:"transparent",border:"none",color:"#999",fontSize:"1.5rem",cursor:"pointer",padding:"0.25rem"},children:"×"})]}),(0,t.jsxs)("div",{style:{display:"flex",gap:"0.5rem",marginBottom:"1.5rem",borderBottom:"1px solid #333"},children:[(0,t.jsx)("button",{onClick:()=>w("email"),style:{padding:"0.75rem 1.5rem",background:"transparent",border:"none",borderBottom:"email"===y?"2px solid #0066ff":"2px solid transparent",color:"email"===y?"#0066ff":"#999",cursor:"pointer",fontWeight:"email"===y?"600":"400"},children:"📧 Via Email"}),(0,t.jsx)("button",{onClick:()=>w("link"),style:{padding:"0.75rem 1.5rem",background:"transparent",border:"none",borderBottom:"link"===y?"2px solid #0066ff":"2px solid transparent",color:"link"===y?"#0066ff":"#999",cursor:"pointer",fontWeight:"link"===y?"600":"400"},children:"🔗 Link Condivisibile"})]}),"email"===y?(0,t.jsxs)("form",{onSubmit:I,children:[(0,t.jsxs)("div",{style:{marginBottom:"1rem"},children:[(0,t.jsx)("label",{style:{display:"block",marginBottom:"0.5rem",color:"#ccc"},children:"Email dell'utente da invitare"}),(0,t.jsx)("input",{type:"email",value:s,onChange:e=>l(e.target.value),required:!0,placeholder:"user@example.com",style:{width:"100%",padding:"0.75rem",borderRadius:"4px",border:"1px solid #333",background:"#0a0a0a",color:"#fff",fontSize:"1rem"}})]}),(0,t.jsxs)("div",{style:{marginBottom:"1.5rem"},children:[(0,t.jsx)("label",{style:{display:"block",marginBottom:"0.5rem",color:"#ccc"},children:"Ruolo"}),(0,t.jsxs)("select",{value:d,onChange:e=>c(e.target.value),style:{width:"100%",padding:"0.75rem",borderRadius:"4px",border:"1px solid #333",background:"#0a0a0a",color:"#fff",fontSize:"1rem"},children:[(0,t.jsx)("option",{value:"viewer",children:"👁️ Visualizzatore (solo lettura)"}),(0,t.jsx)("option",{value:"commenter",children:"💬 Commentatore (può commentare)"}),(0,t.jsx)("option",{value:"editor",children:"✏️ Editor (può modificare)"}),(0,t.jsx)("option",{value:"owner",children:"👑 Proprietario (controllo totale)"})]})]}),(0,t.jsx)("button",{type:"submit",disabled:u,style:{width:"100%",padding:"0.75rem",background:u?"#333":"#0066ff",color:"#fff",border:"none",borderRadius:"4px",fontSize:"1rem",cursor:u?"not-allowed":"pointer",opacity:u?.6:1},children:u?"Invio...":"Invia invito"})]}):(0,t.jsxs)("div",{children:[(0,t.jsxs)("div",{style:{marginBottom:"1rem"},children:[(0,t.jsx)("label",{style:{display:"block",marginBottom:"0.5rem",color:"#ccc"},children:"Ruolo per il link"}),(0,t.jsxs)("select",{value:h,onChange:e=>g(e.target.value),style:{width:"100%",padding:"0.75rem",borderRadius:"4px",border:"1px solid #333",background:"#0a0a0a",color:"#fff",fontSize:"1rem"},children:[(0,t.jsx)("option",{value:"viewer",children:"👁️ Visualizzatore (solo lettura)"}),(0,t.jsx)("option",{value:"commenter",children:"💬 Commentatore (può commentare)"}),(0,t.jsx)("option",{value:"editor",children:"✏️ Editor (può modificare)"})]})]}),(0,t.jsx)("button",{onClick:C,disabled:u,style:{width:"100%",padding:"0.75rem",background:u?"#333":"#0066ff",color:"#fff",border:"none",borderRadius:"4px",fontSize:"1rem",cursor:u?"not-allowed":"pointer",opacity:u?.6:1,marginBottom:"1rem"},children:u?"Generazione...":"Genera link di invito"}),b&&(0,t.jsxs)("div",{style:{padding:"1rem",background:"#0a0a0a",borderRadius:"4px",border:"1px solid #333"},children:[(0,t.jsx)("div",{style:{marginBottom:"0.5rem",color:"#999",fontSize:"0.85rem"},children:"Link generato:"}),(0,t.jsxs)("div",{style:{display:"flex",gap:"0.5rem",alignItems:"center"},children:[(0,t.jsx)("input",{type:"text",value:b,readOnly:!0,style:{flex:1,padding:"0.5rem",background:"#1a1a1a",border:"1px solid #333",borderRadius:"4px",color:"#0066ff",fontSize:"0.9rem"}}),(0,t.jsx)("button",{onClick:_,style:{padding:"0.5rem 1rem",background:"#333",color:"#fff",border:"none",borderRadius:"4px",cursor:"pointer",whiteSpace:"nowrap"},children:"📋 Copia"})]})]})]}),f&&(0,t.jsx)("div",{style:{marginTop:"1rem",padding:"0.75rem",background:f.includes("❌")?"#4d1a1a":"#1a4d1a",borderRadius:"4px",color:"#fff",fontSize:"0.9rem"},children:f}),j.length>0&&(0,t.jsxs)("div",{style:{marginTop:"2rem",paddingTop:"1.5rem",borderTop:"1px solid #333"},children:[(0,t.jsxs)("h3",{style:{marginBottom:"1rem",color:"#ccc",fontSize:"0.9rem"},children:["Inviti attivi (",j.length,")"]}),(0,t.jsx)("div",{style:{display:"flex",flexDirection:"column",gap:"0.5rem"},children:j.map(e=>(0,t.jsxs)("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0.75rem",background:"#0a0a0a",borderRadius:"4px",border:"1px solid #333"},children:[(0,t.jsxs)("div",{style:{flex:1},children:[(0,t.jsx)("div",{style:{color:"#fff",marginBottom:"0.25rem"},children:e.email||"🔗 Link pubblico"}),(0,t.jsxs)("div",{style:{color:"#666",fontSize:"0.8rem"},children:[e.role," · Scade il ",new Date(e.expires_at).toLocaleDateString()]})]}),(0,t.jsx)("button",{onClick:()=>P(e.id),style:{padding:"0.5rem 1rem",background:"#4d1a1a",color:"#ff6b6b",border:"none",borderRadius:"4px",cursor:"pointer",fontSize:"0.85rem"},children:"Revoca"})]},e.id))})]})]})}):null}function n(){let[n,o]=(0,a.useState)(!1),[s,l]=(0,a.useState)(null);(0,a.useEffect)(()=>{console.log("Home page mounted - initializing Supabase client"),window.__isSigningOut=!1,(async()=>{let{getSupabaseClient:t}=await e.A(21933),i=t();window.supabaseClient=i,console.log("[HomePage] Supabase client ready:",!!i)})();let t=e=>{let{projectId:t,projectName:i,teamId:a}=e.detail;l({projectId:t,projectName:i,teamId:a}),o(!0)};return window.addEventListener("open-share-modal",t),()=>{window.removeEventListener("open-share-modal",t)}},[]);let d=`<div class="app">
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
  `;return(0,t.jsxs)(t.Fragment,{children:[(0,t.jsx)(i.default,{id:"initialize-stub",strategy:"beforeInteractive",dangerouslySetInnerHTML:{__html:`
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
          `}}),(0,t.jsx)("div",{dangerouslySetInnerHTML:{__html:d}}),s&&(0,t.jsx)(r,{isOpen:n,onClose:()=>o(!1),projectId:s.projectId,projectName:s.projectName,teamId:s.teamId}),(0,t.jsx)(i.default,{src:"https://unpkg.com/@supabase/supabase-js@2",strategy:"beforeInteractive"}),(0,t.jsx)(i.default,{src:"https://unpkg.com/wavesurfer.js@6",strategy:"beforeInteractive"}),(0,t.jsx)(i.default,{src:"/flow-auth.js",strategy:"afterInteractive"}),(0,t.jsx)(i.default,{src:"/share-handler.js",strategy:"afterInteractive"}),(0,t.jsx)(i.default,{src:"/flow.js",strategy:"afterInteractive",onLoad:()=>{console.log("[PageInit] Scripts loaded");let e=setInterval(async()=>{if(window.supabaseClient)if(clearInterval(e),console.log("[PageInit] Supabase ready, initializing auth..."),window.flowAuth&&"function"==typeof window.flowAuth.initAuth)if(await window.flowAuth.initAuth()){console.log("[PageInit] ✅ Auth successful, app loaded");try{let e=localStorage.getItem("pending_share");if(e){localStorage.removeItem("pending_share");try{let t=JSON.parse(e);if(t&&t.share_id){let e=t.token?`?token=${encodeURIComponent(t.token)}`:"";window.location.href=`/share/${t.share_id}${e}`;return}}catch(t){window.location.href=`/share/${e}`;return}}let t=localStorage.getItem("pending_invite");if(t){localStorage.removeItem("pending_invite"),window.location.href=`/invite/${t}`;return}}catch(e){console.warn("[PageInit] Error checking pending share/invite",e)}(async()=>{if("function"==typeof window.initializeFromSupabase){console.log("[PageInit] Calling initializeFromSupabase..."),window.initializeFromSupabase();return}if("function"==typeof window.safeFetchProjectsFallback){console.log("[PageInit] initializeFromSupabase not found - calling safeFetchProjectsFallback");try{await window.safeFetchProjectsFallback();return}catch(e){console.warn("[PageInit] safeFetchProjectsFallback failed",e)}}for(let e=0;e<6;e++)if(await new Promise(e=>setTimeout(e,250)),"function"==typeof window.initializeFromSupabase){console.log("[PageInit] initializeFromSupabase became available - calling it"),window.initializeFromSupabase();return}console.warn("[PageInit] initializeFromSupabase NOT FOUND after retries")})().catch(e=>console.error("[PageInit] init/fallback error",e))}else console.log("[PageInit] Auth failed - will redirect to login");else console.error("[PageInit] flowAuth.initAuth not found")},50);setTimeout(()=>{clearInterval(e),window.supabaseClient||console.error("[PageInit] Supabase client not ready after 5s")},5e3)}}),(0,t.jsx)(i.default,{src:"/flow-init.js",strategy:"afterInteractive"})]})}e.s(["default",()=>n],31713)},21933,e=>{e.v(e=>Promise.resolve().then(()=>e(53210)))}]);
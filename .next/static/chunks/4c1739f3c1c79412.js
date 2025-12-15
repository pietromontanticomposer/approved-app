(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,8341,(e,t,i)=>{"use strict";Object.defineProperty(i,"__esModule",{value:!0});var r={cancelIdleCallback:function(){return o},requestIdleCallback:function(){return n}};for(var a in r)Object.defineProperty(i,a,{enumerable:!0,get:r[a]});let n="undefined"!=typeof self&&self.requestIdleCallback&&self.requestIdleCallback.bind(window)||function(e){let t=Date.now();return self.setTimeout(function(){e({didTimeout:!1,timeRemaining:function(){return Math.max(0,50-(Date.now()-t))}})},1)},o="undefined"!=typeof self&&self.cancelIdleCallback&&self.cancelIdleCallback.bind(window)||function(e){return clearTimeout(e)};("function"==typeof i.default||"object"==typeof i.default&&null!==i.default)&&void 0===i.default.__esModule&&(Object.defineProperty(i.default,"__esModule",{value:!0}),Object.assign(i.default,i),t.exports=i.default)},79520,(e,t,i)=>{"use strict";Object.defineProperty(i,"__esModule",{value:!0});var r={default:function(){return y},handleClientScriptLoad:function(){return b},initScriptLoader:function(){return g}};for(var a in r)Object.defineProperty(i,a,{enumerable:!0,get:r[a]});let n=e.r(55682),o=e.r(90809),s=e.r(43476),l=n._(e.r(74080)),d=o._(e.r(71645)),c=e.r(42732),u=e.r(22737),p=e.r(8341),m=new Map,f=new Set,v=e=>{let{src:t,id:i,onLoad:r=()=>{},onReady:a=null,dangerouslySetInnerHTML:n,children:o="",strategy:s="afterInteractive",onError:d,stylesheets:c}=e,p=i||t;if(p&&f.has(p))return;if(m.has(t)){f.add(p),m.get(t).then(r,d);return}let v=()=>{a&&a(),f.add(p)},b=document.createElement("script"),g=new Promise((e,t)=>{b.addEventListener("load",function(t){e(),r&&r.call(this,t),v()}),b.addEventListener("error",function(e){t(e)})}).catch(function(e){d&&d(e)});n?(b.innerHTML=n.__html||"",v()):o?(b.textContent="string"==typeof o?o:Array.isArray(o)?o.join(""):"",v()):t&&(b.src=t,m.set(t,g)),(0,u.setAttributesFromProps)(b,e),"worker"===s&&b.setAttribute("type","text/partytown"),b.setAttribute("data-nscript",s),c&&(e=>{if(l.default.preinit)return e.forEach(e=>{l.default.preinit(e,{as:"style"})});if("undefined"!=typeof window){let t=document.head;e.forEach(e=>{let i=document.createElement("link");i.type="text/css",i.rel="stylesheet",i.href=e,t.appendChild(i)})}})(c),document.body.appendChild(b)};function b(e){let{strategy:t="afterInteractive"}=e;"lazyOnload"===t?window.addEventListener("load",()=>{(0,p.requestIdleCallback)(()=>v(e))}):v(e)}function g(e){e.forEach(b),[...document.querySelectorAll('[data-nscript="beforeInteractive"]'),...document.querySelectorAll('[data-nscript="beforePageRender"]')].forEach(e=>{let t=e.id||e.getAttribute("src");f.add(t)})}function h(e){let{id:t,src:i="",onLoad:r=()=>{},onReady:a=null,strategy:n="afterInteractive",onError:o,stylesheets:u,...m}=e,{updateScripts:b,scripts:g,getIsSsr:h,appDir:y,nonce:w}=(0,d.useContext)(c.HeadManagerContext);w=m.nonce||w;let x=(0,d.useRef)(!1);(0,d.useEffect)(()=>{let e=t||i;x.current||(a&&e&&f.has(e)&&a(),x.current=!0)},[a,t,i]);let j=(0,d.useRef)(!1);if((0,d.useEffect)(()=>{if(!j.current){if("afterInteractive"===n)v(e);else"lazyOnload"===n&&("complete"===document.readyState?(0,p.requestIdleCallback)(()=>v(e)):window.addEventListener("load",()=>{(0,p.requestIdleCallback)(()=>v(e))}));j.current=!0}},[e,n]),("beforeInteractive"===n||"worker"===n)&&(b?(g[n]=(g[n]||[]).concat([{id:t,src:i,onLoad:r,onReady:a,onError:o,...m,nonce:w}]),b(g)):h&&h()?f.add(t||i):h&&!h()&&v({...e,nonce:w})),y){if(u&&u.forEach(e=>{l.default.preinit(e,{as:"style"})}),"beforeInteractive"===n)if(!i)return m.dangerouslySetInnerHTML&&(m.children=m.dangerouslySetInnerHTML.__html,delete m.dangerouslySetInnerHTML),(0,s.jsx)("script",{nonce:w,dangerouslySetInnerHTML:{__html:`(self.__next_s=self.__next_s||[]).push(${JSON.stringify([0,{...m,id:t}])})`}});else return l.default.preload(i,m.integrity?{as:"script",integrity:m.integrity,nonce:w,crossOrigin:m.crossOrigin}:{as:"script",nonce:w,crossOrigin:m.crossOrigin}),(0,s.jsx)("script",{nonce:w,dangerouslySetInnerHTML:{__html:`(self.__next_s=self.__next_s||[]).push(${JSON.stringify([i,{...m,id:t}])})`}});"afterInteractive"===n&&i&&l.default.preload(i,m.integrity?{as:"script",integrity:m.integrity,nonce:w,crossOrigin:m.crossOrigin}:{as:"script",nonce:w,crossOrigin:m.crossOrigin})}return null}Object.defineProperty(h,"__nextScript",{value:!0});let y=h;("function"==typeof i.default||"object"==typeof i.default&&null!==i.default)&&void 0===i.default.__esModule&&(Object.defineProperty(i.default,"__esModule",{value:!0}),Object.assign(i.default,i),t.exports=i.default)},3303,(e,t,i)=>{t.exports=e.r(79520)},31713,e=>{"use strict";var t=e.i(43476),i=e.i(3303),r=e.i(71645);function a({isOpen:e,onClose:i,projectId:a,projectName:n,teamId:o}){let[s,l]=(0,r.useState)(""),[d,c]=(0,r.useState)("viewer"),[u,p]=(0,r.useState)(!1),[m,f]=(0,r.useState)(""),[v,b]=(0,r.useState)(""),[g,h]=(0,r.useState)("viewer"),[y,w]=(0,r.useState)("email"),[x,j]=(0,r.useState)([]);(0,r.useEffect)(()=>{e&&S()},[e,o]);let k=async()=>{try{let e=window;if(e.flowAuth&&"function"==typeof e.flowAuth.getAuthHeaders)try{let t=e.flowAuth.getSession&&e.flowAuth.getSession();if(t&&t.access_token&&"demo"!==t.access_token&&t.user&&"demo-user"!==t.user.id){let i=e.flowAuth.getAuthHeaders();return!i["x-actor-id"]&&t.user&&t.user.id&&(i["x-actor-id"]=t.user.id),i}}catch(e){}if(e.supabaseClient&&e.supabaseClient.auth)try{let t=await e.supabaseClient.auth.getUser(),i=t?.data?.user;if(i&&i.id){let t={"x-actor-id":i.id};try{let i=(await e.supabaseClient.auth.getSession())?.data?.session;i?.access_token&&(t.authorization="Bearer "+i.access_token)}catch(e){}return t}}catch(e){}}catch(e){}return{"Content-Type":"application/json"}},S=async()=>{try{let e=await k(),t=await fetch(`/api/invites?team_id=${o}`,{headers:e});if(t.ok){let e=await t.json();j(e.invites||[])}}catch(e){console.error("Error loading invites:",e)}},C=async e=>{e.preventDefault(),p(!0),f("");try{let e=await k(),t=await fetch("/api/invites",{method:"POST",headers:{"Content-Type":"application/json",...e},body:JSON.stringify({team_id:o,project_id:a,email:s,role:d,is_link_invite:!1})}),i=await t.json();if(!t.ok)throw Error(i.error||"Failed to create invite");f(`✅ Invito inviato a ${s}`),l(""),S()}catch(e){f(`❌ ${e.message}`)}finally{p(!1)}},I=async()=>{p(!0),f("");try{let e=await k(),t=await fetch("/api/invites",{method:"POST",headers:{"Content-Type":"application/json",...e},body:JSON.stringify({team_id:o,project_id:a,role:g,is_link_invite:!0})}),i=await t.json();if(!t.ok)throw Error(i.error||"Failed to create invite link");b(i.invite_url),f("✅ Link generato!"),S()}catch(e){f(`❌ ${e.message}`)}finally{p(!1)}},_=async()=>{try{let e=v||"";if(!e)return void f("❌ Nessun link disponibile");if(/^\//.test(e)&&(e=window.location.origin.replace(/\/+$/,"")+e),!/^https?:\/\//i.test(e)&&/^[^/:]+:\d+\//.test(e)&&(e="http://"+e),navigator.clipboard&&navigator.clipboard.writeText)await navigator.clipboard.writeText(e);else{let t=document.createElement("textarea");t.value=e,t.setAttribute("readonly",""),t.style.position="fixed",t.style.left="-9999px",document.body.appendChild(t),t.select(),t.setSelectionRange(0,t.value.length);let i=document.execCommand("copy");if(document.body.removeChild(t),!i)throw Error("execCommand failed")}f("✅ Link copiato!"),setTimeout(()=>f(""),2e3)}catch(e){console.error("[ShareModal] copy failed",e),f("❌ Impossibile copiare — prova a tenere premuto il link e copiare manualmente")}},E=async e=>{try{let t=await k();(await fetch(`/api/invites?invite_id=${e}`,{method:"DELETE",headers:{...t}})).ok&&(f("✅ Invito revocato"),S())}catch(e){console.error("Error revoking invite:",e)}};return e?(0,t.jsx)("div",{style:{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.8)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1e3},onClick:i,children:(0,t.jsxs)("div",{style:{background:"#1a1a1a",borderRadius:"8px",padding:"2rem",maxWidth:"600px",width:"90%",maxHeight:"80vh",overflow:"auto",border:"1px solid #333"},onClick:e=>e.stopPropagation(),children:[(0,t.jsxs)("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.5rem"},children:[(0,t.jsxs)("h2",{style:{margin:0,color:"#fff"},children:["Condividi: ",n]}),(0,t.jsx)("button",{onClick:i,style:{background:"transparent",border:"none",color:"#999",fontSize:"1.5rem",cursor:"pointer",padding:"0.25rem"},children:"×"})]}),(0,t.jsxs)("div",{style:{display:"flex",gap:"0.5rem",marginBottom:"1.5rem",borderBottom:"1px solid #333"},children:[(0,t.jsx)("button",{onClick:()=>w("email"),style:{padding:"0.75rem 1.5rem",background:"transparent",border:"none",borderBottom:"email"===y?"2px solid #0066ff":"2px solid transparent",color:"email"===y?"#0066ff":"#999",cursor:"pointer",fontWeight:"email"===y?"600":"400"},children:"📧 Via Email"}),(0,t.jsx)("button",{onClick:()=>w("link"),style:{padding:"0.75rem 1.5rem",background:"transparent",border:"none",borderBottom:"link"===y?"2px solid #0066ff":"2px solid transparent",color:"link"===y?"#0066ff":"#999",cursor:"pointer",fontWeight:"link"===y?"600":"400"},children:"🔗 Link Condivisibile"})]}),"email"===y?(0,t.jsxs)("form",{onSubmit:C,children:[(0,t.jsxs)("div",{style:{marginBottom:"1rem"},children:[(0,t.jsx)("label",{style:{display:"block",marginBottom:"0.5rem",color:"#ccc"},children:"Email dell'utente da invitare"}),(0,t.jsx)("input",{type:"email",value:s,onChange:e=>l(e.target.value),required:!0,placeholder:"user@example.com",style:{width:"100%",padding:"0.75rem",borderRadius:"4px",border:"1px solid #333",background:"#0a0a0a",color:"#fff",fontSize:"1rem"}})]}),(0,t.jsxs)("div",{style:{marginBottom:"1.5rem"},children:[(0,t.jsx)("label",{style:{display:"block",marginBottom:"0.5rem",color:"#ccc"},children:"Ruolo"}),(0,t.jsxs)("select",{value:d,onChange:e=>c(e.target.value),style:{width:"100%",padding:"0.75rem",borderRadius:"4px",border:"1px solid #333",background:"#0a0a0a",color:"#fff",fontSize:"1rem"},children:[(0,t.jsx)("option",{value:"viewer",children:"👁️ Visualizzatore (solo lettura)"}),(0,t.jsx)("option",{value:"commenter",children:"💬 Commentatore (può commentare)"}),(0,t.jsx)("option",{value:"editor",children:"✏️ Editor (può modificare)"}),(0,t.jsx)("option",{value:"owner",children:"👑 Proprietario (controllo totale)"})]})]}),(0,t.jsx)("button",{type:"submit",disabled:u,style:{width:"100%",padding:"0.75rem",background:u?"#333":"#0066ff",color:"#fff",border:"none",borderRadius:"4px",fontSize:"1rem",cursor:u?"not-allowed":"pointer",opacity:u?.6:1},children:u?"Invio...":"Invia invito"})]}):(0,t.jsxs)("div",{children:[(0,t.jsxs)("div",{style:{marginBottom:"1rem"},children:[(0,t.jsx)("label",{style:{display:"block",marginBottom:"0.5rem",color:"#ccc"},children:"Ruolo per il link"}),(0,t.jsxs)("select",{value:g,onChange:e=>h(e.target.value),style:{width:"100%",padding:"0.75rem",borderRadius:"4px",border:"1px solid #333",background:"#0a0a0a",color:"#fff",fontSize:"1rem"},children:[(0,t.jsx)("option",{value:"viewer",children:"👁️ Visualizzatore (solo lettura)"}),(0,t.jsx)("option",{value:"commenter",children:"💬 Commentatore (può commentare)"}),(0,t.jsx)("option",{value:"editor",children:"✏️ Editor (può modificare)"})]})]}),(0,t.jsx)("button",{onClick:I,disabled:u,style:{width:"100%",padding:"0.75rem",background:u?"#333":"#0066ff",color:"#fff",border:"none",borderRadius:"4px",fontSize:"1rem",cursor:u?"not-allowed":"pointer",opacity:u?.6:1,marginBottom:"1rem"},children:u?"Generazione...":"Genera link di invito"}),v&&(0,t.jsxs)("div",{style:{padding:"1rem",background:"#0a0a0a",borderRadius:"4px",border:"1px solid #333"},children:[(0,t.jsx)("div",{style:{marginBottom:"0.5rem",color:"#999",fontSize:"0.85rem"},children:"Link generato:"}),(0,t.jsxs)("div",{style:{display:"flex",gap:"0.5rem",alignItems:"center"},children:[(0,t.jsx)("input",{type:"text",value:v,readOnly:!0,style:{flex:1,padding:"0.5rem",background:"#1a1a1a",border:"1px solid #333",borderRadius:"4px",color:"#0066ff",fontSize:"0.9rem"}}),(0,t.jsx)("button",{onClick:_,style:{padding:"0.5rem 1rem",background:"#333",color:"#fff",border:"none",borderRadius:"4px",cursor:"pointer",whiteSpace:"nowrap"},children:"📋 Copia"})]})]})]}),m&&(0,t.jsx)("div",{style:{marginTop:"1rem",padding:"0.75rem",background:m.includes("❌")?"#4d1a1a":"#1a4d1a",borderRadius:"4px",color:"#fff",fontSize:"0.9rem"},children:m}),x.length>0&&(0,t.jsxs)("div",{style:{marginTop:"2rem",paddingTop:"1.5rem",borderTop:"1px solid #333"},children:[(0,t.jsxs)("h3",{style:{marginBottom:"1rem",color:"#ccc",fontSize:"0.9rem"},children:["Inviti attivi (",x.length,")"]}),(0,t.jsx)("div",{style:{display:"flex",flexDirection:"column",gap:"0.5rem"},children:x.map(e=>(0,t.jsxs)("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0.75rem",background:"#0a0a0a",borderRadius:"4px",border:"1px solid #333"},children:[(0,t.jsxs)("div",{style:{flex:1},children:[(0,t.jsx)("div",{style:{color:"#fff",marginBottom:"0.25rem"},children:e.email||"🔗 Link pubblico"}),(0,t.jsxs)("div",{style:{color:"#666",fontSize:"0.8rem"},children:[e.role," · Scade il ",new Date(e.expires_at).toLocaleDateString()]})]}),(0,t.jsx)("button",{onClick:()=>E(e.id),style:{padding:"0.5rem 1rem",background:"#4d1a1a",color:"#ff6b6b",border:"none",borderRadius:"4px",cursor:"pointer",fontSize:"0.85rem"},children:"Revoca"})]},e.id))})]})]})}):null}function n(){let[n,o]=(0,r.useState)(!1),[s,l]=(0,r.useState)(null);(0,r.useEffect)(()=>{console.log("Home page mounted - initializing Supabase client"),window.__isSigningOut=!1,(async()=>{let{getSupabaseClient:t}=await e.A(21933),i=t();window.supabaseClient=i,console.log("[HomePage] Supabase client ready:",!!i)})();let t=e=>{let{projectId:t,projectName:i,teamId:r}=e.detail;l({projectId:t,projectName:i,teamId:r}),o(!0)};return window.addEventListener("open-share-modal",t),()=>{window.removeEventListener("open-share-modal",t)}},[]);let d=`<div class="app">
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
  `;return(0,t.jsxs)(t.Fragment,{children:[(0,t.jsx)("div",{dangerouslySetInnerHTML:{__html:d}}),s&&(0,t.jsx)(a,{isOpen:n,onClose:()=>o(!1),projectId:s.projectId,projectName:s.projectName,teamId:s.teamId}),(0,t.jsx)(i.default,{src:"https://unpkg.com/@supabase/supabase-js@2",strategy:"beforeInteractive"}),(0,t.jsx)(i.default,{src:"https://unpkg.com/wavesurfer.js@6",strategy:"beforeInteractive"}),(0,t.jsx)(i.default,{src:"/flow-auth.js",strategy:"afterInteractive"}),(0,t.jsx)(i.default,{src:"/share-handler.js",strategy:"afterInteractive"}),(0,t.jsx)(i.default,{src:"/flow.js",strategy:"afterInteractive",onLoad:()=>{console.log("[PageInit] Scripts loaded");let e=setInterval(async()=>{if(window.supabaseClient)if(clearInterval(e),console.log("[PageInit] Supabase ready, initializing auth..."),window.flowAuth&&"function"==typeof window.flowAuth.initAuth)if(await window.flowAuth.initAuth()){console.log("[PageInit] ✅ Auth successful, app loaded");try{let e=localStorage.getItem("pending_share");if(e){localStorage.removeItem("pending_share");try{let t=JSON.parse(e);if(t&&t.share_id){let e=t.token?`?token=${encodeURIComponent(t.token)}`:"";window.location.href=`/share/${t.share_id}${e}`;return}}catch(t){window.location.href=`/share/${e}`;return}}let t=localStorage.getItem("pending_invite");if(t){localStorage.removeItem("pending_invite"),window.location.href=`/invite/${t}`;return}}catch(e){console.warn("[PageInit] Error checking pending share/invite",e)}"function"==typeof window.initializeFromSupabase?(console.log("[PageInit] Calling initializeFromSupabase..."),window.initializeFromSupabase()):console.warn("[PageInit] initializeFromSupabase NOT FOUND")}else console.log("[PageInit] Auth failed - will redirect to login");else console.error("[PageInit] flowAuth.initAuth not found")},50);setTimeout(()=>{clearInterval(e),window.supabaseClient||console.error("[PageInit] Supabase client not ready after 5s")},5e3)}})]})}e.s(["default",()=>n],31713)},21933,e=>{e.v(t=>Promise.all(["static/chunks/5e12cd52e6f0e646.js"].map(t=>e.l(t))).then(()=>t(53210)))}]);
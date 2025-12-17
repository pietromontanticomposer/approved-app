module.exports=[33354,(a,b,c)=>{"use strict";c._=function(a){return a&&a.__esModule?a:{default:a}}},92966,(a,b,c)=>{"use strict";b.exports=a.r(42602).vendored.contexts.HeadManagerContext},30089,(a,b,c)=>{"use strict";Object.defineProperty(c,"__esModule",{value:!0}),Object.defineProperty(c,"setAttributesFromProps",{enumerable:!0,get:function(){return g}});let d={acceptCharset:"accept-charset",className:"class",htmlFor:"for",httpEquiv:"http-equiv",noModule:"noModule"},e=["onLoad","onReady","dangerouslySetInnerHTML","children","onError","strategy","stylesheets"];function f(a){return["async","defer","noModule"].includes(a)}function g(a,b){for(let[c,g]of Object.entries(b)){if(!b.hasOwnProperty(c)||e.includes(c)||void 0===g)continue;let h=d[c]||c.toLowerCase();"SCRIPT"===a.tagName&&f(h)?a[h]=!!g:a.setAttribute(h,String(g)),(!1===g||"SCRIPT"===a.tagName&&f(h)&&(!g||"false"===g))&&(a.setAttribute(h,""),a.removeAttribute(h))}}("function"==typeof c.default||"object"==typeof c.default&&null!==c.default)&&void 0===c.default.__esModule&&(Object.defineProperty(c.default,"__esModule",{value:!0}),Object.assign(c.default,c),b.exports=c.default)},12962,(a,b,c)=>{"use strict";Object.defineProperty(c,"__esModule",{value:!0});var d={cancelIdleCallback:function(){return g},requestIdleCallback:function(){return f}};for(var e in d)Object.defineProperty(c,e,{enumerable:!0,get:d[e]});let f="undefined"!=typeof self&&self.requestIdleCallback&&self.requestIdleCallback.bind(window)||function(a){let b=Date.now();return self.setTimeout(function(){a({didTimeout:!1,timeRemaining:function(){return Math.max(0,50-(Date.now()-b))}})},1)},g="undefined"!=typeof self&&self.cancelIdleCallback&&self.cancelIdleCallback.bind(window)||function(a){return clearTimeout(a)};("function"==typeof c.default||"object"==typeof c.default&&null!==c.default)&&void 0===c.default.__esModule&&(Object.defineProperty(c.default,"__esModule",{value:!0}),Object.assign(c.default,c),b.exports=c.default)},96665,(a,b,c)=>{"use strict";Object.defineProperty(c,"__esModule",{value:!0});var d={default:function(){return t},handleClientScriptLoad:function(){return q},initScriptLoader:function(){return r}};for(var e in d)Object.defineProperty(c,e,{enumerable:!0,get:d[e]});let f=a.r(33354),g=a.r(46058),h=a.r(87924),i=f._(a.r(35112)),j=g._(a.r(72131)),k=a.r(92966),l=a.r(30089),m=a.r(12962),n=new Map,o=new Set,p=a=>{let{src:b,id:c,onLoad:d=()=>{},onReady:e=null,dangerouslySetInnerHTML:f,children:g="",strategy:h="afterInteractive",onError:j,stylesheets:k}=a,m=c||b;if(m&&o.has(m))return;if(n.has(b)){o.add(m),n.get(b).then(d,j);return}let p=()=>{e&&e(),o.add(m)},q=document.createElement("script"),r=new Promise((a,b)=>{q.addEventListener("load",function(b){a(),d&&d.call(this,b),p()}),q.addEventListener("error",function(a){b(a)})}).catch(function(a){j&&j(a)});f?(q.innerHTML=f.__html||"",p()):g?(q.textContent="string"==typeof g?g:Array.isArray(g)?g.join(""):"",p()):b&&(q.src=b,n.set(b,r)),(0,l.setAttributesFromProps)(q,a),"worker"===h&&q.setAttribute("type","text/partytown"),q.setAttribute("data-nscript",h),k&&(a=>{if(i.default.preinit)return a.forEach(a=>{i.default.preinit(a,{as:"style"})})})(k),document.body.appendChild(q)};function q(a){let{strategy:b="afterInteractive"}=a;"lazyOnload"===b?window.addEventListener("load",()=>{(0,m.requestIdleCallback)(()=>p(a))}):p(a)}function r(a){a.forEach(q),[...document.querySelectorAll('[data-nscript="beforeInteractive"]'),...document.querySelectorAll('[data-nscript="beforePageRender"]')].forEach(a=>{let b=a.id||a.getAttribute("src");o.add(b)})}function s(a){let{id:b,src:c="",onLoad:d=()=>{},onReady:e=null,strategy:f="afterInteractive",onError:g,stylesheets:l,...n}=a,{updateScripts:q,scripts:r,getIsSsr:s,appDir:t,nonce:u}=(0,j.useContext)(k.HeadManagerContext);u=n.nonce||u;let v=(0,j.useRef)(!1);(0,j.useEffect)(()=>{let a=b||c;v.current||(e&&a&&o.has(a)&&e(),v.current=!0)},[e,b,c]);let w=(0,j.useRef)(!1);if((0,j.useEffect)(()=>{if(!w.current){if("afterInteractive"===f)p(a);else"lazyOnload"===f&&("complete"===document.readyState?(0,m.requestIdleCallback)(()=>p(a)):window.addEventListener("load",()=>{(0,m.requestIdleCallback)(()=>p(a))}));w.current=!0}},[a,f]),("beforeInteractive"===f||"worker"===f)&&(q?(r[f]=(r[f]||[]).concat([{id:b,src:c,onLoad:d,onReady:e,onError:g,...n,nonce:u}]),q(r)):s&&s()?o.add(b||c):s&&!s()&&p({...a,nonce:u})),t){if(l&&l.forEach(a=>{i.default.preinit(a,{as:"style"})}),"beforeInteractive"===f)if(!c)return n.dangerouslySetInnerHTML&&(n.children=n.dangerouslySetInnerHTML.__html,delete n.dangerouslySetInnerHTML),(0,h.jsx)("script",{nonce:u,dangerouslySetInnerHTML:{__html:`(self.__next_s=self.__next_s||[]).push(${JSON.stringify([0,{...n,id:b}])})`}});else return i.default.preload(c,n.integrity?{as:"script",integrity:n.integrity,nonce:u,crossOrigin:n.crossOrigin}:{as:"script",nonce:u,crossOrigin:n.crossOrigin}),(0,h.jsx)("script",{nonce:u,dangerouslySetInnerHTML:{__html:`(self.__next_s=self.__next_s||[]).push(${JSON.stringify([c,{...n,id:b}])})`}});"afterInteractive"===f&&c&&i.default.preload(c,n.integrity?{as:"script",integrity:n.integrity,nonce:u,crossOrigin:n.crossOrigin}:{as:"script",nonce:u,crossOrigin:n.crossOrigin})}return null}Object.defineProperty(s,"__nextScript",{value:!0});let t=s;("function"==typeof c.default||"object"==typeof c.default&&null!==c.default)&&void 0===c.default.__esModule&&(Object.defineProperty(c.default,"__esModule",{value:!0}),Object.assign(c.default,c),b.exports=c.default)},47283,(a,b,c)=>{b.exports=a.r(96665)},60350,a=>{"use strict";var b=a.i(87924),c=a.i(47283),d=a.i(72131);function e({isOpen:a,onClose:c,projectId:e,projectName:f,teamId:g}){let[h,i]=(0,d.useState)(""),[j,k]=(0,d.useState)("viewer"),[l,m]=(0,d.useState)(!1),[n,o]=(0,d.useState)(""),[p,q]=(0,d.useState)(""),[r,s]=(0,d.useState)("viewer"),[t,u]=(0,d.useState)("email"),[v,w]=(0,d.useState)([]);(0,d.useEffect)(()=>{a&&y()},[a,g]);let x=async()=>{try{let a=window;if(a.flowAuth&&"function"==typeof a.flowAuth.getAuthHeaders)try{let b=a.flowAuth.getSession&&a.flowAuth.getSession();if(b&&b.access_token&&"demo"!==b.access_token&&b.user&&"demo-user"!==b.user.id){let c=a.flowAuth.getAuthHeaders();return!c["x-actor-id"]&&b.user&&b.user.id&&(c["x-actor-id"]=b.user.id),c}}catch(a){}if(a.supabaseClient&&a.supabaseClient.auth)try{let b=await a.supabaseClient.auth.getUser(),c=b?.data?.user;if(c&&c.id){let b={"x-actor-id":c.id};try{let c=(await a.supabaseClient.auth.getSession())?.data?.session;c?.access_token&&(b.authorization="Bearer "+c.access_token)}catch(a){}return b}}catch(a){}}catch(a){}return{"Content-Type":"application/json"}},y=async()=>{try{let a=await x(),b=await fetch(`/api/invites?team_id=${g}`,{headers:a});if(b.ok){let a=await b.json();w(a.invites||[])}}catch(a){console.error("Error loading invites:",a)}},z=async a=>{a.preventDefault(),m(!0),o("");try{let a=await x(),b=await fetch("/api/invites",{method:"POST",headers:{"Content-Type":"application/json",...a},body:JSON.stringify({team_id:g,project_id:e,email:h,role:j,is_link_invite:!1})}),c=await b.json();if(!b.ok)throw Error(c.error||"Failed to create invite");o(`✅ Invito inviato a ${h}`),i(""),y()}catch(a){o(`❌ ${a.message}`)}finally{m(!1)}},A=async()=>{m(!0),o("");try{let a=await x(),b=await fetch("/api/invites",{method:"POST",headers:{"Content-Type":"application/json",...a},body:JSON.stringify({team_id:g,project_id:e,role:r,is_link_invite:!0})}),c=await b.json();if(!b.ok)throw Error(c.error||"Failed to create invite link");q(c.invite_url),o("✅ Link generato!"),y()}catch(a){o(`❌ ${a.message}`)}finally{m(!1)}},B=async()=>{try{let a=p||"";if(!a)return void o("❌ Nessun link disponibile");if(/^\//.test(a)&&(a=window.location.origin.replace(/\/+$/,"")+a),!/^https?:\/\//i.test(a)&&/^[^/:]+:\d+\//.test(a)&&(a="http://"+a),navigator.clipboard&&navigator.clipboard.writeText)await navigator.clipboard.writeText(a);else{let b=document.createElement("textarea");b.value=a,b.setAttribute("readonly",""),b.style.position="fixed",b.style.left="-9999px",document.body.appendChild(b),b.select(),b.setSelectionRange(0,b.value.length);let c=document.execCommand("copy");if(document.body.removeChild(b),!c)throw Error("execCommand failed")}o("✅ Link copiato!"),setTimeout(()=>o(""),2e3)}catch(a){console.error("[ShareModal] copy failed",a),o("❌ Impossibile copiare — prova a tenere premuto il link e copiare manualmente")}},C=async a=>{try{let b=await x();(await fetch(`/api/invites?invite_id=${a}`,{method:"DELETE",headers:{...b}})).ok&&(o("✅ Invito revocato"),y())}catch(a){console.error("Error revoking invite:",a)}};return a?(0,b.jsx)("div",{style:{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.8)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1e3},onClick:c,children:(0,b.jsxs)("div",{style:{background:"#1a1a1a",borderRadius:"8px",padding:"2rem",maxWidth:"600px",width:"90%",maxHeight:"80vh",overflow:"auto",border:"1px solid #333"},onClick:a=>a.stopPropagation(),children:[(0,b.jsxs)("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.5rem"},children:[(0,b.jsxs)("h2",{style:{margin:0,color:"#fff"},children:["Condividi: ",f]}),(0,b.jsx)("button",{onClick:c,style:{background:"transparent",border:"none",color:"#999",fontSize:"1.5rem",cursor:"pointer",padding:"0.25rem"},children:"×"})]}),(0,b.jsxs)("div",{style:{display:"flex",gap:"0.5rem",marginBottom:"1.5rem",borderBottom:"1px solid #333"},children:[(0,b.jsx)("button",{onClick:()=>u("email"),style:{padding:"0.75rem 1.5rem",background:"transparent",border:"none",borderBottom:"email"===t?"2px solid #0066ff":"2px solid transparent",color:"email"===t?"#0066ff":"#999",cursor:"pointer",fontWeight:"email"===t?"600":"400"},children:"📧 Via Email"}),(0,b.jsx)("button",{onClick:()=>u("link"),style:{padding:"0.75rem 1.5rem",background:"transparent",border:"none",borderBottom:"link"===t?"2px solid #0066ff":"2px solid transparent",color:"link"===t?"#0066ff":"#999",cursor:"pointer",fontWeight:"link"===t?"600":"400"},children:"🔗 Link Condivisibile"})]}),"email"===t?(0,b.jsxs)("form",{onSubmit:z,children:[(0,b.jsxs)("div",{style:{marginBottom:"1rem"},children:[(0,b.jsx)("label",{style:{display:"block",marginBottom:"0.5rem",color:"#ccc"},children:"Email dell'utente da invitare"}),(0,b.jsx)("input",{type:"email",value:h,onChange:a=>i(a.target.value),required:!0,placeholder:"user@example.com",style:{width:"100%",padding:"0.75rem",borderRadius:"4px",border:"1px solid #333",background:"#0a0a0a",color:"#fff",fontSize:"1rem"}})]}),(0,b.jsxs)("div",{style:{marginBottom:"1.5rem"},children:[(0,b.jsx)("label",{style:{display:"block",marginBottom:"0.5rem",color:"#ccc"},children:"Ruolo"}),(0,b.jsxs)("select",{value:j,onChange:a=>k(a.target.value),style:{width:"100%",padding:"0.75rem",borderRadius:"4px",border:"1px solid #333",background:"#0a0a0a",color:"#fff",fontSize:"1rem"},children:[(0,b.jsx)("option",{value:"viewer",children:"👁️ Visualizzatore (solo lettura)"}),(0,b.jsx)("option",{value:"commenter",children:"💬 Commentatore (può commentare)"}),(0,b.jsx)("option",{value:"editor",children:"✏️ Editor (può modificare)"}),(0,b.jsx)("option",{value:"owner",children:"👑 Proprietario (controllo totale)"})]})]}),(0,b.jsx)("button",{type:"submit",disabled:l,style:{width:"100%",padding:"0.75rem",background:l?"#333":"#0066ff",color:"#fff",border:"none",borderRadius:"4px",fontSize:"1rem",cursor:l?"not-allowed":"pointer",opacity:l?.6:1},children:l?"Invio...":"Invia invito"})]}):(0,b.jsxs)("div",{children:[(0,b.jsxs)("div",{style:{marginBottom:"1rem"},children:[(0,b.jsx)("label",{style:{display:"block",marginBottom:"0.5rem",color:"#ccc"},children:"Ruolo per il link"}),(0,b.jsxs)("select",{value:r,onChange:a=>s(a.target.value),style:{width:"100%",padding:"0.75rem",borderRadius:"4px",border:"1px solid #333",background:"#0a0a0a",color:"#fff",fontSize:"1rem"},children:[(0,b.jsx)("option",{value:"viewer",children:"👁️ Visualizzatore (solo lettura)"}),(0,b.jsx)("option",{value:"commenter",children:"💬 Commentatore (può commentare)"}),(0,b.jsx)("option",{value:"editor",children:"✏️ Editor (può modificare)"})]})]}),(0,b.jsx)("button",{onClick:A,disabled:l,style:{width:"100%",padding:"0.75rem",background:l?"#333":"#0066ff",color:"#fff",border:"none",borderRadius:"4px",fontSize:"1rem",cursor:l?"not-allowed":"pointer",opacity:l?.6:1,marginBottom:"1rem"},children:l?"Generazione...":"Genera link di invito"}),p&&(0,b.jsxs)("div",{style:{padding:"1rem",background:"#0a0a0a",borderRadius:"4px",border:"1px solid #333"},children:[(0,b.jsx)("div",{style:{marginBottom:"0.5rem",color:"#999",fontSize:"0.85rem"},children:"Link generato:"}),(0,b.jsxs)("div",{style:{display:"flex",gap:"0.5rem",alignItems:"center"},children:[(0,b.jsx)("input",{type:"text",value:p,readOnly:!0,style:{flex:1,padding:"0.5rem",background:"#1a1a1a",border:"1px solid #333",borderRadius:"4px",color:"#0066ff",fontSize:"0.9rem"}}),(0,b.jsx)("button",{onClick:B,style:{padding:"0.5rem 1rem",background:"#333",color:"#fff",border:"none",borderRadius:"4px",cursor:"pointer",whiteSpace:"nowrap"},children:"📋 Copia"})]})]})]}),n&&(0,b.jsx)("div",{style:{marginTop:"1rem",padding:"0.75rem",background:n.includes("❌")?"#4d1a1a":"#1a4d1a",borderRadius:"4px",color:"#fff",fontSize:"0.9rem"},children:n}),v.length>0&&(0,b.jsxs)("div",{style:{marginTop:"2rem",paddingTop:"1.5rem",borderTop:"1px solid #333"},children:[(0,b.jsxs)("h3",{style:{marginBottom:"1rem",color:"#ccc",fontSize:"0.9rem"},children:["Inviti attivi (",v.length,")"]}),(0,b.jsx)("div",{style:{display:"flex",flexDirection:"column",gap:"0.5rem"},children:v.map(a=>(0,b.jsxs)("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0.75rem",background:"#0a0a0a",borderRadius:"4px",border:"1px solid #333"},children:[(0,b.jsxs)("div",{style:{flex:1},children:[(0,b.jsx)("div",{style:{color:"#fff",marginBottom:"0.25rem"},children:a.email||"🔗 Link pubblico"}),(0,b.jsxs)("div",{style:{color:"#666",fontSize:"0.8rem"},children:[a.role," · Scade il ",new Date(a.expires_at).toLocaleDateString()]})]}),(0,b.jsx)("button",{onClick:()=>C(a.id),style:{padding:"0.5rem 1rem",background:"#4d1a1a",color:"#ff6b6b",border:"none",borderRadius:"4px",cursor:"pointer",fontSize:"0.85rem"},children:"Revoca"})]},a.id))})]})]})}):null}function f(){let[f,g]=(0,d.useState)(!1),[h,i]=(0,d.useState)(null);(0,d.useEffect)(()=>{console.log("Home page mounted - initializing Supabase client"),window.__isSigningOut=!1,(async()=>{let{getSupabaseClient:b}=await a.A(61780),c=b();window.supabaseClient=c,console.log("[HomePage] Supabase client ready:",!!c)})();let b=a=>{let{projectId:b,projectName:c,teamId:d}=a.detail;i({projectId:b,projectName:c,teamId:d}),g(!0)};return window.addEventListener("open-share-modal",b),()=>{window.removeEventListener("open-share-modal",b)}},[]);let j=`<div class="app">
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
  `;return(0,b.jsxs)(b.Fragment,{children:[(0,b.jsx)(c.default,{id:"initialize-stub",strategy:"beforeInteractive",dangerouslySetInnerHTML:{__html:`
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
          `}}),(0,b.jsx)("div",{dangerouslySetInnerHTML:{__html:j}}),h&&(0,b.jsx)(e,{isOpen:f,onClose:()=>g(!1),projectId:h.projectId,projectName:h.projectName,teamId:h.teamId}),(0,b.jsx)(c.default,{src:"https://unpkg.com/@supabase/supabase-js@2",strategy:"beforeInteractive"}),(0,b.jsx)(c.default,{src:"https://unpkg.com/wavesurfer.js@6",strategy:"beforeInteractive"}),(0,b.jsx)(c.default,{src:"/flow-auth.js",strategy:"afterInteractive"}),(0,b.jsx)(c.default,{src:"/share-handler.js",strategy:"afterInteractive"}),(0,b.jsx)(c.default,{src:"/flow.js",strategy:"afterInteractive",onLoad:()=>{console.log("[PageInit] Scripts loaded");let a=setInterval(async()=>{if(window.supabaseClient)if(clearInterval(a),console.log("[PageInit] Supabase ready, initializing auth..."),window.flowAuth&&"function"==typeof window.flowAuth.initAuth)if(await window.flowAuth.initAuth()){console.log("[PageInit] ✅ Auth successful, app loaded");try{let a=localStorage.getItem("pending_share");if(a){localStorage.removeItem("pending_share");try{let b=JSON.parse(a);if(b&&b.share_id){let a=b.token?`?token=${encodeURIComponent(b.token)}`:"";window.location.href=`/share/${b.share_id}${a}`;return}}catch(b){window.location.href=`/share/${a}`;return}}let b=localStorage.getItem("pending_invite");if(b){localStorage.removeItem("pending_invite"),window.location.href=`/invite/${b}`;return}}catch(a){console.warn("[PageInit] Error checking pending share/invite",a)}(async()=>{if("function"==typeof window.initializeFromSupabase){console.log("[PageInit] Calling initializeFromSupabase..."),window.initializeFromSupabase();return}if("function"==typeof window.safeFetchProjectsFallback){console.log("[PageInit] initializeFromSupabase not found - calling safeFetchProjectsFallback");try{await window.safeFetchProjectsFallback();return}catch(a){console.warn("[PageInit] safeFetchProjectsFallback failed",a)}}for(let a=0;a<6;a++)if(await new Promise(a=>setTimeout(a,250)),"function"==typeof window.initializeFromSupabase){console.log("[PageInit] initializeFromSupabase became available - calling it"),window.initializeFromSupabase();return}console.warn("[PageInit] initializeFromSupabase NOT FOUND after retries")})().catch(a=>console.error("[PageInit] init/fallback error",a))}else console.log("[PageInit] Auth failed - will redirect to login");else console.error("[PageInit] flowAuth.initAuth not found")},50);setTimeout(()=>{clearInterval(a),window.supabaseClient||console.error("[PageInit] Supabase client not ready after 5s")},5e3)}}),(0,b.jsx)(c.default,{src:"/flow-init.js",strategy:"afterInteractive"})]})}a.s(["default",()=>f],60350)}];

//# sourceMappingURL=_4af45bf5._.js.map
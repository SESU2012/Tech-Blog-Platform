// --- tiny markdown -> HTML (safe-ish, minimal subset) ---
    function mdToHtml(md){
      if(!md) return '';
      // escape HTML
      md = md.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      // code blocks ```
      md = md.replace(/```([\s\S]*?)```/g, function(m, code){ return '<pre><code>'+code.replace(/&amp;/g,'&amp;')+'</code></pre>'});
      // headings
      md = md.replace(/^### (.*$)/gim, '<h3>$1</h3>');
      md = md.replace(/^## (.*$)/gim, '<h2>$1</h2>');
      md = md.replace(/^# (.*$)/gim, '<h1>$1</h1>');
      // bold and italics
      md = md.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
      md = md.replace(/\*(.*?)\*/gim, '<em>$1</em>');
      // inline code
      md = md.replace(/`([^`]+)`/gim, '<code>$1</code>');
      // links [text](url)
      md = md.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank">$1</a>');
      // lists
      md = md.replace(/^\s*[-\*] (.*)/gim, '<li>$1</li>');
      md = md.replace(/(<li>[\s\S]*?<\/li>)(?:\n(?=<li>))/gim, '$1');
      // wrap consecutive li into ul
      md = md.replace(/(?:<li>[\s\S]*?<\/li>\s*)+/g, function(m){ return '<ul>'+m+'</ul>'});
      // paragraphs
      md = md.replace(/\n\n+/g, '\n\n');
      let lines = md.split('\n');
      for(let i=0;i<lines.length;i++){
        if(!lines[i].match(/^<h|^<ul|^<pre|^<|^<li|^<\/|^<h/)){
          if(lines[i].trim()!=='') lines[i] = '<p>'+lines[i]+'</p>';
        }
      }
      return lines.join('\n');
    }

    // --- storage helpers ---
    const LS_USERS_KEY = 'techblog_users_v1';
    const LS_POSTS_KEY = 'techblog_posts_v1';

    function loadUsers(){
      try{ return JSON.parse(localStorage.getItem(LS_USERS_KEY) || '[]') }catch(e){return[]}
    }
    function saveUsers(users){ localStorage.setItem(LS_USERS_KEY, JSON.stringify(users)); }
    function loadPosts(){ try{ return JSON.parse(localStorage.getItem(LS_POSTS_KEY) || '[]') }catch(e){return[]} }
    function savePosts(posts){ localStorage.setItem(LS_POSTS_KEY, JSON.stringify(posts)); }

    // --- app state ---
    let users = loadUsers();
    let posts = loadPosts();
    let activeUser = users[0] || null;

    // --- UI wiring ---
    const userSel = document.getElementById('user-sel');
    const usersDiv = document.getElementById('users');
    const activeUserDiv = document.getElementById('active-user');
    const newUserBtn = document.getElementById('new-user-btn');
    const newPostBtn = document.getElementById('new-post');
    const editorArea = document.getElementById('editor-area');
    const postsDiv = document.getElementById('posts');
    const searchInput = document.getElementById('search');
    const allTagsDiv = document.getElementById('all-tags');

    function renderUserOptions(){
      userSel.innerHTML = '';
      users.forEach(u=>{
        const opt = document.createElement('option'); opt.value = u.id; opt.text = u.name; userSel.appendChild(opt);
      });
      if(activeUser) userSel.value = activeUser.id;
    }

    function renderUsersList(){
      usersDiv.innerHTML = '';
      users.forEach(u=>{
        const el = document.createElement('div'); el.className='row'; el.style.alignItems='center';
        const a = document.createElement('div'); a.className='avatar'; a.textContent = u.name.split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase();
        const name = document.createElement('div'); name.style.marginLeft='8px'; name.innerHTML = '<div style="font-weight:600">'+u.name+'</div><div class="muted">'+(u.bio||'')+'</div>';
        el.appendChild(a); el.appendChild(name);
        el.style.cursor='pointer'; el.onclick = ()=>{ setActiveUser(u.id); }
        usersDiv.appendChild(el);
      })
    }

    function setActiveUser(id){ activeUser = users.find(u=>u.id===id); renderActiveUser(); renderUserOptions(); }
    function renderActiveUser(){ activeUserDiv.innerHTML = '';
      if(!activeUser){ activeUserDiv.innerHTML = '<div class="muted">No user — create one</div>'; return; }
      const a = document.createElement('div'); a.className='avatar'; a.textContent = activeUser.name.split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase();
      const nm = document.createElement('div'); nm.style.marginLeft='10px'; nm.innerHTML = '<div style="font-weight:700">'+activeUser.name+'</div><div class="muted">'+(activeUser.email||'')+'</div>';
      activeUserDiv.appendChild(a); activeUserDiv.appendChild(nm);
    }

    function renderTags(){
      const tagSet = new Set(); posts.forEach(p=> (p.tags||[]).forEach(t=>tagSet.add(t)) );
      allTagsDiv.innerHTML = '';
      Array.from(tagSet).slice(0,30).forEach(t=>{ const el = document.createElement('div'); el.className='tag'; el.textContent = t; el.onclick=()=>{searchInput.value=t; renderPosts();}; allTagsDiv.appendChild(el)});
    }

    function renderPosts(filter){
      postsDiv.innerHTML='';
      const q = (searchInput.value||'').toLowerCase();
      let list = posts.slice().sort((a,b)=>new Date(b.updated||b.created)-new Date(a.updated||a.created));
      if(q){ list = list.filter(p=> (p.title||'').toLowerCase().includes(q) || (p.excerpt||'').toLowerCase().includes(q) || (p.content||'').toLowerCase().includes(q) || (p.author||'').toLowerCase().includes(q) || (p.tags||[]).join(' ').toLowerCase().includes(q) ); }
      if(list.length===0){ postsDiv.innerHTML='<div class="muted">No posts yet. Create one!</div>'; return }
      list.forEach(p=>{
        const el = document.createElement('div'); el.className='post';
        el.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:flex-start"><div><h3>${p.title||'(untitled)'}</h3><div class="muted">by ${p.author} • ${new Date(p.created).toLocaleString()}</div></div><div style="text-align:right"><div class="muted">${p.status||'draft'}</div><div style="margin-top:8px" class="muted">❤ ${p.likes||0}</div></div></div><p class="muted" style="margin-top:8px">${p.excerpt||''}</p>`;
        const tagsDiv = document.createElement('div'); tagsDiv.className='tags'; (p.tags||[]).slice(0,6).forEach(t=>{ const tEl=document.createElement('span'); tEl.className='tag'; tEl.textContent=t; tEl.onclick=()=>{searchInput.value=t; renderPosts();}; tagsDiv.appendChild(tEl) });
        el.appendChild(tagsDiv);
        const actions = document.createElement('div'); actions.className='post-actions';
        const view = document.createElement('button'); view.className='ghost'; view.textContent='View'; view.onclick = ()=>{ openPostEditor(p.id, true) };
        const edit = document.createElement('button'); edit.className='ghost'; edit.textContent='Edit'; edit.onclick = ()=>{ openPostEditor(p.id) };
        const like = document.createElement('button'); like.className='like'; like.textContent='❤ '+(p.likes||0); like.onclick=()=>{ p.likes=(p.likes||0)+1; savePosts(posts); renderPosts(); }
        const del = document.createElement('button'); del.className='ghost'; del.textContent='Delete'; del.onclick=()=>{ if(confirm('Delete this post?')){ posts = posts.filter(pp=>pp.id!==p.id); savePosts(posts); renderPosts(); renderTags(); } }
        actions.appendChild(view); actions.appendChild(edit); actions.appendChild(like); actions.appendChild(del);
        el.appendChild(actions);
        postsDiv.appendChild(el);
      })
    }

    function createUser(name,email,bio){ const id='u_'+Date.now()+'_'+Math.random().toString(36).slice(2,8); const u={id,name,email,bio,created: new Date().toISOString()}; users.push(u); saveUsers(users); renderUserOptions(); renderUsersList(); setActiveUser(u.id); }

    // --- editor creation ---
    function openNewEditor(){
      if(!activeUser){ alert('Please create and select a user first.'); return; }
      editorArea.innerHTML='';
      const tpl = document.getElementById('editor-template'); const node = tpl.content.cloneNode(true);
      editorArea.appendChild(node);
      wireEditor(null);
    }

    function openPostEditor(postId, readonly=false){
      const p = posts.find(pp=>pp.id===postId);
      if(!p){ alert('Post not found'); return; }
      editorArea.innerHTML='';
      const tpl = document.getElementById('editor-template'); const node = tpl.content.cloneNode(true);
      editorArea.appendChild(node);
      wireEditor(p, readonly);
    }

    function wireEditor(post, readonly=false){
      const title = document.getElementById('title'); const excerpt = document.getElementById('excerpt'); const content = document.getElementById('content'); const preview = document.getElementById('preview'); const tags = document.getElementById('post-tags'); const status = document.getElementById('status'); const imgUpload = document.getElementById('img-upload'); const saveDraft = document.getElementById('save-draft'); const publish = document.getElementById('publish');
      if(post){ title.value=post.title||''; excerpt.value=post.excerpt||''; content.value=post.content||''; tags.value=(post.tags||[]).join(', '); status.textContent = post.status||'draft'; }
      if(readonly){ title.disabled=excerpt.disabled=content.disabled=tags.disabled=imgUpload.disabled=true; saveDraft.style.display='none'; publish.style.display='none'; }

      function updatePreview(){ preview.innerHTML = mdToHtml(content.value); }
      content.addEventListener('input', updatePreview); updatePreview();

      imgUpload.addEventListener('change', async (e)=>{
        const f = e.target.files[0]; if(!f) return; const data = await fileToDataUrl(f); // insert image markdown
        content.value += '\n\n!['+f.name+']('+data+')\n\n'; updatePreview();
      })

      saveDraft.onclick = ()=>{
        if(!post){ const newPost = makePost(title.value, excerpt.value, content.value, tags.value, 'draft'); posts.push(newPost); savePosts(posts); openPostEditor(newPost.id); renderPosts(); renderTags(); } else { post.title=title.value; post.excerpt=excerpt.value; post.content=content.value; post.tags = cleanTags(tags.value); post.updated = new Date().toISOString(); post.status = 'draft'; savePosts(posts); renderPosts(); renderTags(); openPostEditor(post.id); }
      }
      publish.onclick = ()=>{
        if(!post){ const newPost = makePost(title.value, excerpt.value, content.value, tags.value, 'published'); posts.push(newPost); savePosts(posts); openPostEditor(newPost.id,true); renderPosts(); renderTags(); } else { post.title=title.value; post.excerpt=excerpt.value; post.content=content.value; post.tags = cleanTags(tags.value); post.updated = new Date().toISOString(); post.status = 'published'; savePosts(posts); renderPosts(); renderTags(); openPostEditor(post.id,true); }
      }
    }

    function cleanTags(s){ if(!s) return []; return s.split(',').map(t=>t.trim()).filter(Boolean).slice(0,10); }
    function makePost(title,excerpt,content,tags,status){ return { id:'p_'+Date.now()+'_'+Math.random().toString(36).slice(2,6), title:title||'Untitled', excerpt:excerpt||'', content:content||'', tags:cleanTags(tags), author:activeUser.name, authorId:activeUser.id, created:new Date().toISOString(), updated:null, status:status||'draft', likes:0 } }

    function fileToDataUrl(file){ return new Promise((res,rej)=>{ const r = new FileReader(); r.onload = ()=>res(r.result); r.onerror=rej; r.readAsDataURL(file); }) }

    // --- initial seed ---
    function seedIfEmpty(){
      if(users.length===0){ createUser('Ada Lovelace','ada@example.com','Tech writer'); createUser('Linus Torvalds','linus@example.com','Kernel tinkerer'); }
      if(posts.length===0){ posts.push({id:'p_demo_1',title:'Welcome to TechBlog',excerpt:'A demo post to show how the platform works',content:'# Hello\nThis is a **demo** post. Write markdown on the left and it will appear here.',tags:['demo','welcome'],author:users[0].name,authorId:users[0].id,created:new Date().toISOString(),status:'published',likes:7}); savePosts(posts); }
    }

    // --- events ---
    newUserBtn.onclick = ()=>{
      const name = prompt('User full name'); if(!name) return; const email = prompt('Email (optional)'); const bio = prompt('Short bio (optional)'); createUser(name,email,bio);
    }
    userSel.onchange = ()=>{ setActiveUser(userSel.value); }
    newPostBtn.onclick = openNewEditor;
    searchInput.addEventListener('input', ()=>renderPosts());

    // --- boot ---
    seedIfEmpty(); renderUserOptions(); renderUsersList(); renderTags(); renderPosts(); setActiveUser(users[0].id);

    // expose for console (debug convenience)
    window.__techblog = { users, posts, save: ()=>{ saveUsers(users); savePosts(posts); } }
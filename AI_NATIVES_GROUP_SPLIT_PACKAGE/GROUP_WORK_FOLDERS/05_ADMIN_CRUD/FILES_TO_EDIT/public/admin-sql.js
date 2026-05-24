(function(){
  function esc(s){return String(s||'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));}
  function msg(data, fallback){ return data?.message || data?.error || fallback || 'Request failed'; }
  async function api(url, options={}){
    const res = await fetch(url, { credentials:'include', headers:{'Content-Type':'application/json', ...(options.headers||{})}, ...options });
    let data={}; try{ data=await res.json(); }catch{}
    if(!res.ok) throw new Error(msg(data,res.statusText));
    return data;
  }
  async function getUsers(){ return await api('/api/admin/users'); }

  window.renderRTUsers = async function(){
    const el = document.getElementById('rt-users-list'); if(!el) return;
    try{
      const users = await getUsers();
      if(!users.length){ el.innerHTML = '<div style="padding:16px;text-align:center;color:var(--muted)">No users yet.</div>'; return; }
      el.innerHTML = users.map(u=>`<div class="param-row" data-id="${u.id}">
        <div class="param-icon" style="background:#16a34a1a"><span style="color:#16a34a">👤</span></div>
        <div class="flex-1">
          <input class="ctrl-input" data-edit="full_name" value="${esc(u.full_name)}" style="width:100%;border:none;background:transparent;font-size:14px;font-weight:600;padding:2px 4px"/>
          <input class="ctrl-input" data-edit="email" value="${esc(u.email)}" style="width:100%;border:none;background:transparent;font-size:12px;color:var(--muted);padding:2px 4px"/>
          <input class="ctrl-input" data-edit="phone" value="${esc(u.phone||'')}" placeholder="Phone" style="width:100%;border:none;background:transparent;font-size:12px;color:var(--muted);padding:2px 4px"/>
          <select data-edit="role" class="ctrl-select" style="font-size:11px;padding:3px 6px;margin-top:4px">
            <option value="user" ${u.role==='user'?'selected':''}>user</option>
            <option value="employer" ${u.role==='employer'?'selected':''}>employer</option>
            <option value="admin" ${u.role==='admin'?'selected':''}>admin</option>
          </select>
        </div>
        <div style="text-align:right;display:flex;flex-direction:column;align-items:flex-end;gap:4px">
          <select data-edit="status" class="ctrl-select" style="font-size:11px;padding:3px 6px">
            <option ${u.status==='Active'?'selected':''}>Active</option>
            <option ${u.status==='Idle'?'selected':''}>Idle</option>
            <option ${u.status==='Offline'?'selected':''}>Offline</option>
            <option ${u.status==='Suspended'?'selected':''}>Suspended</option>
            <option ${u.status==='Disabled'?'selected':''}>Disabled</option>
          </select>
          <button class="btn" style="padding:3px 8px;font-size:11px" onclick="saveUserRow('${u.id}')">Update</button>
          <button class="btn" style="padding:3px 8px;font-size:11px" onclick="toggleSuspendUser('${u.id}','${u.status==='Suspended'?'Active':'Suspended'}')">${u.status==='Suspended'?'Activate':'Suspend'}</button>
          <button class="btn" style="padding:3px 8px;font-size:11px;color:#b91c1c" onclick="deleteUserRow('${u.id}')">Delete</button>
        </div>
      </div>`).join('');
      el.querySelectorAll('[data-id]').forEach(row=>{
        row.querySelectorAll('[data-edit]').forEach(inp=>{
          inp.addEventListener('change', async()=>{ await window.saveUserRow(row.dataset.id); });
        });
      });
    }catch(err){ el.innerHTML = '<div style="padding:16px;color:#b91c1c">Supabase users unavailable: '+esc(err.message)+'</div>'; }
  };

  window.saveUserRow = async function(id){
    const row = document.querySelector(`[data-id="${CSS.escape(String(id))}"]`); if(!row) return;
    const body = {
      fullName: row.querySelector('[data-edit="full_name"]')?.value || '',
      email: row.querySelector('[data-edit="email"]')?.value || '',
      phone: row.querySelector('[data-edit="phone"]')?.value || '',
      role: row.querySelector('[data-edit="role"]')?.value || 'user',
      status: row.querySelector('[data-edit="status"]')?.value || 'Active'
    };
    try{ await api('/api/admin/users/'+id,{ method:'PUT', body:JSON.stringify(body) }); }
    catch(err){ alert('Update failed: '+err.message); }
  };

  window.toggleSuspendUser = async function(id, status){
    try{ await api('/api/admin/users/'+id+'/status',{ method:'PATCH', body:JSON.stringify({ status }) }); await window.renderRTUsers(); }
    catch(err){ alert('Status change failed: '+err.message); }
  };

  window.addUserRow = async function(){
    const name = prompt('User name:'); if(!name) return;
    const email = prompt('Email:','user@example.com'); if(!email) return;
    const role = prompt('Role: user, employer, or admin','user') || 'user';
    const password = prompt('Temporary password:','Password123'); if(!password) return;
    try{ const created = await api('/api/admin/users',{ method:'POST', body:JSON.stringify({ fullName:name, email, role, password, status:'Active' }) }); await window.renderRTUsers(); alert(created.message || 'User added.'); }
    catch(err){ alert('Add user failed: '+err.message); }
  };

  window.deleteUserRow = async function(id){
    if(!confirm('Delete this user from Supabase?')) return;
    try{ await api('/api/admin/users/'+id,{ method:'DELETE' }); await window.renderRTUsers(); }
    catch(err){ alert('Delete failed: '+err.message); }
  };

  document.addEventListener('DOMContentLoaded', ()=> setTimeout(()=>window.renderRTUsers(), 300));
})();

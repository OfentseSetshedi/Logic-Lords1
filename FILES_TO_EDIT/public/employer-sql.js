(function(){
  let editingJobId = null;
  function esc(s){ return String(s||'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }
  function apiMessage(data, fallback){ return data?.message || data?.error || fallback || 'Request failed'; }
  async function api(url, options={}){
    const res = await fetch(url, { credentials:'include', headers:{'Content-Type':'application/json', ...(options.headers||{})}, ...options });
    let data={}; try{ data=await res.json(); }catch{}
    if(!res.ok) throw new Error(apiMessage(data, res.statusText));
    return data;
  }
  function mapDbJob(j){
    return {
      id:String(j.id), dbId:j.id, title:j.title, company:j.company_name, location:j.location, type:j.job_type,
      mode:j.work_mode || '', department:j.department || '', salary:j.salary || '', experience:j.experience_level || '',
      closingDate:j.closing_date || '', email:j.contact_email || '', description:j.description || '', requirements:j.requirements || '',
      benefits:j.benefits || '', status:j.status || 'Active', postedAt:j.created_at || new Date().toISOString()
    };
  }
  function bodyFromJobForm(data){
    return {
      title:data.title, companyName:data.company, location:data.location || 'South Africa', jobType:data.type || 'Full-time',
      workMode:data.mode || '', department:data.department || '', salary:data.salary || '', experienceLevel:data.experience || '',
      closingDate:data.closingDate || null, contactEmail:data.email || '', description:data.description || data.benefits || 'No description supplied.',
      requirements:data.requirements || 'Requirements not supplied.', benefits:data.benefits || '', status:data.status || 'Active'
    };
  }
  async function refreshJobs(){
    try{
      const rows = await api('/api/jobs');
      window.postedJobs = rows.map(mapDbJob);
      try{ localStorage.setItem('ems.jobs', JSON.stringify(window.postedJobs)); }catch{}
      if(typeof renderJobList === 'function') renderJobList();
    }catch(err){ console.warn('Could not load Supabase jobs:', err.message); }
  }

  window.renderJobList = function(){
    const el = document.getElementById('job-list-container'); if(!el) return;
    const jobs = window.postedJobs || [];
    if (jobs.length === 0) { el.innerHTML = '<p class="text-center text-muted py-8">No jobs posted yet.</p>'; return; }
    el.innerHTML = '<div class="job-list">' + jobs.map(j => {
      const tags = [j.type, j.mode, j.experience, j.location, j.department, j.status].filter(Boolean);
      return `<div class="job-card" data-id="${esc(j.id)}">
        <button class="job-card-head" type="button" data-act="toggle">
          <div style="flex:1;text-align:left"><div class="job-list-title">${esc(j.title)}</div><div class="job-list-sub">${esc(j.company)} • ${esc(j.location||'—')}</div></div>
          <span class="job-list-time">${new Date(j.postedAt).toLocaleString('en-ZA')}</span><span class="job-card-caret">▾</span>
        </button>
        <div class="job-card-body" hidden>
          <div class="preview-tags">${tags.map(t=>`<span class="preview-tag">${esc(t)}</span>`).join('')}</div>
          ${j.salary ? `<h4>Salary</h4><p>${esc(j.salary)}</p>` : ''}
          ${j.description ? `<h4>About the role</h4><p>${esc(j.description)}</p>` : ''}
          ${j.requirements ? `<h4>Requirements</h4><p>${esc(j.requirements)}</p>` : ''}
          ${j.benefits ? `<h4>Benefits & accessibility</h4><p>${esc(j.benefits)}</p>` : ''}
          ${j.closingDate ? `<h4>Closing date</h4><p>${esc(j.closingDate)}</p>` : ''}
          ${j.email ? `<h4>Apply via</h4><p>${esc(j.email)}</p>` : ''}
          <div class="flex gap-2" style="justify-content:flex-end;margin-top:12px;flex-wrap:wrap">
            <button class="btn btn-outline btn-sm" data-act="edit">✏️ Edit</button>
            <button class="btn btn-outline btn-sm" data-act="status">${j.status==='Suspended'?'Activate':'Suspend'}</button>
            <button class="btn btn-outline btn-sm" data-act="delete" style="color:#b91c1c">🗑 Delete</button>
          </div>
        </div>
      </div>`;
    }).join('') + '</div>';
    el.querySelectorAll('.job-card').forEach(card => {
      const id = card.dataset.id;
      card.querySelector('[data-act="toggle"]').addEventListener('click', () => { const body = card.querySelector('.job-card-body'); body.hidden = !body.hidden; card.classList.toggle('open', !body.hidden); });
      card.querySelector('[data-act="edit"]').addEventListener('click', () => { const j = (window.postedJobs||[]).find(x => x.id === id); if(!j) return; if(typeof loadIntoForm === 'function') loadIntoForm(j); editingJobId = id; document.getElementById('post-job-form')?.scrollIntoView({behavior:'smooth', block:'start'}); if(typeof showToast === 'function') showToast('Editing job — submit to update Supabase'); });
      card.querySelector('[data-act="status"]').addEventListener('click', async () => { const j = (window.postedJobs||[]).find(x => x.id === id); if(!j) return; const status = j.status === 'Suspended' ? 'Active' : 'Suspended'; try{ await api('/api/jobs/'+id+'/status',{ method:'PATCH', body:JSON.stringify({ status }) }); await refreshJobs(); if(typeof showToast === 'function') showToast('Job status updated'); }catch(err){ alert('Status update failed: '+err.message); } });
      card.querySelector('[data-act="delete"]').addEventListener('click', async () => { if(!confirm('Delete this job posting from Supabase?')) return; try{ await api('/api/jobs/'+id,{ method:'DELETE' }); await refreshJobs(); if(typeof showToast === 'function') showToast('Job deleted from Supabase'); }catch(err){ alert('Delete failed: '+err.message); } });
    });
  };

  async function refreshApplicants(){
    try{
      const rows = await api('/api/applications/employer');
      window.applicants = rows.map(a => ({ id:String(a.id), name:a.applicant_name || 'Applicant', email:a.applicant_email || '', jobTitle:a.title || 'Job', appliedAt:a.created_at, status:a.status || 'Pending', comment:a.comment || '', cvDownloadUrl:a.cvDownloadUrl || '', documentDownloadUrl:a.documentDownloadUrl || '' }));
      try{ localStorage.setItem('ems.applicants', JSON.stringify(window.applicants)); }catch{}
      if(typeof renderApplicantsTable === 'function') renderApplicantsTable();
    }catch(err){ console.warn('Could not load Supabase applicants:', err.message); }
  }

  window.renderApplicantsTable = function(){
    const el = document.getElementById('applicants-table-container'); if(!el) return;
    const list = window.applicants || [];
    const meta = document.getElementById('appf-meta'); if(meta) meta.textContent = `Showing ${list.length} of ${list.length} applicants`;
    if(!list.length){ el.innerHTML = '<p class="text-center text-muted py-8">No applicants yet.</p>'; return; }
    el.innerHTML = `<table><thead><tr><th>Applicant</th><th>Job</th><th>Applied</th><th>Status</th><th>Files</th><th class="td-comment">Comment</th><th></th></tr></thead><tbody>${list.map(a=>`<tr data-id="${esc(a.id)}"><td><div class="td-name-main">${esc(a.name)}</div><div class="td-name-sub">${esc(a.email)}</div></td><td>${esc(a.jobTitle)}</td><td class="text-muted">${new Date(a.appliedAt).toLocaleDateString('en-ZA')}</td><td><select class="status-select" data-action="status"><option ${a.status==='Pending'?'selected':''}>Pending</option><option ${a.status==='Reviewed'?'selected':''}>Reviewed</option><option ${a.status==='Shortlisted'?'selected':''}>Shortlisted</option><option ${a.status==='Interview'?'selected':''}>Interview</option><option ${a.status==='Accepted'?'selected':''}>Accepted</option><option ${a.status==='Rejected'?'selected':''}>Rejected</option></select></td><td>${a.cvDownloadUrl ? `<a href="${esc(a.cvDownloadUrl)}" target="_blank">CV</a>` : '—'} ${a.documentDownloadUrl ? `<a href="${esc(a.documentDownloadUrl)}" target="_blank">Document</a>` : ''}</td><td class="td-comment"><textarea rows="2" class="textarea" style="font-size:12px" data-action="comment" placeholder="Add a comment...">${esc(a.comment)}</textarea></td><td><button class="btn btn-outline btn-sm" data-action="remove">Delete</button></td></tr>`).join('')}</tbody></table>`;
    el.querySelectorAll('tr[data-id]').forEach(row => {
      const id = row.dataset.id;
      row.querySelector('[data-action="status"]').addEventListener('change', async function(){ try{ await api('/api/applications/'+id+'/status',{ method:'PUT', body:JSON.stringify({ status:this.value }) }); await refreshApplicants(); if(typeof showToast === 'function') showToast('Application status updated'); }catch(err){ alert('Status update failed: '+err.message); } });
      row.querySelector('[data-action="comment"]').addEventListener('change', async function(){ try{ await api('/api/applications/'+id,{ method:'PUT', body:JSON.stringify({ comment:this.value }) }); if(typeof showToast === 'function') showToast('Comment saved'); }catch(err){ alert('Comment update failed: '+err.message); } });
      row.querySelector('[data-action="remove"]').addEventListener('click', async function(){ if(!confirm('Delete this application from Supabase?')) return; try{ await api('/api/applications/'+id,{ method:'DELETE' }); await refreshApplicants(); if(typeof showToast === 'function') showToast('Application deleted'); }catch(err){ alert('Delete failed: '+err.message); } });
    });
  };

  document.addEventListener('DOMContentLoaded', function(){
    refreshJobs(); refreshApplicants();
    const form = document.getElementById('post-job-form');
    if(!form) return;
    form.addEventListener('submit', async function(e){
      e.preventDefault(); e.stopImmediatePropagation();
      const data = typeof readJobForm === 'function' ? readJobForm() : {};
      if(!data.title || !data.company){ alert('Job title and company name are required'); return; }
      try{
        const method = editingJobId ? 'PUT' : 'POST';
        const url = editingJobId ? '/api/jobs/'+editingJobId : '/api/jobs';
        await api(url, { method, body:JSON.stringify(bodyFromJobForm(data)) });
        editingJobId = null;
        if(typeof clearForm === 'function') clearForm();
        await refreshJobs();
        if(typeof showToast === 'function') showToast(method==='PUT' ? 'Job updated in Supabase' : 'Job posted to Supabase successfully');
      }catch(err){ alert('Could not save job: ' + err.message); }
    }, true);
  });
})();

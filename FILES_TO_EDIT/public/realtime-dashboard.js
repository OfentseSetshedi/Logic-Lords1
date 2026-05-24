/* AI Natives real-time Supabase backend UI patch.
   This script removes demo numbers and uses backend API data only. */
(function () {
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));

  async function api(url, options = {}) {
    const isForm = options.body instanceof FormData;
    const res = await fetch(url, {
      credentials: 'include',
      headers: isForm ? (options.headers || {}) : { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options
    });
    let data = {};
    try { data = await res.json(); } catch {}
    if (!res.ok) throw new Error(data.message || data.error || res.statusText);
    return data;
  }

  function saveUser(user) {
    try {
      localStorage.setItem('aiNativesLoggedIn', JSON.stringify(user));
      localStorage.setItem('loggedInUser', JSON.stringify(user));
    } catch {}
  }

  async function loadMe() {
    try {
      const data = await api('/api/auth/me');
      if (data.user) saveUser(data.user);
      return data.user || null;
    } catch {
      return null;
    }
  }

  function initials(name) {
    const clean = String(name || 'User').replace(/@.*/, '').trim();
    const parts = clean.split(/\s+/).filter(Boolean);
    if (!parts.length) return 'U';
    if (parts.length === 1) return parts[0].slice(0,2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  async function applyGreeting() {
    const user = await loadMe();
    if (!user) return;
    const name = user.name || user.full_name || 'User';
    const init = initials(name);
    $$('.user-avatar,.top-avatar,.sb-user-av,.nuc-av,#profileCircle').forEach(el => { el.textContent = init; el.title = name; });
    $$('.user-name,.sb-user-meta .n,.nuc-meta .n,#profileName').forEach(el => { el.textContent = name; });
    $$('.user-role,.sb-user-role').forEach(el => {
      el.textContent = user.role === 'admin' ? 'System Administrator' : user.role === 'employer' ? 'Employer' : 'User';
    });
    $$('.dash-title,h1,h2,.welcome-title,.hero-title').forEach(el => {
      if (/hello|welcome|gallagher|ethan/i.test(el.textContent)) el.textContent = `Hello, ${name}`;
    });
    $$('.dash-sub,.welcome-subtitle').forEach(el => {
      if (/welcome back|system|happening/i.test(el.textContent)) el.textContent = `Welcome back, ${name}. Your dashboard is connected to live Supabase data.`;
    });
  }

  function removeEmojis() {
    // Do NOT rewrite document.body.innerHTML here.
    // Rewriting body HTML removes all event listeners and makes dashboard buttons stop working.
    const emojis = ['👋','✅','📄','💼','👤','🔔'];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      let value = node.nodeValue;
      emojis.forEach(icon => { value = value.split(icon).join(''); });
      node.nodeValue = value;
    });
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function setByLabel(label, value) {
    const cards = $$('.stat-card,.dash-card,.metric-card,.card');
    cards.forEach(card => {
      if (card.textContent.toLowerCase().includes(label.toLowerCase())) {
        const big = card.querySelector('h2,h3,.stat-value,.metric-value,.num,.value');
        if (big) big.textContent = value;
      }
    });
  }

  async function loadStats() {
    try {
      const stats = await api('/api/jobs/stats');
      setText('stat-active-jobs', stats.activeJobs || 0);
      setText('stat-applied', stats.applications || 0);
      setText('stat-applications', stats.applications || 0);
      setText('stat-interviews', stats.interviews || 0);
      setText('stat-offers', stats.accepted || 0);
      setText('stat-rejections', stats.rejected || 0);
      setText('stat-match-score', (stats.matchScore || 0) + '%');
      setText('donut-total-val', stats.applications || stats.matchingJobs || 0);

      setByLabel('Active Jobs', stats.activeJobs || stats.myJobs || 0);
      setByLabel('Applications', stats.applications || 0);
      setByLabel('Interviews', stats.interviews || 0);
      setByLabel('Match Score', (stats.matchScore || 0) + '%');

      if (window.Chart && document.getElementById('donutChart')) {
        const ctx = document.getElementById('donutChart');
        if (window.aiNativesRealChart) window.aiNativesRealChart.destroy();
        const data = [stats.pending || 0, stats.interviews || 0, stats.accepted || 0, stats.rejected || 0];
        window.aiNativesRealChart = new Chart(ctx, {
          type: 'doughnut',
          data: { labels: ['Pending','In Review','Accepted','Rejected'], datasets: [{ data, borderWidth: 0 }] },
          options: { cutout: '70%', plugins: { legend: { display: false } } }
        });
        const leg = document.getElementById('donut-legend');
        if (leg) leg.innerHTML = `Pending (${data[0]}) • In Review (${data[1]}) • Accepted (${data[2]}) • Rejected (${data[3]})`;
      }
    } catch (err) {
      console.warn('Live stats unavailable:', err.message);
    }
  }

  function jobCard(job, includeApply=true) {
    const score = job.matchScore ? `<span class="badge">${job.matchScore}% match</span>` : '';
    const keys = job.matchedKeywords?.length ? `<div class="text-muted text-xs">Matched: ${esc(job.matchedKeywords.join(', '))}</div>` : '';
    return `<div class="card job-card" data-job-id="${job.id}" style="margin-bottom:12px">
      <div class="flex justify-between items-start gap-3">
        <div>
          <h3 style="margin:0 0 6px">${esc(job.title)}</h3>
          <div class="text-muted">${esc(job.companyName || job.company_name)} • ${esc(job.location || '')}</div>
          <div class="text-muted text-sm">${esc(job.jobType || job.job_type || '')} ${job.workMode || job.work_mode ? '• ' + esc(job.workMode || job.work_mode) : ''}</div>
        </div>
        <div>${score}</div>
      </div>
      <p>${esc(job.description || '').slice(0, 220)}</p>
      ${keys}
      ${includeApply ? `<button class="btn btn-primary ai-apply-job" data-job-id="${job.id}" style="margin-top:10px">Apply</button>` : ''}
    </div>`;
  }

  async function loadJobs() {
    const containers = [
      '#real-jobs-list','#jobs-list','#matching-jobs-list','#rt-jobs-list','#job-list','.jobs-list'
    ].map(s => $(s)).filter(Boolean);
    if (!containers.length && !/user\.html|jobs\.html/.test(location.pathname)) return;

    try {
      const jobs = await api('/api/jobs');
      const html = jobs.length ? jobs.map(j => jobCard(j, true)).join('') : `<div class="card">No jobs available yet. When an employer posts a job, it will appear here automatically.</div>`;
      containers.forEach(c => c.innerHTML = html);
    } catch (err) {
      containers.forEach(c => c.innerHTML = `<div class="card" style="color:#b91c1c">Could not load live jobs: ${esc(err.message)}</div>`);
    }
  }

  async function uploadCvFromForms() {
    $$('form').forEach(form => {
      if (form.dataset.aiCvBound) return;
      const file = form.querySelector('input[type="file"][name="cv"], input[type="file"]#cv-file');
      if (!file) return;
      form.dataset.aiCvBound = '1';
      form.addEventListener('submit', async (e) => {
        if (!file.files?.[0]) return;
        e.preventDefault();
        const fd = new FormData();
        fd.append('cv', file.files[0]);
        const textArea = form.querySelector('textarea[name="cvText"], textarea#cv-text');
        if (textArea) fd.append('cvText', textArea.value || '');
        try {
          const result = await api('/api/profile/upload-cv', { method:'POST', body: fd });
          alert(result.message || 'CV uploaded and read for job matching.');
          await loadStats();
          await loadJobs();
        } catch (err) {
          alert('CV upload failed: ' + err.message);
        }
      }, true);
    });
  }

  async function applyForJob(jobId) {
    try {
      const coverNote = prompt('Optional cover note:') || '';
      await api('/api/applications', { method:'POST', body: JSON.stringify({ jobId, coverNote }) });
      alert('Application submitted. The employer can now see it.');
      await loadStats();
    } catch (err) {
      alert('Application failed: ' + err.message);
    }
  }

  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('.ai-apply-job,[data-apply-job]');
    if (!btn) return;
    e.preventDefault();
    const jobId = btn.dataset.jobId || btn.dataset.applyJob || btn.closest('[data-job-id]')?.dataset.jobId;
    if (jobId) await applyForJob(jobId);
  });

  async function employerDashboard() {
    if (!/employer\.html/.test(location.pathname)) return;
    try {
      const jobs = await api('/api/jobs/mine');
      const apps = await api('/api/applications');
      setByLabel('Posted Jobs', jobs.length);
      setByLabel('Active Jobs', jobs.filter(j => j.status === 'Active').length);
      setByLabel('Applications', apps.length);
      const jobContainer = $('#employer-jobs-list,#rt-employer-jobs,#posted-jobs-list');
      if (jobContainer) jobContainer.innerHTML = jobs.length ? jobs.map(j => jobCard(j, false)).join('') : '<div class="card">No jobs posted yet.</div>';
      const appContainer = $('#employer-applications-list,#applicants-list,#rt-applicants-list');
      if (appContainer) appContainer.innerHTML = apps.length ? apps.map(a => `
        <div class="card" style="margin-bottom:10px">
          <strong>${esc(a.applicantName)}</strong><br>
          <span class="text-muted">${esc(a.applicantEmail)} applied for ${esc(a.jobTitle)}</span><br>
          <select class="ai-app-status" data-id="${a.id}">
            ${['Pending','Reviewed','Shortlisted','Interview','Accepted','Rejected'].map(s=>`<option ${a.status===s?'selected':''}>${s}</option>`).join('')}
          </select>
        </div>`).join('') : '<div class="card">No applications yet.</div>';
    } catch (err) { console.warn(err); }
  }

  document.addEventListener('change', async (e) => {
    const sel = e.target.closest('.ai-app-status');
    if (!sel) return;
    try {
      await api('/api/applications/' + sel.dataset.id + '/status', { method:'PATCH', body: JSON.stringify({ status: sel.value }) });
      alert('Application status updated.');
    } catch (err) { alert('Status update failed: ' + err.message); }
  });

  function removeAdminRegisterOptions() {
    $$('select option').forEach(opt => {
      if (String(opt.value).toLowerCase() === 'admin' || /admin/i.test(opt.textContent)) opt.remove();
    });
    $$('input[type="radio"],input[type="checkbox"]').forEach(input => {
      if (String(input.value).toLowerCase() === 'admin') {
        const label = input.closest('label') || input.parentElement;
        if (label) label.remove();
      }
    });
    const textWalker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (textWalker.nextNode()) textNodes.push(textWalker.currentNode);
    textNodes.forEach(node => {
      node.nodeValue = node.nodeValue.replace(/Demo login/gi, 'Login').replace(/demo account/gi, 'account');
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    removeAdminRegisterOptions();
    removeEmojis();
    await applyGreeting();
    await loadStats();
    await loadJobs();
    await uploadCvFromForms();
    await employerDashboard();
  });

  window.aiNativesRealtime = { api, loadStats, loadJobs, applyGreeting };
})();

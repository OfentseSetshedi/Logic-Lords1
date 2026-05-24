'use strict';

/* ═══════════════════════════════════════
   DATA
════════════════════════════════════════ */
const STORAGE_APPLICANTS = 'ems.applicants';
const STORAGE_JOBS       = 'ems.jobs';

const DONUT_COLORS = ['#0f172a','#1e293b','#334155','#475569','#94a3b8','#cbd5e1'];
const DONUT_DATA = [
  { name: 'Applied',     value: 1 },
  { name: 'In Review',   value: 1 },
  { name: 'Interviews',  value: 1 },
  { name: 'Offers',      value: 1 },
  { name: 'Rejections',  value: 1 },
];

const CONSUMPTION_DATA = {
  labels: ['00:00','01:00','02:00','03:00','04:00','05:00','06:00','07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00','23:00'],
  values: [34,56,52,46,32,40,47,44,55,48,58,60,52,57,54,59,56,50,47,48,44,46,58,55],
};

const ENERGY_PARAMS = [
  { label:'KVAH',          sub:'Apparent Energy',     val:'46.08',  unit:'KVAH'  },
  { label:'Billing',       sub:'Current Billing',     val:'527.50', unit:'₹'     },
  { label:'KVA',           sub:'Apparent Power',      val:'53.54',  unit:'KVA'   },
  { label:'KW',            sub:'Active Power',        val:'46.45',  unit:'KW'    },
  { label:'KWH',           sub:'Energy Consumption',  val:'57.74',  unit:'KWH'   },
  { label:'Power Factor',  sub:'Power Factor',        val:'0.929',  unit:''      },
  { label:'KVARh (Lag)',   sub:'Reactive Energy Lag', val:'13.96',  unit:'KVARh' },
  { label:'KVARh (Lead)',  sub:'Reactive Energy Lead',val:'11.90',  unit:'KVARh' },
];

const SEED_APPLICANTS = [
  { id:'a1', name:'Thandiwe Nkosi',  email:'thandiwe.nkosi@example.com', jobTitle:'Junior Software Developer', appliedAt: new Date(Date.now()-86400000).toISOString(), status:'Pending',  comment:'' },
  { id:'a2', name:'Sipho Dlamini',   email:'sipho.d@example.com',         jobTitle:'HR Coordinator',           appliedAt: new Date(Date.now()-172800000).toISOString(), status:'Reviewed', comment:'Strong communication skills.' },
  { id:'a3', name:'Lerato Mokoena',  email:'lerato.m@example.com',        jobTitle:'Data Analyst',             appliedAt: new Date(Date.now()-259200000).toISOString(), status:'Accepted', comment:'Great fit for the team.' },
];

const STATUS_CLASSES = {
  Pending:  'badge badge-pending',
  Reviewed: 'badge badge-reviewed',
  Accepted: 'badge badge-accepted',
  Rejected: 'badge badge-rejected',
};

/* ═══════════════════════════════════════
   HELPERS
════════════════════════════════════════ */
function readLS(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function writeLS(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}
function uid() { return 'j' + Math.random().toString(36).slice(2, 9); }
function fmtDate(iso) { return new Date(iso).toLocaleDateString('en-ZA'); }
function fmtDateTime(iso) {
  const d = new Date(iso);
  return d.getFullYear() + '/' + String(d.getMonth()+1).padStart(2,'0') + '/' + String(d.getDate()).padStart(2,'0') + ' ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
}
function showToast(msg, isError=false) {
  const t = document.createElement('div');
  t.className = 'toast' + (isError ? ' error' : '');
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

/* ═══════════════════════════════════════
   NAVIGATION
════════════════════════════════════════ */
let activePage = 'dashboard';

const PAGE_TITLES = { dashboard:'Dashboard', analytics:'Analytics', 'post-jobs':'Post Jobs', applicants:'Applicants', reports:'Reports', settings:'Settings & Profile', 'create-vacancy':'Create Vacancy' };
function updateBreadcrumb(id){ const el=document.getElementById('breadcrumb-current'); if(el) el.textContent = PAGE_TITLES[id] || id; }
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const page = document.getElementById('page-' + id);
  if (page) page.classList.add('active');
  const btn = document.querySelector(`[data-page="${id}"]`);
  if (btn) btn.classList.add('active');
  activePage = id;
  updateBreadcrumb(id);
  if (id === 'reports') renderReports();
}

document.querySelectorAll('#main-nav .nav-btn').forEach(btn => {
  btn.addEventListener('click', () => showPage(btn.dataset.page));
});

document.getElementById('go-create-vacancy').addEventListener('click', () => showPage('create-vacancy'));
document.getElementById('btn-back-from-vacancy').addEventListener('click', () => showPage('dashboard'));

/* ═══════════════════════════════════════
   SETTINGS TABS
════════════════════════════════════════ */
document.querySelectorAll('.settings-nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.settings-nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.settings-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('panel-' + btn.dataset.panel).classList.add('active');
  });
});

/* Analytics tab bar (visual only) */
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    btn.closest('.tab-bar').querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

/* ═══════════════════════════════════════
   CHARTS
════════════════════════════════════════ */
// Donut
(function () {
  const legend = document.getElementById('donut-legend');
  DONUT_DATA.forEach((d, i) => {
    legend.innerHTML += `<span class="legend-item"><span class="legend-dot" style="background:${DONUT_COLORS[i]}"></span>${d.name}</span>`;
  });
  new Chart(document.getElementById('donutChart'), {
    type: 'doughnut',
    data: {
      labels: DONUT_DATA.map(d => d.name),
      datasets: [{ data: DONUT_DATA.map(d => d.value), backgroundColor: DONUT_COLORS, borderWidth: 2, borderColor: '#fff', hoverOffset: 6 }],
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '62%',
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed.toLocaleString()} kWh` } } },
    },
  });
})();

// Trend chart — driven by application data (last 7 days)
let trendChartObj = null;
function buildTrendChart(){
  const apps = readLS(STORAGE_APPLICANTS, []);
  const today = new Date();
  const labels = [];
  const counts = [];
  const accepted = [];
  for(let i=6;i>=0;i--){
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate()-i);
    const key = d.toISOString().slice(0,10);
    labels.push(d.toLocaleDateString('en',{weekday:'short'}));
    let c=0,a=0;
    apps.forEach(x=>{ if((x.appliedAt||'').slice(0,10)===key){ c++; if(x.status==='Accepted') a++; } });
    counts.push(c); accepted.push(a);
  }
  const el = document.getElementById('trendChart'); if(!el) return;
  if(trendChartObj) trendChartObj.destroy();
  trendChartObj = new Chart(el, {
    type:'line',
    data:{ labels, datasets:[
      { label:'Applications', data:counts, borderColor:'#16a34a', borderWidth:2, fill:true,
        backgroundColor:'rgba(34,197,94,0.15)', tension:0.4, pointRadius:4 },
      { label:'Accepted', data:accepted, borderColor:'#16a34a', borderWidth:2, fill:false,
        tension:0.4, pointRadius:4 }
    ]},
    options:{ responsive:true, maintainAspectRatio:false,
      scales:{ x:{grid:{color:'#f1f5f9'}}, y:{beginAtZero:true, grid:{color:'#f1f5f9'}, ticks:{precision:0}} },
      plugins:{ legend:{display:true, position:'bottom'} }
    }
  });
}
buildTrendChart();

/* ═══════════════════════════════════════
   ENERGY PARAMS LIST
════════════════════════════════════════ */
(function () {
  const el = document.getElementById('params-list');
  ENERGY_PARAMS.forEach(p => {
    el.innerHTML += `
      <div class="param-row">
        <div class="param-icon">▦</div>
        <div><div class="param-name">${p.label}</div><div class="param-sub">${p.sub}</div></div>
        <div class="param-val"><div class="param-val-num">${p.val}</div><div class="param-val-unit">${p.unit}</div></div>
      </div>`;
  });
})();

/* ═══════════════════════════════════════
   POST JOBS + DRAFTS + PREVIEW
════════════════════════════════════════ */
const STORAGE_DRAFTS = 'ems.jobDrafts';
let postedJobs = readLS(STORAGE_JOBS, []);
let jobDrafts  = readLS(STORAGE_DRAFTS, []);

const JOB_FIELDS = ['f-title','f-company','f-type','f-mode','f-location','f-dept','f-salary','f-exp','f-date','f-email','f-desc','f-reqs','f-bens'];

function readJobForm() {
  const v = id => (document.getElementById(id)?.value || '').trim();
  return {
    title: v('f-title'), company: v('f-company'), type: v('f-type'), mode: v('f-mode'),
    location: v('f-location'), department: v('f-dept'), salary: v('f-salary'),
    experience: v('f-exp'), closingDate: v('f-date'), email: v('f-email'),
    description: v('f-desc'), requirements: v('f-reqs'), benefits: v('f-bens'),
  };
}
function loadIntoForm(j) {
  const m = { 'f-title':'title','f-company':'company','f-type':'type','f-mode':'mode','f-location':'location','f-dept':'department','f-salary':'salary','f-exp':'experience','f-date':'closingDate','f-email':'email','f-desc':'description','f-reqs':'requirements','f-bens':'benefits' };
  Object.entries(m).forEach(([id,k]) => { const el=document.getElementById(id); if(el) el.value = j[k] || ''; });
}

function renderJobList() {
  const el = document.getElementById('job-list-container');
  if (postedJobs.length === 0) {
    el.innerHTML = '<p class="text-center text-muted py-8">No jobs posted yet.</p>';
    return;
  }
  el.innerHTML = '<div class="job-list">' +
    postedJobs.map(j => {
      const tags = [j.type, j.mode, j.experience, j.location, j.department].filter(Boolean);
      return `
      <div class="job-card" data-id="${j.id}">
        <button class="job-card-head" type="button" data-act="toggle">
          <div style="flex:1;text-align:left">
            <div class="job-list-title">${escHtml(j.title)}</div>
            <div class="job-list-sub">${escHtml(j.company)} • ${escHtml(j.location||'—')}</div>
          </div>
          <span class="job-list-time">${fmtDateTime(j.postedAt)}</span>
          <span class="job-card-caret">▾</span>
        </button>
        <div class="job-card-body" hidden>
          <div class="preview-tags">${tags.map(t=>`<span class="preview-tag">${escHtml(t)}</span>`).join('')}</div>
          ${j.salary ? `<h4>Salary</h4><p>${escHtml(j.salary)}</p>` : ''}
          ${j.description ? `<h4>About the role</h4><p>${escHtml(j.description)}</p>` : ''}
          ${j.requirements ? `<h4>Requirements</h4><p>${escHtml(j.requirements)}</p>` : ''}
          ${j.benefits ? `<h4>Benefits & accessibility</h4><p>${escHtml(j.benefits)}</p>` : ''}
          ${j.closingDate ? `<h4>Closing date</h4><p>${escHtml(j.closingDate)}</p>` : ''}
          ${j.email ? `<h4>Apply via</h4><p>${escHtml(j.email)}</p>` : ''}
          <div class="flex gap-2" style="justify-content:flex-end;margin-top:12px;flex-wrap:wrap">
            <button class="btn btn-outline btn-sm" data-act="edit">✏️ Edit</button>
            <button class="btn btn-outline btn-sm" data-act="delete" style="color:#b91c1c">🗑 Delete</button>
          </div>
        </div>
      </div>`;
    }).join('') +
    '</div>';

  el.querySelectorAll('.job-card').forEach(card => {
    const id = card.dataset.id;
    card.querySelector('[data-act="toggle"]').addEventListener('click', () => {
      const body = card.querySelector('.job-card-body');
      body.hidden = !body.hidden;
      card.classList.toggle('open', !body.hidden);
    });
    card.querySelector('[data-act="edit"]').addEventListener('click', (e) => {
      e.stopPropagation();
      const j = postedJobs.find(x => x.id === id); if (!j) return;
      loadIntoForm(j);
      postedJobs = postedJobs.filter(x => x.id !== id);
      writeLS(STORAGE_JOBS, postedJobs);
      renderJobList();
      document.getElementById('post-job-form').scrollIntoView({behavior:'smooth', block:'start'});
      showToast('Editing job — re-post to save changes');
    });
    card.querySelector('[data-act="delete"]').addEventListener('click', (e) => {
      e.stopPropagation();
      if (!confirm('Delete this job posting?')) return;
      postedJobs = postedJobs.filter(x => x.id !== id);
      writeLS(STORAGE_JOBS, postedJobs);
      renderJobList();
      showToast('Job deleted');
    });
  });
}
renderJobList();

function renderDrafts() {
  const card = document.getElementById('drafts-card');
  const el   = document.getElementById('drafts-list-container');
  if (!card || !el) return;
  if (jobDrafts.length === 0) { card.style.display = 'none'; return; }
  card.style.display = '';
  el.innerHTML = jobDrafts.map(d => `
    <div class="draft-row" data-id="${d.id}">
      <div class="draft-info">
        <div class="draft-title">${escHtml(d.title || '(Untitled draft)')}</div>
        <div class="draft-sub">${escHtml(d.company || 'No company')} • saved ${fmtDateTime(d.savedAt)}</div>
      </div>
      <div class="draft-actions">
        <button class="btn btn-outline btn-sm" data-act="edit">Continue editing</button>
        <button class="btn btn-outline btn-sm" data-act="delete">Delete</button>
      </div>
    </div>`).join('');
  el.querySelectorAll('.draft-row').forEach(row => {
    const id = row.dataset.id;
    row.querySelector('[data-act="edit"]').addEventListener('click', () => {
      const d = jobDrafts.find(x => x.id === id); if (!d) return;
      loadIntoForm(d);
      jobDrafts = jobDrafts.filter(x => x.id !== id);
      writeLS(STORAGE_DRAFTS, jobDrafts);
      renderDrafts();
      showToast('Draft loaded into form');
    });
    row.querySelector('[data-act="delete"]').addEventListener('click', () => {
      jobDrafts = jobDrafts.filter(x => x.id !== id);
      writeLS(STORAGE_DRAFTS, jobDrafts);
      renderDrafts();
      showToast('Draft deleted');
    });
  });
}
renderDrafts();

function clearForm() { JOB_FIELDS.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; }); }
document.getElementById('btn-clear-form').addEventListener('click', clearForm);

document.getElementById('btn-save-draft').addEventListener('click', () => {
  const j = readJobForm();
  if (!j.title && !j.company) { showToast('Add a title or company before saving a draft', true); return; }
  jobDrafts = [{ id: uid(), ...j, savedAt: new Date().toISOString() }, ...jobDrafts];
  writeLS(STORAGE_DRAFTS, jobDrafts);
  renderDrafts();
  showToast('Draft saved — finish it later from the Drafts list');
});

function openJobPreview(job, opts) {
  opts = opts || {};
  const tags = [job.type, job.mode, job.experience, job.location].filter(Boolean);
  const m = document.getElementById('preview-modal');
  m.innerHTML = `
    <div class="preview-banner">👁 You are previewing this job exactly as a candidate will see it.</div>
    <h1>${escHtml(job.title || '(Untitled position)')}</h1>
    <div class="preview-company">${escHtml(job.company || 'Your company')}${job.department ? ' • ' + escHtml(job.department) : ''}</div>
    <div class="preview-tags">${tags.map(t => `<span class="preview-tag">${escHtml(t)}</span>`).join('')}</div>
    ${job.salary ? `<h3>Salary</h3><p>${escHtml(job.salary)}</p>` : ''}
    ${job.description ? `<h3>About the role</h3><p>${escHtml(job.description)}</p>` : ''}
    ${job.requirements ? `<h3>Requirements</h3><p>${escHtml(job.requirements)}</p>` : ''}
    ${job.benefits ? `<h3>Benefits & accessibility</h3><p>${escHtml(job.benefits)}</p>` : ''}
    ${job.closingDate ? `<h3>Closing date</h3><p>${escHtml(job.closingDate)}</p>` : ''}
    ${job.email ? `<h3>Apply via</h3><p>${escHtml(job.email)}</p>` : ''}
    <div class="preview-actions">
      <button class="btn btn-outline" onclick="closeJobPreview()">Close preview</button>
      <button class="btn btn-primary" disabled style="opacity:.6;cursor:not-allowed">Apply (candidate view)</button>
    </div>`;
  document.getElementById('preview-overlay').classList.add('open');
}
function closeJobPreview() { document.getElementById('preview-overlay').classList.remove('open'); }
window.closeJobPreview = closeJobPreview;

document.getElementById('btn-preview-job').addEventListener('click', () => {
  const j = readJobForm();
  if (!j.title) { showToast('Add at least a job title to preview', true); return; }
  openJobPreview(j);
});

document.getElementById('post-job-form').addEventListener('submit', e => {
  e.preventDefault();
  const data = readJobForm();
  if (!data.title || !data.company) { showToast('Job title and company name are required', true); return; }
  const job = { id: uid(), ...data, location: data.location || '—', postedAt: new Date().toISOString() };
  postedJobs = [job, ...postedJobs];
  writeLS(STORAGE_JOBS, postedJobs);
  clearForm();
  renderJobList();
  showToast('Job posted successfully');
});

/* ═══════════════════════════════════════
   APPLICANTS
════════════════════════════════════════ */
let applicants = readLS(STORAGE_APPLICANTS, null);
if (!applicants) { applicants = SEED_APPLICANTS; writeLS(STORAGE_APPLICANTS, applicants); }

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function saveApplicants() { writeLS(STORAGE_APPLICANTS, applicants); }

const applicantFilters = { search: '', status: '', period: '' };

function getFilteredApplicants() {
  const q = applicantFilters.search.toLowerCase();
  const days = parseInt(applicantFilters.period, 10);
  const cutoff = days ? Date.now() - days * 86400000 : null;
  return applicants.filter(a => {
    if (applicantFilters.status && a.status !== applicantFilters.status) return false;
    if (cutoff && new Date(a.appliedAt).getTime() < cutoff) return false;
    if (q) {
      const blob = (a.name + ' ' + a.email + ' ' + a.jobTitle).toLowerCase();
      if (!blob.includes(q)) return false;
    }
    return true;
  });
}

function renderApplicantsTable() {
  const el = document.getElementById('applicants-table-container');
  const meta = document.getElementById('appf-meta');
  const list = getFilteredApplicants();
  if (meta) meta.textContent = `Showing ${list.length} of ${applicants.length} applicants`;
  if (list.length === 0) {
    el.innerHTML = applicants.length === 0
      ? '<p class="text-center text-muted py-8">No applicants yet.</p>'
      : '<p class="text-center text-muted py-8">No applicants match the current filters.</p>';
    return;
  }
  el.innerHTML = `
    <table>
      <thead><tr>
        <th>Applicant</th><th>Job</th><th>Applied</th><th>Status</th>
        <th class="td-comment">Comment</th><th></th>
      </tr></thead>
      <tbody>
        ${list.map(a => `
          <tr data-id="${a.id}">
            <td><div class="td-name-main">${escHtml(a.name)}</div><div class="td-name-sub">${escHtml(a.email)}</div></td>
            <td>${escHtml(a.jobTitle)}</td>
            <td class="text-muted">${fmtDate(a.appliedAt)}</td>
            <td>
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                <span class="${STATUS_CLASSES[a.status]}">${a.status}</span>
                <select class="status-select" data-action="status">
                  <option ${a.status==='Pending'?'selected':''}>Pending</option>
                  <option ${a.status==='Reviewed'?'selected':''}>Reviewed</option>
                  <option ${a.status==='Accepted'?'selected':''}>Accepted</option>
                  <option ${a.status==='Rejected'?'selected':''}>Rejected</option>
                </select>
              </div>
            </td>
            <td class="td-comment"><textarea rows="2" class="textarea" style="font-size:12px" data-action="comment" placeholder="Add a comment...">${escHtml(a.comment)}</textarea></td>
            <td><button class="btn btn-outline btn-sm" data-action="remove">Remove</button></td>
          </tr>`).join('')}
      </tbody>
    </table>`;

  el.querySelectorAll('tr[data-id]').forEach(row => {
    const id = row.dataset.id;
    row.querySelector('[data-action="status"]').addEventListener('change', function () {
      const a = applicants.find(x => x.id === id);
      if (a) { a.status = this.value; saveApplicants(); renderApplicantsTable(); showToast(`Status updated to ${this.value}`); }
    });
    row.querySelector('[data-action="comment"]').addEventListener('input', function () {
      const a = applicants.find(x => x.id === id);
      if (a) { a.comment = this.value; saveApplicants(); }
    });
    row.querySelector('[data-action="remove"]').addEventListener('click', () => {
      applicants = applicants.filter(x => x.id !== id);
      saveApplicants(); renderApplicantsTable();
    });
  });
}

(function wireApplicantFilters(){
  const s = document.getElementById('appf-search');
  const st = document.getElementById('appf-status');
  const p = document.getElementById('appf-period');
  const clear = document.getElementById('appf-clear');
  const br = document.getElementById('appf-bulk-reviewed');
  const bx = document.getElementById('appf-bulk-rejected');
  if (s)  s.addEventListener('input',  () => { applicantFilters.search = s.value; renderApplicantsTable(); });
  if (st) st.addEventListener('change', () => { applicantFilters.status = st.value; renderApplicantsTable(); });
  if (p)  p.addEventListener('change',  () => { applicantFilters.period = p.value; renderApplicantsTable(); });
  if (clear) clear.addEventListener('click', () => {
    applicantFilters.search=''; applicantFilters.status=''; applicantFilters.period='';
    if (s) s.value=''; if (st) st.value=''; if (p) p.value=''; renderApplicantsTable();
  });
  function bulk(status, label) {
    const list = getFilteredApplicants();
    if (list.length === 0) { showToast('No applicants in current filter', true); return; }
    if (!confirm(`${label} ${list.length} applicant(s)?`)) return;
    const ids = new Set(list.map(a => a.id));
    applicants.forEach(a => { if (ids.has(a.id)) a.status = status; });
    saveApplicants(); renderApplicantsTable();
    showToast(`${list.length} applicant(s) marked ${status}`);
  }
  if (br) br.addEventListener('click', () => bulk('Reviewed', 'Mark as Reviewed —'));
  if (bx) bx.addEventListener('click', () => bulk('Rejected', 'Send rejection to'));
})();

renderApplicantsTable();

/* ═══════════════════════════════════════
   REPORTS
════════════════════════════════════════ */
function renderReports() { renderEmpReportPreview(); renderEmpSavedReports(); }

/* Employer Report Builder */
function empGetChecked(id){ return Array.from(document.querySelectorAll('#'+id+' input[type=checkbox]:checked')).map(i=>i.value); }
function buildEmpReportData(){
  const sections = empGetChecked('emp-rep-sections');
  const charts = empGetChecked('emp-rep-charts');
  const range = (document.getElementById('emp-rep-range')||{}).value || '30';
  const rangeLabel = range==='all' ? 'All time' : 'Last '+range+' days';
  const apps = readLS(STORAGE_APPLICANTS, []);
  const jobs = readLS(STORAGE_JOBS, []);
  const cutoff = range==='all' ? 0 : Date.now() - parseInt(range,10)*86400000;
  const filteredApps = apps.filter(a => new Date(a.appliedAt).getTime() >= cutoff);
  const filteredJobs = jobs.filter(j => new Date(j.postedAt).getTime() >= cutoff);
  const byStatus = { Pending:0, Reviewed:0, Accepted:0, Rejected:0 };
  filteredApps.forEach(a => { if (byStatus[a.status]!==undefined) byStatus[a.status]++; });
  return { generatedAt:new Date().toISOString(), range:rangeLabel, charts, sections, byStatus, apps:filteredApps, jobs:filteredJobs };
}
function renderEmpReportPreview(){
  const el = document.getElementById('emp-rep-preview'); if(!el) return;
  const d = buildEmpReportData();
  if (!d.sections.length && !d.charts.length){ el.innerHTML = '<div class="rep-empty">Select at least one section or chart to preview.</div>'; return; }
  let html = `<div class="rep-section"><strong>Range:</strong> ${d.range} &nbsp;·&nbsp; <strong>Charts:</strong> ${d.charts.length? d.charts.join(', '):'—'}</div>`;
  if (d.sections.includes('summary')) html += `<div class="rep-section"><h4>Summary</h4>Posted Jobs: ${d.jobs.length} · Applicants: ${d.apps.length}</div>`;
  if (d.sections.includes('status')) html += `<div class="rep-section"><h4>Application Status</h4>Pending: ${d.byStatus.Pending} · Reviewed: ${d.byStatus.Reviewed} · Accepted: ${d.byStatus.Accepted} · Rejected: ${d.byStatus.Rejected}</div>`;
  if (d.sections.includes('applicants')) html += `<div class="rep-section"><h4>Applicants (${d.apps.length})</h4>${d.apps.slice(0,5).map(a=>`${escHtml(a.name)} — <em>${a.status}</em>`).join('<br>') || '—'}${d.apps.length>5?'<br>…':''}</div>`;
  if (d.sections.includes('jobs')) html += `<div class="rep-section"><h4>Posted Jobs (${d.jobs.length})</h4>${d.jobs.slice(0,5).map(j=>`${escHtml(j.title)} — ${escHtml(j.company)}`).join('<br>') || '—'}${d.jobs.length>5?'<br>…':''}</div>`;
  if (d.sections.includes('comments')) html += `<div class="rep-section"><h4>Applicant Comments</h4>${d.apps.filter(a=>a.comment).map(a=>`<strong>${escHtml(a.name)}:</strong> ${escHtml(a.comment)}`).join('<br>') || '—'}</div>`;
  el.innerHTML = html;
}
function empToCSV(d){
  const rows = [['Section','Field','Value']];
  rows.push(['summary','PostedJobs',d.jobs.length],['summary','Applicants',d.apps.length]);
  Object.entries(d.byStatus).forEach(([k,v])=>rows.push(['status',k,v]));
  d.apps.forEach(a=>rows.push(['applicant', a.name, `${a.email} | ${a.jobTitle} | ${a.status}`]));
  d.jobs.forEach(j=>rows.push(['job', j.title, `${j.company} | ${j.location}`]));
  return rows.map(r=>r.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(',')).join('\n');
}
function empDownload(name, type, content){
  const blob = new Blob([content],{type}); const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download=name;
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}
function exportEmpReport(){
  const d = buildEmpReportData();
  if (!d.sections.length){ showToast('Select at least one section to export', true); return; }
  const fmt = (document.getElementById('emp-rep-format')||{}).value || 'pdf';
  const ts = new Date().toISOString().replace(/[:.]/g,'-');
  const formats = fmt==='all' ? ['pdf','csv','json'] : [fmt];
  formats.forEach(f=>{
    if (f==='json') empDownload(`employer-report-${ts}.json`,'application/json',JSON.stringify(d,null,2));
    else if (f==='csv') empDownload(`employer-report-${ts}.csv`,'text/csv',empToCSV(d));
    else {
      const html = `<!doctype html><html><head><meta charset="utf-8"><title>Employer Report</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#1a1f18}h1{margin:0 0 6px}h4{margin:14px 0 4px;color:#16a34a}.muted{color:#6b7280;font-size:12px}</style></head><body><h1>Employer Report</h1><div class="muted">Generated ${new Date(d.generatedAt).toLocaleString()} · ${d.range} · Charts: ${d.charts.join(', ')||'—'}</div>${document.getElementById('emp-rep-preview').innerHTML}<scr`+`ipt>window.onload=()=>setTimeout(()=>window.print(),200)</scr`+`ipt></body></html>`;
      const w = window.open('','_blank'); if(w){ w.document.write(html); w.document.close(); }
    }
  });
  const arr = loadEmpReports();
  arr.unshift({ id:'r'+Date.now(), name:'Employer report '+new Date().toLocaleDateString(), ts:Date.now(), applicants:d.apps.length, jobs:d.jobs.length });
  saveEmpReports(arr);
  renderEmpSavedReports();
  showToast('Report exported');
}
document.addEventListener('change', e=>{ if(e.target.closest('#emp-rep-sections, #emp-rep-charts, #emp-rep-range, #emp-rep-format')) renderEmpReportPreview(); });
document.getElementById('emp-rep-sections-all')?.addEventListener('click', ()=>{ document.querySelectorAll('#emp-rep-sections input').forEach(i=>i.checked=true); renderEmpReportPreview(); });
document.getElementById('emp-rep-charts-all')?.addEventListener('click', ()=>{ document.querySelectorAll('#emp-rep-charts input').forEach(i=>i.checked=true); renderEmpReportPreview(); });
document.getElementById('emp-rep-export')?.addEventListener('click', exportEmpReport);
document.getElementById('btn-download-report')?.addEventListener('click', exportEmpReport);


/* ═══════════════════════════════════════
   APPLICATION STATUS GRID (replaces env)
════════════════════════════════════════ */
function renderEmpStatusGrid(){
  const el = document.getElementById('emp-status-grid'); if(!el) return;
  const apps = readLS(STORAGE_APPLICANTS, []);
  const counts = { Pending:0, Reviewed:0, Accepted:0, Rejected:0 };
  apps.forEach(a=>{ if(counts[a.status]!==undefined) counts[a.status]++; });
  const tiles = [
    { lbl:'APPLIED',     icon:'send',              val:apps.length,        sub:'Total applications' },
    { lbl:'IN REVIEW',   icon:'hourglass_top',     val:counts.Reviewed,    sub:'Awaiting employer' },
    { lbl:'INTERVIEWS',  icon:'event',             val:counts.Pending,     sub:'Scheduled' },
    { lbl:'OFFERS',      icon:'workspace_premium', val:counts.Accepted,    sub:'Received' },
    { lbl:'REJECTIONS',  icon:'cancel',            val:counts.Rejected,    sub:'Closed' },
  ];
  el.innerHTML = tiles.map(t=>`
    <div class="env-tile">
      <div class="text-xs text-muted" style="display:flex;align-items:center;gap:6px">
        <span class="material-icons" style="font-size:14px">${t.icon}</span>${t.lbl}
      </div>
      <div class="env-tile-val">${t.val}</div>
      <div class="text-xs text-muted">${t.sub}</div>
    </div>`).join('');
}
renderEmpStatusGrid();

/* ═══════════════════════════════════════
   SAVED REPORTS CRUD
════════════════════════════════════════ */
const EMP_REPORTS_KEY = 'emp.savedReports';
function loadEmpReports(){ try{return JSON.parse(localStorage.getItem(EMP_REPORTS_KEY))||[];}catch{return [];} }
function saveEmpReports(a){ localStorage.setItem(EMP_REPORTS_KEY, JSON.stringify(a)); }
function renderEmpSavedReports(){
  const el = document.getElementById('emp-saved-reports'); if(!el) return;
  const reports = loadEmpReports();
  if(!reports.length){ el.innerHTML = '<div style="padding:16px;text-align:center;color:#94a3b8">No saved reports yet.</div>'; return; }
  el.innerHTML = `<div class="table-wrap"><table>
    <thead><tr><th>Name</th><th>Saved at</th><th>Applicants</th><th>Jobs</th><th></th></tr></thead>
    <tbody>${reports.map(r=>`
      <tr>
        <td class="font-semibold">${escHtml(r.name)}</td>
        <td class="text-muted">${new Date(r.ts).toLocaleString()}</td>
        <td>${r.applicants||0}</td>
        <td>${r.jobs||0}</td>
        <td><button class="btn btn-outline btn-sm" onclick="deleteEmpReport('${r.id}')">Delete</button></td>
      </tr>`).join('')}
    </tbody></table></div>`;
}
function deleteEmpReport(id){
  if(!confirm('Delete this saved report?')) return;
  saveEmpReports(loadEmpReports().filter(r=>r.id!==id));
  renderEmpSavedReports();
  showToast('Report deleted');
}
function clearAllEmpReports(){
  if(!confirm('Delete ALL saved reports?')) return;
  saveEmpReports([]); renderEmpSavedReports();
  showToast('All reports cleared');
}

/* ═══ PDF PREVIEW & EXPORT (replaces zip flow) ═══ */
function buildEmpReportHTML(){
  const apps = readLS(STORAGE_APPLICANTS,[]);
  const jobs = readLS(STORAGE_JOBS,[]);
  const byStatus = { Pending:0,Reviewed:0,Accepted:0,Rejected:0 };
  apps.forEach(a=>{ if(byStatus[a.status]!==undefined) byStatus[a.status]++; });
  const tiles = [
    ['Posted Jobs', jobs.length],
    ['Total Applicants', apps.length],
    ['Accepted', byStatus.Accepted],
    ['Reviewed', byStatus.Reviewed],
    ['Pending', byStatus.Pending],
    ['Rejected', byStatus.Rejected],
  ];
  const tilesHTML = tiles.map(([k,v])=>`<div class="pdfm-tile"><div class="pdfm-tile-l">${k}</div><div class="pdfm-tile-v">${v}</div></div>`).join('');
  const appsHTML = apps.length ? `<table class="pdfm-table"><thead><tr><th>Name</th><th>Email</th><th>Job</th><th>Applied</th><th>Status</th></tr></thead><tbody>${
    apps.map(a=>`<tr><td>${escHtml(a.name)}</td><td>${escHtml(a.email)}</td><td>${escHtml(a.jobTitle)}</td><td>${fmtDate(a.appliedAt)}</td><td>${a.status}</td></tr>`).join('')
  }</tbody></table>` : '<p style="color:#94a3b8">No applicants yet.</p>';
  const jobsHTML = jobs.length ? `<table class="pdfm-table"><thead><tr><th>Title</th><th>Company</th><th>Location</th><th>Posted</th></tr></thead><tbody>${
    jobs.map(j=>`<tr><td>${escHtml(j.title)}</td><td>${escHtml(j.company)}</td><td>${escHtml(j.location)}</td><td>${fmtDate(j.postedAt)}</td></tr>`).join('')
  }</tbody></table>` : '<p style="color:#94a3b8">No jobs posted yet.</p>';
  return `
    <h1>Employer Report</h1>
    <div class="pdfm-meta">Generated ${new Date().toLocaleString()}</div>
    <h2>📊 Application Status Overview</h2>
    <div class="pdfm-chart-wrap"><canvas id="pdfm-chart"></canvas></div>
    <h2>📋 Summary</h2>
    <div class="pdfm-grid">${tilesHTML}</div>
    <h2>👥 Applicants (${apps.length})</h2>
    ${appsHTML}
    <h2>💼 Posted Jobs (${jobs.length})</h2>
    ${jobsHTML}
    <div style="margin-top:24px;font-size:11px;color:#9ca3af;text-align:center">EMS Control — Employer Report</div>`;
}

let _empPdfChart = null;
function openEmpReportPreview(){
  const apps = readLS(STORAGE_APPLICANTS,[]);
  const byStatus = { Pending:0,Reviewed:0,Accepted:0,Rejected:0 };
  apps.forEach(a=>{ if(byStatus[a.status]!==undefined) byStatus[a.status]++; });
  document.getElementById('pdfm-page').innerHTML = buildEmpReportHTML();
  document.getElementById('pdfm-overlay').classList.add('open');
  setTimeout(()=>{
    const ctx = document.getElementById('pdfm-chart');
    if(_empPdfChart) _empPdfChart.destroy();
    _empPdfChart = new Chart(ctx, {
      type:'bar',
      data:{ labels:['Pending','Reviewed','Accepted','Rejected'],
        datasets:[{ label:'Applications', data:[byStatus.Pending,byStatus.Reviewed,byStatus.Accepted,byStatus.Rejected],
          backgroundColor:['#3b82f6','#f59e0b','#16a34a','#ef4444']}]},
      options:{responsive:true,maintainAspectRatio:false,animation:false,
        plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{stepSize:1}}}}
    });
  },50);
  document.getElementById('pdfm-export').onclick = exportEmpPdf;
}
function closePdfPreview(){ document.getElementById('pdfm-overlay').classList.remove('open'); }

async function exportEmpPdf(){
  const page = document.getElementById('pdfm-page');
  const canvas = await html2canvas(page,{scale:2,backgroundColor:'#ffffff'});
  const imgData = canvas.toDataURL('image/png');
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF('p','mm','a4');
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const imgW = pageW; const imgH = canvas.height * imgW / canvas.width;
  let heightLeft = imgH; let position = 0;
  pdf.addImage(imgData,'PNG',0,position,imgW,imgH);
  heightLeft -= pageH;
  while(heightLeft>0){ position = heightLeft - imgH; pdf.addPage(); pdf.addImage(imgData,'PNG',0,position,imgW,imgH); heightLeft -= pageH; }
  pdf.save('employer-report-'+new Date().toISOString().slice(0,10)+'.pdf');
  // persist saved report entry
  const apps = readLS(STORAGE_APPLICANTS,[]);
  const jobs = readLS(STORAGE_JOBS,[]);
  const arr = loadEmpReports();
  arr.unshift({ id:'r'+Date.now(), name:'Employer report '+new Date().toLocaleDateString(), ts:Date.now(), applicants:apps.length, jobs:jobs.length });
  saveEmpReports(arr);
  renderEmpSavedReports();
  closePdfPreview();
  showToast('PDF exported');
}

// Replace existing download-button handler with PDF preview
(function(){
  const btn = document.getElementById('btn-download-report');
  if(!btn) return;
  const fresh = btn.cloneNode(true);
  btn.parentNode.replaceChild(fresh, btn);
  fresh.addEventListener('click', openEmpReportPreview);
})();

// Patch renderReports to also render saved reports
const _origRenderReports = renderReports;
renderReports = function(){
  _origRenderReports();
  renderEmpSavedReports();
};

// When new applicants/jobs change, refresh trend + status grid
const _origSaveApplicants = saveApplicants;
saveApplicants = function(){ _origSaveApplicants(); renderEmpStatusGrid(); buildTrendChart(); };

// ===== Page navigation =====
const navBtns = document.querySelectorAll('.nav-btn');
const pages = document.querySelectorAll('.page');
const PAGE_TITLES = { dashboard:'Dashboard', jobs:'Inclusive Jobs', voice:'Voice & Translation', navigation:'Navigation', reports:'Reports', settings:'Settings' };
function updateBreadcrumb(id){ const el=document.getElementById('breadcrumb-current'); if(el) el.textContent = PAGE_TITLES[id] || id; }
function goToPage(target){
  navBtns.forEach(b=>b.classList.toggle('active', b.dataset.page===target));
  pages.forEach(p=>p.classList.remove('active'));
  document.getElementById('page-'+target)?.classList.add('active');
  updateBreadcrumb(target);
  location.hash = target;
  if(target==='dashboard'){ initConfigMap(); }
  if(target==='navigation'){ initNavMap(); }
}
navBtns.forEach(btn=>btn.addEventListener('click', ()=>goToPage(btn.dataset.page)));

// Quick-access shortcut buttons (any element with data-goto)
document.addEventListener('click', (e)=>{
  const t = e.target.closest('[data-goto]');
  if(!t) return;
  const page = t.dataset.goto;
  if(!page) return;
  // Only handle if it's not already a nav-btn (those have their own listener)
  if(t.classList.contains('nav-btn')) return;
  goToPage(page);
  window.scrollTo({top:0,behavior:'smooth'});
});

// Initialize dashboard sites map on first load (dashboard is active by default)
window.addEventListener('load', ()=>{ initConfigMap(); const h=(location.hash||'').replace('#','').trim(); if(h && document.getElementById('page-'+h)) goToPage(h); });

// ===== Charts (Jobs Matching Your Profile) =====
let donutChartObj = null;
function getJobCounts(){
  const jobs = loadSavedJobs();
  const c = { Applied:0, 'In Review':0, Interview:0, Offer:0, Rejected:0 };
  jobs.forEach(j=>{ if(c[j.status]!==undefined) c[j.status]++; });
  return c;
}
function initCharts(){
  if(typeof Chart === 'undefined') return;
  const donutEl = document.getElementById('donutChart');
  if(!donutEl) return;
  const c = getJobCounts();
  const labels = ['APPLIED','IN REVIEW','INTERVIEWS','OFFERS','REJECTIONS'];
  const data = [c.Applied, c['In Review'], c.Interview, c.Offer, c.Rejected];
  const colors = ['#16a34a','#3b82f6','#f59e0b','#16a34a','#ef4444'];
  const total = data.reduce((a,b)=>a+b,0);
  const totalEl = document.getElementById('donut-total-val'); if(totalEl) totalEl.textContent = total;
  if(donutChartObj) donutChartObj.destroy();
  donutChartObj = new Chart(donutEl,{
    type:'doughnut',
    data:{ labels, datasets:[{ data, backgroundColor:colors, borderWidth:0 }] },
    options:{ cutout:'70%', plugins:{ legend:{display:false} } }
  });
  const leg = document.getElementById('donut-legend');
  if(leg) leg.innerHTML = labels.map((l,i)=>`<span style="color:${colors[i]}">● ${l} (${data[i]})</span>`).join(' ');
  // Update inline status numbers
  const map = { Applied:'ds-applied','In Review':'ds-review',Interview:'ds-interviews',Offer:'ds-offers',Rejected:'ds-rejections' };
  Object.entries(map).forEach(([k,id])=>{ const el=document.getElementById(id); if(el) el.textContent = c[k]; });
}

// ===== Reports table =====
const tbody = document.getElementById('report-tbody');
if(tbody){
  const rows=[
    ['Mon','152.4','1,489','48.2','0.91','125','OK'],
    ['Tue','168.9','1,651','52.4','0.93','138','OK'],
    ['Wed','144.2','1,408','45.8','0.90','118','OK'],
    ['Thu','175.6','1,716','55.1','0.92','144','High'],
    ['Fri','181.0','1,769','56.6','0.93','149','High'],
    ['Sat','165.0','1,612','51.2','0.91','135','OK'],
    ['Sun','185.0','1,801','52.4','0.92','152','OK'],
  ];
  tbody.innerHTML = rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('');
}

// ===== Job application stats now comes from live backend through realtime-dashboard.js =====
const STATS_KEY = 'ems.jobStats';
function loadStats(){
  try { return JSON.parse(localStorage.getItem(STATS_KEY)) || {}; } catch { return {}; }
}
function renderStats(){
  const s = loadStats();
  const set = (id,v)=>{ const el=document.getElementById(id); if(el) el.textContent = v ?? 0; };
  set('stat-applied',     s.applied    || 0);
  set('stat-review',      s.review     || 0);
  set('stat-interviews',  s.interviews || 0);
  set('stat-offers',      s.offers     || 0);
  set('stat-rejections',  s.rejections || 0);
}
renderStats();

// ===== Jobs / CV upload (CV is saved once and reused) =====
const CV_KEY = 'ems.savedCV';
function loadCV(){ try{ return JSON.parse(localStorage.getItem(CV_KEY)); }catch{ return null; } }
function saveCV(info){ localStorage.setItem(CV_KEY, JSON.stringify(info)); }
const cvForm = document.getElementById('cv-form');
const cvFile = document.getElementById('cv-file');
const cvDrop = document.getElementById('cv-drop');
const cvDropSub = document.getElementById('cv-drop-sub');
const cvSavedInfo = document.getElementById('cv-saved-info');
function refreshCVStatus(){
  const cv = loadCV();
  if(cv && cvSavedInfo) cvSavedInfo.innerHTML = `✅ CV on file: <strong>${cv.name}</strong> — will be used for applications.`;
  else if(cvSavedInfo) cvSavedInfo.textContent = 'No CV saved yet. Upload one to apply with a single click.';
}
if(cvFile){
  cvFile.addEventListener('change',()=>{
    if(cvFile.files[0]) cvDropSub.textContent = cvFile.files[0].name;
  });
  ['dragover','dragenter'].forEach(e=>cvDrop.addEventListener(e,ev=>{ev.preventDefault();cvDrop.classList.add('drag')}));
  ['dragleave','drop'].forEach(e=>cvDrop.addEventListener(e,ev=>{ev.preventDefault();cvDrop.classList.remove('drag')}));
  cvDrop.addEventListener('drop',ev=>{
    if(ev.dataTransfer.files[0]){cvFile.files = ev.dataTransfer.files; cvDropSub.textContent = ev.dataTransfer.files[0].name}
  });
  cvForm.addEventListener('submit', async e=>{
    e.preventDefault();
    if(!cvFile.files[0]){alert('Please choose a CV file first.');return;}
    const formData = new FormData();
    formData.append('cv', cvFile.files[0]);
    try{
      const res = await fetch('/api/profile/upload-cv', { method:'POST', credentials:'include', body:formData });
      const data = await res.json().catch(()=>({}));
      if(!res.ok) throw new Error(data.message || 'CV upload failed');
      saveCV({ name: cvFile.files[0].name, size: cvFile.files[0].size, ts: Date.now(), backend:true });
      refreshCVStatus();
      alert('CV uploaded to the backend. You can now apply to jobs.');
    }catch(err){ alert('Could not upload CV: '+err.message); }
  });
}
refreshCVStatus();

// ===== Employer-posted jobs (expandable + Apply with saved CV) =====
const APPLIED_KEY = 'ems.appliedJobs';
function loadApplied(){ try{return JSON.parse(localStorage.getItem(APPLIED_KEY))||{};}catch{return {};} }
function saveApplied(o){ localStorage.setItem(APPLIED_KEY, JSON.stringify(o)); }

function getEmployerJobs(){
  // Read the latest backend-loaded employer jobs cached by user-sql-jobs.js
  try {
    const j = JSON.parse(localStorage.getItem('ems.jobs'));
    if(Array.isArray(j) && j.length) return j;
  } catch {}
  return [];
}
const EMPLOYER_POSTED_JOBS_FALLBACK = [];

function escapeHtmlSafe(s){ return String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

let externalJobs = [];
let externalLoading = false;
let externalQuery = '';

async function fetchExternalJobs(query){
  externalLoading = true; renderUserJobs();
  try {
    const url = 'https://remotive.com/api/remote-jobs?limit=25' + (query?('&search='+encodeURIComponent(query)):'');
    const r = await fetch(url);
    const j = await r.json();
    externalJobs = (j.jobs||[]).map(x=>({
      id: 'ext'+x.id,
      title: x.title,
      company: x.company_name,
      location: x.candidate_required_location || 'Remote',
      postedAt: (x.publication_date||'').slice(0,10),
      type: x.job_type || 'Full-time',
      mode: 'Remote',
      experience: x.category || '',
      salary: x.salary || 'Not disclosed',
      description: (x.description||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,600)+'…',
      requirements: '',
      benefits: '',
      closingDate: '',
      url: x.url,
      source: 'external'
    }));
  } catch(err){
    console.warn('External job fetch failed:', err);
    externalJobs = [];
  }
  externalLoading = false; renderUserJobs();
}

let userJobsSource = 'site';

function applyJobFilters(jobs){
  const prov = (document.getElementById('uj-province')?.value || '').toLowerCase().trim();
  const title = (document.getElementById('uj-jobtitle')?.value || '').toLowerCase().trim();
  const city = (document.getElementById('uj-city')?.value || '').toLowerCase().trim();
  const sen  = (document.getElementById('uj-seniority')?.value || '').toLowerCase().trim();
  return jobs.filter(j=>{
    const loc = (j.location||'').toLowerCase();
    const t = (j.title||'').toLowerCase();
    const exp = (j.experience||'').toLowerCase();
    if(prov && !loc.includes(prov.split(' ')[0])) return false;
    if(title && !t.includes(title)) return false;
    if(city && !loc.includes(city)) return false;
    if(sen && !exp.includes(sen.split(' ')[0])) return false;
    return true;
  });
}

function renderUserJobs(){
  const el = document.getElementById('user-jobs-list'); if(!el) return;
  const searchRow = document.getElementById('uj-search-row');
  const filtersRow = document.getElementById('uj-filters-row');
  if(searchRow) searchRow.hidden = userJobsSource !== 'external';
  if(filtersRow) filtersRow.hidden = userJobsSource !== 'external';
  if(userJobsSource==='external' && externalLoading){
    el.innerHTML = `<p style="text-align:center;color:#6b7280;padding:24px">Searching online jobs…</p>`;
    return;
  }
  let jobs = userJobsSource === 'external' ? externalJobs : getEmployerJobs();
  if(userJobsSource === 'external'){
    const prov = (document.getElementById('uj-province')?.value || '').trim();
    const title = (document.getElementById('uj-jobtitle')?.value || '').trim();
    if(!prov || !title){
      el.innerHTML = `<p style="text-align:center;color:#6b7280;padding:24px">Select a <b>Province</b> and enter a <b>Job title</b> to search.</p>`;
      return;
    }
    jobs = applyJobFilters(jobs);
  }
  const applied = loadApplied();
  if(!jobs.length){
    el.innerHTML = `<p style="text-align:center;color:#6b7280;padding:24px">${userJobsSource==='external'?'No online jobs found. Try a different search.':'No jobs posted on this site yet.'}</p>`;
    return;
  }
  el.innerHTML = jobs.map(j=>{
    const tags = [j.type, j.mode, j.experience, j.location].filter(Boolean);
    const isApplied = !!applied[j.id];
    const isExt = j.source === 'external';
    return `<div class="uj-card" data-id="${j.id}">
      <button class="uj-head" type="button" data-act="toggle">
        <div style="flex:1">
          <div class="uj-title">${escapeHtmlSafe(j.title)}</div>
          <div class="uj-sub">${escapeHtmlSafe(j.company)} • ${escapeHtmlSafe(j.location||'—')}</div>
        </div>
        <span class="uj-time">${escapeHtmlSafe((j.postedAt||j.posted||'').slice(0,10))}</span>
        <span class="uj-caret">▾</span>
      </button>
      <div class="uj-body" hidden>
        <div class="uj-tags">${tags.map(t=>`<span class="uj-tag">${escapeHtmlSafe(t)}</span>`).join('')}</div>
        ${j.salary?`<h4>Salary</h4><p>${escapeHtmlSafe(j.salary)}</p>`:''}
        ${j.description?`<h4>About the role</h4><p>${escapeHtmlSafe(j.description)}</p>`:''}
        ${j.requirements?`<h4>Requirements</h4><p>${escapeHtmlSafe(j.requirements)}</p>`:''}
        ${j.benefits?`<h4>Benefits &amp; accessibility</h4><p>${escapeHtmlSafe(j.benefits)}</p>`:''}
        ${j.closingDate?`<h4>Closing date</h4><p>${escapeHtmlSafe(j.closingDate)}</p>`:''}
        ${j.email?`<h4>Apply via</h4><p>${escapeHtmlSafe(j.email)}</p>`:''}
        <div class="uj-actions">
          ${isExt
            ? `<a class="btn-accent" href="${escapeHtmlSafe(j.url||'#')}" target="_blank" rel="noopener">Apply on company site ↗</a>`
            : (isApplied
                ? `<span class="uj-applied-badge">✓ Applied</span>`
                : `<button class="btn-accent" data-act="apply">Apply with my CV</button>`)}
        </div>
      </div>
    </div>`;
  }).join('');
  el.querySelectorAll('.uj-card').forEach(card=>{
    const id = card.dataset.id;
    card.querySelector('[data-act="toggle"]').addEventListener('click', ()=>{
      const body = card.querySelector('.uj-body');
      body.hidden = !body.hidden;
      card.classList.toggle('open', !body.hidden);
    });
    const applyBtn = card.querySelector('[data-act="apply"]');
    if(applyBtn) applyBtn.addEventListener('click', async ()=>{
      const cv = loadCV();
      if(!cv){ alert('No CV on file. Please upload your CV first using the CV Job Matcher.'); goToPage('jobs'); return; }
      try{
        const res = await fetch('/api/applications', { method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ jobId:id }) });
        const data = await res.json().catch(()=>({}));
        if(!res.ok) throw new Error(data.message || 'Application failed');
        const a = loadApplied(); a[id] = { ts:Date.now(), cv:cv.name }; saveApplied(a);
        await (window.refreshSupabaseJobsForUser ? window.refreshSupabaseJobsForUser() : Promise.resolve());
        renderUserJobs(); initCharts(); renderSavedJobs();
        alert('Application submitted successfully.');
      }catch(err){ alert('Could not apply: '+err.message); }
    });
  });
}
window.addEventListener('load', ()=>{
  renderUserJobs();
  document.querySelectorAll('.uj-filter-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      userJobsSource = btn.dataset.source;
      document.querySelectorAll('.uj-filter-btn').forEach(b=>{
        const on = b===btn;
        b.classList.toggle('active', on);
        b.setAttribute('aria-selected', on?'true':'false');
      });
      if(userJobsSource==='external' && !externalJobs.length && !externalLoading){
        fetchExternalJobs(externalQuery);
      } else {
        renderUserJobs();
      }
    });
  });
  const sBtn = document.getElementById('uj-search-btn');
  const sInp = document.getElementById('uj-search-input');
  function runSearch(){
    const title = (document.getElementById('uj-jobtitle')?.value || '').trim();
    externalQuery = [sInp.value.trim(), title].filter(Boolean).join(' ');
    fetchExternalJobs(externalQuery);
  }
  if(sBtn) sBtn.addEventListener('click', runSearch);
  if(sInp) sInp.addEventListener('keydown', e=>{ if(e.key==='Enter') runSearch(); });
  ['uj-province','uj-jobtitle','uj-city','uj-seniority'].forEach(id=>{
    const elx = document.getElementById(id);
    if(!elx) return;
    elx.addEventListener('change', renderUserJobs);
    elx.addEventListener('input', renderUserJobs);
  });
});


// ===== Voice & Translation (Web Speech API) =====
const micBtn = document.getElementById('mic-btn');
const micStatus = document.getElementById('mic-status');
const transcriptEl = document.getElementById('transcript');
const srcLang = document.getElementById('src-lang');
const tgtLang = document.getElementById('tgt-lang');
const translationEl = document.getElementById('translation');
const translateBtn = document.getElementById('translate-btn');
const speakBtn = document.getElementById('speak-btn');

let recognition = null;
let mediaRecorder = null;
let mediaChunks = [];
let usingDeepgram = false;
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

async function transcribeWithDeepgram(blob){
  const fd = new FormData();
  fd.append('audio', blob, 'voice.webm');
  const r = await fetch('/api/deepgram/transcribe', { method:'POST', body: fd });
  const j = await r.json();
  if(!r.ok) throw new Error(j.error || 'Deepgram transcription failed');
  return j.transcript || '';
}

if(SR && micBtn){
  recognition = new SR();
  recognition.interimResults = true;
  recognition.continuous = true;
  recognition.onresult = (ev)=>{
    let txt = '';
    for(let i=0;i<ev.results.length;i++) txt += ev.results[i][0].transcript;
    transcriptEl.value = txt;
  };
  recognition.onend = ()=>{ if(!usingDeepgram){ micBtn.classList.remove('recording'); micStatus.textContent='Stopped'; } };
}
if(micBtn){
  micBtn.addEventListener('click', async ()=>{
    if(micBtn.classList.contains('recording')){
      if(mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
      else if(recognition) recognition.stop();
      micBtn.classList.remove('recording');
      micStatus.textContent='Processing...';
      return;
    }

    transcriptEl.value='';

    // Primary integration: Deepgram server transcription.
    if(navigator.mediaDevices && window.MediaRecorder){
      try{
        const stream = await navigator.mediaDevices.getUserMedia({ audio:true });
        mediaChunks = [];
        mediaRecorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : undefined });
        usingDeepgram = true;
        mediaRecorder.ondataavailable = e => { if(e.data && e.data.size) mediaChunks.push(e.data); };
        mediaRecorder.onstop = async ()=>{
          stream.getTracks().forEach(t=>t.stop());
          micBtn.classList.remove('recording');
          micStatus.textContent='Transcribing with Deepgram...';
          try{
            const blob = new Blob(mediaChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
            const text = await transcribeWithDeepgram(blob);
            transcriptEl.value = text || '(No speech detected)';
            micStatus.textContent='Deepgram transcript ready';
          }catch(err){
            micStatus.textContent='Deepgram failed, using browser voice if available';
            if(recognition){ recognition.lang = srcLang.value; recognition.start(); }
            else alert(err.message);
          }finally{ usingDeepgram = false; }
        };
        mediaRecorder.start();
        micBtn.classList.add('recording');
        micStatus.textContent='Recording... tap again to stop';
        return;
      }catch(err){
        console.warn('Microphone/Deepgram recording failed:', err);
      }
    }

    // Fallback: built-in browser speech recognition.
    if(!recognition){ alert('Speech recognition not supported in this browser. Try Chrome/Edge.'); return; }
    recognition.lang = srcLang.value;
    recognition.start();
    micBtn.classList.add('recording');
    micStatus.textContent='Listening with browser speech...';
  });
}
if(translateBtn){
  translateBtn.addEventListener('click', async ()=>{
    const q = transcriptEl.value.trim();
    if(!q){alert('Nothing to translate yet.');return;}
    translationEl.value='Translating...';
    try{
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(q)}&langpair=${encodeURIComponent(srcLang.value.split('-')[0])}|${encodeURIComponent(tgtLang.value)}`;
      const r = await fetch(url);
      const j = await r.json();
      const out = j?.responseData?.translatedText || '(no translation)';
      translationEl.value = out;
      saveConversation({
        ts: Date.now(),
        src: srcLang.value, tgt: tgtLang.value,
        source: q, translation: out
      });
    }catch(err){
      translationEl.value = 'Translation failed: ' + err.message;
    }
  });
}
if(speakBtn){
  speakBtn.addEventListener('click',()=>{
    const t = translationEl.value.trim();
    if(!t) return;
    const u = new SpeechSynthesisUtterance(t);
    u.lang = tgtLang.value;
    u.rate = window.AINativesSpeechRate || 1;
    speechSynthesis.speak(u);
  });
}

// ===== Previous conversations (persisted) =====
const CONVO_KEY = 'ems.voiceConversations';
const convoList = document.getElementById('convo-list');
const convoEmpty = document.getElementById('convo-empty');
const convoClear = document.getElementById('convo-clear');
function loadConvos(){
  try { return JSON.parse(localStorage.getItem(CONVO_KEY)) || []; } catch { return []; }
}
function saveConversation(item){
  const list = loadConvos();
  list.unshift(item);
  localStorage.setItem(CONVO_KEY, JSON.stringify(list.slice(0,50)));
  renderConvos();
}
function renderConvos(){
  if(!convoList) return;
  const list = loadConvos();
  if(!list.length){
    convoEmpty.hidden = false;
    convoList.hidden = true;
    convoList.innerHTML = '';
    return;
  }
  convoEmpty.hidden = true;
  convoList.hidden = false;
  convoList.innerHTML = list.map(c=>{
    const d = new Date(c.ts).toLocaleString();
    return `<li class="convo-item">
      <div class="convo-meta">
        <span class="convo-langs">${c.src} → ${c.tgt}</span>
        <span class="convo-time">${d}</span>
      </div>
      <div class="convo-src">${escapeHtml(c.source)}</div>
      <div class="convo-tgt">${escapeHtml(c.translation)}</div>
    </li>`;
  }).join('');
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));}
if(convoClear){
  convoClear.addEventListener('click',()=>{
    if(!confirm('Clear all saved conversations?')) return;
    localStorage.removeItem(CONVO_KEY);
    renderConvos();
  });
}
renderConvos();

// ===== Saved locations (user) =====
const SITES_KEY = 'ems.savedSites';
function loadSites(){
  try { return JSON.parse(localStorage.getItem(SITES_KEY)) || []; } catch { return []; }
}
function saveSites(arr){ localStorage.setItem(SITES_KEY, JSON.stringify(arr)); }
function escapeAttr(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}

let siteMarkers = [];
function renderSites(){
  const ul = document.getElementById('site-list');
  const empty = document.getElementById('site-empty');
  if(!ul) return;
  const sites = loadSites();
  if(!sites.length){
    ul.innerHTML = '';
    if(empty) empty.hidden = false;
  } else {
    if(empty) empty.hidden = true;
    ul.innerHTML = sites.map((s,i)=>`
      <li data-idx="${i}" data-lat="${s.lat}" data-lng="${s.lng}">
        <span class="material-icons">place</span>
        <div style="flex:1">
          <div class="site-name">${escapeAttr(s.name)}</div>
          <div class="site-sub">${s.lat.toFixed(4)}, ${s.lng.toFixed(4)}</div>
        </div>
        <button class="site-remove" data-remove="${i}" title="Remove" aria-label="Remove location">
          <span class="material-icons" style="font-size:18px">close</span>
        </button>
      </li>`).join('');
  }
  // Refresh markers on the map
  if(configMap){
    siteMarkers.forEach(m=>configMap.removeLayer(m));
    siteMarkers = [];
    sites.forEach(s=>{
      const m = L.marker([s.lat,s.lng]).addTo(configMap).bindPopup(s.name);
      siteMarkers.push(m);
    });
  }
}

// Site form + interactions
document.addEventListener('submit', (e)=>{
  if(e.target?.id !== 'site-form') return;
  e.preventDefault();
  const name = document.getElementById('site-name-input').value.trim();
  const lat = parseFloat(document.getElementById('site-lat-input').value);
  const lng = parseFloat(document.getElementById('site-lng-input').value);
  if(!name || isNaN(lat) || isNaN(lng)) return;
  const sites = loadSites();
  sites.push({name, lat, lng});
  saveSites(sites);
  e.target.reset();
  renderSites();
});
document.addEventListener('click', (e)=>{
  const rm = e.target.closest('[data-remove]');
  if(rm){
    e.stopPropagation();
    const i = parseInt(rm.dataset.remove,10);
    const sites = loadSites();
    sites.splice(i,1);
    saveSites(sites);
    renderSites();
    return;
  }
  const li = e.target.closest('#site-list li');
  if(li && configMap){
    const lat = parseFloat(li.dataset.lat), lng = parseFloat(li.dataset.lng);
    configMap.flyTo([lat,lng], 13);
  }
});

// ===== Maps (Leaflet) =====
let configMap = null, navMap = null;
function initConfigMap(){
  const el = document.getElementById('config-map');
  if(!el || typeof L === 'undefined') return;
  if(!configMap){
    configMap = L.map('config-map').setView([20, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
      attribution:'© OpenStreetMap', maxZoom:19
    }).addTo(configMap);
  }
  renderSites();
  setTimeout(()=>configMap.invalidateSize(), 100);
}
let navRouteLayer = null;
let navUserMarker = null;
let navUserAccCircle = null;
let navWatchId = null;
const STEP_ICONS = { depart:'place', arrive:'flag', turn:'turn_right', 'new name':'straight', continue:'straight', merge:'merge', roundabout:'roundabout_left', rotary:'roundabout_left', 'roundabout turn':'roundabout_left', fork:'call_split', 'end of road':'turn_sharp_right', 'use lane':'straight', notification:'info', 'exit roundabout':'roundabout_right', 'exit rotary':'roundabout_right' };
function stepIcon(s){
  const t = s.maneuver?.type || '';
  const m = s.maneuver?.modifier || '';
  if(t==='turn' && m){
    if(m.includes('left')) return m.includes('sharp')?'turn_sharp_left':m.includes('slight')?'turn_slight_left':'turn_left';
    if(m.includes('right')) return m.includes('sharp')?'turn_sharp_right':m.includes('slight')?'turn_slight_right':'turn_right';
    if(m==='straight'||m==='uturn') return m==='uturn'?'u_turn_left':'straight';
  }
  return STEP_ICONS[t] || 'navigation';
}
function maneuverText(s){
  const t = s.maneuver?.type || 'continue';
  const m = s.maneuver?.modifier ? ' '+s.maneuver.modifier : '';
  const road = s.name ? ' onto '+s.name : '';
  if(t==='depart') return 'Start'+(s.name?' on '+s.name:'');
  if(t==='arrive') return 'Arrive at destination';
  if(t==='turn') return 'Turn'+m+road;
  if(t==='roundabout'||t==='rotary') return 'Take the roundabout'+road;
  if(t==='merge') return 'Merge'+m+road;
  if(t==='fork') return 'Keep'+m+road;
  if(t==='new name') return 'Continue'+road;
  if(t==='continue') return 'Continue'+m+road;
  return (t.charAt(0).toUpperCase()+t.slice(1))+m+road;
}
function fmtDist(m){ return m>=1000 ? (m/1000).toFixed(1)+' km' : Math.round(m)+' m'; }
function renderRouteSteps(steps, summary){
  const el = document.getElementById('route-steps'); if(!el) return;
  if(!steps || !steps.length){
    el.innerHTML = '<li><span class="material-icons">info</span> No turn-by-turn directions available.</li>';
    return;
  }
  const head = summary ? `<li style="font-weight:600"><span class="material-icons">route</span> ${summary}</li>` : '';
  el.innerHTML = head + steps.map(s=>{
    const dist = s.distance ? ` <span style="color:#6b7280;font-size:12px">(${fmtDist(s.distance)})</span>` : '';
    return `<li><span class="material-icons">${stepIcon(s)}</span> ${escapeHtmlSafe(maneuverText(s))}${dist}</li>`;
  }).join('');
}
function initNavMap(){
  const el = document.getElementById('nav-map');
  if(!el || typeof L === 'undefined') return;
  if(!navMap){
    navMap = L.map('nav-map').setView([51.5074, -0.1278], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
      attribution:'© OpenStreetMap', maxZoom:19
    }).addTo(navMap);
    startLocationWatch();
  }
  setTimeout(()=>navMap.invalidateSize(), 100);
}
function startLocationWatch(){
  if(!navigator.geolocation || navWatchId!==null) return;
  navWatchId = navigator.geolocation.watchPosition(pos=>{
    const ll = [pos.coords.latitude, pos.coords.longitude];
    const acc = pos.coords.accuracy || 30;
    if(!navUserMarker){
      navUserMarker = L.circleMarker(ll,{radius:8,color:'#fff',weight:2,fillColor:'#2563eb',fillOpacity:1}).addTo(navMap).bindPopup('You are here');
      navUserAccCircle = L.circle(ll,{radius:acc,color:'#2563eb',weight:1,fillOpacity:.1}).addTo(navMap);
      navMap.setView(ll, 16);
    } else {
      navUserMarker.setLatLng(ll);
      navUserAccCircle.setLatLng(ll).setRadius(acc);
    }
    const fromInp = document.getElementById('route-from');
    if(fromInp && (!fromInp.value || fromInp.dataset.auto==='1')){
      fromInp.value = 'My location';
      fromInp.dataset.auto = '1';
    }
  }, err=>console.warn('Geolocation error:', err.message), {enableHighAccuracy:true, maximumAge:5000, timeout:15000});
}
async function getMyLocation(){
  return new Promise((resolve)=>{
    if(navUserMarker){ const ll = navUserMarker.getLatLng(); return resolve([ll.lat, ll.lng]); }
    if(!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      p=>resolve([p.coords.latitude, p.coords.longitude]),
      ()=>resolve(null),
      {enableHighAccuracy:true, timeout:10000}
    );
  });
}
async function drawNavRoute(a, b, aLabel, bLabel){
  if(!navMap) return;
  if(navRouteLayer){ navMap.removeLayer(navRouteLayer); }
  navRouteLayer = L.layerGroup().addTo(navMap);
  L.marker(a).addTo(navRouteLayer).bindPopup(aLabel||'Start');
  L.marker(b).addTo(navRouteLayer).bindPopup(bLabel||'Destination');
  let coords = null, steps = [], summary = '';
  try {
    const url = `https://router.project-osrm.org/route/v1/foot/${a[1]},${a[0]};${b[1]},${b[0]}?overview=full&geometries=geojson&steps=true`;
    const r = await fetch(url);
    const j = await r.json();
    if(j.code==='Ok' && j.routes?.[0]){
      const route = j.routes[0];
      coords = route.geometry.coordinates.map(c=>[c[1],c[0]]);
      steps = route.legs?.[0]?.steps || [];
      summary = `${fmtDist(route.distance)} • ~${Math.round(route.duration/60)} min walk`;
    }
  } catch(err){ console.warn('Routing failed:', err); }
  if(coords && coords.length){
    L.polyline(coords,{color:'#22c55e',weight:5,opacity:.9}).addTo(navRouteLayer);
    navMap.fitBounds(L.latLngBounds(coords).pad(0.2));
  } else {
    L.polyline([a,b],{color:'#ef4444',weight:4,opacity:.7,dashArray:'6,8'}).addTo(navRouteLayer);
    navMap.fitBounds(L.latLngBounds([a,b]).pad(0.4));
  }
  renderRouteSteps(steps, summary);
}
async function geocode(q){
  if(!q) return null;
  if(/^my location$/i.test(q.trim())){ return await getMyLocation(); }
  try {
    const r = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&q='+encodeURIComponent(q));
    const j = await r.json();
    if(j && j[0]) return [parseFloat(j[0].lat), parseFloat(j[0].lon)];
  } catch {}
  return null;
}
document.addEventListener('click', async (e)=>{
  if(e.target?.id !== 'route-btn' && !e.target?.closest?.('#route-btn')) return;
  e.preventDefault();
  const fromQ = document.getElementById('route-from')?.value.trim();
  const toQ = document.getElementById('route-to')?.value.trim();
  if(!fromQ || !toQ){ alert('Please enter both a From and To location.'); return; }
  initNavMap();
  const btn = document.getElementById('route-btn');
  const orig = btn.innerHTML; btn.disabled = true; btn.innerHTML = 'Finding route…';
  const [a, b] = await Promise.all([geocode(fromQ), geocode(toQ)]);
  if(!a || !b){ btn.disabled=false; btn.innerHTML=orig; alert('Could not find one of the locations. Try a more specific name (or allow location access for "My location").'); return; }
  await drawNavRoute(a, b, fromQ, toQ);
  btn.disabled = false; btn.innerHTML = orig;
});


// ===== Saved Jobs CRUD =====
const SAVED_JOBS_KEY = 'ems.savedJobs';
function loadSavedJobs(){ try{return JSON.parse(localStorage.getItem(SAVED_JOBS_KEY))||[];}catch{return [];} }
function saveSavedJobs(a){ localStorage.setItem(SAVED_JOBS_KEY, JSON.stringify(a)); }

function renderSavedJobs(){
  const list = document.getElementById('jobs-list');
  const empty = document.getElementById('jobs-empty');
  if(!list) return;
  const jobs = loadSavedJobs();
  if(!jobs.length){
    list.hidden = true; if(empty) empty.hidden = false;
  } else {
    if(empty) empty.hidden = true;
    list.hidden = false;
    list.innerHTML = jobs.map(j=>`
      <div class="job-item" data-id="${j.id}" style="display:flex;align-items:center;gap:10px;padding:10px;border-bottom:1px solid var(--border,#e8eae7)">
        <div style="flex:1">
          <input class="field-input" data-edit="title" value="${escapeHtml(j.title)}" style="font-weight:600;border:none;padding:2px;background:transparent" />
          <input class="field-input" data-edit="company" value="${escapeHtml(j.company)}" style="font-size:12px;color:var(--muted,#6b7280);border:none;padding:2px;background:transparent" />
        </div>
        <select data-edit="status" class="field-select" style="width:auto">
          ${['Applied','In Review','Interview','Offer','Rejected'].map(s=>`<option ${j.status===s?'selected':''}>${s}</option>`).join('')}
        </select>
        <button class="btn-outline" data-del style="padding:6px 10px;font-size:12px">Delete</button>
      </div>`).join('');
    list.querySelectorAll('.job-item').forEach(row=>{
      const id = row.dataset.id;
      row.querySelectorAll('[data-edit]').forEach(inp=>{
        inp.addEventListener('change', ()=>{
          const arr = loadSavedJobs(); const j = arr.find(x=>x.id===id);
          if(j){ j[inp.dataset.edit] = inp.value; saveSavedJobs(arr); initCharts(); renderUserSummary(); }
        });
      });
      row.querySelector('[data-del]').addEventListener('click', ()=>{
        if(!confirm('Delete this job?')) return;
        saveSavedJobs(loadSavedJobs().filter(x=>x.id!==id));
        renderSavedJobs(); initCharts(); renderUserSummary();
      });
    });
  }
}

document.addEventListener('submit', (e)=>{
  if(e.target?.id !== 'add-job-form') return;
  e.preventDefault();
  const title = document.getElementById('aj-title').value.trim();
  const company = document.getElementById('aj-company').value.trim();
  const status = document.getElementById('aj-status').value;
  if(!title || !company) return;
  const arr = loadSavedJobs();
  arr.unshift({ id:'j'+Date.now(), title, company, status, ts:Date.now() });
  saveSavedJobs(arr);
  e.target.reset();
  renderSavedJobs(); initCharts(); renderUserSummary();
});

renderSavedJobs();
initCharts();

// ===== User Reports (summary + saved reports CRUD) =====
const USER_REPORTS_KEY = 'ems.savedReports';
function loadUserReports(){ try{return JSON.parse(localStorage.getItem(USER_REPORTS_KEY))||[];}catch{return [];} }
function saveUserReports(a){ localStorage.setItem(USER_REPORTS_KEY, JSON.stringify(a)); }

function buildUserSummary(){
  const jobs = loadSavedJobs();
  const c = getJobCounts();
  const sites = loadSites();
  const convos = loadConvos();
  return {
    'Saved jobs (total)': jobs.length,
    'Applied': c.Applied,
    'In Review': c['In Review'],
    'Interviews': c.Interview,
    'Offers': c.Offer,
    'Rejections': c.Rejected,
    'Saved locations': sites.length,
    'Voice conversations': convos.length,
  };
}

function renderUserSummary(){
  const el = document.getElementById('user-summary-grid'); if(!el) return;
  const sum = buildUserSummary();
  el.innerHTML = Object.entries(sum).map(([k,v])=>`
    <div class="kpi-card">
      <div class="kpi-top"><span class="kpi-label">${k}</span></div>
      <div class="kpi-value">${v}</div>
    </div>`).join('');
}

function renderUserSavedReports(){
  const el = document.getElementById('user-saved-reports'); if(!el) return;
  const reports = loadUserReports();
  if(!reports.length){ el.innerHTML = '<div style="padding:16px;text-align:center;color:var(--muted,#6b7280)">No saved reports yet.</div>'; return; }
  el.innerHTML = `<table class="report-table" style="width:100%">
    <thead><tr><th>Name</th><th>Saved at</th><th>Items</th><th></th></tr></thead>
    <tbody>${reports.map(r=>`
      <tr>
        <td>${escapeHtml(r.name)}</td>
        <td>${new Date(r.ts).toLocaleString()}</td>
        <td>${Object.keys(r.data||{}).length}</td>
        <td>
          <button class="btn-outline" onclick="downloadUserReport('${r.id}')" style="padding:4px 10px;font-size:12px">Download</button>
          <button class="btn-outline" onclick="deleteUserReport('${r.id}')" style="padding:4px 10px;font-size:12px;color:#b91c1c">Delete</button>
        </td>
      </tr>`).join('')}
    </tbody></table>`;
}

// Employer-posted application status loaded from backend when available
let EMPLOYER_POSTED_JOBS = [];
function statusClass(s){ return ({'Applied':'sp-Applied','In Review':'sp-Review','Interview':'sp-Interview','Offer':'sp-Offer','Rejected':'sp-Rejected'})[s]||''; }
function renderEmployerJobs(){
  const el = document.getElementById('user-employer-jobs'); if(!el) return;
  el.innerHTML = `<table class="pdfm-table" style="width:100%">
    <thead><tr><th>Job Title</th><th>Company</th><th>Location</th><th>Posted</th><th>My Status</th></tr></thead>
    <tbody>${EMPLOYER_POSTED_JOBS.map(j=>`<tr>
      <td><strong>${escapeHtml(j.title)}</strong></td>
      <td>${escapeHtml(j.company)}</td>
      <td>${escapeHtml(j.location)}</td>
      <td>${j.posted}</td>
      <td><span class="status-pill ${statusClass(j.status)}">${j.status}</span></td>
    </tr>`).join('')}</tbody></table>`;
}

function buildUserReportHTML(){
  const sum = buildUserSummary();
  const c = getJobCounts();
  const tilesHTML = Object.entries(sum).map(([k,v])=>`<div class="pdfm-tile"><div class="pdfm-tile-l">${k}</div><div class="pdfm-tile-v">${v}</div></div>`).join('');
  const jobsHTML = `<table class="pdfm-table"><thead><tr><th>Job Title</th><th>Company</th><th>Location</th><th>Posted</th><th>My Status</th></tr></thead><tbody>${
    EMPLOYER_POSTED_JOBS.map(j=>`<tr><td><strong>${escapeHtml(j.title)}</strong></td><td>${escapeHtml(j.company)}</td><td>${escapeHtml(j.location)}</td><td>${j.posted}</td><td><span class="status-pill ${statusClass(j.status)}">${j.status}</span></td></tr>`).join('')
  }</tbody></table>`;
  return `
    <h1>My Activity Report</h1>
    <div class="pdfm-meta">Generated ${new Date().toLocaleString()}</div>
    <h2>📊 Application Progress</h2>
    <div class="pdfm-chart-wrap"><canvas id="pdfm-chart"></canvas></div>
    <h2>📋 Activity Summary</h2>
    <div class="pdfm-grid">${tilesHTML}</div>
    <h2>💼 Employer-posted Jobs &amp; My Status (${EMPLOYER_POSTED_JOBS.length})</h2>
    ${jobsHTML}
    <div style="margin-top:24px;font-size:11px;color:#9ca3af;text-align:center">AI Natives — Confidential</div>
  `;
}

let _pdfChart = null;
function openUserReportPreview(){
  const page = document.getElementById('pdfm-page');
  page.innerHTML = buildUserReportHTML();
  document.getElementById('pdfm-overlay').classList.add('open');
  // build chart
  setTimeout(()=>{
    const c = getJobCounts();
    const ctx = document.getElementById('pdfm-chart');
    if(_pdfChart) _pdfChart.destroy();
    _pdfChart = new Chart(ctx, {
      type:'bar',
      data:{ labels:['Applied','In Review','Interview','Offer','Rejected'],
        datasets:[{ label:'Applications', data:[c.Applied,c['In Review'],c.Interview,c.Offer,c.Rejected],
          backgroundColor:['#16a34a','#3b82f6','#f59e0b','#16a34a','#ef4444']}]},
      options:{ responsive:true, maintainAspectRatio:false, animation:false,
        plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true,ticks:{stepSize:1}}}}
    });
  },50);
  document.getElementById('pdfm-export').onclick = exportUserReportPdf;
}
function closePdfPreview(){ document.getElementById('pdfm-overlay').classList.remove('open'); }

async function exportUserReportPdf(){
  const page = document.getElementById('pdfm-page');
  const canvas = await html2canvas(page, {scale:2, backgroundColor:'#ffffff'});
  const imgData = canvas.toDataURL('image/png');
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF('p','mm','a4');
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const imgW = pageW;
  const imgH = canvas.height * imgW / canvas.width;
  let heightLeft = imgH; let position = 0;
  pdf.addImage(imgData, 'PNG', 0, position, imgW, imgH);
  heightLeft -= pageH;
  while(heightLeft > 0){
    position = heightLeft - imgH;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, imgW, imgH);
    heightLeft -= pageH;
  }
  const fname = 'my-report-'+new Date().toISOString().slice(0,10)+'.pdf';
  pdf.save(fname);
  // also persist to saved reports list
  const r = { id:'r'+Date.now(), name:'My report '+new Date().toLocaleDateString(), ts:Date.now(), data: buildUserSummary() };
  const arr = loadUserReports(); arr.unshift(r); saveUserReports(arr);
  renderUserSavedReports();
  closePdfPreview();
}

// Override save handler to open preview instead
function saveUserReport(){ openUserReportPreview(); }
function downloadUserReport(id){
  // Re-open preview for any saved report
  openUserReportPreview();
}
function deleteUserReport(id){
  if(!confirm('Delete this saved report?')) return;
  saveUserReports(loadUserReports().filter(r=>r.id!==id));
  renderUserSavedReports();
}
function clearAllUserReports(){
  if(!confirm('Delete ALL saved reports?')) return;
  saveUserReports([]); renderUserSavedReports();
}

// Render summary + saved list when entering reports
const _origGoToPage = goToPage;
goToPage = function(target){
  _origGoToPage(target);
  if(target==='reports'){ renderUserSummary(); renderUserSavedReports(); renderEmployerJobs(); }
  if(target==='dashboard' || target==='jobs'){ initCharts(); }
};

/* ═══════════════════════════════════════
   PERSONAL REPORT BUILDER (filters + chart picker + export)
════════════════════════════════════════ */
(function(){
  function getChecked(containerId){
    return Array.from(document.querySelectorAll('#'+containerId+' input[type=checkbox]:checked')).map(i=>i.value);
  }
  function buildReportData(){
    const sections = getChecked('rep-sections');
    const charts   = getChecked('rep-charts');
    const range    = (document.getElementById('rep-range')||{}).value || '30';
    const rangeLabel = range==='all' ? 'All time' : 'Last '+range+' days';

    const data = { generatedAt: new Date().toISOString(), range: rangeLabel, charts, sections: {} };
    if (sections.includes('summary')) data.sections.summary = { jobsApplied: 12, interviews: 4, offers: 1 };
    if (sections.includes('status')) data.sections.status = [
      { job:'Junior Software Developer', status:'Pending' },
      { job:'Designer', status:'Rejected' },
      { job:'Tester',   status:'Interview' },
    ];
    if (sections.includes('success')) data.sections.success = { applicationsToInterviews:'33%', interviewsToOffers:'25%' };
    if (sections.includes('feedback')) data.sections.feedback = ['Strong portfolio — work on accessibility testing knowledge.','Improve interview communication.'];
    if (sections.includes('skills'))   data.sections.skills   = { strong:['HTML','CSS','React'], missing:['TypeScript','Accessibility audit'] };
    if (sections.includes('recs'))     data.sections.recs     = ['Apply to more accessibility-focused roles.','Update CV with recent project work.'];
    return data;
  }

  function renderPreview(){
    const el = document.getElementById('rep-preview'); if(!el) return;
    const d = buildReportData();
    const sectionKeys = Object.keys(d.sections);
    if (sectionKeys.length===0 && d.charts.length===0){
      el.innerHTML = '<div class="rep-empty">Select at least one section or chart to preview.</div>';
      return;
    }
    let html = `<div class="rep-section"><strong>Range:</strong> ${d.range} &nbsp;·&nbsp; <strong>Charts:</strong> ${d.charts.length? d.charts.join(', ') : '—'}</div>`;
    if (d.sections.summary)  html += `<div class="rep-section"><h4>Personal Summary</h4>Jobs applied: ${d.sections.summary.jobsApplied} · Interviews: ${d.sections.summary.interviews} · Offers: ${d.sections.summary.offers}</div>`;
    if (d.sections.status)   html += `<div class="rep-section"><h4>Application Status</h4>${d.sections.status.map(r=>`${r.job} — <em>${r.status}</em>`).join('<br>')}</div>`;
    if (d.sections.success)  html += `<div class="rep-section"><h4>Success Rate</h4>Applications → Interviews: ${d.sections.success.applicationsToInterviews}<br>Interviews → Offers: ${d.sections.success.interviewsToOffers}</div>`;
    if (d.sections.feedback) html += `<div class="rep-section"><h4>Employer Feedback</h4>${d.sections.feedback.map(f=>'• '+f).join('<br>')}</div>`;
    if (d.sections.skills)   html += `<div class="rep-section"><h4>Skill Insights</h4>Strong: ${d.sections.skills.strong.join(', ')}<br>Missing: ${d.sections.skills.missing.join(', ')}</div>`;
    if (d.sections.recs)     html += `<div class="rep-section"><h4>Recommendations</h4>${d.sections.recs.map(r=>'• '+r).join('<br>')}</div>`;
    el.innerHTML = html;
  }

  function download(name, type, content){
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }
  function toCSV(d){
    const rows = [['Section','Field','Value']];
    Object.entries(d.sections).forEach(([k,v])=>{
      if (Array.isArray(v)) v.forEach((x,i)=> rows.push([k, '#'+(i+1), typeof x==='object'? JSON.stringify(x): String(x)]));
      else if (typeof v==='object') Object.entries(v).forEach(([f,val])=> rows.push([k,f, Array.isArray(val)? val.join('; '): String(val)]));
      else rows.push([k,'',String(v)]);
    });
    return rows.map(r=> r.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(',')).join('\n');
  }
  function exportReport(){
    const d = buildReportData();
    if (Object.keys(d.sections).length===0){ alert('Select at least one section to export.'); return; }
    const fmt = (document.getElementById('rep-format')||{}).value || 'pdf';
    const ts = new Date().toISOString().replace(/[:.]/g,'-');
    const formats = fmt==='all' ? ['pdf','csv','json'] : [fmt];
    formats.forEach(f=>{
      if (f==='json') download('my-report-'+ts+'.json','application/json', JSON.stringify(d,null,2));
      else if (f==='csv') download('my-report-'+ts+'.csv','text/csv', toCSV(d));
      else {
        const html = `<!doctype html><html><head><meta charset="utf-8"><title>My Report</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#1a1f18} h1{margin:0 0 6px} h3{margin:18px 0 4px} .muted{color:#6b7280;font-size:12px}</style></head><body><h1>My Personal Report</h1><div class="muted">Generated ${new Date(d.generatedAt).toLocaleString()} · ${d.range} · Charts: ${d.charts.join(', ')||'—'}</div>`+ document.getElementById('rep-preview').innerHTML +'<script>window.onload=()=>setTimeout(()=>window.print(),200)<\/script></body></html>';
        const w = window.open('', '_blank'); if (w){ w.document.write(html); w.document.close(); }
      }
    });
  }

  function init(){
    if (!document.getElementById('rep-sections')) return;
    document.querySelectorAll('#rep-sections input, #rep-charts input, #rep-range, #rep-format').forEach(el=> el.addEventListener('change', renderPreview));
    const sa = document.getElementById('rep-sections-all');
    if (sa) sa.addEventListener('click', ()=>{ document.querySelectorAll('#rep-sections input').forEach(i=> i.checked=true); renderPreview(); });
    const ca = document.getElementById('rep-charts-all');
    if (ca) ca.addEventListener('click', ()=>{ document.querySelectorAll('#rep-charts input').forEach(i=> i.checked=true); renderPreview(); });
    const ex = document.getElementById('rep-export');
    if (ex) ex.addEventListener('click', exportReport);
    renderPreview();
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

// ===== Report gating: show report content only after Save & Download =====
(function(){
  const btn = document.getElementById('btn-generate-report');
  if(!btn) return;
  btn.addEventListener('click', ()=>{
    const c = document.getElementById('report-content');
    if(c){ c.hidden = false; }
    renderUserSummary(); renderUserSavedReports(); renderEmployerJobs();
    if(typeof saveUserReport === 'function') saveUserReport();
  });
})();

// ===== Text-to-Speech (type and read aloud) =====
(function initTTS(){
  const inp = document.getElementById('tts-input');
  const lang = document.getElementById('tts-lang');
  const rate = document.getElementById('tts-rate');
  const sBtn = document.getElementById('tts-speak');
  const stop = document.getElementById('tts-stop');
  if(!sBtn || !inp) return;
  sBtn.addEventListener('click', ()=>{
    const t = (inp.value||'').trim();
    if(!t){ alert('Type some text to read aloud.'); return; }
    try { speechSynthesis.cancel(); } catch(e){}
    const u = new SpeechSynthesisUtterance(t);
    u.lang = lang ? lang.value : 'en-US';
    u.rate = window.AINativesSpeechRate || (rate ? parseFloat(rate.value) : 1);
    speechSynthesis.speak(u);
  });
  if(stop) stop.addEventListener('click', ()=>{ try{ speechSynthesis.cancel(); }catch(e){} });
})();

(function(){
  async function loadSupabaseJobs(){
    try{
      const res = await fetch('/api/jobs', { credentials:'include' });
      const data = await res.json().catch(()=>[]);
      if(!res.ok) throw new Error(data?.message || data?.error || 'Could not load jobs');
      const jobs = data.map(window.aiMapDbJob || (j=>j));
      localStorage.setItem('ems.jobs', JSON.stringify(jobs));
      if(typeof renderUserJobs === 'function') renderUserJobs();
      if(typeof renderEmployerJobs === 'function') renderEmployerJobs();
    }catch(err){ console.warn('Supabase jobs unavailable:', err.message); }
  }
  document.addEventListener('DOMContentLoaded', loadSupabaseJobs);
  window.refreshSupabaseJobsForUser = loadSupabaseJobs;
})();

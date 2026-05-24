function textTokens(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3);
}

const COMMON = new Set(['and','the','for','with','you','are','that','this','from','have','will','your','our','job','work','role','team','skills','experience','responsibilities','requirements','candidate','apply','able','using','user']);

function keywords(text) {
  const counts = new Map();
  for (const token of textTokens(text)) {
    if (COMMON.has(token)) continue;
    counts.set(token, (counts.get(token) || 0) + 1);
  }
  return [...counts.entries()].sort((a,b) => b[1]-a[1]).slice(0, 80).map(([w]) => w);
}

function jobText(job) {
  return [
    job.title,
    job.company_name,
    job.location,
    job.job_type,
    job.work_mode,
    job.department,
    job.experience_level,
    job.description,
    job.requirements,
    job.benefits
  ].filter(Boolean).join(' ');
}

function matchJobToCv(job, cvText) {
  const cvKeys = keywords(cvText);
  const jobKeys = new Set(keywords(jobText(job)));
  const hits = cvKeys.filter(k => jobKeys.has(k));
  const base = Math.min(100, Math.round((hits.length / Math.max(6, jobKeys.size || 1)) * 100));
  const titleBoost = textTokens(job.title).some(t => cvKeys.includes(t)) ? 15 : 0;
  const score = Math.max(0, Math.min(100, base + titleBoost));
  return {
    ...job,
    matchScore: score,
    matchedKeywords: hits.slice(0, 12)
  };
}

function sortMatchedJobs(jobs, cvText) {
  return (jobs || [])
    .map(job => matchJobToCv(job, cvText))
    .sort((a,b) => (b.matchScore || 0) - (a.matchScore || 0) || new Date(b.created_at) - new Date(a.created_at));
}

module.exports = { keywords, matchJobToCv, sortMatchedJobs };

import assert from 'node:assert/strict';

export const SHA_RE = /^[a-f0-9]{40}$/;
export const GATES = ['identity', 'deployment', 'ci', 'live', 'journeys', 'review'];
export const STATES = ['PASS', 'FAIL', 'NOT_TESTED'];
const identifier = /^[a-z][a-z0-9-]{0,62}$/;
const repo = /^thiepn\/[A-Za-z0-9_.-]+$/;
const projectName = /^[a-z0-9-]+$/;

export function safeOrigin(raw) {
  const url = new URL(raw);
  assert.equal(url.protocol, 'https:', 'Production URL must use HTTPS');
  assert(!url.username && !url.password && !url.search && !url.hash, 'URL must have no credentials, query or fragment');
  assert.equal(url.hostname.endsWith('.thiepn.dev'), true, 'Only approved THIEPN subdomains are permitted');
  assert.equal(url.pathname, '/', 'V1 supports root-hosted Pages projects only');
  assert.equal(url.port, '', 'No custom ports');
  return url.origin + '/';
}

export function validateManifest(manifest) {
  assert.equal(manifest?.schemaVersion, 1);
  assert(Array.isArray(manifest.apps) && manifest.apps.length > 0 && manifest.apps.length <= 20);
  const ids = new Set();
  for (const app of manifest.apps) {
    assert(identifier.test(app.id), 'Invalid candidate ID');
    assert(!ids.has(app.id), 'Duplicate candidate ID'); ids.add(app.id);
    assert(repo.test(app.repo), `${app.id}: unsupported repository`);
    safeOrigin(app.productionUrl);
    assert.equal(app.hosting?.provider, 'cloudflare-pages');
    assert(projectName.test(app.hosting.project), 'Invalid Cloudflare Pages project');
    assert(typeof app.expectedTitle === 'string' && app.expectedTitle.length >= 3 && app.expectedTitle.length < 120);
    assert(typeof app.appSelector === 'string' && app.appSelector.length >= 2 && app.appSelector.length < 120);
    assert(Array.isArray(app.requiredJourneys) && app.requiredJourneys.length > 0);
    assert(app.requiredJourneys.every(j => identifier.test(j)));
    assert(new Set(app.requiredJourneys).size === app.requiredJourneys.length);
    assert(Array.isArray(app.ci), 'CI contract must be an array');
    for (const item of app.ci) {
      assert(/^\.github\/workflows\/[A-Za-z0-9_.-]+\.ya?ml$/.test(item.workflow));
      assert(typeof item.job === 'string' && item.job.trim());
      assert(typeof item.step === 'string' && item.step.trim());
    }
    assert(app.review === null || (typeof app.review === 'object' && !Array.isArray(app.review)));
    if (app.review) {
      assert(SHA_RE.test(app.review.sha));
      assert.equal(app.review.reviewer, 'thiepn');
      assert(['approve', 'hold'].includes(app.review.decision));
      assert(Array.isArray(app.review.blockers));
      assert(Number.isFinite(Date.parse(app.review.reviewedAt)));
    }
    assert(app.journeyEvidence === undefined || Array.isArray(app.journeyEvidence));
    for (const e of (app.journeyEvidence || [])) {
      assert(app.requiredJourneys.includes(e.id));
      assert(SHA_RE.test(e.sha));
      assert(/^https:\/\/github\.com\/thiepn\/[A-Za-z0-9_.-]+\/actions\/runs\/[1-9]\d*$/.test(e.runUrl));
      assert(typeof e.job === 'string' && e.job.trim());
      assert(typeof e.step === 'string' && e.step.trim());
    }
  }
  return manifest;
}

export function outcome(state, reason, evidence = null) {
  assert(STATES.includes(state));
  return { state, reason, ...(evidence ? { evidence } : {}) };
}

export function chooseProductionDeployment(deployments, productionBranch) {
  assert(Array.isArray(deployments));
  const production = deployments
    .filter(d => d?.environment === 'production')
    .sort((a,b) => Date.parse(b.created_on || 0) - Date.parse(a.created_on || 0));
  if (!production.length) return { deployment: null, result: outcome('NOT_TESTED', 'No confirmed production deployment found in examined pages') };
  const deployment = production[0];
  if (deployment.deployment_trigger?.metadata?.branch !== productionBranch) return { deployment, result: outcome('FAIL','Latest production deployment branch differs from configured production branch') };
  const sha = deployment.deployment_trigger?.metadata?.commit_hash;
  if (deployment.latest_stage?.status !== 'success') return {deployment, result: outcome(deployment.latest_stage?.status === 'failure' ? 'FAIL':'NOT_TESTED', `Latest production deployment stage: ${deployment.latest_stage?.status || 'unknown'}`)};
  if (!SHA_RE.test(sha || '')) return {deployment, result: outcome('NOT_TESTED','Successful production deployment lacks valid source SHA')};
  return { deployment, result: outcome('PASS','Successful production deployment with recorded source revision', { sha, deploymentId: deployment.id }) };
}

export function checkIdentity(app, project) {
  if (!project) return outcome('NOT_TESTED','Cloudflare project metadata was unavailable');
  if (project.name !== app.hosting.project) return outcome('FAIL','Pages project name does not match candidate');
  const config = project.source?.config;
  if (project.source?.type !== 'github' || !config) return outcome('NOT_TESTED','Pages project is not a linked GitHub source');
  if (`${config.owner}/${config.repo_name}` !== app.repo) return outcome('FAIL','Linked GitHub repository differs from candidate');
  if (!project.domains?.includes(new URL(app.productionUrl).hostname)) return outcome('FAIL','Canonical production hostname is not attached to Pages project');
  if (typeof project.production_branch !== 'string' || !project.production_branch) return outcome('NOT_TESTED','No production branch recorded');
  return outcome('PASS','Canonical domain and repository match Pages configuration');
}

export function checkCiContract(app, sha, runs, jobsByRun) {
  if (!SHA_RE.test(sha || '')) return outcome('NOT_TESTED','Cannot evaluate CI without production SHA');
  if (!Array.isArray(runs)) return outcome('NOT_TESTED','GitHub workflow runs were inaccessible');
  if (app.ci.length === 0) return outcome('NOT_TESTED', 'No required release CI workflow has been defined');
  const detail = [];
  let failed = false;
  for (const required of app.ci) {
    const matching = runs.filter(r => r.head_sha === sha && r.path === required.workflow && r.status === 'completed');
    const eligible = matching.filter(r => r.conclusion === 'success');
    let supported = false;
    for (const run of eligible) {
      const jobs = jobsByRun[run.id];
      if (!Array.isArray(jobs)) continue;
      const job = jobs.find(j => j.name === required.job && j.conclusion === 'success');
      const step = job?.steps?.find(s => s.name === required.step && s.conclusion === 'success' && s.status === 'completed');
      if (step) { supported = true; detail.push({ workflow: required.workflow, runId: run.id, jobId: job.id, step: required.step }); break; }
    }
    if (!supported) {
      if (matching.some(r => ['failure','timed_out','cancelled'].includes(r.conclusion))) failed = true;
      detail.push({ workflow: required.workflow, step: required.step, missing: true });
    }
  }
  if (failed) return outcome('FAIL','Required CI workflow has a failed exact-SHA run without verified passing required steps',detail);
  if (detail.some(d => d.missing)) return outcome('NOT_TESTED','Required exact-SHA workflow/job/step evidence not fully available',detail);
  return outcome('PASS','All explicitly required CI steps completed successfully at deployed SHA', detail);
}

export function checkJourneys(app, sha, runs, jobsByRun) {
  if (!SHA_RE.test(sha || '')) return outcome('NOT_TESTED','Unknown deployed SHA');
  const verified=[];
  for (const id of app.requiredJourneys) {
    const matched=(app.journeyEvidence||[]).filter(e=>e.id===id && e.sha===sha && e.runUrl.startsWith(`https://github.com/${app.repo}/actions/runs/`));
    const success=matched.some(e=>{
      const runId=Number(new URL(e.runUrl).pathname.split('/').at(-1));
      const run=runs?.find(r=>r.id===runId && r.head_sha===sha && r.conclusion==='success' && r.status==='completed');
      return Boolean(run && jobsByRun[runId]?.some(job=>job.name===e.job && job.conclusion==='success' && job.steps?.some(s=>s.name===e.step && s.status==='completed' && s.conclusion==='success')));
    });
    if(success)verified.push(id);
  }
  const missing=app.requiredJourneys.filter(x=>!verified.includes(x));
  return missing.length ? outcome('NOT_TESTED','Required journeys lack exact-SHA executed-step evidence',{verified,missing}) : outcome('PASS','All declared journeys have exact-SHA executed-step evidence',{verified});
}

export function checkReview(app, sha) {
  const r=app.review;
  if (!SHA_RE.test(sha||'')) return outcome('NOT_TESTED','Unknown deployed SHA');
  if (!r || r.sha !== sha) return outcome('NOT_TESTED','Owner release review missing for deployed revision');
  if (r.blockers.length || r.decision==='hold') return outcome('FAIL','Owner reported unresolved release blockers',{blockers:r.blockers});
  const time=Date.parse(r.reviewedAt);
  if (time > Date.now()) return outcome('FAIL','Review timestamp lies in the future');
  return outcome('PASS','Owner-approved release review matches deployed SHA',{reviewedAt:r.reviewedAt,reviewer:r.reviewer});
}

export function aggregate(app, gates, sha) {
  assert(GATES.every(g=>STATES.includes(gates[g]?.state)), 'Missing or invalid gate state');
  const statuses=GATES.map(g=>gates[g].state);
  return {
    schemaVersion:1, appId:app.id, repo:app.repo, productionUrl:app.productionUrl,
    deployedSha:SHA_RE.test(sha||'')?sha:null,
    decision:statuses.includes('FAIL')?'BLOCKED':statuses.includes('NOT_TESTED')?'HOLD':'QUALIFIED',
    gates
  };
}

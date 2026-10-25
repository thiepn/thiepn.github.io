// Release evidence is independent of the legacy launch manifest.
// Neither an HTTPS URL nor a successful deployment is an approval.
export const RELEASE_POLICY = 'thiepn-release-gate-v1.0';
export const RELEASE_GATES = Object.freeze(['G1','G2','G3','G4','G5','G6','G7','G8','G9']);
export const GATE_RESULTS = Object.freeze(['PASS','FAIL','NOT_TESTED','NOT_APPLICABLE']);
const HEX40 = /^[0-9a-f]{40}$/;
const VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const APP_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const REPOSITORY = /^thiepn\/[A-Za-z0-9._-]+$/;
const own = (o,k) => Object.prototype.hasOwnProperty.call(o,k);
function object(x) { return x!==null && typeof x==='object' && !Array.isArray(x); }
function assert(condition,message) { if(!condition) throw new Error('Release registry: '+message); }
function https(x) {
  if(typeof x!=='string') return false;
  try {const u=new URL(x); return u.protocol==='https:' && !u.username && !u.password && !u.hash;} catch {return false;}
}
function checkKeys(x,keys,label) {
  assert(object(x),label+' must be an object');
  assert(Object.keys(x).sort().join('|')===keys.slice().sort().join('|'),label+' has missing/unknown fields');
}
function validateEvidence(evidence,id) {
  assert(Array.isArray(evidence),id+' evidence must be an array');
  const fingerprints=new Set();
  for(const [i,e] of evidence.entries()) {
    checkKeys(e,['gate','result','url','description'],id+' evidence '+i);
    assert(RELEASE_GATES.includes(e.gate),id+' evidence has unknown gate');
    assert(GATE_RESULTS.includes(e.result) && e.result!=='NOT_APPLICABLE',id+' evidence has invalid result');
    assert(https(e.url),id+' evidence must use HTTPS URL');
    assert(typeof e.description==='string' && e.description.trim().length>=8,id+' evidence description is missing');
    const key=e.gate+'|'+e.url;
    assert(!fingerprints.has(key),id+' duplicate evidence reference');
    fingerprints.add(key);
  }
}
function validateCertificate(c) {
  checkKeys(c,['appId','repository','version','scopeContract','productionUrl','releaseSha','deployedSha','authModel','storageModel','checks','notApplicableReasons','review','evidence','blockers','recertifyTriggers','checkedAt'], 'certificate');
  const id=c.appId;
  assert(typeof id==='string' && APP_ID.test(id),'invalid appId');
  assert(typeof c.repository==='string' && REPOSITORY.test(c.repository),id+' invalid repository');
  assert(https(c.productionUrl),id+' invalid production URL');
  assert(c.version===null || (typeof c.version==='string' && VERSION.test(c.version)),id+' invalid version');
  assert(c.scopeContract===null || (typeof c.scopeContract==='string' && c.scopeContract.trim().length>=20),id+' invalid scope contract');
  assert(typeof c.releaseSha==='string' && HEX40.test(c.releaseSha),id+' invalid source SHA');
  assert(c.deployedSha===null || (typeof c.deployedSha==='string' && HEX40.test(c.deployedSha)),id+' invalid deployed SHA');
  assert(['unknown','local-only','optional-account','required-account'].includes(c.authModel),id+' invalid auth model');
  assert(typeof c.storageModel==='string' && c.storageModel.length>0,id+' missing storage model');
  checkKeys(c.checks,RELEASE_GATES,id+' checks');
  assert(object(c.notApplicableReasons),id+' N/A reasons must be an object');
  for(const gate of RELEASE_GATES) assert(GATE_RESULTS.includes(c.checks[gate]),id+' '+gate+' invalid result');
  for(const [gate,reason] of Object.entries(c.notApplicableReasons)) {
    assert(RELEASE_GATES.includes(gate) && c.checks[gate]==='NOT_APPLICABLE',id+' unexpected N/A exception');
    assert(typeof reason==='string' && reason.trim().length>=16,id+' N/A requires an explicit reason');
  }
  for(const gate of RELEASE_GATES) if(c.checks[gate]==='NOT_APPLICABLE') assert(own(c.notApplicableReasons,gate),id+' '+gate+' missing N/A reason');
  checkKeys(c.review,['decision','reviewer','reviewedAt'],id+' review');
  assert(['pending','approved','rejected'].includes(c.review.decision),id+' invalid review decision');
  assert(c.review.reviewer===null || (typeof c.review.reviewer==='string' && c.review.reviewer.trim().length>=2),id+' invalid reviewer');
  assert(c.review.reviewedAt===null || (typeof c.review.reviewedAt==='string' && !Number.isNaN(Date.parse(c.review.reviewedAt))),id+' invalid review date');
  assert(Array.isArray(c.blockers) && c.blockers.every(x=>typeof x==='string' && x.trim().length>=10),id+' invalid blockers');
  assert(Array.isArray(c.recertifyTriggers) && c.recertifyTriggers.length>0 && c.recertifyTriggers.every(x=>typeof x==='string' && x.trim().length>=5),id+' invalid recertification triggers');
  assert(typeof c.checkedAt==='string' && !Number.isNaN(Date.parse(c.checkedAt)),id+' invalid checkedAt');
  validateEvidence(c.evidence,id);
  if(c.review.decision==='approved') {
    assert(c.version && c.scopeContract,id+' approved release requires an explicit version and scope');
    assert(c.deployedSha===c.releaseSha,id+' deployed and approved SHA differ');
    assert(c.authModel!=='unknown' && c.storageModel!=='unknown',id+' requires known account and storage models');
    assert(c.review.reviewer && c.review.reviewedAt,id+' missing independent review');
    assert(c.blockers.length===0,id+' unresolved release blockers');
    for(const gate of RELEASE_GATES) {
      assert(c.checks[gate]==='PASS' || c.checks[gate]==='NOT_APPLICABLE',id+' '+gate+' not certified');
      if(c.checks[gate]==='PASS')
        assert(c.evidence.some(e=>e.gate===gate && e.result==='PASS'),id+' '+gate+' has no passing evidence');
    }
  } else {
    assert(c.review.reviewer===null && c.review.reviewedAt===null,id+' cannot carry approval metadata while unapproved');
  }
  return c;
}
export function validateReleaseRegistry(registry) {
  checkKeys(registry,['schemaVersion','policyId','certificates'],'registry');
  assert(registry.schemaVersion===1 && registry.policyId===RELEASE_POLICY,'unsupported schema/policy');
  assert(Array.isArray(registry.certificates),'certificates must be an array');
  const seen=new Set();
  for(const c of registry.certificates) {
    validateCertificate(c);
    assert(!seen.has(c.appId),'duplicate certificate '+c.appId);
    seen.add(c.appId);
  }
  return registry;
}
export function validateDevelopmentInventory(inventory,manifest) {
  checkKeys(inventory,['schemaVersion','policyId','entries'],'development inventory');
  assert(inventory.schemaVersion===1 && inventory.policyId===RELEASE_POLICY,'unsupported development inventory version');
  assert(Array.isArray(inventory.entries),'inventory entries must be an array');
  assert(object(manifest) && Array.isArray(manifest.entries),'launch manifest missing');
  const ids=new Set(manifest.entries.map(e=>e.id));
  const seen=new Set();
  for(const e of inventory.entries) {
    checkKeys(e,['appId','status','reason'],'development entry');
    assert(ids.has(e.appId),e.appId+' is not in legacy launch manifest');
    assert(!seen.has(e.appId),e.appId+' is duplicated in development inventory');
    assert(['in-development','archive-review'].includes(e.status),e.appId+' invalid development status');
    assert(typeof e.reason==='string' && e.reason.trim().length>8,e.appId+' missing reason');
    seen.add(e.appId);
  }
  assert(seen.size===ids.size,'inventory must preserve all legacy launch identities');
  return inventory;
}
export function certifiedLaunchEntries(manifest,registry) {
  validateReleaseRegistry(registry);
  assert(object(manifest) && Array.isArray(manifest.entries),'launch manifest missing');
  const byId=new Map(manifest.entries.map(e=>[e.id,e]));
  assert(byId.size===manifest.entries.length,'duplicate launch manifest IDs');
  for(const c of registry.certificates) {
    const entry=byId.get(c.appId);
    assert(entry,c.appId+' certificate references unknown launcher');
    assert(entry.ownerRepo===c.repository,c.appId+' owner repository does not match launch manifest');
    assert(entry.url===c.productionUrl,c.appId+' production URL does not match launch manifest');
  }
  const approved=new Set(registry.certificates.filter(c=>c.review.decision==='approved').map(c=>c.appId));
  return manifest.entries.filter(e=>approved.has(e.id));
}

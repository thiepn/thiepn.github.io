// Pure, offline H7 operator packet review. No live provider or deployment side effects.
// These pins derive from independently inspected GitHub runs and archived H6 evidence.
// They do NOT turn CI into physical-device, human or security acceptance.
export const QUALIFIED_H6_HEAD = '0001e2ace97b965f8142751d2c025b90e77df2eb';
export const QUALIFIED_H6_MERGE = '2b3d9deb589d47e4e9dfa817f46c1b38e0784513';
export const QUALIFIED_H6_ARCHIVE = '04046786a026846af54d38297d59ef37ef811b3bd7cc7f5bd78f69c40f747a93';
const REPO = 'thiepn/thiepn.github.io';
export const REQUIRED_H6_CI = Object.freeze([
  ['Quality', 38007120521],
  ['Hub Account integration', 38007120456],
  ['Hub device Library browsers', 38007120516],
  ['Hub Notes Inbox browsers', 38007120512],
  ['Hub Notes capture browsers', 38007120451],
  ['Hub managed Notes browsers', 38007120599],
  ['Hub managed TMS60 browsers', 38007120448],
  ['Hub Notes integration', 38007120548],
]);
export const REQUIRED_OPERATOR_GATES = Object.freeze([
  'two-owner-oauth-consent',
  'physical-android-ios',
  'screen-reader-keyboard',
  'device-local-reconsent',
  'security-review',
  'prism-visual-owner',
  'release-owner-authorization',
]);
const plain = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const sha = x => typeof x === 'string' && /^[a-f0-9]{40}$/.test(x);

export function inspectH7OperatorPacket(input) {
  const errors = [];
  if (!plain(input)) return { valid:false,errors:['Missing operator packet'],releaseAllowed:false,externalOpen:[] };
  if (input.schemaVersion !== 1 || input.repository !== REPO || input.mode !== 'independent-operator-review-preparation') errors.push('Wrong H7 repository, schema or preparation intent');
  const ancestors = [
    ['H3',98,'b67a9590a5cf01c144caf00ac7f98c6c07642ef9'],
    ['H4',97,'10d964fcd232f604110aa4105bd397923ff9e57e'],
    ['H5',99,'501b91bd742da3e7014fc4bba304edf77764b6d5'],
  ];
  if (!Array.isArray(input.predecessors) || input.predecessors.length !== ancestors.length ||
    !input.predecessors.every((p,i) => plain(p) && p.phase===ancestors[i][0] && p.pr===ancestors[i][1] && p.head===ancestors[i][2])) errors.push('H3/H4/H5 stack has changed');
  const q=input.qualifiedH6;
  if (!plain(q) || q.pr!==100 || q.head!==QUALIFIED_H6_HEAD ||
    q.base!==ancestors[2][2] || q.testedPrMergeTree!==QUALIFIED_H6_MERGE) errors.push('Qualified H6 exact head/tree mismatch');
  const checks=q?.checks;
  if (!Array.isArray(checks) || checks.length!==REQUIRED_H6_CI.length ||
    !checks.every((c,i)=>plain(c)&&c.name===REQUIRED_H6_CI[i][0]&&c.runId===REQUIRED_H6_CI[i][1]&&
      c.conclusion==='success'&&c.url===`https://github.com/${REPO}/actions/runs/${c.runId}`)) errors.push('H6 mandatory CI run evidence missing or forged');
  const artifacts=q?.artifacts;
  if (!Array.isArray(artifacts)||artifacts.length!==1 || !plain(artifacts[0]) ||
    artifacts[0].name!=='studio-certification'||artifacts[0].id!==11651539301 ||
    artifacts[0].runId!==38007120521 ||
    artifacts[0].reportedArchiveDigest!==QUALIFIED_H6_ARCHIVE ||
    artifacts[0].independentlyRechecked!==true || artifacts[0].archiveZipCrcValid!==true ||
    artifacts[0].rehearsalPublishAllowed!==false || artifacts[0].rehearsalRollbackExecuted!==false) errors.push('H6 release artifact/rehearsal is not independently verified and denied');
  const gates=input.operatorGates;
  const open=[];
  if (!Array.isArray(gates)||gates.length!==REQUIRED_OPERATOR_GATES.length) errors.push('Missing real-world operator acceptance gates');
  else {
    const seen=new Set();
    for (const gate of gates) {
      if (!plain(gate)||!REQUIRED_OPERATOR_GATES.includes(gate.id)||seen.has(gate.id)||
        typeof gate.scope!=='string'||gate.scope.length<12||gate.scope.length>240||
        gate.status!=='OPEN'||gate.reviewer!==null||gate.observedAt!==null||
        gate.proof!==null||gate.observation!==null) errors.push('Unverified, ambiguous or forged human/device acceptance');
      else open.push(gate.id);
      if (plain(gate)) seen.add(gate.id);
    }
    if(seen.size!==REQUIRED_OPERATOR_GATES.length) errors.push('Duplicated or missing independent acceptance gate');
  }
  if (input.realWorldSignoff!=='NOT_COLLECTED'||input.releaseDecision!=='NO_GO'||
    input.publicationAllowed!==false||input.mergeAllowed!==false||input.migrationAllowed!==false||
    input.rollbackExecuted!==false||input.releaseAuthorization!==false||
    input.operatorChallenge!==null||!Array.isArray(input.approvalSignatures)||input.approvalSignatures.length!==0||
    input.h7ExactHead!==null) errors.push('Operator-only release decision is not denied');
  return { valid:errors.length===0,errors,sourceLinkedChecks:REQUIRED_H6_CI.length,
    verifiedArtifact:errors.some(e=>e.startsWith('H6 release artifact'))?false:true,
    externalOpen:open,releaseAllowed:false,deployAllowed:false,rollbackExecuted:false,
    decision:'NO_GO_PENDING_REAL_WORLD_AND_INDEPENDENT_SIGNOFF'};
}

export function rehearseH7ReleaseDecision(packet) {
  const audit=inspectH7OperatorPacket(packet);
  if(!audit.valid) throw new Error(`H7 operator packet rejected: ${audit.errors.join('; ')}`);
  return {
    kind:'H7_NONEXECUTING_OPERATOR_DECISION',candidateHead:QUALIFIED_H6_HEAD,
    testedPrMergeTree:QUALIFIED_H6_MERGE,sourceLinkedChecks:audit.sourceLinkedChecks,
    externalOpen:[...audit.externalOpen],decision:audit.decision,
    releaseAllowed:false,mergeAllowed:false,deployAllowed:false,rollbackExecuted:false,
    realAccountReviewed:false,physicalDeviceReviewed:false,humanSignoffCollected:false,
    actions:[
      'Preserve unmerged H3-H7 stacked draft chain',
      'Require independent operator to re-fetch exact-head CI and immutable artifacts',
      'Collect signed real two-owner OAuth, device, TalkBack/VoiceOver, privacy and Prism visual evidence separately',
      'If an acceptance gate fails, retain the currently deployed release and document remediation',
      'Never register OAuth, mutate private backends, merge, deploy, purge caches or execute rollback without explicit authorization',
    ],
  };
}

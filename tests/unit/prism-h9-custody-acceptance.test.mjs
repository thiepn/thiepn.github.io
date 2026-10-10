import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { generateKeyPairSync, sign, createHash } from 'node:crypto';
import { spkiSha256 } from '../../src/lib/prism/h8-operator-attestation.mjs';
import {
  H9_PARENT,H9_MERGE,H9_WORKFLOWS,H9_SURFACES,
  inspectH9SourcePacket,verifyH9WitnessedCustody,
  canonicalH9CustodyEvent,h9EventDigest,rehearseH9DeniedDecision,
} from '../../src/lib/prism/h9-custody-acceptance.mjs';

const packet=JSON.parse(readFileSync(new URL('../../docs/evidence/HUB_V1_1_H9_CUSTODY_ACCEPTANCE.json',import.meta.url),'utf8'));
const change=fn=>{const x=structuredClone(packet);fn(x);return x;};
const fixtureKeys=Array.from({length:4},()=>generateKeyPairSync('ed25519')); // ephemeral synthetic only
const pub=i=>fixtureKeys[i].publicKey.export({type:'spki',format:'pem'}).toString();
const time=Date.parse('2026-10-10T12:00:00.000Z');
const pins=[spkiSha256(pub(0)),spkiSha256(pub(3))];
const options={initialKeyId:'op-root',initialSpkiPem:pub(0),witnessSpkiPem:pub(3),
  independentPins:pins,nowMs:time};
const nonce=i=>'custody_synthetic_nonce_abcdefghijklmnop'+i;
function signed(payload,signer){
  const bytes=Buffer.from(canonicalH9CustodyEvent(payload));
  return {payload,signerSignature:sign(null,bytes,fixtureKeys[signer].privateKey).toString('base64url'),
    witnessSignature:sign(null,bytes,fixtureKeys[3].privateKey).toString('base64url')};
}
function chain(){
  const a=signed({sequence:1,previousDigest:'0'.repeat(64),action:'rotate',
    signerKeyId:'op-root',nextKeyId:'op-mid',nextSpkiPem:pub(1),
    observedAt:'2026-10-10T09:00:00.000Z',nonce:nonce('a')},0);
  const b=signed({sequence:2,previousDigest:h9EventDigest(a),action:'rotate',
    signerKeyId:'op-mid',nextKeyId:'op-final',nextSpkiPem:pub(2),
    observedAt:'2026-10-10T10:00:00.000Z',nonce:nonce('b')},1);
  const c=signed({sequence:3,previousDigest:h9EventDigest(b),action:'compromise',
    signerKeyId:'op-final',nextKeyId:null,nextSpkiPem:null,
    observedAt:'2026-10-10T11:00:00.000Z',nonce:nonce('c')},2);
  return [a,b,c];
}
describe('H9 independent signer custody and operator NO-GO',()=>{
  it('pins H8 tested source, two independently CRC verified artifacts, all real-world OPEN gates',()=>{
    const result=inspectH9SourcePacket(packet);
    expect(result).toMatchObject({valid:true,sourceLinkedChecks:8,
      independentlyCheckedArtifacts:2,decision:'NO_GO',releaseAllowed:false});
    expect(packet.parentH8.head).toBe(H9_PARENT);
    expect(packet.parentH8.testedPrMergeTree).toBe(H9_MERGE);
    expect(packet.parentH8.checks.map(x=>x.runId)).toEqual(H9_WORKFLOWS.map(x=>x[1]));
    expect(result.sourceProvenanceOpen).toEqual([...H9_SURFACES]);
    expect(result.operatorApprovalsOpen).toHaveLength(7);
    expect(rehearseH9DeniedDecision(packet)).toMatchObject({
      verifiedRealSignatures:0,originalSourceAndRightsApproved:false,
      cdnPwaOfflineApproved:false,releaseDecision:'NO_GO',publicationAllowed:false,
      mergeAllowed:false,deployAllowed:false,rollbackExecuted:false});
  });
  it('rejects substituted H8 run, merge SHA, artifact CRC/digest or manufactured material approval',()=>{
    for(const v of [
      change(x=>{x.parentH8.head='a'.repeat(40);}),
      change(x=>{x.parentH8.testedPrMergeTree='b'.repeat(40);}),
      change(x=>{x.parentH8.checks[0].runId=1;x.parentH8.checks[0].url='https://github.com/thiepn/thiepn.github.io/actions/runs/1';}),
      change(x=>{x.parentH8.artifacts[0].digest='c'.repeat(64);}),
      change(x=>{x.parentH8.artifacts[1].crcOk=false;}),
      change(x=>{x.sourceSurfaces[1].status='APPROVED';}),
      change(x=>{x.sourceSurfaces[2].cdnDigest='a'.repeat(64);}),
      change(x=>{x.sourceSurfaces[3].proofUri='https://example.org/not-proof';}),
      change(x=>{x.operatorGates[1].status='APPROVED';}),
      change(x=>{x.operatorGates[2].reviewer='Synthetic reviewer';}),
      change(x=>{x.custodyEvents=[{fake:true}];}),
      change(x=>{x.replayLedger=['a'.repeat(64)];}),
      change(x=>{x.operatorTrustRoot='PINNED';}),
      change(x=>{x.publicationAllowed=true;}),
    ]){expect(inspectH9SourcePacket(v).valid).toBe(false);expect(()=>rehearseH9DeniedDecision(v)).toThrow();}
  });
  it('authenticates a synthetic two-hop chain with distinct independent witness and terminates on compromise',()=>{
    const result=verifyH9WitnessedCustody(chain(),options);
    expect(result).toMatchObject({valid:true,witnessedTransitions:3,terminated:true,
      operatorApproval:false,publicationAllowed:false,decision:'NO_GO'});
    expect(result.transitions.map(x=>x.kind)).toEqual(['rotate','rotate','compromise']);
  });
  it('requires both independently trusted signer and witness pins and both signatures',()=>{
    for(const cfg of [
      {...options,independentPins:[]},
      {...options,independentPins:[pins[0],pins[0]]},
      {...options,independentPins:[pins[0],'a'.repeat(64)]},
      {...options,witnessSpkiPem:pub(0)},
    ])expect(verifyH9WitnessedCustody(chain(),cfg).valid).toBe(false);
    const missingWitness=chain();missingWitness[1].witnessSignature='a'.repeat(86);
    expect(verifyH9WitnessedCustody(missingWitness,options).valid).toBe(false);
    const modified=chain();modified[0].payload.nextKeyId='op-wrong';
    expect(verifyH9WitnessedCustody(modified,options).valid).toBe(false);
  });
  it('rejects chronology gaps, unlinked hops, replayed nonce and already consumed receipt digest',()=>{
    const bad=chain();bad[1].payload.previousDigest='a'.repeat(64);
    expect(verifyH9WitnessedCustody(bad,options).valid).toBe(false);
    const replay=chain();replay[1].payload.nonce=replay[0].payload.nonce;
    expect(verifyH9WitnessedCustody(replay,options).valid).toBe(false);
    expect(verifyH9WitnessedCustody(chain(),{...options,priorEventDigests:[h9EventDigest(chain()[0])]}).valid).toBe(false);
    const backdated=chain();backdated[1].payload.observedAt='2026-10-10T08:00:00.000Z';
    expect(verifyH9WitnessedCustody(backdated,options).valid).toBe(false);
    const future=chain();future[0].payload.observedAt='2026-10-11T09:00:00.000Z';
    expect(verifyH9WitnessedCustody(future,options).valid).toBe(false);
  });
  it('does not allow a compromised signer to self-recover or silently reuse a revoked identifier',()=>{
    const steps=chain();
    steps.push(signed({sequence:4,previousDigest:h9EventDigest(steps[2]),
      action:'rotate',signerKeyId:'op-final',nextKeyId:'op-after',nextSpkiPem:pub(0),
      observedAt:'2026-10-10T11:30:00.000Z',nonce:nonce('d')},2));
    expect(verifyH9WitnessedCustody(steps,options).valid).toBe(false);
    const repeated=chain();repeated[1].payload.nextKeyId='op-root';
    expect(verifyH9WitnessedCustody(repeated,options).valid).toBe(false);
  });
});

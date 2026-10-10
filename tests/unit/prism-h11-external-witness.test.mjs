import { describe,it,expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash,generateKeyPairSync,sign } from 'node:crypto';
import { spkiSha256 } from '../../src/lib/prism/h8-operator-attestation.mjs';
import { H11_PARENT,H11_CHECKS,H11_ARTIFACTS,canonicalH11Packet,
  inspectH11Preparation,inspectH11ExternalPackets,h11ReceiptDigest,
  prepareH11NoGo,verifyH11TrustHandoff } from '../../src/lib/prism/h11-external-witness.mjs';
const packet=JSON.parse(readFileSync(new URL('../../docs/evidence/HUB_V1_1_H11_EXTERNAL_WITNESS.json',import.meta.url),'utf8'));
const change=f=>{const x=structuredClone(packet);f(x);return x;};
const hash=v=>createHash('sha256').update(v).digest('hex');
const keys=[generateKeyPairSync('ed25519'),generateKeyPairSync('ed25519')];
const pem=i=>keys[i].publicKey.export({format:'pem',type:'spki'}).toString();
const data=Buffer.from('H11 synthetic self-contained unprotected source object');
const now=Date.parse('2026-10-10T15:00:00.000Z');
const nonce='h11_independent_external_nonce_0123456789';
const fields={
  schemaVersion:1,repository:'thiepn/thiepn.github.io',subjectHead:H11_PARENT,
  domain:'original-source-objects',observation:'source-byte-inspection',
  signerKeyId:'source-operator',witnessKeyId:'external-witness',epoch:1,sequence:1,
  previousDigest:'0'.repeat(64),sourceSha256:hash('synthetic source'),
  objectSha256:hash(data),rightsSha256:hash('synthetic rights'),
  proofSha256:hash('synthetic proof'),objectBytes:data.byteLength,
  observedAt:'2026-10-10T14:00:00.000Z',expiresAt:'2026-10-11T14:00:00.000Z',nonce,
};
const signPacket=(p=fields)=>{const signed=Buffer.from(canonicalH11Packet(p));return {
  payload:p,operatorSignature:sign(null,signed,keys[0].privateKey).toString('base64url'),
  witnessSignature:sign(null,signed,keys[1].privateKey).toString('base64url')}};
const args={epoch:1,signerKeyId:'source-operator',witnessKeyId:'external-witness',
  operatorSpkiPem:pem(0),witnessSpkiPem:pem(1),
  independentPins:[spkiSha256(pem(0)),spkiSha256(pem(1))],
  operatorRole:'source-reviewer',witnessRole:'evidence-witness',
  nowMs:now,objectBytesByDigest:{[hash(data)]:data}};
describe('H11 source-pinned NO-GO preparation',()=>{
  it('retains exact H10 head, all eight CI and verified ZIP digests, and denies any release',()=>{
    expect(inspectH11Preparation(packet)).toMatchObject({valid:true,checkedWorkflows:8,
      checkedZipArchives:2,decision:'NO_GO',releaseAllowed:false});
    expect(packet.parentH10.checks.map(x=>x.runId)).toEqual(H11_CHECKS.map(x=>x[1]));
    expect(packet.parentH10.artifacts.map(x=>x.sha256)).toEqual(H11_ARTIFACTS.map(x=>x[3]));
    expect(prepareH11NoGo(packet)).toMatchObject({releaseDecision:'NO_GO',
      rollbackDecision:'NOT_EXECUTED',mergeAllowed:false,deployAllowed:false});
  });
  it('rejects forged checks, ZIP evidence, rights, physical reviews and privileged actions',()=>{
    const invalid=[
      change(x=>x.parentH10.head='a'.repeat(40)),
      change(x=>x.parentH10.testedPrMergeTree='b'.repeat(40)),
      change(x=>x.parentH10.checks[2].conclusion='failure'),
      change(x=>x.parentH10.artifacts[0].entries=49),
      change(x=>x.parentH10.artifacts[1].crcOk=false),
      change(x=>x.trustRoot='TRUSTED'),
      change(x=>x.externalPackets.push({fake:true})),
      change(x=>x.provenance[1].status='ACCEPTED'),
      change(x=>x.provenance[2].objectSha256='c'.repeat(64)),
      change(x=>x.humanGates[1].status='APPROVED'),
      change(x=>x.humanGates[6].reviewer='self'),
      change(x=>x.decisions.release='GO'),
      change(x=>x.decisions.rollback='EXECUTED'),
      change(x=>x.decisions.purge=true),
    ];
    for(const p of invalid){
      expect(inspectH11Preparation(p).valid).toBe(false);
      expect(()=>prepareH11NoGo(p)).toThrow();
    }
  });
});
describe('H11 externally governed signed intake',()=>{
  it('checks bytes, canonical evidence, independent pins and retains human NO-GO',()=>{
    const r=inspectH11ExternalPackets([signPacket()],args);
    expect(r).toMatchObject({valid:true,verifiedSyntheticOrExternalSignatures:1,
      sourceRightsApproved:false,physicalAccessibilityApproved:false,releaseAllowed:false});
    expect(r.endingDigest).toBe(h11ReceiptDigest(signPacket()));
    expect(JSON.stringify(r)).not.toContain(nonce);
    expect(JSON.stringify(r)).not.toContain('BEGIN PUBLIC KEY');
  });
  it('rejects replay, bad bytes, wrong roles, unsigned rights, forged devices and timestamps',()=>{
    const spoof=signPacket({...fields,domain:'physical-device-observations',observation:'android-chrome'});
    const altered=signPacket();altered.payload.rightsSha256=hash('rights changed');
    const privateData=signPacket({...fields,userEmail:'private@example.test'});
    const expired=signPacket({...fields,expiresAt:'2026-10-10T13:00:00.000Z'});
    const future=signPacket({...fields,observedAt:'2026-10-11T14:00:00.000Z'});
    const unallowed=signPacket({...fields,observation:'self-approved-release'});
    const replay=signPacket({...fields,sequence:2,previousDigest:h11ReceiptDigest(signPacket())});
    const badBytes={...args,objectBytesByDigest:{[hash(data)]:Buffer.from('tamper')}};
    for(const item of [spoof,altered,privateData,expired,future,unallowed])
      expect(inspectH11ExternalPackets([item],args).valid).toBe(false);
    expect(inspectH11ExternalPackets([signPacket()],badBytes).valid).toBe(false);
    expect(inspectH11ExternalPackets([signPacket(),replay],args).valid).toBe(false);
    expect(inspectH11ExternalPackets([signPacket()],{...args,priorNonceDigests:[hash(nonce)]}).valid).toBe(false);
    expect(inspectH11ExternalPackets([signPacket()],{...args,revokedAt:'2026-10-10T13:00:00.000Z'}).valid).toBe(false);
    expect(inspectH11ExternalPackets([signPacket()],{...args,compromisedAt:'2026-10-10T14:30:00.000Z'}).valid).toBe(false);
    expect(inspectH11ExternalPackets([signPacket()],{...args,independentPins:[args.independentPins[0],hash('wrong')]}).valid).toBe(false);
    expect(inspectH11ExternalPackets([signPacket()],{...args,operatorRole:'rights-reviewer'}).valid).toBe(false);
    expect(inspectH11ExternalPackets([signPacket()],{...args,witnessSpkiPem:pem(0)}).valid).toBe(false);
    expect(verifyH11TrustHandoff([],{})).toMatchObject({valid:false,trustRootInstalled:false,releaseAllowed:false});
  });
});

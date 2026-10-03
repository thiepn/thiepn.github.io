import { describe, it, expect } from 'vitest';
import { WORKFLOWS, WORKFLOW_APPS, parseWorkflowLocation, workflowLocation } from '../../src/lib/workflows/catalogue';
import { defaultTransferPolicy, validateTransferIntent, validateTransferReceipt, validResourceReference, TransferTracker, type TransferIntent, type TransferGrant, type TransferReceipt } from '../../src/lib/workflows/transfer';
const now = Date.parse('2026-10-02T12:00:00Z');
const context = { scope: 'device' as const, deviceId: 'fictional-device', consentRevision: 'v1' };
const intent: TransferIntent = { schemaVersion: 1, requestId: 'fictional-request', idempotencyKey: 'fictional-intent', mode: 'copy', source: { owner: 'pdf', resourceId: 'fictional-pdf', revision: 'v2', mime: 'application/pdf', bytes: 1024, sha256: 'a'.repeat(64), context }, destination: 'library', destinationContext: context, expiresAt: '2026-10-02T12:02:00Z' };
const sourceGrant: TransferGrant = { owner: 'pdf', context, permissions: ['pdf.hub.transfer.read'], expiresAt: now + 180000 };
const targetGrant: TransferGrant = { owner: 'library', context, permissions: ['library.hub.transfer.write'], expiresAt: now + 180000 };
const policy = { enabled: true, destination: 'library' as const, modes: ['copy'] as const, maxBytes: 250 * 1024 * 1024 };
const receipt: TransferReceipt = { schemaVersion: 1, requestId: intent.requestId, idempotencyKey: intent.idempotencyKey, status: 'committed', source: intent.source, destination: 'library', destinationContext: context, mode: 'copy', resourceId: 'fictional-copy', revision: 'v1', sha256: intent.source.sha256, committedAt: '2026-10-02T12:00:01Z' };
describe('H6 public guide metadata', () => {
  it('preserves reviewed apps, source revisions and separate manual paths', () => {
    expect(WORKFLOWS.map(f => f.id)).toEqual(['scan-read','pdf-read','notes-draft']);
    expect(WORKFLOW_APPS.scan.href).toBe('https://thiepn.dev/scan/');
    expect(WORKFLOWS.every(f => f.steps.every(s => s.check && s.recovery && WORKFLOW_APPS[s.owner].href.startsWith('https:')))).toBe(true);
    expect(Object.values(WORKFLOW_APPS).every(a => /^[a-f0-9]{40}$/.test(a.revision))).toBe(true);
  });
  it('bounds guide coordinates and strips payload parameters from generated locations', () => {
    expect(parseWorkflowLocation('?flow=pdf-read&step=2&token=private')).toEqual({ id:'pdf-read',step:1 });
    for (const step of ['0','-1','99','2.5','secret']) expect(parseWorkflowLocation('?flow=pdf-read&step='+step).step).toBe(0);
    expect(parseWorkflowLocation('?flow=unknown&step=2').id).toBe('scan-read');
    expect(workflowLocation('pdf-read',1)).toBe('/flows/?flow=pdf-read&step=2');
    expect(workflowLocation('private')).toBe('/flows/'); expect(workflowLocation('pdf-read',9)).toBe('/flows/');
  });
});
describe('H6 future transfer contract (fictional only)', () => {
  it('denies every automated production policy', () => { expect(() => validateTransferIntent(intent,defaultTransferPolicy('library'),sourceGrant,targetGrant,now)).toThrow('not certified'); });
  it('binds explicit copy intent and returns isolated metadata without source mutation', () => {
    const result = validateTransferIntent(intent,policy,sourceGrant,targetGrant,now); result.source.revision='changed'; expect(intent.source.revision).toBe('v2');
    expect(validateTransferIntent(intent,policy,sourceGrant,targetGrant,now).mode).toBe('copy');
  });
  it('rejects incompatible MIME, modes, destination and byte excess', () => {
    for (const p of [{...policy,modes:['reference'] as const},{...policy,maxBytes:100},{...policy,destination:'notes' as const}]) expect(() => validateTransferIntent(intent,p,sourceGrant,targetGrant,now)).toThrow();
    expect(() => validateTransferIntent({...intent,source:{...intent.source,mime:'text/plain'}},policy,sourceGrant,targetGrant,now)).toThrow();
  });
  it('requires both live purpose grants and matching selected device/consent', () => {
    for (const grant of [{...sourceGrant,permissions:[]},{...sourceGrant,expiresAt:now},{...sourceGrant,context:{...context,consentRevision:'revoked'}}]) expect(() => validateTransferIntent(intent,policy,grant,targetGrant,now)).toThrow();
    expect(() => validateTransferIntent(intent,policy,sourceGrant,{...targetGrant,permissions:['app_data.read']},now)).toThrow();
    const different={...context,deviceId:'other'}; expect(() => validateTransferIntent({...intent,destinationContext:different},policy,sourceGrant,{...targetGrant,context:different},now)).toThrow('bridge');
  });
  it('rejects expiry, future contracts, raw data, arbitrary URL and malformed resources', () => {
    for (const patch of [{schemaVersion:2},{expiresAt:'2026-10-02T12:00:00Z'},{expiresAt:'2026-10-02T12:10:00Z'},{url:'https://evil.test/'}]) expect(() => validateTransferIntent({...intent,...patch},policy,sourceGrant,targetGrant,now)).toThrow();
    for (const patch of [{bytes:NaN},{bytes:0},{sha256:'fake'},{revision:''},{body:'private'},{url:'data:application/pdf;base64,xxx'},{context:{...context,accountId:'private'}}]) expect(validResourceReference({...intent.source,...patch})).toBe(false);
  });
  it('requires Notes account context without unsupported workspace or translation', () => {
    const account={scope:'account' as const,accountId:'11111111-1111-4111-8111-111111111111',workspaceId:null,grantRevision:'v1',translationId:null};
    expect(validResourceReference({...intent.source,owner:'notes',mime:'text/markdown',context:account})).toBe(true);
    expect(validResourceReference({...intent.source,owner:'notes',mime:'text/markdown',context:{...account,workspaceId:'wrong'}})).toBe(false);
    expect(validResourceReference({...intent.source,owner:'notes',mime:'text/markdown',context})).toBe(false);
  });
  it('binds receipt to identity, source revision, digest, operation and idempotency', () => {
    expect(validateTransferReceipt(receipt,intent,now).resourceId).toBe('fictional-copy');
    for (const patch of [{requestId:'old'},{idempotencyKey:'other'},{status:'opened'},{mode:'reference'},{source:{...intent.source,revision:'v1'}},{sha256:'b'.repeat(64)},{destinationContext:{...context,consentRevision:'other'}},{committedAt:'2026-02-31T12:00:01Z'},{href:'https://evil.test'}]) expect(() => validateTransferReceipt({...receipt,...patch},intent,now)).toThrow();
    expect(() => validateTransferReceipt(receipt,intent,now+180000)).toThrow();
  });
  it('keeps account-owned Notes and device-owned drafts bound to their selected grants', () => {
    const account={scope:'account' as const,accountId:'11111111-1111-4111-8111-111111111111',workspaceId:null,grantRevision:'v1',translationId:null};
    const notesIntent: TransferIntent={...intent,source:{...intent.source,owner:'notes',mime:'text/markdown',context:account},destination:'manuscript'};
    const notesGrant: TransferGrant={...sourceGrant,owner:'notes',context:account,permissions:['notes.hub.transfer.read']};
    const draftGrant: TransferGrant={...targetGrant,owner:'manuscript',permissions:['manuscript.hub.transfer.write']};
    const draftPolicy={...policy,destination:'manuscript' as const};
    expect(validateTransferIntent(notesIntent,draftPolicy,notesGrant,draftGrant,now).destination).toBe('manuscript');
    expect(() => validateTransferIntent(notesIntent,draftPolicy,{...notesGrant,context:{...account,accountId:'22222222-2222-4222-8222-222222222222'}},draftGrant,now)).toThrow();
  });
  it('keeps interrupted outcomes uncertain without retrying or inventing completion', () => {
    const tracker=new TransferTracker(); tracker.begin(intent); tracker.uncertain(); expect(tracker.snapshot()).toEqual({outcome:'needs-reconciliation',receipt:null});
    expect(() => tracker.begin({...intent,requestId:'retry'})).toThrow(); expect(tracker.accept({...receipt,requestId:'wrong'},now)).toBe(false);
    expect(tracker.snapshot().outcome).toBe('needs-reconciliation'); expect(tracker.accept(receipt,now)).toBe(true); expect(tracker.accept(receipt,now)).toBe(true);
    expect(tracker.accept({...receipt,resourceId:'duplicate-copy'},now)).toBe(false); expect(tracker.snapshot().outcome).toBe('committed');
    tracker.clear(); expect(tracker.accept(receipt,now)).toBe(false); expect(tracker.snapshot()).toEqual({outcome:'idle',receipt:null});
  });
});

import{describe,expect,it}from'vitest';
import{candidateRequestHeaders}from'../../scripts/vercel/candidate-request-headers.mjs';

describe('P6 candidate protected request headers',()=>{
  it('preserves the automation bypass when POST supplies Content-Type',()=>{
    const headers=candidateRequestHeaders({bypass:'a'.repeat(32),headers:{'Content-Type':'application/json'}});
    expect(headers['x-vercel-protection-bypass']).toBe('a'.repeat(32));
    expect(headers['content-type']).toBe('application/json');
    expect(headers['user-agent']).toBe('THIEPN-Vercel-P5-Candidate/1');
  });
  it('does not synthesize a bypass when none was provided',()=>{
    const headers=candidateRequestHeaders({headers:{Accept:'application/json'}});
    expect(headers['x-vercel-protection-bypass']).toBeUndefined();
    expect(headers.accept).toBe('application/json');
  });
});

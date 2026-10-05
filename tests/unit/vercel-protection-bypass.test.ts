import{afterEach,describe,expect,it,vi}from'vitest';
import{generateBypassSecret,updateProtectionBypass}from'../../scripts/vercel/protection-bypass.mjs';

afterEach(()=>vi.restoreAllMocks());

describe('P6 Vercel deployment protection automation bypass',()=>{
  it('generates a 32-character alphanumeric ephemeral secret',()=>{
    expect(generateBypassSecret()).toMatch(/^[A-Za-z0-9]{32}$/);
  });
  it('creates the project bypass without exposing it as an environment variable',async()=>{
    const fetchImpl=vi.fn(async(url,init)=>{
      expect(String(url)).toBe('https://api.vercel.com/v1/projects/prj_fixture/protection-bypass');
      expect(new Headers(init?.headers).get('authorization')).toBe('Bearer token');
      expect(JSON.parse(String(init?.body))).toEqual({
        generate:{secret:'a'.repeat(32),note:'THIEPN CI ephemeral release certification'}
      });
      return new Response(null,{status:200});
    });
    await updateProtectionBypass({action:'generate',token:'token',projectId:'prj_fixture',secret:'a'.repeat(32),fetchImpl});
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
  it('revokes the exact ephemeral bypass after certification',async()=>{
    const fetchImpl=vi.fn(async(_url,init)=>{
      expect(JSON.parse(String(init?.body))).toEqual({revoke:{secret:'b'.repeat(32),regenerate:false}});
      return new Response(null,{status:200});
    });
    await updateProtectionBypass({action:'revoke',token:'token',projectId:'prj_fixture',secret:'b'.repeat(32),fetchImpl});
  });
  it('fails closed on invalid project and secret inputs',async()=>{
    await expect(updateProtectionBypass({action:'generate',token:'token',projectId:'bad',secret:'a'.repeat(32),fetchImpl:vi.fn()})).rejects.toThrow('PROJECT_ID');
    await expect(updateProtectionBypass({action:'generate',token:'token',projectId:'prj_fixture',secret:'bad',fetchImpl:vi.fn()})).rejects.toThrow('bypass secret');
  });
});

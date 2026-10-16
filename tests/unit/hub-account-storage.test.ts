import {describe,it,expect} from 'vitest';
import {createHubAccountStorage} from '../../src/lib/hub-account-storage';

function memory():Storage {
 const values=new Map<string,string>();
 return {get length(){return values.size;},key:i=>[...values.keys()][i]??null,clear:()=>values.clear(),getItem:k=>values.get(k)??null,setItem:(k,v)=>{values.set(k,v);},removeItem:k=>{values.delete(k);}};
}
describe('Hub Account storage under app-origin quota pressure',()=>{
 it('uses persistent credentials normally and never clears another app’s data',()=>{
  const local=memory(),tab=memory();local.setItem('other-app','keep');const storage=createHubAccountStorage(local,tab,['token']);
  storage.setItem('token','first');expect(local.getItem('token')).toBe('first');expect(tab.length).toBe(0);
  storage.clear();expect(local.getItem('other-app')).toBe('keep');expect(storage.getItem('token')).toBeNull();
 });
 it('retains tab credentials across runtime recreation when persistent writes fail',()=>{
  const local=memory(),tab=memory();local.setItem('token','old');local.setItem=()=>{throw new DOMException('full','QuotaExceededError');};
  const storage=createHubAccountStorage(local,tab,['token']);storage.setItem('token','new');expect(storage.getItem('token')).toBe('new');
  expect(createHubAccountStorage(local,tab,['token']).getItem('token')).toBe('new');storage.removeItem('token');expect(storage.getItem('token')).toBeNull();expect(local.getItem('token')).toBeNull();
 });
 it('keeps a sign-out tombstone if persistent removal is blocked',()=>{
  const local=memory(),tab=memory();local.setItem('token','old');local.removeItem=()=>{throw new DOMException('blocked','SecurityError');};
  const storage=createHubAccountStorage(local,tab,['token']);storage.removeItem('token');
  expect(createHubAccountStorage(local,tab,['token']).getItem('token')).toBeNull();expect(local.getItem('token')).toBe('old');
 });
 it('uses tab storage if persistent storage access is denied',()=>{
  const tab=memory(),storage=createHubAccountStorage(null,tab,['token']);storage.setItem('token','value');expect(storage.getItem('token')).toBe('value');storage.removeItem('token');expect(storage.getItem('token')).toBeNull();
 });
 it('accepts a newer persistent session from another tab instead of its stale fallback',()=>{
  const local=memory(),tab=memory();const write=local.setItem;local.setItem=()=>{throw new DOMException('full','QuotaExceededError');};
  const storage=createHubAccountStorage(local,tab,['token']);storage.setItem('token','fallback');local.setItem=write;local.setItem('token','other-tab');
  storage.reconcilePersistentChange('token');expect(storage.getItem('token')).toBe('other-tab');
 });
});

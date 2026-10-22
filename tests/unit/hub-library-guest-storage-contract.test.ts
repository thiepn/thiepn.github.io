import {describe,expect,it} from 'vitest';
import {unexpectedGuestIndexedDbNames} from '../hub-library/guest-storage-contract';

describe('Hub Library and Reading guest IndexedDB ownership boundary',()=>{
 it('permits only exact original Hub workspace and Account credential stores',()=>{
  expect(unexpectedGuestIndexedDbNames(['thiepn-adaptive-workspace','thiepn-hub-account'])).toEqual([]);
  expect(unexpectedGuestIndexedDbNames(['thiepn-hub-account','thiepn-hub-account'])).toEqual([]);
 });
 it('rejects progress, private EPUB files and every other unexpected database',()=>{
  const forbidden=['thiepn-library','thiepn-library-personal-books','thiepn-library-index','other-app'];
  expect(unexpectedGuestIndexedDbNames(['thiepn-hub-account',...forbidden])).toEqual(forbidden);
 });
 it('does not permit lookalike credential databases, case variations or unnamed DBs',()=>{
  expect(unexpectedGuestIndexedDbNames(['thiepn-hub-account-backup','THIEPN-HUB-ACCOUNT',undefined,null]))
    .toEqual(['thiepn-hub-account-backup','THIEPN-HUB-ACCOUNT','<unnamed database>','<unnamed database>']);
 });
});

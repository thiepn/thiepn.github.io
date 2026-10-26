import {test,expect} from '@playwright/test';
test.use({serviceWorkers:'block'});
test.skip(process.env.KEEP_NATIVE_BUILT!=='1','Requires exact original KEEP Bun/Vite/crypto build.');
for(const width of [390,1440]){
 test('real original Argon2id vault setup, wrong-password, lock, reload, identity revoke and offline '+width,async({page,context})=>{
  test.setTimeout(180_000);
  await page.setViewportSize({width,height:width===390?844:900});
  await page.goto('/home/knowledge/');
  await expect(page.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');
  await page.evaluate(async()=>new Promise<void>((resolve,reject)=>{
    const r=indexedDB.open('KeepNotesDB',1);
    r.onupgradeneeded=()=>{
      for(const name of ['notes','folders','saved_searches','settings'])
        r.result.createObjectStore(name,{keyPath:name==='settings'?'key':'id'});
    };
    r.onerror=()=>reject(r.error);
    r.onsuccess=()=>{r.result.close();resolve();};
  }));
  page.once('dialog',d=>d.accept());
  await page.locator('[data-action=knowledge-native-start]').click();
  await expect(page.locator('[data-keep-original-react-active=true]')).toBeVisible();
  await page.locator('#btn-workspace-tools-menu').click();
  await page.getByRole('button',{name:'Encryption & Keys'}).click();
  const modal=page.getByRole('dialog').filter({hasText:'Full-Vault Client-Side Encryption'});
  await expect(modal).toBeVisible();
  const secret='synthetic-vault-test-passphrase-14';
  await modal.getByPlaceholder('Enter strong master passphrase...').fill(secret);
  await modal.getByPlaceholder('Re-enter master passphrase...').fill(secret);
  await modal.getByRole('button',{name:'Enable Full-Vault Encryption'}).click();
  await expect(modal).toContainText('Full-vault client-side encryption successfully enabled!',{timeout:60_000});
  const header=await page.evaluate(()=>{
   const h=JSON.parse(localStorage.getItem('keepnotes_vault_enc_header')??'null');
   return h && {format:h.format,kdf:h.kdf.algorithm,cipher:h.cipher.cipher,wrapped:h.wrappedKey.ciphertext,plaintext:localStorage.getItem('keepnotes_vault_enc_header')?.includes('synthetic-vault-test-passphrase-14')};
  });
  expect(header).toMatchObject({format:'keepnotes-vault-enc',kdf:'argon2id',cipher:'AES-256-GCM',plaintext:false});
  expect(header.wrapped).toBeTruthy();
  await modal.locator('button').first().click();
  await expect(modal).toHaveCount(0);
  await page.locator('[data-keep-native-exit]').click();
  await expect(page.locator('[data-keep-original-react-active=true]')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');
  page.once('dialog',d=>d.accept());
  await page.locator('[data-action=knowledge-native-start]').click();
  await expect(page.getByRole('heading',{name:'Vault is Locked'})).toBeVisible();
  await page.getByPlaceholder('Enter master passphrase...').fill('incorrect-synthetic-password');
  await page.getByRole('button',{name:'Unlock Vault'}).click();
  await expect(page.getByText('Incorrect master passphrase or corrupted key')).toBeVisible({timeout:60_000});
  await page.getByPlaceholder('Enter master passphrase...').fill(secret);
  await page.getByRole('button',{name:'Unlock Vault'}).click();
  await expect(page.getByRole('heading',{name:'Vault is Locked'})).toHaveCount(0,{timeout:60_000});
  await context.setOffline(true);
  await page.locator('[data-keep-native-exit]').click();
  await expect(page.locator('[data-keep-native-frame]')).toBeHidden();
  await context.setOffline(false);
  page.once('dialog',d=>d.accept());
  await page.locator('[data-action=knowledge-native-start]').click();
  await expect(page.getByRole('heading',{name:'Vault is Locked'})).toBeVisible();
  // Identity revocation is stronger than rendered privacy: no original root survives.
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('hub:identity',{detail:{status:'checking'}})));
  await expect(page.locator('[data-keep-original-react-active=true]')).toHaveCount(0);
  expect(await page.evaluate(()=>localStorage.getItem('keepnotes_vault_enc_header')!==null)).toBe(true);
 });
}

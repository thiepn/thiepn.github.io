import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const page = fs.readFileSync(new URL('../../src/pages/account/index.astro', import.meta.url), 'utf8');
const client = fs.readFileSync(new URL('../../src/scripts/account.ts', import.meta.url), 'utf8');
const privacy = fs.readFileSync(new URL('../../src/pages/privacy/index.astro', import.meta.url), 'utf8');

describe('THIEPN Account A1 contract', () => {
  it('uses the canonical shared Supabase identity and session key', () => {
    expect(client).toContain('https://hycegznamzjhwinegaai.supabase.co');
    expect(client).toContain("sb-hycegznamzjhwinegaai-auth-token");
    expect(client).not.toContain('service_role');
    expect(client).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
  });

  it('keeps the account dashboard private from indexing and analytics', () => {
    expect(page).toContain('noindex={true}');
    expect(page).toContain('One account.');
    expect(page).toContain('Separate apps.');
  });

  it('exposes the A1 account-management surfaces', () => {
    expect(page).toContain('data-auth-google');
    expect(page).toContain('data-profile-form');
    expect(page).toContain('data-email-form');
    expect(page).toContain('data-password-form');
    expect(page).toContain('data-account-apps');
    expect(page).toContain('data-delete-account');
  });

  it('requires an explicit ecosystem-wide destructive confirmation', () => {
    expect(client).toContain("const DELETE_CONFIRMATION = 'DELETE MY ACCOUNT';");
    expect(page).toContain('DELETE MY ACCOUNT');
    expect(client).toContain('/rest/v1/rpc/delete_thiepn_account');
    expect(client).toContain('/storage/v1/object/notes-attachments');
  });

  it('documents that shared identity does not imply shared app data', () => {
    expect(page).toContain('Shared identity does not mean shared content.');
    expect(privacy).toContain('authentication alone does not grant access to another app');
    expect(privacy).toContain('Row Level Security');
  });
});

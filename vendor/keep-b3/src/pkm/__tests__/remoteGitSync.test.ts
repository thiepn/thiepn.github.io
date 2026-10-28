import {
  merge3Text,
  computeLineDiff,
  areBinaryContentsEqual,
  applyConflictResolution,
} from '../mergeEngine';
import { remoteSyncManager } from '../remoteSyncManager';
import { gitHubAdapter } from '../remoteGitAdapters/githubAdapter';
import { gitLabAdapter } from '../remoteGitAdapters/gitlabAdapter';
import { giteaAdapter } from '../remoteGitAdapters/giteaAdapter';
import { PROVIDER_CAPABILITIES, BROWSER_COMPATIBILITY_MATRIX } from '../compatibilityMatrix';
import { Note, Folder } from '../../types';
import { PortableVaultData } from '../portableVaultTypes';
import { FileConflict } from '../remoteGitTypes';

export async function runRemoteGitSyncTests(): Promise<{ passed: number; failed: number; errors: string[] }> {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, msg: string) {
    if (condition) {
      passed++;
    } else {
      failed++;
      errors.push(msg);
      console.error(`  FAIL: ${msg}`);
    }
  }

  try {
    // 1. Clean 3-way merge on identical text
    const text = '# Note Title\n\nSome body text.';
    const res1 = merge3Text('# Old Title', text, text);
    assert(res1.clean === true, 'Merge3 on identical text is clean');
    assert(res1.hasConflicts === false, 'Merge3 on identical text has no conflicts');
    assert(res1.mergedText === text, 'Merge3 on identical text preserves content');

    // 2. Clean 3-way merge on remote edit only
    const base2 = 'Line 1\nLine 2\nLine 3';
    const local2 = 'Line 1\nLine 2\nLine 3';
    const remote2 = 'Line 1\nLine 2 (Updated remotely)\nLine 3';
    const res2 = merge3Text(base2, local2, remote2);
    assert(res2.clean === true, 'Accepts remote change when local is unmodified');
    assert(res2.mergedText === remote2, 'Merged output matches remote change');

    // 3. Clean 3-way merge on local edit only
    const base3 = 'Line 1\nLine 2\nLine 3';
    const local3 = 'Line 1\nLine 2 (Updated locally)\nLine 3';
    const remote3 = 'Line 1\nLine 2\nLine 3';
    const res3 = merge3Text(base3, local3, remote3);
    assert(res3.clean === true, 'Keeps local change when remote is unmodified');
    assert(res3.mergedText === local3, 'Merged output matches local change');

    // 4. Non-overlapping clean merge from both sides
    const base4 = 'Header\n\nSection A: Base\n\nSection B: Base\n\nFooter';
    const local4 = 'Header\n\nSection A: Updated locally\n\nSection B: Base\n\nFooter';
    const remote4 = 'Header\n\nSection A: Base\n\nSection B: Updated remotely\n\nFooter';
    const res4 = merge3Text(base4, local4, remote4);
    assert(res4.clean === true, 'Non-overlapping changes merge cleanly');
    assert(res4.mergedText.includes('Section A: Updated locally'), 'Merged text contains local section edit');
    assert(res4.mergedText.includes('Section B: Updated remotely'), 'Merged text contains remote section edit');

    // 5. Overlapping conflict with Git conflict markers
    const base5 = 'Line 1\nTarget Line Base\nLine 3';
    const local5 = 'Line 1\nTarget Line Local edit\nLine 3';
    const remote5 = 'Line 1\nTarget Line Remote edit\nLine 3';
    const res5 = merge3Text(base5, local5, remote5);
    assert(res5.clean === false, 'Overlapping changes marked as conflict');
    assert(res5.hasConflicts === true, 'Conflict flag set to true');
    assert(res5.mergedText.includes('<<<<<<< LOCAL (Active Vault)'), 'Contains LOCAL marker');
    assert(res5.mergedText.includes('Target Line Local edit'), 'Contains local conflicting chunk');
    assert(res5.mergedText.includes('======='), 'Contains conflict separator');
    assert(res5.mergedText.includes('Target Line Remote edit'), 'Contains remote conflicting chunk');
    assert(res5.mergedText.includes('>>>>>>> REMOTE (Remote Repo)'), 'Contains REMOTE marker');

    // 6. Binary comparisons
    const b1 = new Uint8Array([1, 2, 3, 4, 5]);
    const b2 = new Uint8Array([1, 2, 3, 4, 5]);
    const b3 = new Uint8Array([1, 2, 9, 4, 5]);
    assert(areBinaryContentsEqual(b1, b2) === true, 'Equal byte arrays match');
    assert(areBinaryContentsEqual(b1, b3) === false, 'Different byte arrays differ');
    assert(areBinaryContentsEqual(undefined, undefined) === true, 'Both undefined match');
    assert(areBinaryContentsEqual(b1, undefined) === false, 'Defined and undefined differ');

    // 7. Applying conflict resolutions
    const conflict: FileConflict = {
      path: 'notes/test.md',
      fileType: 'markdown',
      localContent: 'Local text',
      remoteContent: 'Remote text',
      mergedContent: 'Merged text with markers',
      status: 'unresolved',
    };
    const resLocal = applyConflictResolution(conflict, 'local');
    assert(resLocal.resolvedContent === 'Local text', 'Resolution "local" picks local text');
    assert(conflict.status === 'resolved', 'Conflict status marked resolved');

    const resRemote = applyConflictResolution(conflict, 'remote');
    assert(resRemote.resolvedContent === 'Remote text', 'Resolution "remote" picks remote text');

    const resBoth = applyConflictResolution(conflict, 'both');
    assert(resBoth.resolvedContent === 'Merged text with markers', 'Resolution "both" picks merged markers');

    const resCustom = applyConflictResolution(conflict, 'custom', 'Custom hand-edited text');
    assert(resCustom.resolvedContent === 'Custom hand-edited text', 'Resolution "custom" applies custom text');

    // 8. Security & localStorage token protection
    localStorage.clear();
    remoteSyncManager.clearSessionToken();
    remoteSyncManager.saveConfig({
      provider: 'github',
      owner: 'octocat',
      repo: 'vault',
      branch: 'main',
      authorName: 'Octo User',
      authorEmail: 'octo@github.com',
    });
    const rawStored = localStorage.getItem('keepnotes_remote_git_config');
    assert(rawStored !== null, 'Saved remote config in localStorage');
    const parsed = JSON.parse(rawStored!);
    assert(parsed.provider === 'github', 'Persisted provider correctly');
    assert(parsed.token === undefined, 'No token in persistent storage');

    // 9. Volatile Session Token Management
    assert(remoteSyncManager.isAuthenticated() === false, 'Unauthenticated when token not set');
    remoteSyncManager.setSessionToken('ghp_test_session_secret_xyz');
    assert(remoteSyncManager.isAuthenticated() === true, 'Authenticated after setting in-memory session token');
    assert(remoteSyncManager.getSessionToken() === 'ghp_test_session_secret_xyz', 'Session token readable in memory');
    remoteSyncManager.clearSessionToken();
    assert(remoteSyncManager.isAuthenticated() === false, 'Session token cleared cleanly');

    // 10. Provider Capability Matrix Verification
    assert(PROVIDER_CAPABILITIES.github.directBrowserCORS === true, 'GitHub capabilities verified');
    assert(PROVIDER_CAPABILITIES.gitlab.directBrowserCORS === true, 'GitLab capabilities verified');
    assert(PROVIDER_CAPABILITIES.gitea.directBrowserCORS === true, 'Gitea capabilities verified');
    assert(PROVIDER_CAPABILITIES.custom_http.requiresCorsProxy === true, 'Custom HTTP correctly flagged as requiring CORS proxy');

    // 11. Offline Fallback Safety
    const mockVault: PortableVaultData = {
      notes: [
        {
          id: 'note-1',
          title: 'Local Note',
          content: 'Local Content',
          type: 'text',
          checklist: [],
          tags: [],
          color: 'default',
          folderId: null,
          pinned: false,
          archived: false,
          trashed: false,
          reminderDate: null,
          images: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      folders: [],
      savedSearches: [],
    };
    const syncRes = await remoteSyncManager.pullAndMerge(mockVault);
    assert(syncRes.success === false, 'Pull fails gracefully without valid remote connection');
    assert(syncRes.updatedVault.notes.length === 1, 'Local vault remains intact and uncorrupted');
  } catch (err: any) {
    failed++;
    errors.push(`Unhandled error in remoteGitSync.test: ${err.message}`);
  }

  return { passed, failed, errors };
}

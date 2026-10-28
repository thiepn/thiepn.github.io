import {
  RemoteRepoConfig,
  RemoteFileSnapshot,
  RemoteCommitRef,
} from '../remoteGitTypes';
import { PortableFileEntry } from '../portableVaultTypes';
import { uint8ArrayToDataUrl, dataUrlToUint8Array } from '../portableVaultSerializer';

export class GitLabGitAdapter {
  private getBaseUrl(config: RemoteRepoConfig): string {
    return (config.baseUrl || 'https://gitlab.com').replace(/\/+$/, '');
  }

  private getProjectIdentifier(config: RemoteRepoConfig): string {
    // Can be owner/repo (URL encoded) or numeric ID
    const path = `${config.owner}/${config.repo}`;
    return encodeURIComponent(path);
  }

  private getHeaders(token: string) {
    return {
      'Content-Type': 'application/json',
      'PRIVATE-TOKEN': token,
    };
  }

  /**
   * Test connection and permissions
   */
  async testConnection(
    config: RemoteRepoConfig,
    token: string
  ): Promise<{ ok: boolean; repoName: string; defaultBranch: string; error?: string }> {
    const projectId = this.getProjectIdentifier(config);
    const url = `${this.getBaseUrl(config)}/api/v4/projects/${projectId}`;

    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(token),
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          return { ok: false, repoName: config.repo, defaultBranch: 'main', error: 'Authentication failed (401/403). Check your GitLab Personal Access Token.' };
        }
        if (res.status === 404) {
          return { ok: false, repoName: config.repo, defaultBranch: 'main', error: `Project "${config.owner}/${config.repo}" not found on GitLab.` };
        }
        return { ok: false, repoName: config.repo, defaultBranch: 'main', error: `GitLab API error: HTTP ${res.status}` };
      }

      const data = await res.json();
      return {
        ok: true,
        repoName: data.path_with_namespace || `${config.owner}/${config.repo}`,
        defaultBranch: data.default_branch || 'main',
      };
    } catch (e: any) {
      return { ok: false, repoName: config.repo, defaultBranch: 'main', error: e.message || 'Network error connecting to GitLab' };
    }
  }

  /**
   * Get latest commit on target branch
   */
  async getHeadCommit(
    config: RemoteRepoConfig,
    token: string
  ): Promise<RemoteCommitRef | null> {
    const projectId = this.getProjectIdentifier(config);
    const branch = config.branch || 'main';
    const url = `${this.getBaseUrl(config)}/api/v4/projects/${projectId}/repository/branches/${encodeURIComponent(branch)}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(token),
    });

    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`Failed to get GitLab branch "${branch}": HTTP ${res.status}`);
    }

    const branchData = await res.json();
    const c = branchData.commit;

    return {
      sha: c.id,
      shortSha: (c.short_id || c.id).slice(0, 7),
      message: c.message?.trim() || '',
      author: {
        name: c.author_name || 'Author',
        email: c.author_email || '',
        date: c.authored_date || c.created_at || new Date().toISOString(),
      },
    };
  }

  /**
   * Get commit history list
   */
  async getCommitHistory(
    config: RemoteRepoConfig,
    token: string,
    depth = 25
  ): Promise<RemoteCommitRef[]> {
    const projectId = this.getProjectIdentifier(config);
    const branch = config.branch || 'main';
    const url = `${this.getBaseUrl(config)}/api/v4/projects/${projectId}/repository/commits?ref_name=${encodeURIComponent(branch)}&per_page=${depth}`;

    const res = await fetch(url, {
      headers: this.getHeaders(token),
    });

    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map((c: any) => ({
      sha: c.id,
      shortSha: (c.short_id || c.id).slice(0, 7),
      message: c.message?.trim() || '',
      author: {
        name: c.author_name || 'Author',
        email: c.author_email || '',
        date: c.authored_date || c.created_at || new Date().toISOString(),
      },
    }));
  }

  /**
   * Fetch all files from the remote tree
   */
  async fetchRemoteFiles(
    config: RemoteRepoConfig,
    token: string
  ): Promise<{ files: RemoteFileSnapshot[]; headCommit: RemoteCommitRef | null }> {
    const head = await this.getHeadCommit(config, token);
    if (!head) {
      return { files: [], headCommit: null };
    }

    const projectId = this.getProjectIdentifier(config);
    const branch = config.branch || 'main';

    // List all files in tree
    const treeUrl = `${this.getBaseUrl(config)}/api/v4/projects/${projectId}/repository/tree?ref=${encodeURIComponent(branch)}&recursive=true&per_page=100`;
    const treeRes = await fetch(treeUrl, {
      headers: this.getHeaders(token),
    });

    if (!treeRes.ok) {
      throw new Error(`Failed to fetch GitLab tree: HTTP ${treeRes.status}`);
    }

    const treeItems: Array<{ path: string; mode: string; type: string; id: string }> = await treeRes.json();
    const fileEntries: RemoteFileSnapshot[] = [];

    for (const item of treeItems) {
      if (item.type !== 'blob') continue;
      if (item.path.startsWith('.git/')) continue;

      const fileUrl = `${this.getBaseUrl(config)}/api/v4/projects/${projectId}/repository/files/${encodeURIComponent(item.path)}/raw?ref=${encodeURIComponent(branch)}`;
      const fileRes = await fetch(fileUrl, {
        headers: { 'PRIVATE-TOKEN': token },
      });

      if (!fileRes.ok) continue;

      const isBinary = (
        item.path.endsWith('.png') ||
        item.path.endsWith('.jpg') ||
        item.path.endsWith('.jpeg') ||
        item.path.endsWith('.pdf') ||
        item.path.endsWith('.bin')
      );

      if (isBinary) {
        const arrayBuf = await fileRes.arrayBuffer();
        fileEntries.push({
          path: item.path,
          content: new Uint8Array(arrayBuf),
          isBinary: true,
          sha: item.id,
        });
      } else {
        const text = await fileRes.text();
        fileEntries.push({
          path: item.path,
          content: text,
          isBinary: false,
          sha: item.id,
        });
      }
    }

    return { files: fileEntries, headCommit: head };
  }

  /**
   * Push full vault commit using GitLab Commits Multi-File API
   */
  async pushVaultCommit(
    config: RemoteRepoConfig,
    token: string,
    files: PortableFileEntry[],
    message: string,
    author?: { name: string; email: string }
  ): Promise<RemoteCommitRef> {
    const projectId = this.getProjectIdentifier(config);
    const branch = config.branch || 'main';
    const baseUrl = this.getBaseUrl(config);

    // 1. Fetch remote tree to see existing files and choose create vs update vs delete action
    let existingPaths = new Set<string>();
    try {
      const { files: remoteFiles } = await this.fetchRemoteFiles(config, token);
      existingPaths = new Set(remoteFiles.map((f) => f.path));
    } catch {
      // Branch or repo may be newly initialized
    }

    const currentPaths = new Set(files.map((f) => f.path));
    const actions: any[] = [];

    // Deleted files
    for (const oldPath of existingPaths) {
      if (!currentPaths.has(oldPath)) {
        actions.push({
          action: 'delete',
          file_path: oldPath,
        });
      }
    }

    // Created or updated files
    for (const file of files) {
      const exists = existingPaths.has(file.path);
      const action = exists ? 'update' : 'create';

      if (file.isBinary) {
        const bytes = file.content instanceof Uint8Array ? file.content : new Uint8Array();
        const dataUrl = uint8ArrayToDataUrl(bytes, 'application/octet-stream');
        const base64 = dataUrl.split(',')[1] || '';

        actions.push({
          action,
          file_path: file.path,
          content: base64,
          encoding: 'base64',
        });
      } else {
        const text = typeof file.content === 'string' ? file.content : new TextDecoder().decode(file.content);
        actions.push({
          action,
          file_path: file.path,
          content: text,
          encoding: 'text',
        });
      }
    }

    const commitPayload: any = {
      branch,
      commit_message: message || `Vault synchronization snapshot ${new Date().toISOString()}`,
      actions,
    };

    if (author?.name) commitPayload.author_name = author.name;
    if (author?.email) commitPayload.author_email = author.email;

    const commitRes = await fetch(`${baseUrl}/api/v4/projects/${projectId}/repository/commits`, {
      method: 'POST',
      headers: this.getHeaders(token),
      body: JSON.stringify(commitPayload),
    });

    if (!commitRes.ok) {
      const errJson = await commitRes.json().catch(() => ({}));
      throw new Error(`GitLab Commit failed: ${errJson.message || commitRes.statusText}`);
    }

    const commitData = await commitRes.json();
    return {
      sha: commitData.id,
      shortSha: (commitData.short_id || commitData.id).slice(0, 7),
      message: commitData.message || message,
      author: {
        name: commitData.author_name || author?.name || 'Author',
        email: commitData.author_email || author?.email || '',
        date: commitData.authored_date || new Date().toISOString(),
      },
    };
  }
}

export const gitLabAdapter = new GitLabGitAdapter();

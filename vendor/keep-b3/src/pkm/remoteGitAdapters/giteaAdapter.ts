import {
  RemoteRepoConfig,
  RemoteFileSnapshot,
  RemoteCommitRef,
} from '../remoteGitTypes';
import { PortableFileEntry } from '../portableVaultTypes';
import { uint8ArrayToDataUrl, dataUrlToUint8Array } from '../portableVaultSerializer';

export class GiteaGitAdapter {
  private getBaseUrl(config: RemoteRepoConfig): string {
    return (config.baseUrl || 'http://localhost:3000').replace(/\/+$/, '');
  }

  private getHeaders(token: string) {
    return {
      'Content-Type': 'application/json',
      Authorization: `token ${token}`,
    };
  }

  /**
   * Test connection and permissions
   */
  async testConnection(
    config: RemoteRepoConfig,
    token: string
  ): Promise<{ ok: boolean; repoName: string; defaultBranch: string; error?: string }> {
    const url = `${this.getBaseUrl(config)}/api/v1/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}`;

    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(token),
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          return { ok: false, repoName: config.repo, defaultBranch: 'main', error: 'Authentication failed (401/403). Check your Gitea Personal Access Token.' };
        }
        if (res.status === 404) {
          return { ok: false, repoName: config.repo, defaultBranch: 'main', error: `Repository "${config.owner}/${config.repo}" not found on Gitea server.` };
        }
        return { ok: false, repoName: config.repo, defaultBranch: 'main', error: `Gitea API error: HTTP ${res.status}` };
      }

      const data = await res.json();
      return {
        ok: true,
        repoName: data.full_name || `${config.owner}/${config.repo}`,
        defaultBranch: data.default_branch || 'main',
      };
    } catch (e: any) {
      return { ok: false, repoName: config.repo, defaultBranch: 'main', error: e.message || 'Network error connecting to Gitea' };
    }
  }

  /**
   * Get latest commit on target branch
   */
  async getHeadCommit(
    config: RemoteRepoConfig,
    token: string
  ): Promise<RemoteCommitRef | null> {
    const branch = config.branch || 'main';
    const url = `${this.getBaseUrl(config)}/api/v1/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/branches/${encodeURIComponent(branch)}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(token),
    });

    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`Failed to get Gitea branch "${branch}": HTTP ${res.status}`);
    }

    const branchData = await res.json();
    const c = branchData.commit;

    return {
      sha: c.id,
      shortSha: (c.id || '').slice(0, 7),
      message: c.message?.trim() || '',
      author: {
        name: c.author?.name || 'Author',
        email: c.author?.email || '',
        date: c.timestamp || c.created || new Date().toISOString(),
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
    const branch = config.branch || 'main';
    const url = `${this.getBaseUrl(config)}/api/v1/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/commits?sha=${encodeURIComponent(branch)}&limit=${depth}`;

    const res = await fetch(url, {
      headers: this.getHeaders(token),
    });

    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map((c: any) => ({
      sha: c.sha || c.id,
      shortSha: (c.sha || c.id || '').slice(0, 7),
      message: c.commit?.message?.trim() || c.message?.trim() || '',
      author: {
        name: c.commit?.author?.name || c.author?.name || 'Author',
        email: c.commit?.author?.email || c.author?.email || '',
        date: c.commit?.author?.date || c.created || new Date().toISOString(),
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

    const branch = config.branch || 'main';
    const url = `${this.getBaseUrl(config)}/api/v1/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/git/trees/${encodeURIComponent(branch)}?recursive=1`;

    const treeRes = await fetch(url, {
      headers: this.getHeaders(token),
    });

    if (!treeRes.ok) {
      throw new Error(`Failed to fetch Gitea tree: HTTP ${treeRes.status}`);
    }

    const treeData = await treeRes.json();
    const treeItems: Array<{ path: string; mode: string; type: string; sha: string }> = treeData.tree || [];
    const fileEntries: RemoteFileSnapshot[] = [];

    for (const item of treeItems) {
      if (item.type !== 'blob') continue;
      if (item.path.startsWith('.git/')) continue;

      const rawUrl = `${this.getBaseUrl(config)}/api/v1/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/raw/branch/${encodeURIComponent(branch)}/${item.path}`;
      const rawRes = await fetch(rawUrl, {
        headers: this.getHeaders(token),
      });

      if (!rawRes.ok) continue;

      const isBinary = (
        item.path.endsWith('.png') ||
        item.path.endsWith('.jpg') ||
        item.path.endsWith('.jpeg') ||
        item.path.endsWith('.pdf') ||
        item.path.endsWith('.bin')
      );

      if (isBinary) {
        const arrayBuf = await rawRes.arrayBuffer();
        fileEntries.push({
          path: item.path,
          content: new Uint8Array(arrayBuf),
          isBinary: true,
          sha: item.sha,
        });
      } else {
        const text = await rawRes.text();
        fileEntries.push({
          path: item.path,
          content: text,
          isBinary: false,
          sha: item.sha,
        });
      }
    }

    return { files: fileEntries, headCommit: head };
  }

  /**
   * Push full vault commit using Gitea Multi-file / change API
   */
  async pushVaultCommit(
    config: RemoteRepoConfig,
    token: string,
    files: PortableFileEntry[],
    message: string,
    author?: { name: string; email: string }
  ): Promise<RemoteCommitRef> {
    const branch = config.branch || 'main';
    const baseUrl = this.getBaseUrl(config);
    const owner = encodeURIComponent(config.owner);
    const repo = encodeURIComponent(config.repo);

    // 1. Check existing remote files
    let existingPaths = new Set<string>();
    let head = await this.getHeadCommit(config, token);
    try {
      const { files: remoteFiles } = await this.fetchRemoteFiles(config, token);
      existingPaths = new Set(remoteFiles.map((f) => f.path));
    } catch {
      // Empty repo
    }

    const currentPaths = new Set(files.map((f) => f.path));
    const operations: any[] = [];

    for (const oldPath of existingPaths) {
      if (!currentPaths.has(oldPath)) {
        operations.push({
          operation: 'delete',
          path: oldPath,
        });
      }
    }

    for (const file of files) {
      const exists = existingPaths.has(file.path);
      const operation = exists ? 'update' : 'create';

      let contentBase64 = '';
      if (file.isBinary) {
        const bytes = file.content instanceof Uint8Array ? file.content : new Uint8Array();
        const dataUrl = uint8ArrayToDataUrl(bytes, 'application/octet-stream');
        contentBase64 = dataUrl.split(',')[1] || '';
      } else {
        const text = typeof file.content === 'string' ? file.content : new TextDecoder().decode(file.content);
        contentBase64 = btoa(unescape(encodeURIComponent(text)));
      }

      operations.push({
        operation,
        path: file.path,
        content: contentBase64,
      });
    }

    const payload: any = {
      branch,
      message: message || `Vault synchronization snapshot ${new Date().toISOString()}`,
      files: operations,
    };

    if (author?.name) {
      payload.author = {
        name: author.name,
        email: author.email || 'user@local.vault',
      };
    }

    // Gitea changes/multi-file commit API endpoint
    const commitUrl = `${baseUrl}/api/v1/repos/${owner}/${repo}/contents`;
    const res = await fetch(commitUrl, {
      method: 'POST',
      headers: this.getHeaders(token),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(`Gitea Commit failed: ${errJson.message || res.statusText}`);
    }

    const resData = await res.json();
    const commitSha = resData.commit?.sha || resData.commit?.id || 'unknown';

    return {
      sha: commitSha,
      shortSha: commitSha.slice(0, 7),
      message: payload.message,
      author: {
        name: author?.name || 'Author',
        email: author?.email || '',
        date: new Date().toISOString(),
      },
    };
  }
}

export const giteaAdapter = new GiteaGitAdapter();

import {
  RemoteRepoConfig,
  RemoteFileSnapshot,
  RemoteCommitRef,
  ProviderCapability,
} from '../remoteGitTypes';
import { PortableFileEntry } from '../portableVaultTypes';
import { uint8ArrayToDataUrl, dataUrlToUint8Array } from '../portableVaultSerializer';

export class GitHubGitAdapter {
  private getBaseUrl(config: RemoteRepoConfig): string {
    return (config.baseUrl || 'https://api.github.com').replace(/\/+$/, '');
  }

  private getHeaders(token: string) {
    return {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
    };
  }

  /**
   * Test connection and permissions
   */
  async testConnection(
    config: RemoteRepoConfig,
    token: string
  ): Promise<{ ok: boolean; repoName: string; defaultBranch: string; permissions?: any; error?: string }> {
    const url = `${this.getBaseUrl(config)}/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}`;
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(token),
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          return { ok: false, repoName: config.repo, defaultBranch: 'main', error: 'Authentication failed (401/403). Check your Personal Access Token.' };
        }
        if (res.status === 404) {
          return { ok: false, repoName: config.repo, defaultBranch: 'main', error: `Repository "${config.owner}/${config.repo}" not found on GitHub.` };
        }
        return { ok: false, repoName: config.repo, defaultBranch: 'main', error: `GitHub API error: HTTP ${res.status} ${res.statusText}` };
      }

      const data = await res.json();
      return {
        ok: true,
        repoName: data.full_name || `${config.owner}/${config.repo}`,
        defaultBranch: data.default_branch || 'main',
        permissions: data.permissions,
      };
    } catch (e: any) {
      return { ok: false, repoName: config.repo, defaultBranch: 'main', error: e.message || 'Network error connecting to GitHub' };
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
    const refUrl = `${this.getBaseUrl(config)}/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/git/ref/heads/${encodeURIComponent(branch)}`;

    const res = await fetch(refUrl, {
      method: 'GET',
      headers: this.getHeaders(token),
    });

    if (!res.ok) {
      if (res.status === 404) return null; // Branch doesn't exist yet
      throw new Error(`Failed to get branch ref for "${branch}": HTTP ${res.status}`);
    }

    const refData = await res.json();
    const sha = refData.object.sha;

    // Get commit details
    const commitUrl = `${this.getBaseUrl(config)}/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/git/commits/${sha}`;
    const commitRes = await fetch(commitUrl, {
      method: 'GET',
      headers: this.getHeaders(token),
    });

    if (!commitRes.ok) {
      return {
        sha,
        shortSha: sha.slice(0, 7),
        message: 'HEAD',
        author: { name: 'Unknown', email: '', date: new Date().toISOString() },
      };
    }

    const commitData = await commitRes.json();
    return {
      sha,
      shortSha: sha.slice(0, 7),
      message: commitData.message || '',
      author: {
        name: commitData.author?.name || 'Author',
        email: commitData.author?.email || '',
        date: commitData.author?.date || new Date().toISOString(),
      },
      treeSha: commitData.tree?.sha,
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
    const url = `${this.getBaseUrl(config)}/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/commits?sha=${encodeURIComponent(branch)}&per_page=${depth}`;

    const res = await fetch(url, {
      headers: this.getHeaders(token),
    });

    if (!res.ok) return [];

    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map((c: any) => ({
      sha: c.sha,
      shortSha: c.sha.slice(0, 7),
      message: c.commit?.message?.trim() || '',
      author: {
        name: c.commit?.author?.name || c.author?.login || 'Author',
        email: c.commit?.author?.email || '',
        date: c.commit?.author?.date || new Date().toISOString(),
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
    if (!head || !head.treeSha) {
      return { files: [], headCommit: null };
    }

    // Get recursive tree
    const treeUrl = `${this.getBaseUrl(config)}/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/git/trees/${head.treeSha}?recursive=1`;
    const treeRes = await fetch(treeUrl, {
      headers: this.getHeaders(token),
    });

    if (!treeRes.ok) {
      throw new Error(`Failed to fetch Git tree: HTTP ${treeRes.status}`);
    }

    const treeData = await treeRes.json();
    const treeItems: Array<{ path: string; mode: string; type: string; sha: string; size?: number }> = treeData.tree || [];

    const fileEntries: RemoteFileSnapshot[] = [];

    for (const item of treeItems) {
      if (item.type !== 'blob') continue;
      // Skip git internals or non-vault files if desired
      if (item.path.startsWith('.git/')) continue;

      const blobUrl = `${this.getBaseUrl(config)}/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/git/blobs/${item.sha}`;
      const blobRes = await fetch(blobUrl, {
        headers: this.getHeaders(token),
      });

      if (!blobRes.ok) continue;

      const blobData = await blobRes.json();
      const isBinary = blobData.encoding === 'base64' && (
        item.path.endsWith('.png') ||
        item.path.endsWith('.jpg') ||
        item.path.endsWith('.jpeg') ||
        item.path.endsWith('.pdf') ||
        item.path.endsWith('.bin')
      );

      if (isBinary) {
        const { bytes } = dataUrlToUint8Array(`data:application/octet-stream;base64,${blobData.content.replace(/\s/g, '')}`);
        fileEntries.push({
          path: item.path,
          content: bytes,
          isBinary: true,
          sha: item.sha,
        });
      } else {
        let text = '';
        if (blobData.encoding === 'base64') {
          try {
            text = decodeURIComponent(
              atob(blobData.content.replace(/\s/g, ''))
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
            );
          } catch {
            text = atob(blobData.content.replace(/\s/g, ''));
          }
        } else {
          text = blobData.content;
        }

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
   * Push full vault commit using standard GitHub Git Database API (creates blobs, tree, commit, ref update)
   */
  async pushVaultCommit(
    config: RemoteRepoConfig,
    token: string,
    files: PortableFileEntry[],
    message: string,
    author?: { name: string; email: string }
  ): Promise<RemoteCommitRef> {
    const baseUrl = this.getBaseUrl(config);
    const branch = config.branch || 'main';
    const owner = encodeURIComponent(config.owner);
    const repo = encodeURIComponent(config.repo);
    const headers = this.getHeaders(token);

    // 1. Get HEAD ref if exists
    let parentSha: string | null = null;
    try {
      const head = await this.getHeadCommit(config, token);
      if (head) {
        parentSha = head.sha;
      }
    } catch {
      // New or empty repo
    }

    // 2. Upload blobs for all files
    const treeItems: Array<{ path: string; mode: string; type: 'blob'; sha: string }> = [];

    for (const file of files) {
      let contentBase64: string;
      let encoding: 'utf-8' | 'base64';

      if (file.isBinary) {
        const bytes = file.content instanceof Uint8Array ? file.content : new Uint8Array();
        const dataUrl = uint8ArrayToDataUrl(bytes, 'application/octet-stream');
        contentBase64 = dataUrl.split(',')[1] || '';
        encoding = 'base64';
      } else {
        contentBase64 = typeof file.content === 'string' ? file.content : new TextDecoder().decode(file.content);
        encoding = 'utf-8';
      }

      const blobRes = await fetch(`${baseUrl}/repos/${owner}/${repo}/git/blobs`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          content: contentBase64,
          encoding,
        }),
      });

      if (!blobRes.ok) {
        const errJson = await blobRes.json().catch(() => ({}));
        throw new Error(`Failed to upload blob for "${file.path}": ${errJson.message || blobRes.statusText}`);
      }

      const blobJson = await blobRes.json();
      treeItems.push({
        path: file.path,
        mode: '100644',
        type: 'blob',
        sha: blobJson.sha,
      });
    }

    // 3. Create tree
    const treeRes = await fetch(`${baseUrl}/repos/${owner}/${repo}/git/trees`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        tree: treeItems,
      }),
    });

    if (!treeRes.ok) {
      const errJson = await treeRes.json().catch(() => ({}));
      throw new Error(`Failed to create Git tree: ${errJson.message || treeRes.statusText}`);
    }

    const treeJson = await treeRes.json();
    const treeSha = treeJson.sha;

    // 4. Create Commit
    const commitBody: any = {
      message: message || `Vault synchronization snapshot ${new Date().toISOString()}`,
      tree: treeSha,
      parents: parentSha ? [parentSha] : [],
    };

    if (author && author.name && author.email) {
      commitBody.author = {
        name: author.name,
        email: author.email,
        date: new Date().toISOString(),
      };
    }

    const commitRes = await fetch(`${baseUrl}/repos/${owner}/${repo}/git/commits`, {
      method: 'POST',
      headers,
      body: JSON.stringify(commitBody),
    });

    if (!commitRes.ok) {
      const errJson = await commitRes.json().catch(() => ({}));
      throw new Error(`Failed to create Git commit: ${errJson.message || commitRes.statusText}`);
    }

    const commitJson = await commitRes.json();
    const newCommitSha = commitJson.sha;

    // 5. Update Branch Ref
    if (parentSha) {
      // Update existing branch ref
      const updateRefRes = await fetch(`${baseUrl}/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(branch)}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          sha: newCommitSha,
          force: false,
        }),
      });

      if (!updateRefRes.ok) {
        const errJson = await updateRefRes.json().catch(() => ({}));
        throw new Error(`Failed to update branch "${branch}" to ${newCommitSha}: ${errJson.message || updateRefRes.statusText}`);
      }
    } else {
      // Create new branch ref
      const createRefRes = await fetch(`${baseUrl}/repos/${owner}/${repo}/git/refs`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ref: `refs/heads/${branch}`,
          sha: newCommitSha,
        }),
      });

      if (!createRefRes.ok) {
        const errJson = await createRefRes.json().catch(() => ({}));
        throw new Error(`Failed to create branch ref "${branch}": ${errJson.message || createRefRes.statusText}`);
      }
    }

    return {
      sha: newCommitSha,
      shortSha: newCommitSha.slice(0, 7),
      message: commitJson.message || message,
      author: {
        name: commitJson.author?.name || author?.name || 'Author',
        email: commitJson.author?.email || author?.email || '',
        date: commitJson.author?.date || new Date().toISOString(),
      },
      treeSha,
    };
  }
}

export const gitHubAdapter = new GitHubGitAdapter();

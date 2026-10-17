import git from 'isomorphic-git';
import http from 'isomorphic-git/http/web';
import { localGitService } from '../localGitService';
import {
  RemoteRepoConfig,
  RemoteFileSnapshot,
  RemoteCommitRef,
} from '../remoteGitTypes';
import { PortableFileEntry } from '../portableVaultTypes';

export class SmartHttpGitAdapter {
  private getRemoteUrl(config: RemoteRepoConfig): string {
    if (config.baseUrl) {
      return `${config.baseUrl.replace(/\/+$/, '')}/${config.owner}/${config.repo}.git`;
    }
    return `https://github.com/${config.owner}/${config.repo}.git`;
  }

  async testConnection(
    config: RemoteRepoConfig,
    token: string
  ): Promise<{ ok: boolean; repoName: string; defaultBranch: string; error?: string }> {
    if (!config.corsProxyUrl && !config.baseUrl?.includes('localhost')) {
      return {
        ok: false,
        repoName: config.repo,
        defaultBranch: config.branch || 'main',
        error: 'Direct Git Smart HTTP from browser requires a user-configured trusted CORS proxy or CORS-enabled server.',
      };
    }

    try {
      const fs = localGitService.getFS();
      const url = this.getRemoteUrl(config);
      const info = await git.getRemoteInfo({
        http,
        url,
        corsProxy: config.corsProxyUrl,
        onAuth: () => ({ username: token, password: '' }),
      });

      return {
        ok: true,
        repoName: `${config.owner}/${config.repo}`,
        defaultBranch: info.HEAD || 'main',
      };
    } catch (e: any) {
      return {
        ok: false,
        repoName: config.repo,
        defaultBranch: 'main',
        error: e.message || 'Smart HTTP connection failed',
      };
    }
  }

  async getHeadCommit(
    config: RemoteRepoConfig,
    token: string
  ): Promise<RemoteCommitRef | null> {
    const fs = localGitService.getFS();
    const url = this.getRemoteUrl(config);
    const info = await git.getRemoteInfo({
      http,
      url,
      corsProxy: config.corsProxyUrl,
      onAuth: () => ({ username: token, password: '' }),
    });

    const branch = config.branch || 'main';
    const sha = info.refs?.heads?.[branch];
    if (!sha) return null;

    return {
      sha,
      shortSha: sha.slice(0, 7),
      message: 'Remote HEAD',
      author: {
        name: 'Remote',
        email: '',
        date: new Date().toISOString(),
      },
    };
  }
}

export const smartHttpAdapter = new SmartHttpGitAdapter();

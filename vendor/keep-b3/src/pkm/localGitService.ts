import git from 'isomorphic-git';
import FS from '@isomorphic-git/lightning-fs';
import {
  PortableVaultData,
  PortableFileEntry,
  GitCommitInfo,
  GitStatusSummary,
} from './portableVaultTypes';
import {
  serializePortableVault,
  deserializePortableVault,
} from './portableVaultSerializer';

const DEFAULT_REPO_DIR = '/vault';
const FS_DB_NAME = 'keepnotes_vault_git_fs';

class LocalGitService {
  private fs: any;
  private pfs: any;
  private initialized = false;

  constructor() {
    this.initFS();
  }

  private initFS() {
    try {
      // LightningFS uses IndexedDB in browsers, or in-memory in Node / non-browser
      this.fs = new FS(FS_DB_NAME, {
        wipe: false,
      });
      this.pfs = this.fs.promises;
      this.initialized = true;
    } catch (e) {
      console.warn('LocalGitService: LightningFS initialization warning:', e);
    }
  }

  public getFS() {
    if (!this.initialized || !this.fs) {
      this.initFS();
    }
    return this.fs;
  }

  public getPFS() {
    if (!this.pfs) {
      this.initFS();
    }
    return this.pfs;
  }

  /**
   * Helper to ensure parent directory exists in virtual filesystem
   */
  private async ensureDir(filePath: string): Promise<void> {
    const pfs = this.getPFS();
    const parts = filePath.replace(/\\/g, '/').split('/').filter(Boolean);
    parts.pop(); // remove file name

    let cur = '';
    for (const part of parts) {
      cur += '/' + part;
      try {
        await pfs.mkdir(cur);
      } catch (err: any) {
        if (err.code !== 'EEXIST') {
          // ignore already exists
        }
      }
    }
  }

  /**
   * Check if a Git repository is already initialized in the working directory
   */
  async isRepoInitialized(dir = DEFAULT_REPO_DIR): Promise<boolean> {
    const pfs = this.getPFS();
    try {
      const stat = await pfs.stat(`${dir}/.git`);
      return Boolean(stat);
    } catch {
      return false;
    }
  }

  /**
   * Initialize a new local Git repository
   */
  async initRepository(dir = DEFAULT_REPO_DIR, defaultBranch = 'main'): Promise<void> {
    const fs = this.getFS();
    const pfs = this.getPFS();

    try {
      await pfs.mkdir(dir);
    } catch (err: any) {
      if (err.code !== 'EEXIST') {
        // ignore if root dir already exists
      }
    }

    await git.init({
      fs,
      dir,
      defaultBranch,
    });
  }

  /**
   * Recursively read all files currently present in working directory (excluding .git)
   */
  async listWorkingTreeFiles(dir = DEFAULT_REPO_DIR, prefix = ''): Promise<string[]> {
    const pfs = this.getPFS();
    const currentDir = prefix ? `${dir}/${prefix}` : dir;
    let list: string[] = [];

    try {
      const entries: string[] = await pfs.readdir(currentDir);
      for (const entry of entries) {
        if (entry === '.git') continue;
        const entryRel = prefix ? `${prefix}/${entry}` : entry;
        const fullPath = `${dir}/${entryRel}`;
        try {
          const stat = await pfs.stat(fullPath);
          if (stat.isDirectory()) {
            const sub = await this.listWorkingTreeFiles(dir, entryRel);
            list.push(...sub);
          } else {
            list.push(entryRel);
          }
        } catch {
          // ignore
        }
      }
    } catch {
      // directory might not exist yet
    }

    return list;
  }

  /**
   * Synchronizes serialized portable vault files into the virtual FS working tree
   * Writes updated/new files and cleans up files that were deleted in the vault
   */
  async syncVaultToWorkingTree(
    vaultData: PortableVaultData,
    dir = DEFAULT_REPO_DIR
  ): Promise<{ written: number; deleted: number }> {
    const fs = this.getFS();
    const pfs = this.getPFS();

    const isInit = await this.isRepoInitialized(dir);
    if (!isInit) {
      await this.initRepository(dir);
    }

    const { files } = await serializePortableVault(vaultData);
    const newFilePaths = new Set(files.map((f) => f.path.replace(/\\/g, '/')));

    // 1. Check existing working files and delete removed ones
    const existingFiles = await this.listWorkingTreeFiles(dir);
    let deleted = 0;
    for (const oldFile of existingFiles) {
      if (!newFilePaths.has(oldFile)) {
        try {
          await pfs.unlink(`${dir}/${oldFile}`);
          deleted++;
        } catch (e) {
          console.warn(`Could not remove ${oldFile}:`, e);
        }
      }
    }

    // 2. Write all serialized vault files
    let written = 0;
    for (const file of files) {
      const fullPath = `${dir}/${file.path}`;
      await this.ensureDir(fullPath);

      if (file.isBinary) {
        const bytes = file.content instanceof Uint8Array ? file.content : new Uint8Array();
        await pfs.writeFile(fullPath, bytes);
      } else {
        await pfs.writeFile(fullPath, file.content as string, 'utf8');
      }
      written++;
    }

    return { written, deleted };
  }

  /**
   * Gets working tree status matrix and parses it into human-friendly lists
   */
  async getStatus(dir = DEFAULT_REPO_DIR): Promise<GitStatusSummary> {
    const fs = this.getFS();
    const isInit = await this.isRepoInitialized(dir);
    if (!isInit) {
      return {
        clean: true,
        modified: [],
        added: [],
        deleted: [],
        unmodified: [],
        totalFiles: 0,
      };
    }

    const matrix = await git.statusMatrix({
      fs,
      dir,
    });

    const modified: string[] = [];
    const added: string[] = [];
    const deleted: string[] = [];
    const unmodified: string[] = [];

    for (const [filepath, head, workdir, stage] of matrix) {
      if (filepath.startsWith('.git')) continue;

      // Matrix meaning: [file, HEAD, WORKDIR, STAGE]
      // 0 2 0 => untracked new file
      // 0 2 2 => added and staged
      // 1 2 1 => modified, unstaged
      // 1 2 2 => modified, staged
      // 1 0 1 => deleted, unstaged
      // 1 0 0 => deleted, staged
      // 1 1 1 => unmodified

      if (head === 0 && workdir >= 2) {
        added.push(filepath);
      } else if (head >= 1 && workdir === 0) {
        deleted.push(filepath);
      } else if (head >= 1 && workdir >= 2 && (head !== workdir || stage !== 1)) {
        modified.push(filepath);
      } else if (head === 1 && workdir === 1 && stage === 1) {
        unmodified.push(filepath);
      } else {
        modified.push(filepath);
      }
    }

    const totalFiles = matrix.length;
    const clean = modified.length === 0 && added.length === 0 && deleted.length === 0;

    return {
      clean,
      modified,
      added,
      deleted,
      unmodified,
      totalFiles,
    };
  }

  /**
   * Stage changes and create a local Git commit
   */
  async createCommit(options: {
    message: string;
    author?: { name: string; email: string };
    dir?: string;
  }): Promise<GitCommitInfo> {
    const dir = options.dir || DEFAULT_REPO_DIR;
    const fs = this.getFS();

    const isInit = await this.isRepoInitialized(dir);
    if (!isInit) {
      await this.initRepository(dir);
    }

    // Get current status matrix to stage all added, modified, deleted files
    const matrix = await git.statusMatrix({
      fs,
      dir,
    });

    for (const [filepath, head, workdir] of matrix) {
      if (filepath.startsWith('.git')) continue;
      if (workdir === 0) {
        // File was deleted
        await git.remove({ fs, dir, filepath });
      } else {
        // File is added or modified
        await git.add({ fs, dir, filepath });
      }
    }

    const author = {
      name: options.author?.name || 'KeepNotes User',
      email: options.author?.email || 'user@local.vault',
      timestamp: Math.floor(Date.now() / 1000),
      timezoneOffset: new Date().getTimezoneOffset(),
    };

    const sha = await git.commit({
      fs,
      dir,
      message: options.message || `Vault snapshot at ${new Date().toLocaleString()}`,
      author,
    });

    const commitObj = await git.readCommit({
      fs,
      dir,
      oid: sha,
    });

    return {
      oid: sha,
      shortOid: sha.slice(0, 7),
      message: commitObj.commit.message.trim(),
      author: {
        name: commitObj.commit.author.name,
        email: commitObj.commit.author.email,
        timestamp: commitObj.commit.author.timestamp,
        timezoneOffset: commitObj.commit.author.timezoneOffset,
      },
      tree: commitObj.commit.tree,
      parents: commitObj.commit.parent || [],
    };
  }

  /**
   * Returns commit history log
   */
  async getLog(options?: { depth?: number; dir?: string }): Promise<GitCommitInfo[]> {
    const dir = options?.dir || DEFAULT_REPO_DIR;
    const fs = this.getFS();

    const isInit = await this.isRepoInitialized(dir);
    if (!isInit) return [];

    try {
      const commits = await git.log({
        fs,
        dir,
        depth: options?.depth || 50,
      });

      return commits.map((entry) => ({
        oid: entry.oid,
        shortOid: entry.oid.slice(0, 7),
        message: entry.commit.message.trim(),
        author: {
          name: entry.commit.author.name,
          email: entry.commit.author.email,
          timestamp: entry.commit.author.timestamp,
          timezoneOffset: entry.commit.author.timezoneOffset,
        },
        tree: entry.commit.tree,
        parents: entry.commit.parent || [],
      }));
    } catch {
      // Empty repository without commits yet
      return [];
    }
  }

  /**
   * Restores vault state from a previous commit
   */
  async restoreVaultFromCommit(
    commitOid: string,
    dir = DEFAULT_REPO_DIR
  ): Promise<PortableVaultData> {
    const fs = this.getFS();
    const pfs = this.getPFS();

    // Checkout the specific commit
    await git.checkout({
      fs,
      dir,
      ref: commitOid,
      force: true,
    });

    // Read all working tree files at this checked out commit
    const relFilePaths = await this.listWorkingTreeFiles(dir);
    const portableFiles: PortableFileEntry[] = [];

    for (const relPath of relFilePaths) {
      const fullPath = `${dir}/${relPath}`;
      const isMdOrJson = relPath.endsWith('.md') || relPath.endsWith('.json') || relPath.endsWith('.txt');

      if (isMdOrJson) {
        const text = await pfs.readFile(fullPath, 'utf8');
        portableFiles.push({
          path: relPath,
          content: text,
          isBinary: false,
        });
      } else {
        const bytes = await pfs.readFile(fullPath);
        portableFiles.push({
          path: relPath,
          content: bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes),
          isBinary: true,
        });
      }
    }

    return deserializePortableVault(portableFiles);
  }

  /**
   * Resets virtual repository (useful for testing or clearing git database)
   */
  async resetRepo(dir = DEFAULT_REPO_DIR): Promise<void> {
    const pfs = this.getPFS();
    const files = await this.listWorkingTreeFiles(dir);
    for (const file of files) {
      try {
        await pfs.unlink(`${dir}/${file}`);
      } catch {
        // ignore
      }
    }
  }
}

export const localGitService = new LocalGitService();

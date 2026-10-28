import JSZip from 'jszip';
import {
  PortableVaultData,
  PortableFileEntry,
  FileSystemCapability,
} from './portableVaultTypes';
import {
  serializePortableVault,
  deserializePortableVault,
  blobToUint8Array,
} from './portableVaultSerializer';

/**
 * Checks if the File System Access API (showDirectoryPicker) is supported in current environment
 */
export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && typeof (window as any).showDirectoryPicker === 'function';
}

/**
 * Returns capability and description for UI badges/warnings
 */
export function getFileSystemCapability(): FileSystemCapability {
  const hasFSA = isFileSystemAccessSupported();
  let browserDesc = 'Standard Browser';

  if (typeof navigator !== 'undefined') {
    const ua = navigator.userAgent;
    if (ua.includes('Firefox')) browserDesc = 'Firefox (ZIP fallback active)';
    else if (ua.includes('Safari') && !ua.includes('Chrome')) browserDesc = 'Safari (ZIP fallback active)';
    else if (ua.includes('Chrome')) browserDesc = 'Chromium Engine (Native Folder API)';
  }

  return {
    hasFileSystemAccess: hasFSA,
    fallbackMode: hasFSA ? 'directory_input' : 'zip',
    browserDescription: browserDesc,
  };
}

/**
 * Prompts user with native OS directory picker
 * Never silently called without user interaction
 */
export async function pickLocalVaultDirectory(): Promise<FileSystemDirectoryHandle | null> {
  if (!isFileSystemAccessSupported()) {
    throw new Error('File System Access API is not supported in this browser. Please use the ZIP export/import option.');
  }

  try {
    const handle = await (window as any).showDirectoryPicker({
      mode: 'readwrite',
    });
    return handle;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return null;
    }
    throw err;
  }
}

/**
 * Helper to write a file to a FileSystemDirectoryHandle, creating nested directories as needed
 */
async function writeFileToDirectoryHandle(
  rootDir: FileSystemDirectoryHandle,
  relativePath: string,
  content: string | Uint8Array
): Promise<void> {
  const parts = relativePath.replace(/\\/g, '/').split('/').filter(Boolean);
  const fileName = parts.pop()!;

  let currentDir = rootDir;
  for (const dirName of parts) {
    currentDir = await currentDir.getDirectoryHandle(dirName, { create: true });
  }

  const fileHandle = await currentDir.getFileHandle(fileName, { create: true });
  const writable = await (fileHandle as any).createWritable();
  await writable.write(content);
  await writable.close();
}

/**
 * Exports complete portable vault to a local folder handle
 */
export async function exportVaultToDirectoryHandle(
  dirHandle: FileSystemDirectoryHandle,
  vaultData: PortableVaultData,
  onProgress?: (processed: number, total: number, currentFile: string) => void
): Promise<{ writtenCount: number; errors: string[] }> {
  const { files } = await serializePortableVault(vaultData);
  const errors: string[] = [];
  let writtenCount = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      if (onProgress) {
        onProgress(i + 1, files.length, file.path);
      }
      await writeFileToDirectoryHandle(dirHandle, file.path, file.content);
      writtenCount++;
    } catch (err: any) {
      errors.push(`Failed writing "${file.path}": ${err.message || String(err)}`);
    }
  }

  return { writtenCount, errors };
}

/**
 * Recursively reads all files from a FileSystemDirectoryHandle into PortableFileEntry[]
 */
export async function readFilesFromDirectoryHandle(
  dirHandle: FileSystemDirectoryHandle,
  prefix = '',
  onProgress?: (count: number, currentFile: string) => void
): Promise<PortableFileEntry[]> {
  const entries: PortableFileEntry[] = [];

  for await (const [name, handle] of (dirHandle as any).entries()) {
    const relPath = prefix ? `${prefix}/${name}` : name;
    if (handle.kind === 'directory') {
      const subEntries = await readFilesFromDirectoryHandle(handle, relPath, onProgress);
      entries.push(...subEntries);
    } else if (handle.kind === 'file') {
      const file: File = await handle.getFile();
      const isMdOrJson = name.endsWith('.md') || name.endsWith('.json') || name.endsWith('.txt');

      if (onProgress) {
        onProgress(entries.length + 1, relPath);
      }

      if (isMdOrJson) {
        const text = await file.text();
        entries.push({
          path: relPath,
          content: text,
          isBinary: false,
        });
      } else {
        const arrayBuffer = await file.arrayBuffer();
        entries.push({
          path: relPath,
          content: new Uint8Array(arrayBuffer),
          isBinary: true,
        });
      }
    }
  }

  return entries;
}

/**
 * Imports portable vault from FileSystemDirectoryHandle
 */
export async function importVaultFromDirectoryHandle(
  dirHandle: FileSystemDirectoryHandle,
  onProgress?: (count: number, currentFile: string) => void
): Promise<PortableVaultData> {
  const fileEntries = await readFilesFromDirectoryHandle(dirHandle, '', onProgress);
  return deserializePortableVault(fileEntries);
}

/**
 * Universal ZIP export of the portable vault layout
 */
export async function exportVaultToZipBlob(
  vaultData: PortableVaultData,
  onProgress?: (percent: number) => void
): Promise<Blob> {
  const { files } = await serializePortableVault(vaultData);
  const zip = new JSZip();

  for (const file of files) {
    if (file.isBinary) {
      zip.file(file.path, file.content, { binary: true });
    } else {
      zip.file(file.path, file.content as string);
    }
  }

  return zip.generateAsync(
    {
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    },
    (metadata) => {
      if (onProgress) {
        onProgress(Math.round(metadata.percent));
      }
    }
  );
}

/**
 * Trigger browser file download for the Portable Vault ZIP
 */
export async function downloadPortableVaultZip(
  vaultData: PortableVaultData,
  customFileName?: string
): Promise<void> {
  const blob = await exportVaultToZipBlob(vaultData);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const dateStr = new Date().toISOString().slice(0, 10);
  a.download = customFileName || `KeepNotes_Vault_${dateStr}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Universal ZIP import of portable vault
 */
export async function importVaultFromZipBlob(
  zipFileOrBlob: File | Blob,
  onProgress?: (processed: number, total: number) => void
): Promise<PortableVaultData> {
  const arrayBuffer = await zipFileOrBlob.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);
  const fileEntries: PortableFileEntry[] = [];

  const fileKeys = Object.keys(zip.files).filter((k) => !zip.files[k].dir);
  let processed = 0;

  for (const path of fileKeys) {
    const zipObj = zip.files[path];
    const isMdOrJson = path.endsWith('.md') || path.endsWith('.json') || path.endsWith('.txt');

    if (isMdOrJson) {
      const text = await zipObj.async('text');
      fileEntries.push({
        path,
        content: text,
        isBinary: false,
      });
    } else {
      const uint8 = await zipObj.async('uint8array');
      fileEntries.push({
        path,
        content: uint8,
        isBinary: true,
      });
    }

    processed++;
    if (onProgress) {
      onProgress(processed, fileKeys.length);
    }
  }

  return deserializePortableVault(fileEntries);
}

/**
 * Import from standard `<input type="file" webkitdirectory directory />` FileList
 */
export async function importVaultFromFileList(fileList: FileList): Promise<PortableVaultData> {
  const fileEntries: PortableFileEntry[] = [];

  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i];
    // webkitRelativePath contains e.g. "my-vault/notes/note.md"
    let relPath = file.webkitRelativePath || file.name;
    // Strip leading root folder name if present
    const parts = relPath.split('/');
    if (parts.length > 1) {
      relPath = parts.slice(1).join('/');
    }

    const isMdOrJson = file.name.endsWith('.md') || file.name.endsWith('.json') || file.name.endsWith('.txt');
    if (isMdOrJson) {
      const text = await file.text();
      fileEntries.push({
        path: relPath,
        content: text,
        isBinary: false,
      });
    } else {
      const bytes = await blobToUint8Array(file);
      fileEntries.push({
        path: relPath,
        content: bytes,
        isBinary: true,
      });
    }
  }

  return deserializePortableVault(fileEntries);
}

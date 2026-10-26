/**
 * Phase P45: Deterministic File Hashing & Checksum Utility
 */

export class FileHasher {
  /**
   * Computes SHA-256 hash string for text content
   */
  public async hashText(text: string): Promise<string> {
    if (typeof crypto === 'undefined' || !crypto.subtle) {
      return this.fallbackHash(text);
    }
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(text);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      return this.bufferToHex(hashBuffer);
    } catch {
      return this.fallbackHash(text);
    }
  }

  /**
   * Computes SHA-256 hash string for binary ArrayBuffer or Blob
   */
  public async hashBinary(data: ArrayBuffer | Blob): Promise<string> {
    const buffer = data instanceof Blob ? await data.arrayBuffer() : data;
    if (typeof crypto === 'undefined' || !crypto.subtle) {
      return `bin-${buffer.byteLength}-${buffer.slice(0, 32)}`;
    }
    try {
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      return this.bufferToHex(hashBuffer);
    } catch {
      return `bin-${buffer.byteLength}`;
    }
  }

  private bufferToHex(buffer: ArrayBuffer): string {
    const hashArray = Array.from(new Uint8Array(buffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Fallback non-cryptographic fast hash if SubtleCrypto is unavailable
   */
  private fallbackHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return `fb-${Math.abs(hash).toString(16)}-${str.length}`;
  }
}

export const fileHasher = new FileHasher();

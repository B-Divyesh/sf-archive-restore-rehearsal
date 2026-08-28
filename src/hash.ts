import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';

export async function hashFile(file: File, chunkSize = 4 * 1024 * 1024): Promise<string> {
  const hash = sha256.create();
  for (let offset = 0; offset < file.size; offset += chunkSize) {
    const chunk = await file.slice(offset, Math.min(offset + chunkSize, file.size)).arrayBuffer();
    hash.update(new Uint8Array(chunk));
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
  return bytesToHex(hash.digest());
}

export function shortHash(hash: string): string {
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
}

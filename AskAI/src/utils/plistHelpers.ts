import { spawnSync } from "node:child_process";

const plistCache = new Map<string, unknown>();

/**
 * Read a plist file and convert it to a JavaScript object
 * @param plistPath Path to the plist file
 * @param cache Whether to cache the result
 * @returns The parsed plist file content
 */
export async function readPlist<T>(plistPath: string, cache = true): Promise<T> {
  if (cache && plistCache.has(plistPath)) {
    return plistCache.get(plistPath) as T;
  }

  const proc = spawnSync("plutil", ["-convert", "json", "-o", "-", plistPath]);
  if (proc.error) {
    throw new Error(`Failed to read plist file: ${proc.error.message}`);
  }
  if (proc.status !== 0) {
    throw new Error(`plutil failed with status ${proc.status}: ${proc.stderr.toString()}`);
  }

  const plistContent = proc.stdout.toString();
  const result = JSON.parse(plistContent) as T;

  if (cache) {
    plistCache.set(plistPath, result);
  }

  return result;
}

/**
 * Clear the plist cache for a specific file or all files
 * @param plistPath Optional path to clear cache for a specific file
 */
export function clearPlistCache(plistPath?: string) {
  if (plistPath) {
    plistCache.delete(plistPath);
  } else {
    plistCache.clear();
  }
}

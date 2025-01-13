import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname } from "node:path";

/**
 * Read a JSON file
 * @param jsonPath Path to the JSON file
 * @returns The parsed JSON content
 */
export async function readJSON<T>(jsonPath: string): Promise<T | undefined> {
  if (!existsSync(jsonPath)) {
    return undefined;
  }

  try {
    const content = await readFile(jsonPath, "utf-8");
    return JSON.parse(content) as T;
  } catch (error) {
    console.error(`Failed to read JSON file ${jsonPath}:`, error);
    return undefined;
  }
}

/**
 * Write data to a JSON file
 * @param jsonPath Path to the JSON file
 * @param data Data to write
 */
export async function writeJSON<T>(jsonPath: string, data: T): Promise<void> {
  try {
    await mkdir(dirname(jsonPath), { recursive: true });
    await writeFile(jsonPath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Failed to write JSON file ${jsonPath}:`, error);
  }
}

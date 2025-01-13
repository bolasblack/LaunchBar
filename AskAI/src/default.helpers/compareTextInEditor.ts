import { exists, mkdir, writeFile } from "node:fs/promises";
import { LaunchBar } from "../common/LaunchBar";
import { Action } from "../common/Action";

export async function compareTextInEditor(
  oldText: string,
  newText: string
): Promise<void> {
  const impls: Editor[] = [BBEdit, SublimeMerge];

  const existImpl = await Promise.all(
    impls.map((impl) => Promise.all([impl.isExist(), impl]))
  );
  const [, impl] = existImpl.find(([isExist]) => isExist) ?? [false, null];
  if (impl == null) {
    throw new Error("No supported editor found");
  }

  const actionId = await Action.getBundleIdentifier();
  const tempDir = `/tmp/launchbar-${actionId}/${Date.now()}`;
  const originalTextFile = `${tempDir}/original.txt`;
  const newTextFile = `${tempDir}/new.txt`;

  await mkdir(tempDir, { recursive: true });
  await Promise.all([
    writeFile(originalTextFile, oldText),
    writeFile(newTextFile, newText),
  ]);
  await impl.compare(originalTextFile, newTextFile);
}

interface Editor {
  isExist(): Promise<boolean>;
  compare(oldFilePath: string, newFilePath: string): Promise<void>;
}

const BBEdit: Editor = {
  async isExist(): Promise<boolean> {
    return await exists("/Applications/BBEdit.app");
  },
  async compare(oldPath, newPath): Promise<void> {
    await LaunchBar.executeAppleScript(
      'tell application "BBEdit"',
      "   activate",
      `   set theResult to compare file ("${oldPath}" as POSIX file) against file ("${newPath}" as POSIX file)`,
      "end tell"
    );
  },
};

const SublimeMerge: Editor = {
  async isExist(): Promise<boolean> {
    return await exists("/Applications/Sublime Merge.app");
  },
  async compare(oldPath, newPath): Promise<void> {
    await Bun.spawn([
      "/Applications/Sublime Merge.app/Contents/SharedSupport/bin/smerge",
      "mergetool",
      oldPath,
      newPath,
    ]);
  },
};

// LaunchBar UI

import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

interface AppleScriptFile {
  raw: string;
  doReadFile: string;
}
const appleScriptFileFactory = (path: string): AppleScriptFile => ({
  raw: path,
  doReadFile: `(do shell script "cat ${path}")`,
});
type FilePathMap<T extends Record<string, string>> = {
  [K in keyof T]: AppleScriptFile;
};
async function withTempFiles<T extends Record<string, string>, R>(
  prefix: string,
  files: T,
  fn: (files: FilePathMap<T>) => Promise<R>
): Promise<R> {
  const tmpDir = await mkdtemp(`osascript-${prefix}-`);
  const filePaths = Object.fromEntries(
    await Promise.all(
      Object.entries(files).map(async ([key, content]) => {
        const path = join(tmpDir, key);
        await writeFile(path, content);
        return [key, appleScriptFileFactory(path)];
      })
    )
  ) as FilePathMap<T>;

  try {
    return await fn(filePaths);
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
}

async function executeAppleScript(
  script: string,
  ...additionalLines: string[]
): Promise<[stdout: string, stderr: string]> {
  const proc = Bun.spawn([
    "osascript",
    "-e",
    [script, ...additionalLines].join("\n"),
  ]);

  return await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
}

export const LaunchBar = {
  executeAppleScript: async (
    script: string,
    ...additionalLines: string[]
  ): Promise<string> => {
    return (await executeAppleScript(script, ...additionalLines))[0];
  },

  hide: async () => {
    await executeAppleScript('tell application "LaunchBar" to hide');
  },

  alert: async (
    message: string,
    info?: string,
    ...buttonTitles: string[]
  ): Promise<number> => {
    const [output] = await withTempFiles(
      "alert",
      {
        message,
        info: info || "",
      },
      async (files) => {
        const script = `
          set messageText to ${files.message.doReadFile}
          set infoText to ${files.info.doReadFile}
          display dialog messageText & "\\n" & infoText with title "Alert"${
            buttonTitles.length
              ? ` buttons {${buttonTitles
                  .map((b) => JSON.stringify(b))
                  .join(", ")}}`
              : ""
          }
        `;
        return executeAppleScript(script);
      }
    );
    return buttonTitles.indexOf(output.replace("button returned:", "").trim());
  },

  displayNotification: async (options: { title?: string; string: string }) => {
    await withTempFiles(
      "notification",
      {
        message: options.string,
        ...(options.title ? { title: options.title } : {}),
      },
      async (files) => {
        const script = `
          set messageText to ${files.message.doReadFile}
          ${
            files.title
              ? `set titleText to ${files.title.doReadFile}
                 display notification messageText with title titleText`
              : "display notification messageText"
          }
        `;
        return executeAppleScript(script);
      }
    );
  },

  getClipboardString: async (): Promise<string | undefined> => {
    const [stdout] = await executeAppleScript(`get the clipboard`);
    return stdout.trim()
      ? stdout.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim()
      : undefined;
  },

  setClipboardString: async (text: string): Promise<void> => {
    await withTempFiles("clipboard", { text }, async (files) => {
      const script = `
          set clipText to ${files.text.doReadFile}
          set the clipboard to clipText
        `;
      return executeAppleScript(script);
    });
  },

  options: {
    /**
     * Whether the user has pressed the ⌘ key
     */
    commandKey: process.env.LB_OPTION_COMMAND_KEY === "1",

    /**
     * Whether the user has pressed the ⌥ key
     */
    alternateKey: process.env.LB_OPTION_ALTERNATE_KEY === "1",

    /**
     * Whether the user has pressed the ⇧ key
     */
    shiftKey: process.env.LB_OPTION_SHIFT_KEY === "1",

    /**
     * Whether the user has pressed the ctrl key
     */
    controlKey: process.env.LB_OPTION_CONTROL_KEY === "1",

    /**
     * Whether the action was run because the user pressed the Space key
     */
    spaceKey: process.env.LB_OPTION_SPACE_KEY === "1",

    /**
     * Whether the action is run in background
     */
    runInBackground: process.env.LB_OPTION_RUN_IN_BACKGROUND === "1",

    /**
     * Whether the action is run for live feedback during text input
     */
    liveFeedback: process.env.LB_OPTION_LIVE_FEEDBACK === "1",
  },
};

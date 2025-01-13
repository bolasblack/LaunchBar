import { exists, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { Persona, UserPresets } from "../models";
import { Action } from "../common/Action";
import { LaunchBar } from "../common/LaunchBar";
import { getSelectedEditor } from "../common/editors";
import { requestModels } from "./requestModels.claude";

export async function getDefaultPersona(): Promise<Persona> {
  let persona = await Action.getPreference<Persona>("defaultPersona");

  if (persona == null) {
    persona = ((await getUserPresets()) ?? (await getBuiltinPresets()))
      .personas[0];
  }

  return persona;
}

export async function getBuiltinPresets(): Promise<UserPresets> {
  const content = await readFile(
    (await Action.getPath()) + "/Contents/Resources/presets.json",
    "utf-8"
  );

  return JSON.parse(content);
}

export async function checkUserPresets(): Promise<
  null | "not-exist" | "invalid-json"
> {
  const userPresetsFile = join(await Action.getSupportPath(), "presets.json");

  if (!(await exists(userPresetsFile))) {
    return "not-exist";
  }

  const jsonInvalidReason = await Bun.file(userPresetsFile)
    .json()
    .then(() => null)
    .catch(() => "invalid-json" as const);
  if (jsonInvalidReason) return jsonInvalidReason;

  return null;
}
export async function getUserPresets(): Promise<null | UserPresets> {
  const userPresetsFile = join(await Action.getSupportPath(), "presets.json");

  if (!(await exists(userPresetsFile))) {
    return null;
  }

  return await Bun.file(userPresetsFile).json();
}
export async function writeUserPresets(
  presets: UserPresets,
  options: {
    createFile?: boolean;
  } = {}
): Promise<void> {
  const userPresetsFile = join(await Action.getSupportPath(), "presets.json");

  if (options.createFile) {
    await mkdir(dirname(userPresetsFile), { recursive: true });
  }

  await writeFile(userPresetsFile, JSON.stringify(presets, null, 2));
}

export async function comparePresets(): Promise<string[]> {
  const userPresets = await getUserPresets();
  if (!userPresets) return [];

  const presets = await getBuiltinPresets();

  const allUserPresets = [...userPresets.prompts, ...userPresets.personas];
  const allUserPresetTitles = allUserPresets.map((item) => item.title);

  const allPresets = [...presets.prompts, ...presets.personas];
  const newPresetTitles = allPresets
    .filter((item) => !allUserPresetTitles.includes(item.title))
    .map((item) => item.title);

  return newPresetTitles;
}

export async function updatePresets(): Promise<void> {
  const userPresets = await getUserPresets();
  if (!userPresets) return;

  const presets = await getBuiltinPresets();

  // Update prompts
  const userPromptTitles = userPresets.prompts.map((item) => item.title);
  const newPrompts = presets.prompts.filter(
    (item) => !userPromptTitles.includes(item.title)
  );
  userPresets.prompts.push(...newPrompts);

  // Update personas
  const userPersonaTitles = userPresets.personas.map((item) => item.title);
  const newPersonas = presets.personas.filter(
    (item) => !userPersonaTitles.includes(item.title)
  );
  userPresets.personas.push(...newPersonas);

  await writeUserPresets(userPresets);

  await LaunchBar.displayNotification({
    title: "Done!",
    string: `${newPersonas.length} new personas. ${newPrompts.length} new prompts.`,
  });
}

export async function editFile(filePath: string): Promise<void> {
  const editor = await getSelectedEditor();
  if (editor) {
    await Bun.spawn(["open", "-b", editor.appID, filePath]);
  } else {
    await Bun.spawn(["open", filePath]);
  }
}

export async function setApiKey(): Promise<"failed" | "open-page" | "done"> {
  const response = await LaunchBar.alert(
    "API key required",
    "1) Press »Open OpenAI.com« to create an API key.\n2) Press »Set API key«",
    "Open OpenAI.com",
    "Set API key",
    "Cancel"
  );

  if (response === 0) {
    await Bun.spawn(["open", "https://platform.openai.com/account/api-keys"]);
    return "open-page";
  }

  if (response === 1) {
    const clipboardContent = await LaunchBar.getClipboardString();
    if (!clipboardContent) {
      await LaunchBar.alert(
        "No clipboard content",
        "Make sure you have copied your API key to the clipboard!"
      );
      return "failed";
    }

    const succeed = await requestModels({ apiKey: clipboardContent }).then(
      () => true,
      () => false
    );
    if (!succeed) {
      await LaunchBar.alert(
        "API key invalid",
        "Make sure you have copied a valid API key to the clipboard!"
      );
      return "failed";
    }

    await Action.setPreference("apiKey", clipboardContent);
    await LaunchBar.displayNotification({
      string: `API key set to: ${clipboardContent}`,
    });
    return "done";
  }

  return "failed";
}

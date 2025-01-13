import { exists } from "node:fs/promises";
import { join } from "node:path";
import { Action } from "./common/Action";
import { getCurrentURL } from "./common/browser";
import {
  getAvailableEditors,
  getSelectedEditor,
  setSelectedEditor,
} from "./common/editors";
import { LaunchBar } from "./common/LaunchBar";
import { isNewerVersion } from "./common/versions";
import { DEFAULT_MODEL, MODELS } from "./constants";
import {
  checkUserPresets,
  comparePresets,
  editFile,
  getBuiltinPresets,
  getDefaultPersona,
  getUserPresets,
  setApiKey,
  updatePresets,
  writeUserPresets,
} from "./default.helpers";
import { compareTextInEditor } from "./default.helpers/compareTextInEditor";
import {
  addRecentChat,
  getRecentChats,
  openRecentChatFolder,
  readRecentChat,
  RecentChat,
} from "./default.helpers/recentFiles";
import { requestCompletions } from "./default.helpers/requestCompletions.claude";
import { requestModels } from "./default.helpers/requestModels.claude";
import { Persona } from "./models";
import { ActionRouter } from "./utils/ActionRouter";
import { ActionArgument, ActionOutput } from "./utils/launchbarTypes";

declare module "./utils/launchbarTypes" {
  export type ActionArgument =
    | { type: "setApiKey" }
    | { type: "setDefaultModel"; model: string }
    | {
        type: "setDefaultPersona";
        persona: Persona;
      }
    | {
        type: "setDefaultEditor";
        appID: string;
        bundleName: string;
        isMarkdownSupported: boolean;
      }
    | { type: "editPresets" }
    | { type: "updatePresets" }
    | { type: "resetPresets" }
    | { type: "openRecentChatFolder" }
    | {
        type: "showMainMenu";
        argument: string;
        persona?: Persona;
      }
    | {
        type: "chat";
        argument: string;
        presetType?: "persona" | "prompt";
        presetTitle?: string;
        persona?: string;
        icon?: string;
        useCompare?: boolean;
        addURL?: boolean;
        addClipboard?: boolean;
        addRecent?: { path: string };
      };
}

const router = new ActionRouter<ActionArgument>();

// Main function
async function main(userInput: string): Promise<ActionOutput[]> {
  const apiKey = await Action.getPreference<string>("apiKey");

  // Set API key
  if (!apiKey) {
    const res = await setApiKey();
    if (res === "open-page") {
      await LaunchBar.hide();
    }
    return [];
  }

  // Check if presets exist
  const userPresetsInvalidReason = await checkUserPresets();
  if (userPresetsInvalidReason === "not-exist") {
    await writeUserPresets(await getBuiltinPresets(), { createFile: true });
  } else if (
    userPresetsInvalidReason === "invalid-json" ||
    userPresetsInvalidReason != null
  ) {
    const response = await LaunchBar.alert(
      "Your custom presets are invalid. You can either start fresh or try to fix your custom presets JSON.",
      "Start fresh",
      "Edit presets",
      "Cancel"
    );

    switch (response) {
      case 0:
        await router.run({ type: "resetPresets" });
        break;
      case 1:
        await router.run({ type: "editPresets" });
        break;
    }
    return [];
  }

  // Settings
  if (LaunchBar.options.controlKey) {
    return await showDefaultSettingsMenu();
  }

  // If no argument is passed
  if (!userInput) {
    // Check for new presets
    const currentActionVersion = await Action.getVersion();
    if (
      isNewerVersion(
        (await Action.getPreference<string>("lastUsedActionVersion")) ??
          currentActionVersion,
        currentActionVersion
      )
    ) {
      const newPresetsList = await comparePresets();
      if (newPresetsList.length) {
        const response = await LaunchBar.alert(
          "Update presets?",
          "The following presets are new or missing in your user presets:\n" +
            newPresetsList.join("\n") +
            "\nWould you like to add them to your user presets?",
          "Ok",
          "Cancel"
        );

        if (response === 0) {
          await updatePresets();
        }
      }
      await Action.setPreference("lastUsedActionVersion", currentActionVersion);
    }

    // Show predefined prompts
    return await showPromptsMenu();
  }

  // If argument is passed

  if (LaunchBar.options.commandKey) {
    if (LaunchBar.options.shiftKey) {
      return await showRecentChatsMenu(userInput);
    }

    return await showMainMenuWithPersonas(userInput);
  }

  return await showMainMenu({ type: "showMainMenu", argument: userInput });
}

async function showMainMenuWithPersonas(
  argument: string
): Promise<ActionOutput[]> {
  const userPresets = await getUserPresets();
  if (userPresets == null) {
    return [{ title: "No personas found" }];
  }

  return userPresets.personas.map(
    (item): ActionOutput => ({
      title: item.title,
      subtitle: `Asks: ${argument}`,
      alwaysShowsSubtitle: true,
      icon: item.icon,
      actionArgument: {
        type: "showMainMenu",
        persona: item,
        argument,
      },
    })
  );
}

async function showRecentChatsMenu(argument: string): Promise<ActionOutput[]> {
  const recentChats = await getRecentChats();
  if (recentChats.length === 0) {
    return [{ title: "No recent chats found" }];
  }

  return Promise.all(
    recentChats.map((c) => getActionOutputFromRecentChat(c, argument))
  );
}

async function getActionOutputFromRecentChat(
  chat: RecentChat,
  argument: string
): Promise<ActionOutput> {
  const defaultPersona = await getDefaultPersona();

  const res: ActionOutput = {
    title: `Continue: ${chat.title}`,
    subtitle: `Asks: ${argument}`,
    alwaysShowsSubtitle: true,
    icon: chat.icon ?? defaultPersona.icon,
    actionArgument: {
      type: "chat",
      argument: argument,
      persona: chat.persona,
      presetType: chat.presetType,
      presetTitle: chat.presetTitle,
      addRecent: {
        path: chat.path,
      },
    },
  };

  if (chat.presetTitle != null && chat.presetTitle !== defaultPersona.title) {
    res.badge = chat.presetTitle;
  }

  return res;
}

async function showMainMenu(
  actionArgs: ActionArgument & { type: "showMainMenu" }
): Promise<ActionOutput[]> {
  const defaultPersona = await getDefaultPersona();
  const persona = actionArgs.persona?.persona ?? defaultPersona?.persona;
  const presetType = actionArgs.persona != null ? "persona" : undefined;
  const presetTitle = actionArgs.persona?.title;
  const presetIcon = actionArgs.persona?.icon;

  const result: ActionOutput[] = [
    {
      title: "New Chat",
      icon: presetIcon ?? defaultPersona.icon,
      badge: presetTitle,
      actionArgument: {
        type: "chat",
        argument: actionArgs.argument,
        persona,
        presetTitle,
        presetType,
      },
    },
  ];

  // Get most recent chat
  const recentChat = await Action.getPreference<RecentChat>("recentChat");
  if (recentChat?.path && (await exists(recentChat.path))) {
    result.push(
      await getActionOutputFromRecentChat(recentChat, actionArgs.argument)
    );

    // Reverse order if recent was created less than five minutes ago
    const recentTimeStamp = await Action.getPreference<string>(
      "recentTimeStamp"
    );
    if (recentTimeStamp) {
      const timeDifference = (+new Date() - +new Date(recentTimeStamp)) / 60000;
      if (timeDifference < 5) {
        result.reverse();
      }
    }
  }

  // Show context options
  result.push(
    {
      title: "Add Website",
      subtitle: `Asks: ${actionArgs.argument}`,
      icon: "weasel_web",
      badge: presetTitle,
      actionArgument: {
        type: "chat",
        argument: `${actionArgs.argument}\n`,
        persona,
        presetTitle,
        presetType,
        addURL: true,
        icon: presetIcon ?? "weasel_web",
      },
    },
    {
      title: "Add Clipboard",
      subtitle: `Asks: ${actionArgs.argument}`,
      icon: "weasel_clipboard",
      badge: presetTitle,
      actionArgument: {
        type: "chat",
        argument: `${actionArgs.argument}\n`,
        persona,
        presetTitle,
        presetType,
        addClipboard: true,
        icon: presetIcon ?? "weasel_clipboard",
      },
    }
  );

  return result;
}

async function showPromptsMenu(): Promise<ActionOutput[]> {
  const userPresets = await getUserPresets();
  if (userPresets == null) {
    return [{ title: "No prompts found" }];
  }

  return userPresets.prompts.map(
    (item): ActionOutput => ({
      title: item.title,
      subtitle: item.description,
      icon: item.icon,
      actionArgument: {
        type: "chat",
        argument: item.argument,
        persona: item.persona,
        icon: item.icon,
        addClipboard: item.addClipboard,
        addURL: item.addURL,
        useCompare: item.useCompare,
        presetType: "prompt",
      },
    })
  );
}

async function showDefaultSettingsMenu(): Promise<ActionOutput[]> {
  const [selectPersona, selectModel, selectEditor] = await Promise.all([
    showSelectDefaultPersonaMenu(),
    showSelectDefaultModelMenu(),
    showSelectDefaultEditorMenu(),
  ]);

  return [
    {
      title: "Choose default persona",
      icon: (await getDefaultPersona()).icon,
      badge: (await getDefaultPersona()).title,
      children: selectPersona,
    },
    {
      title: "Choose model",
      icon: "gearTemplate",
      badge:
        (await Action.getPreference<string>("defaultModel")) ?? DEFAULT_MODEL,
      children: selectModel,
    },
    {
      title: "Choose editor",
      icon: "eyeTemplate",
      badge: ((await getSelectedEditor()) ?? { bundleName: "default" })
        .bundleName,
      children: selectEditor,
    },
    {
      title: "Set API Key",
      icon: "keyTemplate",
      actionArgument: {
        type: "setApiKey",
      },
    },
    {
      title: "Open recent chats folder",
      icon: "folderTemplate",
      actionArgument: {
        type: "openRecentChatFolder",
      },
    },
    {
      title: "Customize personas & prompts",
      icon: "codeTemplate",
      actionArgument: {
        type: "editPresets",
      },
    },
    {
      title: "Update personas & prompts",
      icon: "updateTemplate",
      actionArgument: {
        type: "updatePresets",
      },
    },
    {
      title: "Reset personas & prompts",
      icon: "sparkleTemplate",
      actionArgument: {
        type: "resetPresets",
      },
    },
  ];
}

async function showSelectDefaultPersonaMenu(): Promise<ActionOutput[]> {
  const userPresets = await getUserPresets();
  if (userPresets == null) return [];

  const currentPersona = await Action.getPreference<Persona>("defaultPersona");

  return userPresets.personas.map(
    (item): ActionOutput => ({
      title:
        item.title + (item.title === currentPersona?.title ? " (Default)" : ""),
      subtitle: item.description,
      icon: item.icon,
      actionArgument: {
        type: "setDefaultPersona",
        persona: item,
      },
    })
  );
}

async function showSelectDefaultModelMenu(): Promise<ActionOutput[]> {
  const currentModel =
    (await Action.getPreference<string>("defaultModel")) ?? DEFAULT_MODEL;

  const apiKey = await Action.getPreference<string>("apiKey");
  let models: readonly string[];
  if (apiKey) {
    models = await requestModels({ apiKey }).then(
      (resp) => resp.models,
      () => MODELS
    );
  } else {
    models = MODELS;
  }

  return models.map(
    (model): ActionOutput => ({
      title: model + (model === currentModel ? " (Default)" : ""),
      actionArgument: {
        type: "setDefaultModel",
        model,
      },
    })
  );
}

async function showSelectDefaultEditorMenu(): Promise<ActionOutput[]> {
  const currentEditor = await getSelectedEditor();
  return (await getAvailableEditors()).map((e) => ({
    title:
      e.bundleName + (e.appID === currentEditor?.appID ? " (Default)" : ""),
    icon: e.appID,
    badge: e.isMarkdownSupported ? "Markdown" : undefined,
    actionArgument: {
      type: "setDefaultEditor",
      appID: e.appID,
      bundleName: e.bundleName,
      isMarkdownSupported: e.isMarkdownSupported,
    },
  }));
}

async function chat_action(
  actionArgs: ActionArgument & { type: "chat" }
): Promise<void> {
  await LaunchBar.hide();

  // Get API key
  const apiKey = await Action.getPreference<string>("apiKey");
  if (!apiKey) {
    await LaunchBar.alert("API Key Not Set", "Please set your API key first.");
    return;
  }

  try {
    let question = actionArgs.argument.trim();
    let history: undefined | string;
    let chatTitle: string;

    if (actionArgs.presetType === "prompt") {
      chatTitle = actionArgs.presetTitle ?? question;
    } else {
      chatTitle = question;
    }

    if (actionArgs.addClipboard) {
      const clipboard = await LaunchBar.getClipboardString();
      if (clipboard) {
        const response = await LaunchBar.alert(
          question.trim(),
          `${
            clipboard.length > 500
              ? clipboard.substring(0, 500) + "…"
              : clipboard
          }"`,
          "Ok",
          "Cancel"
        );
        if (response === 0) {
          question += `\n\n${clipboard}`;
        }
      }
    }

    if (actionArgs.addURL) {
      const currentURL = await getCurrentURL();
      if (currentURL) {
        chatTitle =
          chatTitle +
          " - " +
          currentURL
            .replace(/[&~#@[\]{}\\\/%*$:;,.\?><\|""]+/g, "_")
            .replace(/https?|www/g, "")
            .replace(/^_+|_+$/g, "")
            .trim();

        question += "\n\n" + currentURL;
      }
    }

    // TITLE CLEANUP
    chatTitle = chatTitle
      .replace(/[&~=§#@[\]{}()+\\\/%*$:;,.?><\|""'´]/g, " ")
      .replace(/[\s_]{2,}/g, " ");
    if (chatTitle.length > 80) {
      chatTitle = chatTitle.slice(0, 80) + "…";
    }

    if (actionArgs.addRecent) {
      const recentChat = await readRecentChat(actionArgs.addRecent.path);
      if (recentChat != null) {
        chatTitle = recentChat.title;
        history = recentChat.content;
      }
    }

    const persona = actionArgs.persona ?? (await getDefaultPersona()).persona;
    const { answer } = await requestCompletions({
      apiKey,
      model:
        (await Action.getPreference<string>("defaultModel")) ?? DEFAULT_MODEL,
      persona,
      history,
      question,
    });

    // PLAY CONFIRMATION SOUND
    await Bun.spawn([
      "/usr/bin/afplay",
      "/System/Library/Components/CoreAudio.component/Contents/SharedSupport/SystemSounds/system/acknowledgment_sent.caf",
    ]);

    // COPY RESULT TO CLIPBOARD
    const originalClipboard = (await LaunchBar.getClipboardString()) || "";
    await LaunchBar.setClipboardString(answer);

    // COMPARE INPUT TO ANSWER IN BBEDIT
    if (actionArgs.useCompare) {
      await compareTextInEditor(originalClipboard, answer);
      return;
    }

    // Save chat
    const recentChat = await addRecentChat(
      {
        title: chatTitle,
        icon: actionArgs.icon,
        persona,
        presetTitle: actionArgs.presetTitle,
        presetType: actionArgs.presetType,
        question,
        answer,
      },
      actionArgs.addRecent
    );

    // Update preferences
    await Action.setPreference("recentTimeStamp", new Date().toISOString());
    await Action.setPreference<RecentChat>("recentChat", recentChat);

    console.error("Saved recent chat", recentChat);

    await editFile(recentChat.path);
  } catch (error) {
    await LaunchBar.alert(
      "Error",
      error instanceof Error ? error.message : "Unknown error occurred"
    );
  }
}
router.register("chat", chat_action);

router.register("setApiKey", async () => {
  const res = await setApiKey();
  if (res === "open-page") {
    await LaunchBar.hide();
  }
  return await showDefaultSettingsMenu();
});
router.register("setDefaultModel", async (action) => {
  await Action.setPreference("defaultModel", action.model);
  return await showDefaultSettingsMenu();
});
router.register("setDefaultPersona", async (action) => {
  await LaunchBar.hide();
  await Action.setPreference("defaultPersona", action.persona);
  return await showDefaultSettingsMenu();
});
router.register("setDefaultEditor", async (action) => {
  await setSelectedEditor({
    appID: action.appID,
    bundleName: action.bundleName,
    isMarkdownSupported: action.isMarkdownSupported,
  });
  return await showDefaultSettingsMenu();
});
router.register("editPresets", async () => {
  await LaunchBar.hide();

  const userPresetsFile = join(await Action.getSupportPath(), "presets.json");
  await editFile(userPresetsFile);
});
router.register("updatePresets", async () => {
  await LaunchBar.hide();

  await updatePresets();
});
router.register("resetPresets", async () => {
  await LaunchBar.hide();

  await writeUserPresets(await getBuiltinPresets(), { createFile: true });
});
router.register("openRecentChatFolder", async () => {
  await LaunchBar.hide();
  await openRecentChatFolder();
});
router.register("showMainMenu", (action) => showMainMenu(action));

router
  .handle(Bun.argv, main)
  .then((res) => {
    processActions(res);
    console.log(JSON.stringify(res));

    function processActions(actions: ActionOutput[]) {
      actions.forEach((action) => {
        if (action.actionArgument != null && action.action == null) {
          action.action = "default";
        }
        if (action.children != null) {
          processActions(action.children);
        }
      });
    }
  })
  .catch((err) => {
    console.error(err);
  });

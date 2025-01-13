import { exists, mkdir, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const FILE_PART_BOUNDARY = "==========";

const SUPPORT_PATH = process.env.LB_SUPPORT_PATH!;
const CHATS_FOLDER = join(SUPPORT_PATH, "/chats/");

export interface RecentChat {
  title: string;
  path: string;
  persona: string;
  presetTitle?: string;
  icon?: string;
  presetType?: "prompt" | "persona";
  content: string;
}

export async function openRecentChatFolder(): Promise<void> {
  await Bun.spawn(["open", CHATS_FOLDER]);
}

export async function getRecentChats(): Promise<RecentChat[]> {
  if (!(await exists(CHATS_FOLDER))) {
    return [];
  }

  const chatFiles = await readdir(CHATS_FOLDER);
  const chatList = chatFiles.filter(
    (item) => !item.startsWith(".") || item === ""
  );

  if (chatList.length === 0) {
    return [];
  }

  return Promise.all(
    chatList.map((item) => readRecentChat(`${CHATS_FOLDER}${item}`))
  ).then((res) => res.filter((a): a is NonNullable<typeof a> => a !== null));
}

export async function readRecentChat(path: string): Promise<null | RecentChat> {
  const fileContent = await Bun.file(path).text();
  const fileParts = fileContent.split(
    new RegExp("(\\s*" + FILE_PART_BOUNDARY + "\\s*)", "u")
  );

  let state: "idle" | "opened" | "closed" = "idle";
  const jsonParts: string[] = [];
  const contentParts: string[] = [];
  fileParts.forEach((part) => {
    switch (state) {
      case "idle":
        if (part.trim() === FILE_PART_BOUNDARY) {
          state = "opened";
        }
        break;
      case "opened":
        if (part.trim() === FILE_PART_BOUNDARY) {
          state = "closed";
        } else {
          jsonParts.push(part);
        }
        break;
      case "closed":
        contentParts.push(part);
        break;
    }
  });

  let metadata: any;
  try {
    metadata = JSON.parse(jsonParts.join(""));
  } catch (e) {
    return null;
  }
  const title = metadata.title;
  const persona = metadata.persona;
  const presetTitle = metadata.presetTitle;
  const icon = metadata.icon;
  const presetType = metadata.presetType;
  if (!title || !persona) {
    return null;
  }

  const chatContent = contentParts.join("");

  return {
    title,
    path,
    persona,
    presetTitle,
    icon,
    presetType,
    content: chatContent,
  };
}

export async function addRecentChat(
  chat: {
    title: string;
    persona: string;
    presetTitle?: string;
    icon?: string;
    presetType?: RecentChat["presetType"];
    question: string;
    answer: string;
  },
  existedChat?: {
    path: string;
  }
): Promise<RecentChat> {
  await mkdir(CHATS_FOLDER, { recursive: true });
  const fileLocation =
    existedChat?.path ?? join(CHATS_FOLDER, `${new Date().toISOString()}.md`);

  // format chat text
  let chatText = `> ${chat.question.replace(/\n/g, "\n> ")}\n\n${chat.answer}`;
  if (await exists(fileLocation)) {
    const existingText = await Bun.file(fileLocation).text();
    chatText = `${existingText}\n\n${chatText}`;
  } else {
    chatText = `${FILE_PART_BOUNDARY}
${JSON.stringify(
  {
    title: chat.title,
    icon: chat.icon,
    persona: chat.persona,
    presetTitle: chat.presetTitle,
    presetType: chat.presetType,
  },
  null,
  2
)}
${FILE_PART_BOUNDARY}
${chatText}
    `;
  }

  await writeFile(fileLocation, chatText);

  return {
    title: chat.title,
    path: fileLocation,
    persona: chat.persona,
    presetTitle: chat.presetTitle,
    icon: chat.icon,
    presetType: chat.presetType,
    content: chatText,
  };
}

export function parseRecentChatContent(content: string): {
  role: "user" | "assistant";
  content: string;
}[] {
  const historyMessages = !content?.trim()
    ? []
    : content
        .trim()
        .split("\n")
        .map((item) => ({
          role: item.trim().startsWith("> ")
            ? ("user" as const)
            : ("assistant" as const),
          content: item.trim().startsWith("> ")
            ? item.trim().slice(2)
            : item.trim(),
        }))
        .filter((n) => !!n);

  const collapsedHistoryMessages = historyMessages.reduce<
    { role: "user" | "assistant"; content: string }[]
  >((acc, item) => {
    if (acc.length > 0 && acc[acc.length - 1].role === item.role) {
      acc[acc.length - 1].content += "\n" + item.content;
    } else {
      acc.push(item);
    }

    return acc;
  }, []);

  return collapsedHistoryMessages;
}

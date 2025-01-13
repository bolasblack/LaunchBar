import { parseRecentChatContent } from "./recentFiles";

export async function requestCompletions(info: {
  apiKey: string;
  model: string;
  persona: string;
  history?: string;
  question: string;
}): Promise<{
  answer: string;
}> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": info.apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: info.model,
      system: info.persona,
      messages: [
        ...(info.history ? parseRecentChatContent(info.history) : []),
        { role: "user", content: info.question },
      ],
      max_tokens: 8192,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let error: { error?: { message?: string } };
    try {
      error = JSON.parse(errorText);
    } catch {
      error = { error: { message: errorText } };
    }
    throw new Error(error.error?.message ?? "Unknown error");
  }

  const data = (await response.json()) as MockResponse;
  const text = data.content
    .map((c) => (c.type === "text" ? c.text : `[${c.type}]`))
    .join("\n");

  return {
    answer: text,
  };
}

type MockResponse = typeof mockResp;
const mockResp = {
  content: [
    {
      text: "Hi! My name is Claude.",
      type: "text",
    },
  ],
  id: "msg_013Zva2CMHLNnXjNJJKqJ2EF",
  model: "claude-3-5-sonnet-20241022",
  role: "assistant",
  stop_reason: "end_turn",
  stop_sequence: null,
  type: "message",
  usage: {
    input_tokens: 2095,
    output_tokens: 503,
  },
};

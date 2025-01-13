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
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${info.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: info.model,
      messages: [
        { role: "system", content: info.persona },
        ...(info.history ? parseRecentChatContent(info.history) : []),
        { role: "user", content: info.question },
      ],
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
  const text = data.choices[0].message.content;

  return {
    answer: text,
  };
}

type MockResponse = typeof mockResp;
const mockResp = {
  id: "chatcmpl-123",
  object: "chat.completion",
  created: 1677652288,
  model: "gpt-4o-mini",
  system_fingerprint: "fp_44709d6fcb",
  choices: [
    {
      index: 0,
      message: {
        role: "assistant",
        content: "\n\nHello there, how may I assist you today?",
      },
      logprobs: null,
      finish_reason: "stop",
    },
  ],
  service_tier: "default",
  usage: {
    prompt_tokens: 9,
    completion_tokens: 12,
    total_tokens: 21,
    completion_tokens_details: {
      reasoning_tokens: 0,
      accepted_prediction_tokens: 0,
      rejected_prediction_tokens: 0,
    },
  },
};

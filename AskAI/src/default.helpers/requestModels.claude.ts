export async function requestModels(info: { apiKey: string }): Promise<{
  models: string[];
}> {
  const response = await fetch("https://api.anthropic.com/v1/models", {
    method: "GET",
    headers: {
      "x-api-key": info.apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
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

  return {
    models: data.data.map((model) => model.id),
  };
}

type MockResponse = typeof mockResp;
const mockResp = {
  data: [
    {
      type: "model",
      id: "claude-3-5-sonnet-20241022",
      display_name: "Claude 3.5 Sonnet (New)",
      created_at: "2024-10-22T00:00:00Z",
    },
  ],
  has_more: true,
  first_id: "<string>",
  last_id: "<string>",
};

export async function requestModels(info: { apiKey: string }): Promise<{
  models: string[];
}> {
  const response = await fetch("https://api.openai.com/v1/models", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${info.apiKey}`,
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
  object: "list",
  data: [
    {
      id: "model-id-0",
      object: "model",
      created: 1686935002,
      owned_by: "organization-owner",
    },
  ],
};

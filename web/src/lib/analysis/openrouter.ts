import { z } from "zod";
import { ProviderBusyError } from "./errors.ts";
import { DEFAULT_TEMPERATURE, type Generate } from "./gemini.ts";
import { SYSTEM_INSTRUCTION, buildUserContent } from "./prompt.ts";
import { teaserSchema } from "./teaser-schema.ts";

export const OPENROUTER_MODEL = "google/gemini-2.5-flash";
const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const REQUEST_TIMEOUT_MS = 20_000;

// Returns raw parsed JSON; structure and grounding are checked by groundTeaser, same as for Gemini.
export function createOpenRouterGenerate(
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
  temperature = DEFAULT_TEMPERATURE,
): Generate {
  return async (input) => {
    const response = await fetchImpl(ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        temperature,
        messages: [
          { role: "system", content: SYSTEM_INSTRUCTION },
          { role: "user", content: buildUserContent(input) },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: "teaser", strict: true, schema: z.toJSONSchema(teaserSchema) },
        },
      }),
    });

    // 429 = rate limited, 402 = out of credits, 503 = upstream unavailable: all mean "try later".
    if ([402, 429, 503].includes(response.status)) throw new ProviderBusyError();
    // Fixed message only: never include the response body, which could echo request content.
    if (!response.ok) throw new Error(`openrouter_http_${response.status}`);

    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return JSON.parse(data.choices?.[0]?.message?.content ?? "null");
  };
}

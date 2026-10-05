import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { ProviderBusyError } from "./errors.ts";
import { SYSTEM_INSTRUCTION, buildUserContent } from "./prompt.ts";
import type { AnalyzeRequest } from "./request-schema.ts";
import { teaserSchema } from "./teaser-schema.ts";

export const GEMINI_MODEL = "gemini-2.5-flash";
const REQUEST_TIMEOUT_MS = 20_000;
export const DEFAULT_TEMPERATURE = 0.2;

export type Generate = (input: AnalyzeRequest) => Promise<unknown>;

// Returns raw parsed JSON from the model; structure and grounding are checked by groundTeaser.
export function createGeminiGenerate(apiKey: string, temperature = DEFAULT_TEMPERATURE): Generate {
  const client = new GoogleGenAI({ apiKey });
  return async (input) => {
    try {
      return await call(input);
    } catch (error) {
      const status = (error as { status?: number })?.status;
      if (status === 429 || status === 503) throw new ProviderBusyError();
      throw error;
    }
  };

  async function call(input: AnalyzeRequest) {
    const response = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: buildUserContent(input),
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature,
        responseMimeType: "application/json",
        responseJsonSchema: z.toJSONSchema(teaserSchema),
        abortSignal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      },
    });
    return JSON.parse(response.text ?? "null");
  }
}

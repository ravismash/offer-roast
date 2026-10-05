import { createGeminiGenerate } from "@/lib/analysis/gemini";
import { handleAnalyze } from "@/lib/analysis/handler";
import { createOpenRouterGenerate } from "@/lib/analysis/openrouter";
import { withFallback } from "@/lib/analysis/provider";

// Two attempts of up to 20s each, plus headroom.
export const maxDuration = 60;

export async function POST(request: Request) {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  // Gemini first; OpenRouter only takes over when Gemini is busy or not configured.
  const providers = [
    ...(geminiKey ? [createGeminiGenerate(geminiKey)] : []),
    ...(openRouterKey ? [createOpenRouterGenerate(openRouterKey)] : []),
  ];
  return handleAnalyze(request, {
    generate: withFallback(providers),
    newId: () => crypto.randomUUID(),
  });
}

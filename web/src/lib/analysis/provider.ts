import { ProviderBusyError } from "./errors.ts";
import type { Generate } from "./gemini.ts";

// Tries each provider in order. A "busy" provider (quota, credits, outage) hands over to the next one;
// any other error propagates to the caller's bounded retry. If every provider is busy, report busy.
export function withFallback(providers: Generate[]): Generate | undefined {
  if (providers.length === 0) return undefined;
  return async (input) => {
    for (const provider of providers) {
      try {
        return await provider(input);
      } catch (error) {
        if (!(error instanceof ProviderBusyError)) throw error;
      }
    }
    throw new ProviderBusyError();
  };
}

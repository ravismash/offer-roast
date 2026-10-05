import { z } from "zod";

// Bounds mirror the form in app/page.tsx. Unknown keys are rejected.
export const analyzeRequestSchema = z
  .object({
    // Too little text to analyze meaningfully; reject before spending a model call.
    pitch: z.string().trim().min(15).max(4000),
    buyer: z.string().trim().max(160).default(""),
    offer: z.string().trim().max(160).default(""),
    dealSize: z.string().trim().max(60).default(""),
    proofContext: z.string().trim().max(1000).default(""),
  })
  .strict();

export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>;

// Generous ceiling for the JSON body (4000 + 1000 + short fields, with escaping overhead).
export const MAX_BODY_BYTES = 16 * 1024;

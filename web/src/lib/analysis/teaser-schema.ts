import { z } from "zod";

const quote = z.string().min(1).max(300);

// Structure only. Factual grounding (exact quotes, word limit) is enforced in grounding.ts.
//
// Key order is deliberate: the model fills fields left to right, so evidence (quotes) comes before the
// conclusions that should rest on it, not after (see "Let Me Speak Freely?", arXiv 2408.02442).
export const teaserSchema = z.object({
  // Verbatim from the pitch, or null when no single sentence is identifiable.
  killingSentence: quote.nullable(),
  fatalFlawHypothesis: z.string().min(1).max(400),
  simulatedBuyerMonologue: z.string().min(1).max(600),
  evidenceGaps: z.object({
    // Absence claims: nothing to quote, so these stay labeled "not provided" rather than asserted as defects.
    notProvided: z.array(z.string().min(1).max(300)).max(6),
    // Each contradiction must cite the supplied text it rests on, quotes first.
    contradictedBySuppliedText: z
      .array(z.object({ evidenceQuotes: z.array(quote).min(1).max(2), claim: z.string().min(1).max(300) }))
      .max(6),
  }),
  // A strength must cite the supplied text it rests on, quote first.
  strength: z.object({ evidenceQuote: quote, text: z.string().min(1).max(300) }).nullable(),
});

export type Teaser = z.infer<typeof teaserSchema>;

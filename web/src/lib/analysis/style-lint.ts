import type { Teaser } from "./teaser-schema.ts";

// Stock phrasing seen repeatedly in model output across unrelated pitches. A phrase is only flagged when
// the pitch itself does not use it, so quoting the seller's own words is never penalized.
const stockPhrases = [
  /\bgeneric\b/i,
  /\bvalue proposition\b/i,
  /\bselling proposition\b/i,
  /\bdifferentiat\w*/i,
  /\bstand out\b/i,
  /\bundifferentiated\b/i,
  /\bindistinguishable\b/i,
  /\blacks? (?:any )?specific/i,
  /\bwhat makes you different\b/i,
  /\bunique value\b/i,
  /\b(?:everyone|every vendor|everybody) says\b/i,
];
const stockMonologueOpeners = /^\W*(?:another\b|so,? you(?:'|’)?re telling me\b|wait,)/i;

// Returns the stock patterns found in the teaser's free-text fields. Used for a bounded resample
// (soft ban, as in the Antislop approach): if no cleaner output arrives, the original is kept.
export function styleIssues(teaser: Teaser, pitch: string): string[] {
  const fields = [teaser.fatalFlawHypothesis, teaser.simulatedBuyerMonologue, ...teaser.evidenceGaps.notProvided];
  const issues: string[] = [];
  for (const pattern of stockPhrases) {
    const inPitch = pattern.test(pitch);
    if (!inPitch && fields.some((field) => pattern.test(field))) issues.push(pattern.source);
  }
  if (stockMonologueOpeners.test(teaser.simulatedBuyerMonologue) && !stockMonologueOpeners.test(pitch)) {
    issues.push("monologue-opener");
  }
  return issues;
}

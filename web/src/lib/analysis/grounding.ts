import { ProviderBusyError } from "./errors.ts";
import { styleIssues } from "./style-lint.ts";
import { teaserSchema, type Teaser } from "./teaser-schema.ts";

export const MAX_KILLING_SENTENCE_WORDS = 25;

export type GroundingResult =
  | { ok: true; teaser: Teaser; droppedClaims: number }
  | { ok: false; reason: "malformed" | "quote-not-in-pitch" | "provider-busy" };

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// First `max` words of `text`, keeping the original spacing, so a verbatim quote stays verbatim.
function firstWords(text: string, max: number): string {
  const end = text.match(new RegExp(`^\\s*(?:\\S+\\s*){1,${max}}`))?.[0].trimEnd().length;
  return end ? text.slice(0, end).trimStart() : text;
}

// Validates structure, then enforces grounding:
// - the killing sentence must be an exact substring of the pitch (otherwise reject); if it is longer than
//   25 words, only its first 25 words are kept, which is still a verbatim fragment;
// - every strength and contradiction must cite an exact, short quote from the pitch or another supplied
//   field. A claim whose quote does not verify is dropped, not rejected, so one bad claim cannot fail the
//   whole teaser. Failure reasons are fixed codes: no model output or pitch text is echoed.
export function groundTeaser(raw: unknown, pitch: string, supplied: string[] = []): GroundingResult {
  const parsed = teaserSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, reason: "malformed" };

  let killer = parsed.data.killingSentence;
  if (killer !== null) {
    if (!pitch.includes(killer)) return { ok: false, reason: "quote-not-in-pitch" };
    if (wordCount(killer) > MAX_KILLING_SENTENCE_WORDS) killer = firstWords(killer, MAX_KILLING_SENTENCE_WORDS);
  }

  const sources = [pitch, ...supplied].filter(Boolean);
  const verified = (text: string) => wordCount(text) <= MAX_KILLING_SENTENCE_WORDS && sources.some((source) => source.includes(text));

  let dropped = 0;
  const contradicted = parsed.data.evidenceGaps.contradictedBySuppliedText.filter((item) => {
    const ok = item.evidenceQuotes.every(verified);
    if (!ok) dropped++;
    return ok;
  });
  let teaser: Teaser = { ...parsed.data, killingSentence: killer, evidenceGaps: { ...parsed.data.evidenceGaps, contradictedBySuppliedText: contradicted } };
  if (teaser.strength && !verified(teaser.strength.evidenceQuote)) {
    teaser = { ...teaser, strength: null };
    dropped++;
  }
  const sanitized = sanitizeStrength(capGaps(teaser));
  if (teaser.strength && !sanitized.strength) dropped++;
  return { ok: true, teaser: sanitized, droppedClaims: dropped };
}

// A meeting ask is never a strength, and a strength must not rest on the very sentence called the killer.
// The strength is optional, so dropping a bad one is safe.
const meetingPraise = /\b(call[- ]to[- ]action|meeting|book(?:ing)? a call|schedule)\b/i;
function sanitizeStrength(teaser: Teaser): Teaser {
  const { strength, killingSentence } = teaser;
  if (strength === null) return teaser;
  const restsOnKiller =
    killingSentence !== null && (strength.text.includes(killingSentence) || strength.evidenceQuote === killingSentence);
  if (meetingPraise.test(strength.text) || meetingPraise.test(strength.evidenceQuote) || restsOnKiller) {
    return { ...teaser, strength: null };
  }
  return teaser;
}

export const MAX_GAPS_PER_LIST = 2;

// The model pads lists to the cap and often ignores the prompt's length rule, so enforce a short teaser
// deterministically. The prompt asks for the most important item first, so slicing keeps the best ones.
function capGaps(teaser: Teaser): Teaser {
  const { notProvided, contradictedBySuppliedText } = teaser.evidenceGaps;
  return {
    ...teaser,
    evidenceGaps: {
      notProvided: notProvided.slice(0, MAX_GAPS_PER_LIST),
      contradictedBySuppliedText: contradictedBySuppliedText.slice(0, MAX_GAPS_PER_LIST),
    },
  };
}

// Bounded retry: call `generate` up to `maxAttempts` times and return the first grounded teaser.
// A grounded teaser with stock phrasing (see style-lint.ts) triggers one more attempt if any remain, but
// it is kept as a fallback: stylistic polish never turns a valid result into a failure.
export async function generateGroundedTeaser(
  pitch: string,
  generate: () => Promise<unknown>,
  maxAttempts = 2,
  supplied: string[] = [],
): Promise<GroundingResult> {
  let last: GroundingResult = { ok: false, reason: "malformed" };
  let fallback: GroundingResult | null = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let raw: unknown;
    try {
      raw = await generate();
    } catch (error) {
      if (error instanceof ProviderBusyError) return fallback ?? { ok: false, reason: "provider-busy" };
      last = { ok: false, reason: "malformed" };
      continue;
    }
    last = groundTeaser(raw, pitch, supplied);
    if (!last.ok) continue;
    if (styleIssues(last.teaser, pitch).length === 0) return last;
    fallback ??= last;
  }
  return fallback ?? last;
}

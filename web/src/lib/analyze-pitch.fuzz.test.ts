import { describe, expect, it } from "vitest";
import { analyzePitch } from "./analyze-pitch.ts";
import { groundTeaser } from "./analysis/grounding.ts";

// Deterministic PRNG so failures are reproducible.
function rng(seed: number) {
  return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

const fragments = [
  "We help", "we guarantee 10x", "Book a quick call", "schedule a demo", "our agency", "case study", "18%", "$40,000",
  "Hi", "Hey {{first_name}},", "😀", "“smart quotes”", "—", "\n\n", "  ", "\t", "...", "?!", "ALL CAPS PITCH", "ñandú", "漢字",
  "x".repeat(300), "w ".repeat(60), "<b>html</b>", "'; DROP TABLE;--", "\u0000", "​", "(parens)", "- bullet", "http://a.b/c?d=e",
];
const empties = { buyer: "", offer: "", dealSize: "", proofContext: "" };

describe("fuzz: forum-style messy pitches", () => {
  it("analyzePitch never throws and any quote is a verbatim fragment of at most 25 words", () => {
    const next = rng(42);
    for (let i = 0; i < 3000; i++) {
      const pitch = Array.from({ length: 1 + Math.floor(next() * 40) }, () => fragments[Math.floor(next() * fragments.length)]).join(next() > 0.5 ? " " : "");
      const context = next() > 0.5 ? { buyer: "VP of Sales", offer: "outbound", dealSize: "$5,000", proofContext: next() > 0.5 ? "case study" : "" } : empties;
      const result = analyzePitch({ pitch, ...context });
      if (result.killingSentence !== null) {
        expect(pitch.includes(result.killingSentence)).toBe(true);
        expect(result.killingSentence.trim().split(/\s+/).length).toBeLessThanOrEqual(25);
      }
      expect(result.issue.length).toBeGreaterThan(0);
    }
  });

  it("groundTeaser rejects every non-substring quote, caps verbatim ones at 25 words, and never throws on arbitrary model output", () => {
    const next = rng(7);
    const valid = {
      fatalFlawHypothesis: "h", simulatedBuyerMonologue: "m", killingSentence: null as string | null,
      evidenceGaps: { notProvided: [], contradictedBySuppliedText: [] }, strength: null,
    };
    for (let i = 0; i < 3000; i++) {
      const pitch = Array.from({ length: 1 + Math.floor(next() * 10) }, () => fragments[Math.floor(next() * fragments.length)]).join(" ");
      const start = Math.floor(next() * pitch.length);
      const slice = pitch.slice(start, start + 1 + Math.floor(next() * 80));
      const mutate = next() > 0.5;
      const quote = mutate ? slice + " Z" : slice;
      if (!quote.trim()) continue;
      const result = groundTeaser({ ...valid, killingSentence: quote }, pitch);
      expect(result.ok).toBe(pitch.includes(quote));
      if (result.ok && result.teaser.killingSentence !== null) {
        expect(pitch.includes(result.teaser.killingSentence)).toBe(true);
        expect(result.teaser.killingSentence.trim().split(/\s+/).filter(Boolean).length).toBeLessThanOrEqual(25);
      }
    }
    for (const junk of [undefined, 0, [], [[]], "{}", { killingSentence: {} }, Symbol.iterator.toString()]) {
      expect(() => groundTeaser(junk, "pitch")).not.toThrow();
    }
  });
});

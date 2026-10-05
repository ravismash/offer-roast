import { describe, expect, it, vi } from "vitest";
import { generateGroundedTeaser } from "./grounding.ts";
import { styleIssues } from "./style-lint.ts";
import type { Teaser } from "./teaser-schema.ts";

const pitch = "We help B2B firms grow. Book a quick call next week to see how.";
const teaser = (over: Partial<Teaser> = {}): Teaser => ({
  killingSentence: "We help B2B firms grow.",
  fatalFlawHypothesis: "The growth claim names no segment or outcome, so a buyer cannot tell if it applies.",
  simulatedBuyerMonologue: "Grow how? I have a pipeline target, not a vague promise.",
  evidenceGaps: { notProvided: ["Which firms 'grow', and by what measure."], contradictedBySuppliedText: [] },
  strength: null,
  ...over,
});

describe("styleIssues", () => {
  it("passes specific, non-stock text", () => {
    expect(styleIssues(teaser(), pitch)).toEqual([]);
  });

  it("flags stock phrases in the flaw, monologue and gaps", () => {
    expect(styleIssues(teaser({ fatalFlawHypothesis: "The pitch is too generic." }), pitch)).not.toEqual([]);
    expect(styleIssues(teaser({ simulatedBuyerMonologue: "Everyone says that." }), pitch)).not.toEqual([]);
    expect(styleIssues(teaser({ evidenceGaps: { notProvided: ["What makes you different?"], contradictedBySuppliedText: [] } }), pitch)).not.toEqual([]);
  });

  it("flags stock monologue openers", () => {
    for (const m of ["Another vendor asking for time.", "So you're telling me you can grow?", "Wait, what?"]) {
      expect(styleIssues(teaser({ simulatedBuyerMonologue: m }), pitch)).toContain("monologue-opener");
    }
  });

  it("does not penalize a phrase the seller's own pitch uses", () => {
    const p = "We build a generic value proposition template. Book a call.";
    expect(styleIssues(teaser({ fatalFlawHypothesis: "The template is called generic by the seller itself." }), p)).toEqual([]);
  });
});

describe("generateGroundedTeaser style resample", () => {
  const stock = teaser({ fatalFlawHypothesis: "The pitch is generic." });

  it("resamples once on stock phrasing and returns the cleaner result", async () => {
    const generate = vi.fn().mockResolvedValueOnce(stock).mockResolvedValueOnce(teaser());
    const result = await generateGroundedTeaser(pitch, generate);
    expect(generate).toHaveBeenCalledTimes(2);
    expect(result.ok && result.teaser.fatalFlawHypothesis).toMatch(/names no segment/);
  });

  it("soft ban: keeps the stock-phrased result if the resample is no better or fails", async () => {
    for (const second of [stock, { bad: true }]) {
      const generate = vi.fn().mockResolvedValueOnce(stock).mockResolvedValueOnce(second);
      const result = await generateGroundedTeaser(pitch, generate);
      expect(result.ok && result.teaser.fatalFlawHypothesis).toBe("The pitch is generic.");
    }
  });

  it("keeps the stock-phrased result if the provider goes busy on the resample", async () => {
    const { ProviderBusyError } = await import("./errors.ts");
    const generate = vi.fn().mockResolvedValueOnce(stock).mockRejectedValueOnce(new ProviderBusyError());
    expect((await generateGroundedTeaser(pitch, generate)).ok).toBe(true);
  });

  it("does not resample clean output", async () => {
    const generate = vi.fn().mockResolvedValue(teaser());
    await generateGroundedTeaser(pitch, generate);
    expect(generate).toHaveBeenCalledTimes(1);
  });
});

import { describe, expect, it } from "vitest";
import { analyzePitch } from "./analyze-pitch.ts";

const emptyContext = {
  buyer: "",
  offer: "",
  dealSize: "",
  proofContext: "",
};

describe("analyzePitch", () => {
  it("returns a verbatim source fragment of no more than 25 words", () => {
    const pitch = `${"We provide growth support to ambitious companies ".repeat(8)}with a clear plan. Thanks.`;
    const result = analyzePitch({ ...emptyContext, pitch });

    expect(result.killingSentence).toBeTruthy();
    expect(pitch.includes(result.killingSentence ?? "")).toBe(true);
    expect(result.killingSentence?.trim().split(/\s+/).length).toBeLessThanOrEqual(25);
  });

  it("reports a meeting ask as a likely friction point", () => {
    const pitch = "Could we book a quick call next week?";
    const result = analyzePitch({ ...emptyContext, pitch });

    expect(result.killingSentence).toBe(pitch);
    expect(result.issue).toMatch(/meeting time/i);
    expect(result.buyerMonologue).toMatch(/asking for time/i);
  });

  it("distinguishes proof supplied in context from proof in the pitch", () => {
    const result = analyzePitch({
      ...emptyContext,
      pitch: "We provide SEO services for local firms.",
      proofContext: "A customer grew organic leads by 25%.",
    });

    expect(result.evidenceGap).toMatch(/supplied as context/i);
  });

  it("does not invent a killing sentence when no risk cue is found", () => {
    const pitch = "Your product launch is on the 12th. Is this the right owner for the checklist?";
    const result = analyzePitch({ ...emptyContext, pitch });

    expect(result.killingSentence).toBeNull();
    expect(result.strength).toBeNull();
  });

  it("does not treat generic words like customers or increased as proof", () => {
    const result = analyzePitch({ ...emptyContext, pitch: "We help our customers. Results increased." });

    expect(result.strength).toBeNull();
    expect(result.evidenceGap).toMatch(/no proof cue/i);
  });

  it("treats figures and case studies as proof, including dollar amounts", () => {
    for (const pitch of ["Our case study shows it works.", "We cut churn by 18%.", "Added $40,000 in pipeline."]) {
      expect(analyzePitch({ ...emptyContext, pitch }).strength).not.toBeNull();
    }
  });

  it("does not flag the word 'book' or a meeting ask backed by proof", () => {
    expect(analyzePitch({ ...emptyContext, pitch: "I read your book on pricing." }).killingSentence).toBeNull();

    const backed = analyzePitch({ ...emptyContext, pitch: "We cut churn by 18% for Acme. Book a call?" });
    expect(backed.issue).not.toMatch(/meeting time/i);
  });

  it("weights the flaw by context: supplied proof lowers an outcome claim below a leading capability pitch", () => {
    const pitch = "We help firms grow. We guarantee 10x leads.";
    const noProof = analyzePitch({ ...emptyContext, pitch });
    expect(noProof.killingSentence).toBe("We guarantee 10x leads.");

    const withProof = analyzePitch({ ...emptyContext, pitch, proofContext: "Case notes available." });
    expect(withProof.killingSentence).toBe("We help firms grow.");
  });

  it("uses the stated buyer and deal size in the diagnosis", () => {
    const result = analyzePitch({
      ...emptyContext,
      pitch: "Fresh ideas for your growth. Reply if curious.",
      buyer: "dental clinic owners",
      dealSize: "$3,000/month",
    });

    expect(result.issue).toMatch(/buyer you described/i);
    expect(result.killingSentence).toBeNull();
    expect(result.evidenceGap).toMatch(/\$3,000\/month/);
  });

  it("says what is missing instead of implying a clean pitch", () => {
    const result = analyzePitch({ ...emptyContext, pitch: "Is this the right owner for the checklist?" });

    expect(result.issue).toMatch(/not evidence the pitch is strong/i);
    expect(result.issue).toMatch(/target buyer/);
  });

  it("does not treat a price or a market percentage as proof", () => {
    for (const pitch of ["Our service is $297/mo, fully automated.", "These sites usually take 30-50% of the deposit."]) {
      const result = analyzePitch({ ...emptyContext, pitch });
      expect(result.strength).toBeNull();
      expect(result.evidenceGap).toMatch(/no proof cue/i);
    }
  });

  it("still counts a result verb next to a figure as proof", () => {
    for (const pitch of ["We booked 14 demos in 60 days.", "We delivered 3 wins.", "Clients saved $12,000."]) {
      expect(analyzePitch({ ...emptyContext, pitch }).strength).not.toBeNull();
    }
  });

  it("flags buzzword-led pitches", () => {
    const pitch = "We've built an AI-powered platform that leverages machine learning to optimize growth.";
    const result = analyzePitch({ ...emptyContext, pitch });
    expect(result.issue).toMatch(/buzzwords/i);
    expect(pitch.includes(result.killingSentence ?? "")).toBe(true);
  });
});

import { describe, expect, it, vi } from "vitest";
import { ProviderBusyError } from "./errors.ts";
import type { Generate } from "./gemini.ts";
import { handleAnalyze } from "./handler.ts";

const pitch = "We help B2B firms grow. Book a quick call next week to see how.";
const good = {
  fatalFlawHypothesis: "Likely leads with capabilities.",
  killingSentence: "We help B2B firms grow.",
  simulatedBuyerMonologue: "Why should I care?",
  evidenceGaps: { notProvided: ["No customer result supplied."], contradictedBySuppliedText: [] },
  strength: null,
};
const post = (body: unknown, init: RequestInit = {}) =>
  new Request("http://x/api/analyze", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body), ...init });
const deps = (generate: unknown) => ({ generate: generate as Generate | undefined, newId: () => "id-1" });

describe("handleAnalyze", () => {
  it("returns only analysisId and freeTeaser, uncached", async () => {
    const res = await handleAnalyze(post({ pitch }), deps(vi.fn().mockResolvedValue(good)));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    const data = await res.json();
    expect(Object.keys(data).sort()).toEqual(["analysisId", "freeTeaser"]);
    expect(data.freeTeaser.killingSentence).toBe("We help B2B firms grow.");
  });

  it("returns 500 when no key is configured", async () => {
    expect((await handleAnalyze(post({ pitch }), deps(undefined))).status).toBe(500);
  });

  it("rejects invalid input without calling the model", async () => {
    const generate = vi.fn();
    for (const body of ["not json", {}, { pitch: "" }, { pitch: "Hi" }, { pitch: "x".repeat(4001) }, { pitch, extra: 1 }, { pitch, buyer: 5 }]) {
      expect((await handleAnalyze(post(body), deps(generate))).status).toBe(400);
    }
    expect(generate).not.toHaveBeenCalled();
  });

  it("rejects oversized bodies by header and by actual bytes", async () => {
    const generate = vi.fn();
    const big = JSON.stringify({ pitch: "x".repeat(20_000) });
    expect((await handleAnalyze(post(big, { headers: { "content-length": String(big.length) } }), deps(generate))).status).toBe(413);
    expect((await handleAnalyze(post(big), deps(generate))).status).toBe(413);
    expect(generate).not.toHaveBeenCalled();
  });

  it("passes supplied context fields to grounding, so a quote from proofContext verifies", async () => {
    const generate = vi.fn().mockResolvedValue({ ...good, strength: { text: "Has a reference.", evidenceQuote: "9 meetings in 45 days" } });
    const res = await handleAnalyze(post({ pitch, proofContext: "Case study: 9 meetings in 45 days" }), deps(generate));
    expect((await res.json()).freeTeaser.strength.evidenceQuote).toBe("9 meetings in 45 days");
  });

  it("returns a fixed 502 and leaks nothing when output is ungrounded", async () => {
    const generate = vi.fn().mockResolvedValue({ ...good, killingSentence: "SECRET INVENTED QUOTE" });
    const res = await handleAnalyze(post({ pitch }), deps(generate));
    expect(res.status).toBe(502);
    expect(await res.text()).toBe('{"error":"analysis_failed"}');
    expect(generate).toHaveBeenCalledTimes(2);
  });

  it("returns 503 provider_busy without retrying when the provider is over quota", async () => {
    const generate = vi.fn().mockRejectedValue(new ProviderBusyError());
    const res = await handleAnalyze(post({ pitch }), deps(generate));
    expect(res.status).toBe(503);
    expect(await res.text()).toBe('{"error":"provider_busy"}');
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it("returns 502 when the provider throws", async () => {
    const res = await handleAnalyze(post({ pitch }), deps(vi.fn().mockRejectedValue(new Error("key=AIza..."))));
    expect(res.status).toBe(502);
    expect(await res.text()).not.toMatch(/AIza/);
  });
});

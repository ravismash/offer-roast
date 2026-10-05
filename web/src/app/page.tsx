"use client";

import { useState, type FormEvent } from "react";
import { analyzePitch, type PitchInput } from "@/lib/analyze-pitch";
import type { Teaser } from "@/lib/analysis/teaser-schema";

// One display shape for both engines, so the panel does not care where the read came from.
type View = {
  source: "rules" | "ai";
  issue: string;
  killingSentence: string | null;
  buyerMonologue: string;
  gaps: Array<{ label: string; text: string }>;
  strength: { text: string; quote: string | null } | null;
};

const errorMessages: Record<string, string> = {
  invalid_request: "The pitch needs at least 15 characters, and every field must be within its length limit.",
  too_large: "That input is too large to analyze.",
  analysis_failed: "The AI analysis could not produce a verifiable result. Please try again.",
  provider_busy: "The AI service is busy or over its usage limit right now. Please try again later.",
  not_configured: "AI analysis is not configured on this server.",
};

function fromTeaser(teaser: Teaser): View {
  return {
    source: "ai",
    issue: teaser.fatalFlawHypothesis,
    killingSentence: teaser.killingSentence,
    buyerMonologue: teaser.simulatedBuyerMonologue,
    gaps: [
      ...teaser.evidenceGaps.notProvided.map((text) => ({ label: "Not provided", text })),
      ...teaser.evidenceGaps.contradictedBySuppliedText.map((item) => ({
        label: "Contradicted by your text",
        text: `${item.claim} (${item.evidenceQuotes.map((quote) => `“${quote}”`).join(" and ")})`,
      })),
    ],
    strength: teaser.strength ? { text: teaser.strength.text, quote: teaser.strength.evidenceQuote } : null,
  };
}

const blankPitch: PitchInput = {
  buyer: "",
  offer: "",
  dealSize: "",
  proofContext: "",
  pitch: "",
};

const samplePitch: PitchInput = {
  buyer: "VP of Sales at a 20-100 person B2B software company",
  offer: "Outbound lead generation retainer",
  dealSize: "$5,000-$10,000 per month",
  proofContext: "",
  pitch: "We help B2B companies grow with our proven outbound services. Our team handles everything from targeting to messaging. Book a quick call next week and we can show you how to scale pipeline.",
};

export default function Home() {
  const [form, setForm] = useState<PitchInput>(blankPitch);
  const [analysis, setAnalysis] = useState<View | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateField<Key extends keyof PitchInput>(key: Key, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = analyzePitch(form);
    setError(null);
    setAnalysis({
      source: "rules",
      issue: result.issue,
      killingSentence: result.killingSentence,
      buyerMonologue: result.buyerMonologue,
      gaps: [{ label: "Evidence gap", text: result.evidenceGap }],
      strength: result.strength ? { text: result.strength, quote: null } : null,
    });
  }

  async function runAi() {
    setLoading(true);
    setError(null);
    setAnalysis(null);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(errorMessages[data?.error] ?? "Something went wrong. Please try again.");
      } else {
        setAnalysis(fromTeaser(data.freeTeaser));
      }
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  function loadSample() {
    setForm(samplePitch);
    setAnalysis(null);
    setError(null);
  }

  function resetForm() {
    setForm(blankPitch);
    setAnalysis(null);
    setError(null);
  }

  return (
    <div className="site-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="OfferRoast home">
          <span className="brand-mark" aria-hidden="true">O</span>
          <span>OfferRoast</span>
        </a>
        <div className="header-status">
          <span className="status-dot" aria-hidden="true" />
          <span>LOCAL PROTOTYPE</span>
        </div>
      </header>

      <main id="top" className="main-content">
        <section className="intro-row" aria-labelledby="page-title">
          <div>
            <p className="eyebrow">B2B OUTBOUND / FIELD TEST 01</p>
            <h1 id="page-title">Put the offer<br />under pressure.</h1>
          </div>
          <p className="intro-copy">
            A first-pass read from the buyer&apos;s side. No copy polish, no made-up proof.
          </p>
        </section>

        <div className="privacy-note">
          <span className="privacy-symbol" aria-hidden="true">i</span>
          <p>Your input stays in this browser session. This prototype uses local rules only; no model or storage is connected.</p>
        </div>

        <section className="workbench" aria-label="Pitch diagnostic">
          <form className="pitch-form" onSubmit={handleSubmit}>
            <div className="section-heading">
              <div>
                <p className="eyebrow">01 / THE OFFER</p>
                <h2>Give it the context a buyer would have.</h2>
              </div>
              <button className="text-button" type="button" onClick={loadSample}>Load example</button>
            </div>

            <div className="field-grid">
              <label className="field">
                <span>Who are you trying to reach?</span>
                <input
                  autoComplete="off"
                  maxLength={160}
                  onChange={(event) => updateField("buyer", event.target.value)}
                  placeholder="e.g. VP of Sales at a B2B SaaS company"
                  value={form.buyer}
                />
              </label>
              <label className="field">
                <span>What are you selling?</span>
                <input
                  autoComplete="off"
                  maxLength={160}
                  onChange={(event) => updateField("offer", event.target.value)}
                  placeholder="e.g. Outbound lead generation retainer"
                  value={form.offer}
                />
              </label>
            </div>

            <label className="field">
              <span>Typical deal size</span>
              <select onChange={(event) => updateField("dealSize", event.target.value)} value={form.dealSize}>
                <option value="">Choose a range</option>
                <option value="$1,000-$5,000 per month">$1k-$5k / month</option>
                <option value="$5,000-$10,000 per month">$5k-$10k / month</option>
                <option value="$10,000-$25,000 per month">$10k-$25k / month</option>
                <option value="$25,000+">$25k+ / engagement</option>
              </select>
            </label>

            <label className="field pitch-field">
              <span>Your cold pitch <span className="required-note">REQUIRED</span></span>
              <textarea
                maxLength={4000}
                onChange={(event) => updateField("pitch", event.target.value)}
                placeholder="Paste the email or message exactly as you send it."
                required
                rows={8}
                value={form.pitch}
              />
              <span className="character-count">{form.pitch.length} / 4,000</span>
            </label>

            <label className="field">
              <span>Proof you can actually show <span className="optional-note">OPTIONAL</span></span>
              <textarea
                maxLength={1000}
                onChange={(event) => updateField("proofContext", event.target.value)}
                placeholder="A case study, customer result, reference, sample, or pilot terms. Leave blank if you have none."
                rows={3}
                value={form.proofContext}
              />
            </label>

            <div className="form-actions">
              <button className="submit-button" type="submit" disabled={!form.pitch.trim() || loading}>
                Run first-pass roast <span aria-hidden="true">↗</span>
              </button>
              <button className="text-button" type="button" onClick={runAi} disabled={form.pitch.trim().length < 15 || loading}>
                {loading ? "Analyzing…" : "Run AI analysis"}
              </button>
              <button className="text-button reset-button" type="button" onClick={resetForm}>Reset</button>
              <span className="form-footnote">Rules-based · not buyer research</span>
            </div>
            <p className="form-footnote">
              &ldquo;Run AI analysis&rdquo; sends everything above to a third-party AI provider: Google Gemini, or OpenRouter (which forwards it to a model provider) if Gemini is unavailable. Nothing is stored by this app yet. The first-pass button never leaves your browser.
            </p>
          </form>

          <section className="report-panel" aria-labelledby="report-heading" aria-live="polite" aria-busy={loading}>
            <div className="report-topline">
              <p className="eyebrow">02 / THE READ</p>
              <span className="report-index">{loading ? "ANALYZING" : analysis ? (analysis.source === "ai" ? "AI ANALYSIS" : "FIRST PASS") : "AWAITING INPUT"}</span>
            </div>
            {error ? (
              <div className="empty-report" role="alert">
                <span className="empty-mark" aria-hidden="true">!</span>
                <h2 id="report-heading">Couldn&apos;t analyze this.</h2>
                <p>{error}</p>
              </div>
            ) : loading ? (
              <div className="empty-report">
                <span className="empty-mark" aria-hidden="true">…</span>
                <h2 id="report-heading">Reading it like<br />a skeptical buyer.</h2>
                <p>This can take up to about 20 seconds.</p>
              </div>
            ) : analysis ? (
              <div className="report-content">
                <div className="report-lead">
                  <p className="report-label">{analysis.source === "ai" ? "LIKELY FLAW (HYPOTHESIS)" : "LIKELY TRUST BREAKER"}</p>
                  <h2 id="report-heading">{analysis.issue}</h2>
                </div>

                <div className="report-section quote-section">
                  <p className="report-label">KILLING SENTENCE</p>
                  {analysis.killingSentence ? (
                    <blockquote>&ldquo;{analysis.killingSentence}&rdquo;</blockquote>
                  ) : (
                    <p className="report-copy">No single sentence is identifiable as the trigger for this diagnosis.</p>
                  )}
                </div>

                <div className="report-section buyer-section">
                  <p className="report-label">SIMULATED BUYER MONOLOGUE</p>
                  <p className="buyer-thought">&ldquo;{analysis.buyerMonologue}&rdquo;</p>
                </div>

                {analysis.strength && (
                  <div className="strength-note">
                    <span className="strength-mark" aria-hidden="true">+</span>
                    <p><strong>KEEP THIS</strong>{analysis.strength.text}{analysis.strength.quote && <> (&ldquo;{analysis.strength.quote}&rdquo;)</>}</p>
                  </div>
                )}

                <div className="report-section evidence-section">
                  <p className="report-label">EVIDENCE GAPS</p>
                  {analysis.gaps.length === 0 && <p className="report-copy">None identified from the supplied text.</p>}
                  {analysis.gaps.map((gap, index) => (
                    <p className="report-copy" key={index}>{analysis.source === "ai" && <strong>{gap.label}: </strong>}{gap.text}</p>
                  ))}
                </div>
              </div>
            ) : (
              <div className="empty-report">
                <span className="empty-mark" aria-hidden="true">—</span>
                <h2 id="report-heading">The buyer&apos;s read<br />will land here.</h2>
                <p>One likely trust breaker, one source quote, and the proof gap this ruleset can detect.</p>
              </div>
            )}
            <div className="report-disclaimer">
              <span className="disclaimer-mark" aria-hidden="true">!</span>
              <p>This is a prototype heuristic, not a prediction. Its checks can miss context or misread a pitch.</p>
            </div>
          </section>
        </section>

        <footer className="page-footer">
          <span>OFFERROAST / MILESTONE 01</span>
          <span>NO CLAIMS ABOUT PERFORMANCE. JUST A FIRST READ.</span>
        </footer>
      </main>
    </div>
  );
}

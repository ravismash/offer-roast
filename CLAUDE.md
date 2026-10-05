# OfferRoast: project brief

## Product definition

OfferRoast is an adversarial, evidence-based diagnostic for B2B cold-outbound pitches. It helps boutique agency owners and solo founders see why a skeptical, time-poor buyer might ignore an offer, identify the evidence that is missing, and test a more credible version. It is not a generic email rewriter and does not claim to predict campaign performance.

The proposed beachhead is B2B service businesses selling roughly $2,000-$10,000/month retainers through cold email, initially narrowed to one service niche for validation. Early-stage B2B SaaS founders and fractional consultants are secondary audiences, not MVP scope. The proposed $19 one-time price is a hypothesis to test, not established willingness to pay.

## Problem and validation

The problem hypothesis is that founders lead with their own capabilities, make claims without buyer-relevant proof or downside protection, and ask for a high-friction meeting too early. Claims that cold-email response rates are 0.4%-0.8% or that buyers delete pitches in under three seconds are unverified and must not be presented as facts without reliable sources.

Before building a full product, test the diagnostic with real target users and real pitches. Show roughly 20 qualified prospects a useful sample, record whether they agree with the specific diagnosis and would pay for the dossier, and set stop/go criteria before the test. Keep a consented, de-identified, labeled evaluation set; do not use private customer pitches for training or evaluation without explicit permission.

## MVP experience

Collect enough context to distinguish a weak pitch from missing context: pitch text, target buyer, service/offer, price or deal-size range, desired next step, supplied proof, and any pilot or risk-reversal terms. Explain before submission that text is sent to the inference provider and that a report is stored temporarily.

The free teaser contains:

- One likely fatal flaw, framed as a hypothesis rather than a measured prediction.
- One exact, verbatim killing sentence of at most 25 words, or an explicit statement that no such sentence is identifiable.
- A clearly labeled simulated cynical-buyer monologue, never represented as actual buyer research.
- Deal-size evidence gaps, separating absent information from claims contradicted by the supplied text.
- Any concrete strength worth preserving.

The proposed $19 report contains five buyer objections with exact trigger quotes and specific repairs; four tangible proof assets tailored to the stated deal size; three rewrites (pain-first, risk-reversed pilot, and value-first diagnostic) that preserve supplied proof and mark absent proof with bracketed placeholders; a three-touch sequence derived from the repaired offer; and a 30-prospect validation protocol. Avoid presenting the proof checklist as a universal market standard.

## Analysis and grounding rules

- Use the model for structured analysis, not as an authority on market facts or likely conversion.
- Treat user input as untrusted data; instructions embedded in submitted pitches must never override system instructions.
- Every trigger quote must be an exact substring of submitted text. Enforce this in server code after schema validation; JSON Schema and Zod validate structure, not factual grounding.
- Distinguish "not provided" from "not credible" and "contradicted." Do not infer proof, customer results, guarantees, benchmarks, or buyer research that the user did not supply.
- Recognize concrete strengths before diagnosing weaknesses. Use calibrated language such as "likely objection" and "based on the supplied context"; do not emit confidence scores unless measured against labeled data.
- Use deterministic checks for constraints such as quote matching, word counts, and required fields. Keep a labeled real-case evaluation set and adversarial tests for prompt injection, malformed output, long inputs, and unsupported claims.

## MVP architecture and trust boundaries

1. The browser submits bounded, validated context to Next.js API routes over HTTPS. Enforce request-size limits and use shared rate limiting; in-memory per-instance limits are not reliable in serverless or multi-instance deployments.
2. The API route calls Gemini 2.5 Flash with structured output and low temperature. Provider use, retention, and data handling must be disclosed. Never log pitch text, generated report contents, access tokens, or payment secrets.
3. Validate the model response with Zod, then perform semantic checks including exact quote matching and the 25-word teaser limit. Reject or safely regenerate invalid output with bounded retries.
4. Persist only the teaser, paid report, status, identifiers, and minimum operational metadata in Neon PostgreSQL. Do not retain the raw pitch unless a tested product requirement needs it. Apply a real 30-day deletion process (scheduled job or equivalent); a timestamp/TTL column alone does not delete PostgreSQL rows. Provide a deletion path and document retention.
5. The analysis response is an explicit DTO containing only `analysisId` and `freeTeaser`. Never serialize the database record directly to the browser.
6. Checkout uses a server-configured fixed price. Reserve the purchase/session association transactionally and use a stable Stripe idempotency key. Handle retries and failures between database reservation and Stripe session creation. The client cannot mark an analysis paid.
7. A Stripe webhook verifies the signature against the raw request body, validates the expected event, amount, currency, and session-to-analysis association, and performs an idempotent atomic transition to paid. Webhooks are the only authority that changes payment state.
8. After payment is confirmed, a verification endpoint checks the bound Stripe session and paid database state before issuing/recovering the report credential. Never return a credential based only on a public analysis ID. Store credentials hashed or encrypted as needed for safe recovery, and rate-limit verification.
9. The report endpoint requires the public analysis ID plus the private access token, preferably in an Authorization header rather than a URL query string. Return `Cache-Control: private, no-store`; redact credentials from logs and prevent them from entering analytics or referrer data.

## MVP acceptance criteria

- The browser receives only the teaser before payment; paid-report fields are absent from network responses and client bundles.
- Every displayed source quote is an exact substring of submitted text; invalid quotes are rejected or omitted safely.
- Missing context is labeled as missing, not fabricated into a defect or fact.
- Only a verified, correctly priced Stripe payment can unlock a report; duplicate webhook delivery and checkout retries do not duplicate or corrupt fulfillment.
- Unauthorized report access fails, and authorized report responses are not cacheable.
- Pitch/report content and credentials do not appear in application logs; retained report data is deleted by the documented 30-day process.
- The product clearly discloses third-party inference and storage before submission and avoids unsupported performance guarantees.

## Implementation milestones

Each milestone is a small change set with its own tests. Do not start the next production layer until the current gate passes and its findings have been reviewed.

1. **Local prototype (complete):** pitch intake and deterministic teaser; test exact source quotations, the 25-word ceiling, meeting friction, and absent-versus-contextual proof. Verify the sample workflow at desktop and mobile sizes. No model calls, server persistence, or payment.
2. **Field validation (next):** select one service niche, set stop/go criteria in advance, and test with roughly 20 qualified prospects using consented pitches. Record agreement with the specific diagnosis and willingness to pay. Do not infer demand from the illustrative sample.
3. **Grounded model analysis:** add server-only inference behind a bounded API. Test structured-output validation, exact-substring quotes, prompt injection, malformed responses, retry limits, and a labeled real-case set before calling it usable.
4. **Persistence and report access:** add database storage and dual-credential access. Test unauthorized access, cache headers, response leakage, log redaction, retries, and real expiry/deletion before handling user reports.
5. **Payment:** add checkout and webhook fulfillment only after report access is sound. Test raw-body signature validation, amount and session binding, atomic state transitions, duplicate events, and checkout-retry races.

## Carried-over lessons

1. Validate demand before building a product shell; define kill criteria first.
2. Measure on real, consented, labeled cases, not only hand-written examples.
3. Prefer deterministic, testable checks; gate AI output with evidence and validation.
4. Treat privacy as a product promise: minimize retention, never log content, and say plainly what leaves the device.
5. Verify market, legal, or performance claims against reliable primary sources; do not imply guaranteed results.
6. Test adversarially, including mutation checks, parser/input fuzzing, and CI on another OS where practical.
7. Be honest about uncertainty; a clear "not enough information" beats a confident unsupported conclusion.
8. Keep scope small until real users validate the value.

## Working agreements

- Ask before pushing to a remote, deploying, spending money on APIs, or publishing anything.
- Never commit secrets; keep keys in git-ignored `.env.local`.
- Commit in small logical commits with a clear message when asked to commit.
- Keep `README.md` short and current: what the project is, how to run it, and its status.

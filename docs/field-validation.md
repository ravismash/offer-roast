# Milestone 2: field validation plan

Status: **criteria locked 2026-10-02, no sessions run yet.** Niche and thresholds were confirmed by the owner before any session. Do not edit them after seeing results; changes need a new dated batch.

Tools: [consent template](field-validation-consent.md), [session log template](field-validation-sessions.csv), and a tally script (`cd web && npm run tally -- ../docs/field-validation-sessions.csv`) that applies the criteria below mechanically.

## Question being tested

Do qualified sellers agree that the teaser's specific diagnosis describes a real weakness in their own pitch, and would they pay for the fuller report?

This does not test whether rewrites improve reply rates. Do not claim it does.

## Setup (decide first)

- **Niche (locked):** outbound lead-generation agencies.
- **Qualified prospect:** owns or sells for a B2B service business, offer roughly $2,000-$10,000/month, currently or recently using cold email, has a real pitch they will share.
- **Sample:** about 20 prospects. Aim for no more than 5 from one referral network.
- **Consent:** each person agrees, in writing, to how the pitch is used. Default: used for this session only, then deleted. Keeping it in the labeled evaluation set needs separate, explicit opt-in. Remove names, domains and contact details.
- **Format:** run the prototype on their real pitch, show the teaser, ask the questions below. The prototype is rules-based, so results measure the teaser format and heuristics, not a future model.

## Record per session

| Field | Values |
|---|---|
| id, date, niche fit (Y/N) | |
| Pitch had context fields filled | Y/N |
| Killing sentence shown, or "none identified" | |
| **Q1** Is the flagged sentence a real weakness in your pitch? | agree / partly / disagree |
| **Q2** Is the diagnosed flaw the main problem, or a different one? | main / secondary / wrong |
| **Q3** Was anything in the teaser wrong or unfair? (free text, verbatim) | |
| **Q4** Does the evidence-gap note match what you did and did not supply? | Y/N |
| **Q5** Would you pay for the full report at the stated price? Ask before showing the price, then at $19, then ask what they would expect it to contain. | no / maybe / yes |
| Pre-payment action | e.g. asked to see the report, offered a card, nothing |
| Consent to keep de-identified pitch for evaluation | Y/N |

Treat stated "would pay" as weak evidence. Count a card or pre-order as stronger, if you offer one (needs your approval, since it involves real money).

## Stop/go criteria (locked)

Counted over completed sessions with qualified prospects only.

- **Go to Milestone 3** if all hold:
  - Q1 "agree" is at least 60% of sessions, and "disagree" is at most 20%.
  - Q2 "main" or "secondary" is at least 60%.
  - At least 6 of 20 say "yes" to paying, and at least 3 take a concrete pre-payment action.
  - No recurring factual error in the teaser (the same wrong claim in 3 or more sessions).
- **Stop or rethink** if Q1 "agree" is under 35%, or fewer than 3 say "yes" to paying.
- **In between:** change the diagnostic or the audience, then run a new batch of 10 with the criteria unchanged.

If fewer than 15 qualified sessions are completed, report results as inconclusive rather than applying the thresholds.

## Known prototype limits to watch for

Earlier reviews found heuristic weaknesses (generic words, prices and market percentages counted as proof; over-eager meeting flag; fixed flaw priority; context ignored; bland no-match note; buzzword pitches missed). They are fixed in [analyze-pitch.ts](../web/src/lib/analyze-pitch.ts), so these sessions test the updated rules. Remaining limits to log, not fix, during the study:

- The buyer check is plain word matching and misses paraphrases ("dentists" vs "dental").
- Scoring weights and the buzzword list are judgment calls, not measured on real pitches.
- Tone problems (for example insulting the prospect's site) cannot be detected by rules.
- Only one flaw is shown, so a "main / secondary / wrong" answer in Q2 is important.
- Desired next step and pilot or risk-reversal terms are not collected yet.

## After the sessions

1. Tally against the criteria and write the result here (go, stop, or in between), with the raw counts.
2. List the most common disagreement reasons from Q3.
3. Save consented, de-identified pitches with the labels as the start of the evaluation set Milestone 3 requires.
4. Review with the team before starting Milestone 3. Inference spend requires explicit approval.

## Result

Not yet run. Fill in after the sessions: counts, decision, top disagreement reasons.

## Logging notes for the tally

Use the CSV columns exactly. `q1`: agree/partly/disagree. `q2`: main/secondary/wrong. `q5`: no/maybe/yes. `qualified` and `consent_keep`: Y/N. `pre_payment_action`: blank or `none` if nothing. `factual_error_tag`: a short label (for example `proof-false-positive`) when the teaser said something factually wrong, else blank; three sessions with the same tag count as a recurring error. Do not put names, domains or pitch text in the CSV.

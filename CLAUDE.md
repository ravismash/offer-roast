# OfferRoast: project brief for Claude

This file is read at the start of every session in this folder. This is a FRESH project; nothing from earlier projects carries over except the lessons below.

## What it is (UNCONFIRMED: ask the owner to confirm or correct before building)

Working assumption, inferred from the name only: a web tool where you paste a job offer (offer letter or compensation details) and get a
blunt, funny-but-useful critique: red flags, what is missing, and what to ask for. Analysis runs in the browser so the offer never leaves the user's machine.

First thing to do in a new session: confirm the concept, the audience and the tone with the owner. Do not assume the details above are right.

## Lessons carried over from a previous project (n8n Triage), because they were expensive to learn

1. **Validate demand before building a product shell.** The previous project was well engineered and still had unproven demand. Do the cheap human test first
   (show real outputs to about 20 real people, record who says "that was useful"), and set kill criteria in advance.
2. **Measure on real data, not examples you wrote.** Hand-made fixtures gave 100% and real threads gave far less. Keep a labelled set of real cases from day one.
3. **Deterministic first, AI optional and gated.** Rules are cheap, testable and predictable. If an LLM is used: opt-in, grounded (every claim must quote text that
   really appears in the user's input), and never present its confidence as meaningful without measuring it.
4. **Privacy is the product when the input is sensitive.** Offers contain pay and personal details. Process locally where possible, never log content, say plainly what leaves the device.
5. **Verify claims against primary sources.** Do not state market salary ranges, legal rules or norms without a source. This is critique and negotiation help, not legal or financial advice.
6. **Test like an adversary.** Mutation-check the tests (break the code on purpose), fuzz the parser, and run CI on a different OS early. A CI run exposed a real DoS-cost bug that the laptop hid.
7. **Be honest in the UI.** Say what it does not know. A wrong confident answer is worse than "not sure".
8. **Scope discipline.** Build the smallest thing that can be shown to a real person; resist adding features before that test.

## Working agreements

- Ask before: pushing to a remote, deploying, spending money on APIs, or publishing anything.
- Never commit secrets; keep keys in git-ignored `.env.local`.
- Commit in small logical commits with a clear message.
- Keep a short `README.md` (what, how to run, status) and update it as things change.

export type PitchInput = {
  pitch: string;
  buyer: string;
  offer: string;
  dealSize: string;
  proofContext: string;
};

export type PitchAnalysis = {
  issue: string;
  killingSentence: string | null;
  buyerMonologue: string;
  evidenceGap: string;
  strength: string | null;
};

type Candidate = {
  issue: string;
  monologue: string;
  score: number;
  sentence: string | null;
};

const claimPattern = /\b(guarantee(?:d|s)?|double|triple|10x|(?:increase|boost) .+ by \d+%)/i;
const capabilityPattern = /\b(we are|we help|we offer|we provide|our agency|our team|our services)\b/i;
const meetingPattern =
  /\b(?:book|schedule|set up|hop on|jump on)\b[^.!?\n]{0,30}\b(?:call|meeting|demo|chat)\b|\b(?:quick|discovery|intro|\d+[- ]minute)\s+(?:call|chat|meeting)\b/i;

// A proof cue must be a concrete result or an explicit case-study reference. A bare price ("$297/mo"),
// a market claim ("30-50%") or generic words such as "customers" do not count: a figure only counts
// when a result verb sits next to it.
const resultVerbs = "increased|reduced|grew|generated|cut|saved|booked|added|lifted|improved|drove|closed|won|delivered";
const proofPattern = new RegExp(
  String.raw`\b(?:case stud(?:y|ies)|client results?)\b|\b(?:${resultVerbs})\b[^.!?\n]{0,40}\d`,
  "i",
);
const buzzwordPattern =
  /\b(ai-powered|leverag(?:e|es|ing)|machine learning|cutting-edge|state-of-the-art|best-in-class|end-to-end|game-changing|revolutionary|innovative|synerg\w*)\b/i;

const fieldLabels: Array<[keyof PitchInput, string]> = [
  ["buyer", "target buyer"],
  ["offer", "offer"],
  ["dealSize", "deal size"],
  ["proofContext", "proof"],
];

function getSentences(text: string): string[] {
  return (text.match(/[^.!?\n]+(?:[.!?]+|$)/g) ?? [])
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function getQuotedFragment(sentence: string): string {
  const words = sentence.match(/\S+/g) ?? [];
  if (words.length <= 25) return sentence;

  const end = sentence.match(/^(?:\S+\s*){1,25}/)?.[0].trimEnd().length;
  return end ? sentence.slice(0, end) : sentence;
}

function significantWords(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]{4,}/g) ?? []);
}

export function analyzePitch(input: PitchInput): PitchAnalysis {
  const sentences = getSentences(input.pitch);
  const hasProofInPitch = proofPattern.test(input.pitch);
  const hasProofContext = input.proofContext.trim().length > 0;
  const buyer = input.buyer.trim();
  const dealSize = input.dealSize.trim();

  const candidates: Candidate[] = [];
  sentences.forEach((sentence, index) => {
    if (claimPattern.test(sentence)) {
      candidates.push({
        sentence,
        issue: "A strong outcome claim needs visible proof or a clear qualification.",
        monologue: "That is a big promise. What would I be able to verify before believing it?",
        // Proof supplied only as context is not visible to the buyer in the pitch.
        score: hasProofInPitch ? 2 : hasProofContext ? 3.5 : 5,
      });
    }
    if (capabilityPattern.test(sentence)) {
      candidates.push({
        sentence,
        issue: "The pitch leads with your capabilities before making the buyer's outcome clear.",
        monologue: "I can see what you do, but not yet why it matters to my business.",
        score: index === 0 ? 4 : 3,
      });
    }
    if (buzzwordPattern.test(sentence)) {
      candidates.push({
        sentence,
        issue: "Buzzwords stand in for a concrete outcome the buyer can picture.",
        monologue: "That is a lot of jargon and no result I can check.",
        score: index === 0 ? 3.5 : 2.5,
      });
    }
    // A meeting ask backed by a concrete proof cue is not treated as premature.
    if (meetingPattern.test(sentence) && !hasProofInPitch) {
      candidates.push({
        sentence,
        issue: "The pitch asks for meeting time before establishing enough value to earn it.",
        monologue: "You're asking for time before showing me a concrete reason to take the meeting.",
        score: 3,
      });
    }
  });

  if (buyer) {
    const pitchWords = new Set(significantWords(input.pitch));
    const buyerWords = significantWords(buyer);
    if (buyerWords.length > 0 && !buyerWords.some((word) => pitchWords.has(word))) {
      candidates.push({
        sentence: null,
        issue: `Nothing in the pitch visibly refers to the buyer you described (${buyer}).`,
        monologue: "This could have been sent to anyone. Why me?",
        score: 3.5,
      });
    }
  }

  const top = [...candidates].sort((first, second) => second.score - first.score)[0];

  const missing = fieldLabels.filter(([key]) => !input[key].trim()).map(([, label]) => label);
  const dealNote = dealSize ? ` For the stated deal size (${dealSize}), a buyer would still need to see evidence they can check.` : "";
  let evidenceGap: string;
  if (hasProofInPitch) {
    evidenceGap = "The pitch contains a proof cue. Make sure the buyer can connect it to a specific, verifiable source.";
  } else if (hasProofContext) {
    evidenceGap = `Supporting proof was supplied as context, but no proof cue appears in the pitch itself.${dealNote}`;
  } else {
    evidenceGap = `No proof cue appears in the pitch, and no supporting proof was supplied in the context.${dealNote}`;
  }

  let issue: string;
  let buyerMonologue: string;
  if (top) {
    issue = missing.length < fieldLabels.length ? `${top.issue} Based on the context you supplied.` : top.issue;
    buyerMonologue = top.monologue;
  } else {
    issue =
      "No flaw was identified by the prototype's checks. That is not evidence the pitch is strong" +
      (missing.length ? `; missing context (${missing.join(", ")}) limits what can be assessed.` : ".");
    buyerMonologue = "I need more specific context before I can tell whether this is relevant.";
  }

  return {
    issue,
    killingSentence: top?.sentence ? getQuotedFragment(top.sentence) : null,
    buyerMonologue,
    evidenceGap,
    strength: hasProofInPitch
      ? "A concrete proof cue is present. Preserve it and make its source easy to verify."
      : null,
  };
}

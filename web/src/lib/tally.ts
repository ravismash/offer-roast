export type Decision = "go" | "stop" | "in-between" | "inconclusive";

export type Tally = {
  completed: number;
  agree: number;
  disagree: number;
  mainOrSecondary: number;
  yes: number;
  actions: number;
  recurringErrors: string[];
  decision: Decision;
  reasons: string[];
};

// Thresholds are locked in docs/field-validation.md. Change only with a new dated batch.
export const CRITERIA = {
  minSessions: 15,
  goAgreeShare: 0.6,
  goDisagreeMax: 0.2,
  goMainOrSecondaryShare: 0.6,
  goYes: 6,
  goActions: 3,
  stopAgreeBelow: 0.35,
  stopYesBelow: 3,
  recurringErrorCount: 3,
} as const;

export function parseCsv(text: string): Array<Record<string, string>> {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);

  const [header, ...body] = rows;
  if (!header) return [];
  const keys = header.map((key) => key.trim());
  return body.map((values) => Object.fromEntries(keys.map((key, index) => [key, (values[index] ?? "").trim()])));
}

const norm = (value: string | undefined) => (value ?? "").trim().toLowerCase();

export function tally(records: Array<Record<string, string>>): Tally {
  const sessions = records.filter((record) => norm(record.qualified) === "y");
  const n = sessions.length;
  const count = (predicate: (record: Record<string, string>) => boolean) => sessions.filter(predicate).length;

  const agree = count((r) => norm(r.q1) === "agree");
  const disagree = count((r) => norm(r.q1) === "disagree");
  const mainOrSecondary = count((r) => ["main", "secondary"].includes(norm(r.q2)));
  const yes = count((r) => norm(r.q5) === "yes");
  const actions = count((r) => norm(r.pre_payment_action) !== "" && norm(r.pre_payment_action) !== "none");

  const tagCounts = new Map<string, number>();
  for (const record of sessions) {
    const tag = norm(record.factual_error_tag);
    if (tag) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
  }
  const recurringErrors = [...tagCounts].filter(([, c]) => c >= CRITERIA.recurringErrorCount).map(([tag]) => tag);

  const reasons: string[] = [];
  let decision: Decision;
  if (n < CRITERIA.minSessions) {
    decision = "inconclusive";
    reasons.push(`Only ${n} qualified sessions; at least ${CRITERIA.minSessions} are needed to apply the thresholds.`);
  } else if (agree / n < CRITERIA.stopAgreeBelow || yes < CRITERIA.stopYesBelow) {
    decision = "stop";
    if (agree / n < CRITERIA.stopAgreeBelow) reasons.push("Q1 agree is below the stop line.");
    if (yes < CRITERIA.stopYesBelow) reasons.push("Too few 'yes' to paying.");
  } else {
    const checks: Array<[boolean, string]> = [
      [agree / n >= CRITERIA.goAgreeShare, "Q1 agree share"],
      [disagree / n <= CRITERIA.goDisagreeMax, "Q1 disagree share"],
      [mainOrSecondary / n >= CRITERIA.goMainOrSecondaryShare, "Q2 main-or-secondary share"],
      [yes >= CRITERIA.goYes, "'yes' to paying count"],
      [actions >= CRITERIA.goActions, "pre-payment action count"],
      [recurringErrors.length === 0, "no recurring factual error"],
    ];
    const failed = checks.filter(([pass]) => !pass).map(([, label]) => label);
    decision = failed.length === 0 ? "go" : "in-between";
    for (const label of failed) reasons.push(`Not met: ${label}.`);
  }

  return { completed: n, agree, disagree, mainOrSecondary, yes, actions, recurringErrors, decision, reasons };
}

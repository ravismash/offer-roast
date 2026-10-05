import { describe, expect, it } from "vitest";
import { parseCsv, tally } from "./tally.ts";

type Row = Record<string, string>;
const session = (over: Row = {}): Row => ({
  qualified: "Y", q1: "agree", q2: "main", q5: "no", pre_payment_action: "", factual_error_tag: "", ...over,
});
const batch = (n: number, over: (i: number) => Row): Row[] => Array.from({ length: n }, (_, i) => session(over(i)));

describe("parseCsv", () => {
  it("handles quoted commas, quotes and CRLF", () => {
    const rows = parseCsv('id,q3_notes\r\n1,"said ""no"", twice"\r\n2,plain\r\n');
    expect(rows).toEqual([{ id: "1", q3_notes: 'said "no", twice' }, { id: "2", q3_notes: "plain" }]);
  });

  it("returns nothing for an empty or header-only file", () => {
    expect(parseCsv("")).toEqual([]);
    expect(parseCsv("id,qualified\n")).toEqual([]);
  });
});

describe("tally", () => {
  it("is inconclusive under 15 qualified sessions, ignoring unqualified ones", () => {
    const rows = [...batch(14, () => ({})), ...batch(10, () => ({ qualified: "N" }))];
    const result = tally(rows);
    expect(result.completed).toBe(14);
    expect(result.decision).toBe("inconclusive");
  });

  it("returns go when every criterion holds", () => {
    const rows = batch(20, (i) => ({ q5: i < 6 ? "yes" : "no", pre_payment_action: i < 3 ? "offered card" : "none" }));
    expect(tally(rows).decision).toBe("go");
  });

  it("returns stop when agreement is below 35%", () => {
    const rows = batch(20, (i) => ({ q1: i < 6 ? "agree" : "disagree", q5: "yes" }));
    expect(tally(rows).decision).toBe("stop");
  });

  it("returns stop when fewer than 3 would pay", () => {
    const rows = batch(20, (i) => ({ q5: i < 2 ? "yes" : "maybe" }));
    expect(tally(rows).decision).toBe("stop");
  });

  it("returns in-between and names the unmet criterion", () => {
    const rows = batch(20, (i) => ({ q5: i < 6 ? "yes" : "no", pre_payment_action: i < 2 ? "asked for report" : "" }));
    const result = tally(rows);
    expect(result.decision).toBe("in-between");
    expect(result.reasons.join(" ")).toMatch(/pre-payment action/);
  });

  it("blocks go on a recurring factual error (3 sessions, same tag)", () => {
    const rows = batch(20, (i) => ({
      q5: i < 6 ? "yes" : "no",
      pre_payment_action: i < 3 ? "card" : "",
      factual_error_tag: i < 3 ? "Proof-False-Positive" : "",
    }));
    const result = tally(rows);
    expect(result.recurringErrors).toEqual(["proof-false-positive"]);
    expect(result.decision).toBe("in-between");
  });
});

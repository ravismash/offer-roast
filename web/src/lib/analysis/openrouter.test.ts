import { describe, expect, it, vi } from "vitest";
import { ProviderBusyError } from "./errors.ts";
import { createOpenRouterGenerate } from "./openrouter.ts";
import { withFallback } from "./provider.ts";

const input = { pitch: "We help B2B firms grow. Book a call.", buyer: "", offer: "", dealSize: "", proofContext: "" };
const reply = (status: number, body: unknown) => vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));

describe("createOpenRouterGenerate", () => {
  it("parses the JSON message content and sends auth, schema, low temperature and the untrusted-data prompt", async () => {
    const fetchMock = reply(200, { choices: [{ message: { content: '{"a":1}' } }] });
    expect(await createOpenRouterGenerate("sk-test", fetchMock)(input)).toEqual({ a: 1 });
    const [url, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body);
    expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(init.headers.Authorization).toBe("Bearer sk-test");
    expect(body.temperature).toBe(0.2);
    expect(body.response_format.json_schema.strict).toBe(true);
    expect(body.messages[0].content).toMatch(/untrusted data/i);
    expect(JSON.parse(body.messages[1].content).pitch).toBe(input.pitch);
  });

  it("maps 429, 402 and 503 to ProviderBusyError", async () => {
    for (const status of [429, 402, 503]) {
      await expect(createOpenRouterGenerate("k", reply(status, {}))(input)).rejects.toBeInstanceOf(ProviderBusyError);
    }
  });

  it("throws a fixed error for other failures without leaking the body or key", async () => {
    const error = await createOpenRouterGenerate("sk-secret", reply(500, { echo: input.pitch }))(input).catch((e: unknown) => e);
    expect(String(error)).not.toMatch(/sk-secret|We help/);
  });

  it("yields null (later rejected as malformed) when the message is missing", async () => {
    expect(await createOpenRouterGenerate("k", reply(200, { choices: [] }))(input)).toBeNull();
  });
});

describe("withFallback", () => {
  const busy = () => vi.fn().mockRejectedValue(new ProviderBusyError());

  it("uses the first provider when it works and never calls the second", async () => {
    const first = vi.fn().mockResolvedValue("one");
    const second = vi.fn();
    expect(await withFallback([first, second])!(input)).toBe("one");
    expect(second).not.toHaveBeenCalled();
  });

  it("falls over to the next provider when the first is busy", async () => {
    const second = vi.fn().mockResolvedValue("two");
    expect(await withFallback([busy(), second])!(input)).toBe("two");
  });

  it("does not fall over on a non-busy error", async () => {
    const second = vi.fn();
    await expect(withFallback([vi.fn().mockRejectedValue(new Error("x")), second])!(input)).rejects.toThrow("x");
    expect(second).not.toHaveBeenCalled();
  });

  it("reports busy when every provider is busy, and returns undefined when none are configured", async () => {
    await expect(withFallback([busy(), busy()])!(input)).rejects.toBeInstanceOf(ProviderBusyError);
    expect(withFallback([])).toBeUndefined();
  });
});

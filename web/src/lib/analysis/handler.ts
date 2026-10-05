import { generateGroundedTeaser } from "./grounding.ts";
import type { Generate } from "./gemini.ts";
import { MAX_BODY_BYTES, analyzeRequestSchema } from "./request-schema.ts";

export type HandlerDeps = {
  // Undefined when the server has no key configured.
  generate: Generate | undefined;
  newId: () => string;
};

const headers = { "Cache-Control": "private, no-store" };
const fail = (status: number, error: string) => Response.json({ error }, { status, headers });

// Never logs or echoes pitch text, model output, or keys. Error bodies are fixed strings.
export async function handleAnalyze(request: Request, deps: HandlerDeps): Promise<Response> {
  if (!deps.generate) return fail(500, "not_configured");

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) return fail(413, "too_large");

  // Content-Length can be absent or wrong, so also bound the bytes actually read.
  const body = await readBounded(request, MAX_BODY_BYTES);
  if (body === null) return fail(413, "too_large");

  let json: unknown;
  try {
    json = JSON.parse(body);
  } catch {
    return fail(400, "invalid_request");
  }
  const parsed = analyzeRequestSchema.safeParse(json);
  if (!parsed.success) return fail(400, "invalid_request");

  const input = parsed.data;
  const supplied = [input.buyer, input.offer, input.dealSize, input.proofContext];
  const result = await generateGroundedTeaser(input.pitch, () => deps.generate!(input), 2, supplied);
  if (!result.ok) {
    return result.reason === "provider-busy" ? fail(503, "provider_busy") : fail(502, "analysis_failed");
  }

  // Explicit DTO: nothing but these two fields leaves the server.
  return Response.json({ analysisId: deps.newId(), freeTeaser: result.teaser }, { headers });
}

async function readBounded(request: Request, max: number): Promise<string | null> {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

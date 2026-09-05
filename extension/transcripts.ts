import { createReadStream } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, join, resolve } from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

const MAX_SCAN_BYTES = 32 * 1024 * 1024;
const MAX_LINE_BYTES = 1024 * 1024;
const MARKER = "\n[truncated]\n";
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const sessionRoot = (): string => process.env.PI_CODING_AGENT_SESSION_DIR ??
  join(process.env.PI_CODING_AGENT_DIR ?? join(homedir(), ".pi", "agent"), "sessions");

interface Budget { remaining: number; truncated: boolean }

async function* readEntries(path: string, budget: Budget, signal?: AbortSignal) {
  let pending = Buffer.alloc(0);
  const stream = createReadStream(path, { highWaterMark: 16 * 1024, signal });
  try {
    for await (const chunk of stream) {
      budget.remaining -= chunk.length;
      if (budget.remaining < 0) { budget.truncated = true; return; }
      pending = Buffer.concat([pending, chunk]);
      let end: number;
      while ((end = pending.indexOf(10)) >= 0) {
        const line = pending.subarray(0, end).toString("utf8");
        pending = pending.subarray(end + 1);
        try {
          const entry: unknown = JSON.parse(line);
          if (isRecord(entry)) yield entry;
        } catch { /* A crashed session can leave an incomplete entry. */ }
      }
      if (pending.length > MAX_LINE_BYTES) { budget.truncated = true; return; }
    }
    if (pending.length) {
      try {
        const entry: unknown = JSON.parse(pending.toString("utf8"));
        if (isRecord(entry)) yield entry;
      } catch { /* Ignore an incomplete trailing entry. */ }
    }
  } finally {
    stream.destroy();
  }
}

async function sessionFiles() {
  const root = sessionRoot();
  const files: { file: string; modified: number }[] = [];
  const add = async (dir: string) => {
    for (const entry of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
      if (!entry.isFile() || !entry.name.endsWith(".jsonl")) continue;
      const file = join(dir, entry.name);
      const info = await stat(file).catch(() => undefined);
      if (info) files.push({ file, modified: info.mtimeMs });
    }
  };
  await add(root);
  for (const entry of await readdir(root, { withFileTypes: true }).catch(() => [])) {
    if (entry.isDirectory()) await add(join(root, entry.name));
  }
  return files.sort((a, b) => b.modified - a.modified || a.file.localeCompare(b.file));
}

function entryText(entry: Record<string, unknown>): string {
  if (!isRecord(entry.message)) return "";
  const content = entry.message.content;
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content.flatMap((part) => isRecord(part) && part.type === "text" && typeof part.text === "string" ? [part.text] : []).join("\n");
}

const bounded = (value: number | undefined, fallback: number, max: number): number =>
  value === undefined || !Number.isFinite(value) ? fallback : Math.min(max, Math.max(1, Math.floor(value)));
const textResult = (text: string) => ({ content: [{ type: "text" as const, text }], details: {} });

function boundedLines(lines: string[], maxBytes: number, truncated: boolean): string {
  const kept: string[] = [];
  let bytes = 0;
  for (const line of lines) {
    const size = Buffer.byteLength(line) + (kept.length ? 1 : 0);
    if (bytes + size > maxBytes - Buffer.byteLength(MARKER)) { truncated = true; break; }
    kept.push(line);
    bytes += size;
  }
  return kept.join("\n") + (truncated ? MARKER : "");
}

export function registerTranscriptTool(pi: ExtensionAPI): void {
  pi.registerTool({
    name: "pstack_transcripts",
    label: "Pstack transcripts",
    description: "List, read, or search current-project Pi transcripts, newest first, with byte and result bounds. Use projectPath only for another project the user authorized. Read supports offset pagination.",
    parameters: Type.Object({
      operation: Type.Union([Type.Literal("list"), Type.Literal("read"), Type.Literal("search")]),
      sessionId: Type.Optional(Type.String({ minLength: 1 })),
      query: Type.Optional(Type.String({ minLength: 1 })),
      limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 500 })),
      maxBytes: Type.Optional(Type.Integer({ minimum: 64, maximum: 1048576 })),
      offset: Type.Optional(Type.Integer({ minimum: 0 })),
      projectPath: Type.Optional(Type.String({ minLength: 1 })),
    }),
    async execute(_toolCallId, params, signal, _onUpdate, ctx: ExtensionContext) {
      const scope = resolve(ctx.cwd, params.projectPath ?? ".");
      const maxBytes = Math.max(64, bounded(params.maxBytes, 65536, 1048576));
      const budget: Budget = { remaining: MAX_SCAN_BYTES, truncated: false };
      const sessions: { file: string; header: Record<string, unknown> }[] = [];
      for (const { file } of await sessionFiles()) {
        if (budget.remaining <= 0) { budget.truncated = true; break; }
        try {
          for await (const header of readEntries(file, budget, signal)) {
            if (header.type === "session" && typeof header.cwd === "string" && resolve(header.cwd) === scope) sessions.push({ file, header });
            break;
          }
        } catch (error) { if (signal?.aborted) throw error; }
        if (params.operation === "list" && sessions.length >= bounded(params.limit, 10, 500)) break;
      }
      if (params.operation === "list") {
        const lines = sessions.map(({ file, header }) => JSON.stringify({ sessionId: header.id, cwd: header.cwd, timestamp: header.timestamp, file }));
        return textResult(boundedLines(lines.length ? lines : ["(no sessions in scope)"], maxBytes, budget.truncated));
      }
      if (params.operation === "read") {
        if (!params.sessionId) return textResult("read requires sessionId");
        const exact = sessions.filter(({ file, header }) => header.id === params.sessionId || basename(file) === params.sessionId);
        const matches = exact.length ? exact : sessions.filter(({ header }) => typeof header.id === "string" && header.id.startsWith(params.sessionId!));
        if (matches.length > 1) return textResult("ambiguous session id; use the full id from list");
        if (!matches[0]) return textResult(`session not found in scope: ${params.sessionId}`);
        const limit = bounded(params.limit, 200, 500);
        let out = "", bytes = 0, index = 0, count = 0;
        for await (const entry of readEntries(matches[0].file, budget, signal)) {
          if (index++ < (params.offset ?? 0)) continue;
          const line = JSON.stringify(entry) + "\n";
          const size = Buffer.byteLength(line);
          if (count++ >= limit || bytes + size > maxBytes - Buffer.byteLength(MARKER)) { budget.truncated = true; break; }
          out += line;
          bytes += size;
        }
        return textResult((out || "(empty session)") + (budget.truncated ? MARKER : ""));
      }
      if (!params.query) return textResult("search requires query");
      const hits: string[] = [];
      const limit = bounded(params.limit, 20, 500);
      for (const { file } of sessions) {
        for await (const entry of readEntries(file, budget, signal)) {
          const text = entryText(entry);
          const at = text.indexOf(params.query);
          if (at >= 0) hits.push(JSON.stringify({ file, id: entry.id ?? "", excerpt: text.slice(Math.max(0, at - 80), at + 220) }));
          if (hits.length >= limit) break;
        }
        if (hits.length >= limit || budget.truncated) break;
      }
      return textResult(boundedLines(hits.length ? hits : ["(no matches)"], maxBytes, budget.truncated));
    },
  });
}

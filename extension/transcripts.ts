import { readdir, readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

const agentDir = (): string =>
  process.env.PI_CODING_AGENT_DIR ?? join(homedir(), ".pi", "agent");

const sessionRoot = (): string =>
  process.env.PI_CODING_AGENT_SESSION_DIR ?? join(agentDir(), "sessions");

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const entryText = (entry: Record<string, unknown>): string => {
  const message = entry.message;
  if (!isRecord(message)) return "";
  const content = message.content;
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .flatMap((part) =>
      isRecord(part) && part.type === "text" && typeof part.text === "string" ? [part.text] : [],
    )
    .join("\n");
};

const readEntries = async (path: string): Promise<Record<string, unknown>[]> => {
  const lines = (await readFile(path, "utf8")).split("\n");
  const entries: Record<string, unknown>[] = [];
  for (const line of lines) {
    if (line.trim() === "") continue;
    try {
      const value: unknown = JSON.parse(line);
      if (isRecord(value)) entries.push(value);
    } catch {
      continue;
    }
  }
  return entries;
};

const sessionFiles = async (): Promise<string[]> => {
  const root = sessionRoot();
  const projects = await readdir(root).catch(() => []);
  const files: string[] = [];
  for (const project of projects) {
    const dir = join(root, project);
    if (!(await stat(dir).then((info) => info.isDirectory()).catch(() => false))) continue;
    for (const file of await readdir(dir).catch(() => [] as string[])) {
      if (file.endsWith(".jsonl")) files.push(join(dir, file));
    }
  }
  return files.sort();
};

const textResult = (text: string) => ({
  content: [{ type: "text" as const, text }],
  details: {},
});

export function registerTranscriptTool(pi: ExtensionAPI): void {
  pi.registerTool({
    name: "pstack_transcripts",
    label: "Pstack transcripts",
    description:
      "List, read, or search current-project PI session transcripts with bounds. " +
      "Defaults to the current project; pass an explicit projectPath only when " +
      "the user authorizes another project.",
    parameters: Type.Object({
      operation: Type.Union([Type.Literal("list"), Type.Literal("read"), Type.Literal("search")]),
      sessionId: Type.Optional(Type.String({ description: "Session id prefix or filename" })),
      query: Type.Optional(Type.String({ description: "Literal substring for search" })),
      limit: Type.Optional(Type.Number({ description: "Max sessions or matches (default 10)" })),
      maxBytes: Type.Optional(Type.Number({ description: "Max bytes for read (default 65536)" })),
      projectPath: Type.Optional(Type.String({ description: "Authorized non-current project path" })),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx: ExtensionContext) {
      const scope = params.projectPath ? resolve(params.projectPath) : ctx.cwd;
      const files = await sessionFiles();
      const inScope: { file: string; entries: Record<string, unknown>[] }[] = [];
      for (const file of files) {
        const entries = await readEntries(file).catch(() => []);
        const header = entries.find((entry) => entry.type === "session");
        const cwd = typeof header?.cwd === "string" ? header.cwd : "";
        if (!params.projectPath && cwd !== "" && resolve(cwd) !== resolve(scope)) continue;
        inScope.push({ file, entries });
      }
      if (params.operation === "list") {
        const limit = params.limit ?? 10;
        const rows = inScope.slice(-limit).map(({ file, entries }) => {
          const header = entries.find((entry) => entry.type === "session");
          const messages = entries.filter((entry) => entry.type === "message").length;
          return JSON.stringify({
            sessionId: typeof header?.id === "string" ? header.id : file,
            cwd: header?.cwd ?? "",
            timestamp: header?.timestamp ?? "",
            messages,
            file,
          });
        });
        return textResult(rows.join("\n") || "(no sessions in scope)");
      }
      if (params.operation === "read") {
        if (!params.sessionId) return textResult("read requires sessionId");
        const match = inScope.find(
          ({ file, entries }) =>
            file.includes(params.sessionId as string) ||
            entries.some((entry) => entry.type === "session" && String(entry.id).startsWith(params.sessionId as string)),
        );
        if (!match) return textResult(`session not found in scope: ${params.sessionId}`);
        const maxBytes = params.maxBytes ?? 65536;
        const limit = params.limit ?? 200;
        const picked = match.entries.slice(0, limit);
        let out = "";
        for (const entry of picked) {
          const line = JSON.stringify(entry);
          if (out.length + line.length + 1 > maxBytes) {
            out += `\n[truncated at ${maxBytes} bytes]`;
            break;
          }
          out += `${line}\n`;
        }
        return textResult(out || "(empty session)");
      }
      if (!params.query) return textResult("search requires query");
      const limit = params.limit ?? 20;
      const hits: string[] = [];
      for (const { file, entries } of inScope) {
        for (const entry of entries) {
          if (hits.length >= limit) break;
          const text = entryText(entry);
          if (text.includes(params.query)) {
            hits.push(JSON.stringify({ file, id: entry.id ?? "", excerpt: text.slice(0, 300) }));
          }
        }
        if (hits.length >= limit) break;
      }
      return textResult(hits.join("\n") || "(no matches)");
    },
  });
}

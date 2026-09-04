import { appendFile, mkdir, readFile, readdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

const memoryDir = (): string =>
  join(
    process.env.PI_CODING_AGENT_DIR ?? join(homedir(), ".pi", "agent"),
    "pstack",
    "memory",
  );

const memoryFile = (): string => join(memoryDir(), "MEMORY.md");

const todayFile = (): string => {
  const day = new Date().toISOString().slice(0, 10);
  return join(memoryDir(), "daily", `${day}.md`);
};

const ensureMemoryDir = async (): Promise<void> => {
  await mkdir(join(memoryDir(), "daily"), { recursive: true });
  try {
    await readFile(memoryFile(), "utf8");
  } catch {
    await appendFile(
      memoryFile(),
      "# Pstack memory\n\nDurable facts worth keeping across sessions. One line per fact.\n",
    );
  }
};

const grepFiles = async (files: string[], query: string): Promise<string[]> => {
  const hits: string[] = [];
  const needle = query.toLowerCase();
  for (const file of files) {
    const content = await readFile(file, "utf8").catch(() => "");
    for (const line of content.split("\n")) {
      if (line.toLowerCase().includes(needle)) hits.push(`${file}: ${line.trim()}`.slice(0, 300));
      if (hits.length >= 20) return hits;
    }
  }
  return hits;
};

const textResult = (text: string) => ({
  content: [{ type: "text" as const, text }],
  details: {},
});

export function registerMemoryTool(pi: ExtensionAPI): void {
  pi.registerTool({
    name: "pstack_memory",
    label: "Pstack memory",
    description:
      "Durable cross-session memory: remember one-line facts, append to today's log, " +
      "or recall by keyword across facts and logs. Prefer this over re-deriving stable facts.",
    parameters: Type.Object({
      action: Type.Union([Type.Literal("remember"), Type.Literal("log"), Type.Literal("recall")]),
      text: Type.Optional(Type.String({ description: "Fact or log line for remember/log" })),
      query: Type.Optional(Type.String({ description: "Keyword for recall" })),
    }),
    async execute(_toolCallId, params) {
      await ensureMemoryDir();
      if (params.action === "remember") {
        if (!params.text) return textResult("remember requires text");
        await appendFile(memoryFile(), `- ${params.text.trim()}\n`);
        return textResult("remembered");
      }
      if (params.action === "log") {
        if (!params.text) return textResult("log requires text");
        await appendFile(todayFile(), `- ${new Date().toISOString()} ${params.text.trim()}\n`);
        return textResult("logged");
      }
      if (!params.query) return textResult("recall requires query");
      const daily = await readdir(join(memoryDir(), "daily")).catch(() => [] as string[]);
      const files = [memoryFile(), ...daily.slice(-30).map((name) => join(memoryDir(), "daily", name))];
      const hits = await grepFiles(files, params.query);
      return textResult(hits.join("\n") || "(no matches)");
    },
  });
}

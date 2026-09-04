import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { registerMemoryTool } from "../extension/memory";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
  delete process.env.PI_CODING_AGENT_DIR;
});

type Handler = (toolCallId: string, params: Record<string, unknown>) => Promise<{ content: { text: string }[] }>;

const loadTool = async (): Promise<{ handler: Handler; home: string }> => {
  const home = await mkdtemp(join(tmpdir(), "pstack-memory-"));
  roots.push(home);
  process.env.PI_CODING_AGENT_DIR = join(home, "agent");
  let handler: Handler | undefined;
  registerMemoryTool({
    registerTool: (tool: { execute: Handler }) => {
      handler = tool.execute;
    },
  } as never);
  if (!handler) throw new Error("memory tool not registered");
  return { handler, home };
};

const textOf = (result: { content: { text: string }[] }): string =>
  result.content.map((part) => part.text).join("\n");

describe("pstack memory tool", () => {
  test("remember and recall round-trips a fact", async () => {
    const { handler, home } = await loadTool();
    expect(textOf(await handler("1", { action: "remember", text: "Atlas uses Postgres 16" }))).toBe("remembered");
    const found = textOf(await handler("2", { action: "recall", query: "postgres" }));
    expect(found).toContain("Atlas uses Postgres 16");
    const stored = await readFile(join(home, "agent", "pstack", "memory", "MEMORY.md"), "utf8");
    expect(stored).toContain("Atlas uses Postgres 16");
  });

  test("recall with no match reports empty, missing args fail closed", async () => {
    const { handler } = await loadTool();
    expect(textOf(await handler("1", { action: "recall", query: "zzz-nope" }))).toBe("(no matches)");
    expect(textOf(await handler("2", { action: "remember" }))).toBe("remember requires text");
    expect(textOf(await handler("3", { action: "recall" }))).toBe("recall requires query");
  });
});

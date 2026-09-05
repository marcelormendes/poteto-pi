import { afterEach, expect, test } from "bun:test";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { registerTranscriptTool } from "../extension/transcripts";

const roots: string[] = [];
const previousRoot = process.env.PI_CODING_AGENT_SESSION_DIR;
afterEach(async () => {
  if (previousRoot === undefined) delete process.env.PI_CODING_AGENT_SESSION_DIR;
  else process.env.PI_CODING_AGENT_SESSION_DIR = previousRoot;
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "pstack-transcripts-"));
  roots.push(root);
  process.env.PI_CODING_AGENT_SESSION_DIR = root;
  let execute: (...args: any[]) => Promise<any>;
  registerTranscriptTool({ registerTool: (tool: any) => { execute = tool.execute; } } as never);
  const add = async (id: string, cwd: string | undefined, text: string, flat = false) => {
    const dir = flat ? root : join(root, id);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, `${id}.jsonl`), [
      JSON.stringify({ type: "session", id, cwd, timestamp: "2026-09-04T00:00:00Z" }),
      JSON.stringify({ type: "message", id: `${id}-msg`, message: { role: "user", content: text } }),
    ].join("\n"));
  };
  const call = async (params: Record<string, unknown>) => {
    const result = await execute!("test", params, undefined, undefined, { cwd: "/project-a" });
    return result.content.map((part: { text: string }) => part.text).join("\n");
  };
  return { add, call };
}

test("explicit project scope excludes every other project and missing headers", async () => {
  const { add, call } = await fixture();
  await add("a", "/project-a", "needle A");
  await add("b", "/project-b", "needle B");
  await add("c", undefined, "needle unknown");
  const result = await call({ operation: "search", query: "needle", projectPath: "/project-b" });
  expect(result).toContain("needle B");
  expect(result).not.toContain("needle A");
  expect(result).not.toContain("needle unknown");
  expect(await call({ operation: "search", query: "needle" })).not.toContain("needle unknown");
});

test("flat session directories are supported and read ids must be unambiguous", async () => {
  const { add, call } = await fixture();
  await add("shared-one", "/project-a", "first", true);
  await add("shared-two", "/project-a", "second", true);
  expect(await call({ operation: "list" })).toContain("shared-one");
  expect(await call({ operation: "read", sessionId: "shared" })).toContain("ambiguous");
  expect(await call({ operation: "read", sessionId: "shared-two" })).toContain("second");
});

test("read respects a UTF-8 byte budget including its truncation marker", async () => {
  const { add, call } = await fixture();
  await add("unicode", "/project-a", "😀".repeat(500));
  const text = await call({ operation: "read", sessionId: "unicode", maxBytes: 240 });
  expect(Buffer.byteLength(text)).toBeLessThanOrEqual(240);
  expect(text).toContain("truncated");
});

test("list and search respect output byte bounds too", async () => {
  const { add, call } = await fixture();
  for (let i = 0; i < 5; i++) await add(`session-${i}`, "/project-a", "needle " + "😀".repeat(100));
  for (const operation of ["list", "search"]) {
    const text = await call({ operation, query: "needle", maxBytes: 240 });
    expect(Buffer.byteLength(text)).toBeLessThanOrEqual(240);
    expect(text).toContain("truncated");
  }
});

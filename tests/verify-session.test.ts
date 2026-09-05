import { expect, test } from "bun:test";
import pstack from "../extension/pstack";

function fixture() {
  const handlers = new Map<string, Function[]>();
  const commands = new Map<string, any>();
  const tools = new Map<string, any>();
  let entries: any[] = [];
  const pi = {
    registerTool: (tool: any) => tools.set(tool.name, tool),
    registerCommand: (name: string, command: any) => commands.set(name, command),
    on: (name: string, handler: Function) => handlers.set(name, [...(handlers.get(name) ?? []), handler]),
    appendEntry: (customType: string, data: unknown) => entries.push({ type: "custom", customType, data }),
  };
  const ctx = { sessionManager: { getBranch: () => entries }, ui: { notify: () => {} } };
  pstack(pi as never);
  const event = async (name: string, value: unknown = {}) => {
    const results = [];
    for (const handler of handlers.get(name) ?? []) results.push(await handler(value, ctx));
    return results;
  };
  return { commands, tools, ctx, event, entries, setEntries: (next: any[]) => { entries = next; } };
}

test("mode follows the active session branch across resume and new sessions", async () => {
  const f = fixture();
  await f.commands.get("pstack-mode").handler("off", f.ctx);
  await f.event("session_start", { reason: "resume" });
  expect((await f.event("before_agent_start", { systemPrompt: "base" })).every((r) => r === undefined)).toBe(true);
  f.setEntries([]);
  await f.event("session_start", { reason: "new" });
  expect((await f.event("before_agent_start", { systemPrompt: "base" })).some((r) => r?.message)).toBe(true);
  f.setEntries([{ type: "custom", customType: "dev.poteto-pi.mode", data: { enabled: false } }]);
  await f.event("session_tree");
  expect((await f.event("before_agent_start", { systemPrompt: "base" })).every((r) => r === undefined)).toBe(true);
});

test("compaction restores routing instructions and todos survive reload without leaking into new sessions", async () => {
  const f = fixture();
  await f.event("session_start");
  await f.event("before_agent_start", { systemPrompt: "base" });
  await f.event("session_compact");
  expect((await f.event("before_agent_start", { systemPrompt: "base" })).some((r) => r?.message)).toBe(true);
  const todo = f.tools.get("pstack_todo");
  await todo.execute("1", { action: "set", items: ["prove behavior"] });
  await todo.execute("2", { action: "check", index: 0 });
  await f.event("session_start", { reason: "reload" });
  expect((await todo.execute("3", { action: "get" })).content[0].text).toContain("[x] 0: prove behavior");
  f.setEntries([]);
  await f.event("session_start", { reason: "new" });
  expect((await todo.execute("4", { action: "get" })).content[0].text).toBe("(empty todo)");
});

test("checking one todo does not replay a long playbook into model context", async () => {
  const f = fixture();
  const todo = f.tools.get("pstack_todo");
  await todo.execute("1", { action: "set", items: ["prove behavior", "long playbook instruction ".repeat(200)] });
  const result = await todo.execute("2", { action: "check", index: 0 });
  expect(result.content[0].text.length).toBeLessThan(100);
  expect((await todo.execute("3", { action: "get" })).content[0].text).toContain("[x] 0: prove behavior");
});

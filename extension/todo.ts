import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

interface TodoItem {
  text: string;
  done: boolean;
}
const TODO_ENTRY = "dev.poteto-pi.todo";

export function registerTodoTool(pi: ExtensionAPI): void {
  let items: TodoItem[] = [];
  const restore = (_event: unknown, ctx: ExtensionContext) => {
    items = [];
    for (const entry of ctx.sessionManager.getBranch()) {
      if (entry.type === "custom" && entry.customType === TODO_ENTRY && Array.isArray(entry.data)) {
        items = entry.data.filter((item): item is TodoItem =>
          typeof item === "object" && item !== null && typeof item.text === "string" && typeof item.done === "boolean",
        ).map((item) => ({ ...item }));
      }
    }
  };
  pi.on("session_start", restore);
  pi.on("session_tree", restore);
  pi.registerTool({
    name: "pstack_todo",
    label: "Pstack todo",
    description:
      "Session-scoped todo list for multi-step pstack work. Set the full list " +
      "up front, check items as they complete, read to review. Keep items short; " +
      "the first item of a playbook run names the playbook being followed.",
    parameters: Type.Object({
      action: Type.Union([Type.Literal("set"), Type.Literal("get"), Type.Literal("check")]),
      items: Type.Optional(Type.Array(Type.String())),
      index: Type.Optional(Type.Integer({ minimum: 0, description: "Zero-based item for check" })),
    }),
    async execute(_toolCallId, params) {
      if (params.action === "set") {
        items = (params.items ?? []).map((text) => ({ text, done: false }));
      } else if (params.action === "check") {
        const item = params.index === undefined ? undefined : items[params.index];
        if (!item) {
          return { content: [{ type: "text" as const, text: `no todo at index ${params.index}` }], details: {} };
        }
        item.done = true;
      }
      if (params.action !== "get") pi.appendEntry(TODO_ENTRY, items.map((item) => ({ ...item })));
      if (params.action === "check") {
        const done = items.filter((item) => item.done).length;
        return { content: [{ type: "text" as const, text: `Checked todo ${params.index}. ${done}/${items.length} complete.` }], details: {} };
      }
      const lines = items.map((item, index) => `${item.done ? "[x]" : "[ ]"} ${index}: ${item.text}`);
      return { content: [{ type: "text" as const, text: lines.join("\n") || "(empty todo)" }], details: {} };
    },
  });
}

import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { registerTodoTool } from "./todo";
import { registerTranscriptTool } from "./transcripts";
import { registerMemoryTool } from "./memory";
import { COMPANION_PINS, checkCompanionUpdates } from "./update-check";
import { verifyGuardrails } from "./setup-settings";

const MODE_ENTRY = "dev.poteto-pi.mode";
const ROUTER_ENTRY = "dev.poteto-pi.router";

const REMINDER =
  "Pstack mode is on. Route the goal to the narrowest specialist skill, then invoke it via /skill:name. Panels run as numbered subagent passes; verify against the real surface.";

const FULL_ROUTER = `# Pstack routing contract (PI edition)

Pstack mode is enabled. Interpret the user's natural-language goal semantically
and select the installed specialist skill that best fits, then invoke it
explicitly via /skill:name (models do not reliably self-load skills).
Manual slash commands are overrides, not a prerequisite.

## Runtime invariants

- Panels run as parallel subagent passes over "pstack-*" role agents with
  explicit per-run models. Without the "subagent" tool, fall back to
  numbered sequential passes, one per role, switching the session model
  between passes.
- Writers run isolated: pass "worktree: true" plus a gate, and merge only
  the selected result with user confirmation. Readers omit the flag.
- Blind parallel candidates as Candidate A/B/C; never name models in
  shared artifacts. Cross-judge on a contrasting model family.
- Verify every claim against the real surface (commands run, files read,
  transcripts inspected). Report evidence, not assertions.

## Specialist skills

- how: evidence-first explanation with parallel explorer and critic passes
- why: source-control and repository investigation with epistemic prefixes
- architect: competing designs from caller usage, then one implementation
- arena: parallel candidates in git worktrees, blinded adjudication
- swarm: parallel disjoint slices with a merge contract
- interrogate: identical evidence and rubric per reviewer pass
- reflect: tooling, judgment, and divergent lenses, then synthesis
- recall / show-me-your-work: transcript evidence via the pstack transcripts tool

## Role to model mapping (defaults, override in ~/.pi/agent/pstack/models.md)

- exploration, investigation, swarm, feature, refactor: fast local default
- explanation, synthesis, judgment, hardest: strongest reasoning model
- critics and judges: a different family from the author whenever available
`;

export default function pstackPi(pi: ExtensionAPI): void {
  let enabled = true;
  let routerSent = false;
  registerTodoTool(pi);
  registerTranscriptTool(pi);
  registerMemoryTool(pi);

  pi.registerCommand("pstack-mode", {
    description: "Toggle pstack automatic routing for this session (on|off|status)",
    handler: async (args, ctx) => {
      const action = (args ?? "status").trim().toLowerCase();
      if (action === "on" || action === "off") {
        enabled = action === "on";
        pi.appendEntry(MODE_ENTRY, { enabled });
        ctx.ui.notify(`Pstack mode ${action} for this session.`, "info");
      } else {
        ctx.ui.notify(`Pstack mode is ${enabled ? "on" : "off"}.`, "info");
      }
    },
  });

  pi.registerCommand("pstack-status", {
    description: "Show pstack mode, guardrails, and router state",
    handler: async (_args, ctx) => {
      const agentDir = process.env.PI_CODING_AGENT_DIR ?? join(homedir(), ".pi", "agent");
      const readJson = async (path: string): Promise<unknown> => {
        try {
          return JSON.parse(await readFile(path, "utf8")) as unknown;
        } catch {
          return {};
        }
      };
      const findings = verifyGuardrails({
        piSettings: await readJson(join(agentDir, "settings.json")),
        extensionConfig: await readJson(join(agentDir, "extensions", "subagent", "config.json")),
      });
      const updates = await checkCompanionUpdates(undefined, COMPANION_PINS);
      const updateLine =
        updates.stale.length === 0
          ? `Companions: up to date${updates.checkedAt ? "" : " (offline check)"}`
          : `Updates available: ${updates.stale.join(", ")} — pi install <name>@latest`;
      const lines = [
        `Pstack status: ${!enabled ? "off" : findings.length === 0 ? "clean" : "drift detected"}`,
        `Router: ${routerSent ? "loaded" : "pending"}`,
        ...(findings.length === 0
          ? ["Guardrails: 6 adapters disabled, no global worktree default, depth >= 2"]
          : findings.map((finding) => `Missing: ${finding.where} ${finding.key} (need ${finding.expected})`)),
        updateLine,
      ];
      ctx.ui.notify(lines.join("\n"), findings.length === 0 ? "info" : "error");
    },
  });

  pi.on("session_start", async () => {
    routerSent = false;
  });

  pi.on("before_agent_start", async (event) => {
    if (!enabled) return;
    if (!routerSent) {
      routerSent = true;
      pi.appendEntry(ROUTER_ENTRY, { at: Date.now() });
      return {
        message: {
          customType: ROUTER_ENTRY,
          content: FULL_ROUTER,
          display: false,
          details: {},
        },
        systemPrompt: `${event.systemPrompt}\n\n${REMINDER}`,
      };
    }
    return { systemPrompt: `${event.systemPrompt}\n\n${REMINDER}` };
  });
}

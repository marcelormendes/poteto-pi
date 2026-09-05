---
name: setup-pstack
description: Configure pstack's local Pi companions and model roles, smoke-test the selected models, and verify delegation. Use for /setup-pstack or changing pstack's model choices.
---

# Setup pstack

Resolve the Pi agent directory from `PI_CODING_AGENT_DIR`, defaulting to
`~/.pi/agent`. All paths below are relative to that directory. Never write
the default home when the environment selects another configuration.

## 1. Install the local delegation runtime

Run `pi list`. Install missing companions with these exact sources:

- Required for delegation: `npm:pi-subagents@0.64.0`.
- Optional for MCP evidence: `npm:pi-mcp-adapter@2.32.1`.
- Optional for goal runs: `npm:@narumitw/pi-goal@0.54.4`.
- Optional for web research: `npm:pi-web-access@0.27.0`.

Use `pi install <source>`. Preserve installed copies and unrelated
packages. A request to set up pstack authorizes the required companion;
install optional companions when the user requested them. If an extension
was installed during this session, reload Pi before testing its tools.
Do not smoke-test subagents before the `subagent` tool is available.

## 2. Detect models and choose roles

Run `pi --list-models` and read `pstack/models.md` if it exists. Catalog
rows give `provider/model` selectors; availability does not prove auth.
Use only models from the user's authorized providers. Preserve current
choices unless the user asked to replace them.

Choose a fast model for mechanical work and exploration, a strong model
for judgment and difficult work, and contrasting families for panels.
Present one proposed table for confirmation when choices are unspecified.
If the user already named models, accepted defaults, or authorized you to
choose, use that instruction without asking again. Do not ask separately
for every role.

Write one selector per scalar role, or a comma-separated list per panel:

| Role label | Kind |
|---|---|
| feature, refactoring | scalar |
| bug-fix | scalar |
| perf-issue | scalar |
| hillclimb | scalar |
| judgment and prose | scalar |
| hardest tasks | scalar |
| how explorer | scalar |
| how explainer | scalar |
| how critics | panel |
| why investigators | scalar |
| why synthesizer | scalar |
| reflect tooling | scalar |
| reflect judgment, divergent, synthesizer | scalar |
| arena runners | panel |
| arena cross-judge pool | panel |
| swarm workers | scalar |
| architect runners | panel |
| interrogate reviewers | panel |

The file format is `role label: provider/model`, with the labels above.
Thinking levels may be appended as `:low`, `:medium`, `:high`, or another
level supported by that model. Validate the base selector against the
catalog separately from the thinking suffix. Panel length sets the pass
count. For more than four seats, reuse a role agent with a unique run key
and an explicit per-run model. `inherit-parent` and `auto` mean the actual
current session model, never a literal provider selector.

## 3. Configure delegation

Read before writing; merge only the following keys and preserve others.

- `settings.json`: under `subagents.agentOverrides`, disable the external
  CLI adapters `claude-code`, `claude-code-writer`, `cursor-agent`,
  `cursor-agent-writer`, `codex-exec`, and `codex-exec-writer` with
  `disabled: true`.
- `extensions/subagent/config.json`: remove a global `worktree: true`
  default (set it to false); ensure `maxSubagentDepth` is at least 2.
  Writers request a worktree per launch; readers must work outside Git too.

Run `subagent({ action: "list" })`. Confirm the `pstack-*` agents from
this package's `agents/` directory are discovered, including
`pstack-comment-sicko` and all five panels. A missing agent fails setup;
report the missing name and package path. Do not silently substitute a
companion's generic role.

## 4. Smoke-test and save

For each distinct selected model, launch a read-only `pstack-how-explorer`
with that explicit model, `context: "fresh"`, and the task “Reply exactly
smoke-ok without using tools.” Use a single `workflowScript` with
`runs.all` for independent probes. Await completion and inspect the child
results: each needs successful completion, the selected model, and an
actual assistant reply. A parent echo or a successful launch is not proof.
Use unique run keys and let the runtime allocate session directories.
Do not set a shared `sessionDir` on a parallel workflow: children can
collide on the same session file. Keep evidence through runtime artifacts.

If a model fails, name its provider and the concrete failure. Use another
authorized, verified model if the user allowed model selection; otherwise
leave the previous configuration intact and request the missing choice or
credential repair. Never save a table containing a failed model.

After every selected model passes, write `pstack/models.md` in full.
Report the absolute path, role choices, model-smoke results, and discovered
role count. Run the `pstack_status` tool (or `/pstack-status` interactively)
and resolve any reported drift. Existing sessions read the new file when
they next resolve a role; no model change is implied for the parent.

## 5. Project verification

Find an existing project verification skill or runtime harness. If none
exists and the user requested verification, read and run
`create-verification-skill`. Otherwise offer it once as an optional next
step. Setup is complete only after the required companion, model probes,
role discovery, and status checks pass.

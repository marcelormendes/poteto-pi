# Pstack for OMP Design

**Date:** 2026-09-01
**Status:** Approved for written-spec review
**Project:** `pstack-omp`
**Target:** Oh My Pi 18.0.11 and later stable releases
**Upstream:** Cursor pstack 0.14.5 at `b9ddc83c32972210b8a94d389130713e8eed346e`

## Objective

Build a standalone, installable OMP plugin that reproduces official pstack behavior on OMP. Preserve Lauren Tan's pstack methodology, role routing, principles, specialist workflows, playbooks, agents, references, guides, and applicable scripts. Replace Cursor-specific runtime assumptions with native OMP capabilities.

After one mandatory setup, pstack mode is enabled automatically in new OMP sessions. The user states a goal normally; the root agent routes it to the correct pstack playbook and configured model roles without requiring repeated `/how`, `/why`, `/architect`, `/swarm`, `/interrogate`, or similar commands.

All root agents and subagents execute locally on the machine running OMP. The host and root OMP process must remain alive while work is running. Remote executors, cloud-worker abstractions, deployment automation, and Benny are outside scope.

## Success criteria

1. Install through OMP's native plugin manager.
2. Require `/setup-pstack` before pstack workflows can run.
3. Validate every configured model against OMP's authenticated model registry.
4. Preserve unrelated OMP configuration and model roles.
5. Enable automatic pstack routing after setup, with an explicit per-session off switch.
6. Include every official non-Benny skill, principle, playbook, reference, guide, agent, and applicable script.
7. Route each specialist workflow through its configured OMP model and tool profile.
8. Isolate every parallel writer; never auto-apply unselected arena candidates.
9. Support Linux and macOS from one codebase.
10. Track future official pstack releases through a deterministic sync and adaptation pipeline.
11. Pass unit, integration, generated-artifact, plugin-loading, and real separate-OMP acceptance checks.
12. Prove automatic routing for `how`, `why`, `architect`, `arena`, `swarm`, `interrogate`, `reflect`, feature, bug, refactor, performance, verification, and autonomous workflows without explicit skill invocation.
13. Prove bounded `/loop` and goal-mode behavior in a separate OMP process.

## Non-goals

- Benny files or a Benny automation runtime in the generated plugin.
- Cursor Automations, Slack triggers, hosted workers, or remote execution.
- OMP core changes in the initial implementation.
- Deployment, systemd, Docker, cloud-server, or process-supervisor configuration.
- Exact Cursor mode colors, icons, or UI chrome.
- Silent fallback from an unavailable configured model.
- Bundling Graphite, GitHub CLI, or third-party credentials.

## Repository layout

```text
pstack-omp/
├── vendor/
│   └── pstack/                     # immutable official snapshot
├── upstream/
│   ├── manifest.json               # version, commit, checksums, exclusions
│   └── patches.json                # explicit adaptation classification
├── src/
│   ├── extension/
│   │   ├── index.ts                # OMP extension entry point
│   │   ├── mode-state.ts           # automatic/sticky mode state
│   │   ├── routing-context.ts      # compact role and playbook context
│   │   └── commands.ts             # setup/mode/status commands
│   ├── setup/
│   │   ├── model-catalog.ts         # resolve and validate OMP models
│   │   ├── role-config.ts           # pstack role schema
│   │   ├── generated-agents.ts      # thin role-backed agent files
│   │   └── persist.ts               # atomic, preserving config writes
│   ├── transcripts/
│   │   ├── list.ts                  # current-project session discovery
│   │   └── read.ts                  # bounded transcript slices
│   └── adapters/
│       ├── pipeline.ts              # deterministic file adaptation
│       ├── markdown.ts              # safe mechanical Markdown rewrites
│       ├── paths.ts                 # Cursor-to-OMP path mapping
│       └── classify.ts              # verbatim/transform/override policy
├── overrides/                       # complete reviewed OMP replacements
├── plugin/
│   ├── package.json                 # generated plugin shell definition
│   ├── commands/                    # manual override aliases
│   ├── agents/                      # static pstack agents
│   └── skills/                      # OMP-only compatibility skills
├── scripts/
│   ├── sync-upstream.ts
│   ├── build-plugin.ts
│   └── verify-generated.ts
├── tests/
├── dist/
│   └── pstack-omp/                  # reproducible installable artifact
└── docs/superpowers/specs/
```

## Source ownership and provenance

`vendor/pstack` is a byte-preserving snapshot of the pinned upstream `pstack/` directory. It is never edited manually. The snapshot retains the upstream MIT license and Lauren Tan's copyright notice.

Every vendored file is classified as one of:

- **Verbatim:** copied without content changes.
- **Mechanical:** transformed by a named deterministic adapter.
- **Override:** replaced in full by a reviewed file under `overrides/`.
- **Excluded:** retained only in the vendor snapshot and omitted from the generated plugin. Benny is excluded.

`upstream/manifest.json` records the upstream repository, commit, pstack version, file checksums, exclusions, and adapter version. The build fails when the snapshot contains an unclassified file or a transform encounters an unsupported Cursor construct.

Generated `dist/` files are never hand-edited. The verification command rebuilds into a temporary directory and byte-compares it with `dist/pstack-omp`.

## Generated plugin contents

The installable artifact contains:

- Native `package.json#omp` extension metadata.
- All non-Benny official pstack skills.
- All 21 official principle skills.
- All 23 official `poteto-mode` playbooks.
- All non-Benny references, guides, images, and applicable scripts.
- OMP-adapted `poteto-agent` and Comment Sicko definitions.
- Manual slash-command aliases for official pstack entry points.
- The setup and automatic-mode extension.
- The OMP transcript adapter.
- OMP-native replacements for Cursor-only control, skill-authoring, and cleanup assumptions.
- The upstream license and provenance manifest.

The generated plugin does not contain Cursor Automations or advertise unavailable cloud execution.

## Upstream adaptation policy

Mechanical adapters handle only transformations whose meaning is invariant:

- `.cursor/skills` paths to `.omp/skills` paths.
- Cursor plugin-install examples to OMP plugin commands.
- Stable internal links after relocation.
- Known names of OMP tool equivalents in non-behavioral prose.

Runtime-bearing files use complete overrides rather than broad search-and-replace. This includes at least:

- `poteto-mode`
- `setup-pstack`
- `how`
- `why`
- `arena`
- `architect`
- `interrogate`
- `reflect`
- `swarm`
- `recall`
- `automate-me`
- `show-me-your-work`
- transcript-dependent playbooks
- local/cloud orchestration playbooks
- verification and control-surface playbooks

The generated artifact is scanned for unsupported Cursor runtime constructs, including `subagent_type`, Cursor `Task` fields, `environment: "cloud"`, `cloud_base_branch`, `agent-transcripts`, `.cursor/skills`, Cursor `/automate`, and unadapted `cursor-team-kit` dependencies. Any unexplained match fails the build.

## Mandatory model setup

Pstack starts unconfigured. No workflow model silently inherits a shipped default.

`/setup-pstack` performs these steps:

1. Query authenticated OMP models.
2. Read existing pstack configuration, if present.
3. Present every scalar role and every panel role.
4. Accept exact model selectors, `inherit-parent`, or `auto` where supported.
5. Validate every selector and reasoning suffix.
6. Require at least one entry for each panel.
7. Resolve model-family identities for cross-family judging.
8. Write pstack's structured configuration atomically.
9. Merge pstack semantic roles into OMP `modelRoles` without changing unrelated entries.
10. Generate deterministic thin agent definitions for scalar roles and panel slots.
11. Verify that OMP rediscovers every generated agent and resolves its model.
12. Enable automatic pstack mode for future sessions.
13. Request a new session when discovery metadata changed.

Complex pstack configuration lives under the OMP agent directory in a namespaced file rather than being encoded as prose:

```text
~/.omp/agent/pstack/config.yml
```

Generated user agents use a `pstack-` prefix and are tracked in a generated manifest so rerunning setup removes obsolete pstack-owned slot files without touching unrelated user agents.

For the real acceptance run, setup uses the user's supplied mapping:

- GLM 5.3 Flash for feature, refactor, exploration, investigation, and swarm roles.
- Cursor GPT-5.6 SOL Fast at `xhigh` for bug, performance, hillclimb, reflect-tooling, and fast panel roles.
- Cursor GPT-5.6 SOL at `xhigh` for judgment, explanation, synthesis, and hardest roles.
- OpenCode Go DeepSeek V4 Flash Vision Exp at `max` for the vision panel seat.
- Cursor GPT-5.6 SOL at `high` for the high-Codex panel seat.

Setup validates the actual selectors available at execution time and fails closed if entitlement or catalog state differs.

## Automatic mode and routing

After successful setup, pstack mode defaults to enabled for each new root session. The user can use `/poteto-mode off`, `/poteto-mode on`, and `/poteto-mode status` per session.

The extension persists session mode changes as namespaced custom session entries and reconstructs them after resume, branch, and tree navigation. Global auto-enable remains a setup preference; a session-level explicit off state wins.

While enabled, `before_agent_start` supplies:

- The authoritative pstack routing contract.
- The inline principle index.
- The playbook index.
- The configured semantic agent names and panel rosters.
- The local-only execution invariant.
- The requirement that the parent reviews and verifies all delegated work.

The model performs semantic routing, matching official pstack behavior. The extension does not implement a brittle keyword classifier. Manual slash commands remain available as explicit overrides, but normal use requires only a natural-language task.

Each new root session receives the full router contract. Later turns receive a compact reminder plus the current routing registry. The extension must preserve routing after compaction and session resume.

## Agent model and tool profiles

OMP's public Task schema does not expose arbitrary per-call model selection. Setup therefore generates role-backed agents.

Tool profiles are explicit:

- **Read-only:** how explorers/explainers/critics, arena judges, architect design runners, interrogate reviewers, Comment Sicko.
- **MCP-capable non-writing posture:** why investigators/synthesizer and reflect reviewers/synthesizer. They retain full tools for MCP proxy access, while their prompt forbids workspace mutation.
- **Writing:** feature, bug, refactor, performance, hillclimb, arena candidate, swarm, and ordinary poteto workers.
- **Coordinator:** poteto wrapper and orchestration coordinators, with controlled spawn permissions.

The parent owns OMP `todo`. Subagents receive complete assignments or use pstack's durable orchestration ledger; they do not attempt to mutate the parent's todo list.

Structured output schemas are defined for panel and aggregation workflows where they reduce parsing ambiguity. Human-facing prose remains prose.

## Local task execution and isolation

All subagents use native OMP `task` or `eval agent()` and execute on the same host as the root OMP process.

- Async persistent workers use batched `task` calls and Agent Hub.
- Barriered one-shot panels use `eval` with `parallel()`.
- Every parallel writer runs in an isolated workspace.
- Read-only panels do not request workspace isolation unless their experiment needs it.
- Arena candidates use `isolated: true`, `apply: false`, and retained handles. Only the selected base and explicitly grafted changes reach the parent checkout.
- Swarm slices may auto-apply only when ownership is disjoint and the parent has declared the merge contract.
- Shared mutable work serializes at one explicit integration owner.

Recommended baseline settings are async enabled, batch enabled, isolation `auto`, maximum concurrency 32, maximum jobs 100, and recursion depth 2. The plugin checks required capabilities rather than silently mutating unrelated task settings.

The coordinator/track/worker hierarchy fits recursion depth 2 when the root OMP session owns pstack mode. Orchestrate is not started from an already nested poteto worker.

## Transcript adapter

Official pstack transcript workflows must not know OMP's on-disk layout.

The plugin provides a namespaced read-only transcript tool that:

- Discovers only sessions belonging to the current project cwd by default.
- Returns bounded metadata before full content.
- Supports recent-window filtering and explicit session selection.
- Resolves nested subagent transcripts.
- Never searches other projects unless the user explicitly requests it.
- Redacts or excludes provider metadata that is not needed for pstack analysis.

`recall`, `reflect`, `eval`, `automate-me`, `session-pickup`, `show-me-your-work`, and worktree-audit use this adapter. They never hard-code OMP session paths.

## Loops, goals, and unattended local work

The port uses OMP's native `/loop` and goal mode. It does not recreate them in the extension.

Pstack playbooks define predicates, wake cadence, decision logs, and recovery rules. The host and root OMP process must remain alive. If the root process exits, running workers are considered interrupted even when transcripts survive.

Crash recovery is idempotent:

1. Read orchestration units and decision logs.
2. Treat previously running units as unknown.
3. Inspect branches, patches, artifacts, transcripts, and external side effects.
4. Mark proven completed work complete.
5. Redispatch only unproven work.

Tests use bounded loop counts and small checkable goals. No acceptance test starts an unbounded loop.

## External capabilities

The port replaces pstack's Cursor-only control references with OMP-native surfaces:

- Web and Electron-like browser verification: OMP `browser`.
- Host desktop verification: OMP `computer` when available.
- CLI and TUI verification: managed processes and PTYs.
- Skill authoring: an OMP-specific authoring workflow.
- Code cleanup: an OMP-specific cleanup workflow preserving pstack's documented plain-language fallback.

Graphite and GitHub CLI remain explicit external prerequisites for workflows that require them. Missing prerequisites produce actionable failures. The plugin does not provide fake fallbacks or report shipping success without the real tools.

## Error handling and fail-closed behavior

- Missing setup: route and workflow commands return one instruction to run `/setup-pstack`.
- Invalid model: identify the exact role and selector; do not inherit silently.
- Empty panel: setup rejects it.
- Same-family cross-judge candidates: select a contrasting configured family or report that none exists.
- Missing generated agent: setup/status reports drift and offers deterministic regeneration.
- Parallel write without isolation: abort before spawning writers.
- Candidate patch apply failure: preserve the patch artifact and report recovery instructions.
- Transcript scope ambiguity: require explicit project/session selection.
- Unknown upstream Cursor construct: fail the build.
- Missing external CLI: fail only the workflow that requires it, before irreversible work.
- Subagent failure: retain its transcript and artifacts; aggregate `BLOCKED` or `ISSUES`, never count it as a pass.
- Mode state corruption: disable automatic routing and report repair steps rather than injecting partial policy.

## Testing strategy

### Unit tests

- Role-config parsing and validation.
- Model selector and reasoning-suffix resolution.
- Panel length and generated-agent naming.
- Atomic config merge preserving unrelated keys.
- Mode-state precedence and session reconstruction.
- Transcript project scoping and bounds.
- Adapter transforms and forbidden-pattern detection.
- Upstream manifest and checksum validation.

### Generated-artifact tests

- Every upstream non-Benny file is classified.
- Expected counts for skills, principles, and playbooks match the pinned baseline.
- Every internal link resolves.
- Every skill has valid frontmatter.
- Every command targets an installed skill or extension command.
- No unsupported Cursor runtime term remains.
- A clean rebuild byte-matches `dist/pstack-omp`.
- Upstream license and provenance ship in the artifact.

### Script regression tests

Port and retain upstream tests for `orch` and `watch-pr`. Add cross-platform tests for path and process behavior. Prefer Bun/TypeScript for new scripts; retain shell only where the upstream script is already stable and portable.

### OMP integration tests

- Link the generated plugin with OMP's plugin manager.
- Run plugin doctor/list checks.
- Start a clean OMP session and verify extension, commands, skills, agents, tools, and rules are discoverable.
- Run setup against controlled model-registry fixtures.
- Verify setup reruns idempotently.
- Verify setup preserves unrelated global roles and agent files.
- Verify mode on/off/status and session resume.
- Verify role-backed agents resolve to the expected models and tool profiles.
- Verify isolated arena candidates do not modify the parent checkout.

### Real separate-OMP acceptance run

Run a second actual OMP process, separate from the development session, against the built plugin. Use the real authenticated model catalog and the user's approved model mapping.

1. Install or link `dist/pstack-omp` through `omp plugin`.
2. Launch the separate OMP process in a PTY.
3. Run `/setup-pstack` and configure every scalar and panel role.
4. Start a fresh session so generated discovery is authoritative.
5. Confirm pstack mode is automatically active without invoking a workflow skill.
6. Submit natural-language prompts that should route to:
   - how
   - why
   - architect
   - arena
   - swarm
   - interrogate
   - reflect
   - feature
   - bug fix
   - refactor
   - performance
   - verification
7. Inspect Agent Hub/transcripts and assert the selected agent types and resolved models match the setup configuration.
8. Exercise a four-seat panel and confirm all configured seats run.
9. Confirm cross-judge family contrast.
10. Exercise one isolated arena and prove unselected changes do not reach the parent.
11. Run a bounded `/loop 2` scenario and observe two iterations with the original predicate preserved.
12. Run a small goal-mode task through verified completion.
13. Resume the session and confirm automatic pstack mode and role configuration persist.
14. Run the plugin's final status/doctor command and require a clean report.

A compile, unit-test pass, or mocked model registry does not satisfy this acceptance run. Final completion requires observed behavior from the separate real OMP process.

## Cross-platform contract

Linux and macOS are first-class for plugin logic, generation, setup, local subagents, browser verification, CLI/TUI verification, and orchestration scripts.

Host-specific app verification remains capability-based:

- macOS-native apps and iOS simulators require macOS.
- Linux-only services require Linux or a compatible container.
- A missing host capability is reported by the affected verification workflow; it does not invalidate unrelated pstack functionality.

Paths use platform APIs, not shell concatenation. New tests avoid GNU/BSD command differences. Isolation backend selection remains OMP's responsibility.

## Update workflow

`sync-upstream` accepts an official Cursor plugins commit or tag and performs:

1. Fetch or read the upstream pstack tree.
2. Verify repository identity.
3. Replace the vendored snapshot atomically.
4. Update checksums and version metadata.
5. Report added, removed, and changed files by classification.
6. Refuse to classify new files automatically.
7. Build the generated artifact.
8. Run adapters, link checks, forbidden-pattern scans, and tests.
9. Produce a human-reviewable compatibility report.

Upstream changes to runtime-bearing files require an explicit override review. Prompt-only verbatim updates remain mechanically auditable.

## Completion definition

The project is complete only when:

- The full non-Benny generated plugin exists and is reproducible.
- Static checks and all applicable tests pass.
- OMP loads the plugin as a native plugin.
- Mandatory setup works with real available models.
- Automatic routing is active in a fresh session.
- Every named specialist workflow is observed using its intended role in a separate OMP process.
- Isolation, panels, loop, goal, transcript, and resume behavior pass their real acceptance scenarios.
- Documentation explains installation, setup, mode control, update workflow, prerequisites, and recovery without Cursor-only instructions.
- No placeholder, mock runtime, silent fallback, or unverified success path remains.

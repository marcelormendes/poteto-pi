# Pstack for OMP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and prove a complete, local-only, automatically routed OMP port of official pstack, excluding Benny.

**Architecture:** Preserve a pinned official pstack snapshot under `vendor/`, classify every upstream file, and generate a clean installable OMP plugin through deterministic adapters and explicit runtime-bearing overrides. A native OMP extension owns mandatory model setup, generated role-backed agents, sticky automatic pstack mode, route lookup, and current-project transcript access; native OMP `task`, `eval agent()`, Agent Hub, isolation, `/loop`, and goal mode provide execution.

**Tech Stack:** Bun, strict TypeScript, `bun:test`, YAML 2.x, OMP extension API `@oh-my-pi/pi-coding-agent` 18.0.11, Markdown skills/agents/commands, native OMP plugin manager.

## Global Constraints

- Baseline is OMP stable 18.0.11; do not depend on unreleased main-only APIs.
- All root agents and subagents execute locally on the OMP host.
- The root OMP process must remain alive while workers run.
- Benny and Cursor Automations are excluded from the generated plugin.
- `vendor/pstack` is immutable and byte-preserving at upstream commit `b9ddc83c32972210b8a94d389130713e8eed346e`.
- Retain Lauren Tan's MIT license and copyright.
- Pstack remains unusable until every required scalar and panel role passes setup validation.
- Setup preserves unrelated OMP settings, roles, and agent files.
- Automatic pstack routing is enabled after setup; users need not invoke specialist skills manually.
- Every parallel writer is isolated; unselected arena candidates never apply automatically.
- Linux and macOS are first-class for plugin logic and scripts.
- New code uses focused modules, strict types, behavior tests, and no placeholders or fake fallbacks.
- Every implementation task commits its independently passing deliverable.

---

## File and interface map

### Root and provenance

- `package.json` — development scripts and dependencies.
- `tsconfig.json` — strict TypeScript settings for source, tests, and scripts.
- `.gitignore` — transient build/test output only; keep the verified distributable source policy explicit.
- `vendor/pstack/**` — exact upstream snapshot.
- `upstream/manifest.json` — pinned upstream identity, checksums, and baseline counts.
- `upstream/classification.yml` — one classification for every vendored file.

### Core model

- `src/core/types.ts` — role/config/provenance types and canonical role constants.
- `src/core/errors.ts` — `PstackError` and stable error codes.
- `src/core/paths.ts` — namespaced paths under the active OMP agent directory.
- `src/core/yaml.ts` — typed YAML parsing and atomic writes.

### Build and adaptation

- `src/build/inventory.ts` — deterministic file inventory and checksums.
- `src/build/classification.ts` — classification loading and coverage validation.
- `src/build/markdown-adapter.ts` — safe mechanical text/path transformations.
- `src/build/generate.ts` — build `dist/pstack-omp` from vendor, overrides, and plugin shell.
- `src/build/verify.ts` — validate generated contents, links, frontmatter, forbidden constructs, and reproducibility.
- `scripts/sync-upstream.ts`, `scripts/build-plugin.ts`, `scripts/verify-generated.ts` — CLI entry points.

### Setup and role agents

- `src/setup/schema.ts` — parse and validate `PstackConfig`.
- `src/setup/catalog.ts` — adapter over OMP's authenticated model facade.
- `src/setup/omp-config.ts` — preserving `modelRoles` read/merge/write through `omp config`.
- `src/setup/agent-generator.ts` — deterministic flat `pstack-*.md` user agents.
- `src/setup/service.ts` — setup transaction and post-write verification.
- `src/setup/interactive.ts` — `/setup-pstack` UI flow and `--file` import.

### Runtime extension

- `src/extension/index.ts` — register commands, tools, and lifecycle handlers.
- `src/extension/mode-state.ts` — global auto-enable plus per-session on/off state.
- `src/extension/router.ts` — full router injection, compact reminders, and route registry rendering.
- `src/extension/route-tool.ts` — `pstack_route` tool and cross-family candidate filtering.
- `src/extension/status.ts` — doctor/status report.

### Transcript adapter

- `src/transcripts/session-index.ts` — current-project session discovery.
- `src/transcripts/transcript-reader.ts` — bounded metadata and transcript slices.
- `src/transcripts/tool.ts` — `pstack_transcripts` OMP tool.

### Plugin shell and adapted content

- `plugin/package.json` — installable native OMP manifest template.
- `plugin/commands/*.md` — manual specialist aliases.
- `plugin/agents/poteto-agent.md`, `plugin/agents/comment-sicko.md` — static agents.
- `plugin/skills/omp-skill-authoring/SKILL.md` — OMP-native skill authoring replacement.
- `plugin/skills/omp-code-cleanup/SKILL.md` — OMP-native code cleanup replacement.
- `overrides/**` — complete OMP-native replacements keyed to vendored relative paths.

### Tests

- `tests/unit/**/*.test.ts` — pure modules.
- `tests/fixtures/**` — model catalogs, configs, session trees, and generated-agent goldens.
- `tests/integration/**/*.test.ts` — generated plugin and OMP CLI integration.
- `tests/e2e/acceptance.ts` — real separate-OMP role/routing acceptance runner.
- `tests/e2e/models.yml` — local acceptance input using the approved selectors; not a shipped default.

---

### Task 1: Establish the strict project and immutable upstream baseline

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`
- Create: `src/core/types.ts`
- Create: `src/core/errors.ts`
- Create: `src/core/paths.ts`
- Create: `vendor/pstack/**`
- Create: `upstream/manifest.json`
- Create: `tests/unit/core.test.ts`

**Interfaces:**
- Produces `ScalarRole`, `PanelRole`, `ModelChoice`, `PstackConfig`, `UpstreamManifest`, `PstackPaths`.
- Produces `resolvePstackPaths(agentDir: string): PstackPaths`.
- Produces `PstackError` with stable `code` values.
- Later tasks consume these exact types.

- [ ] **Step 1: Write failing core-contract tests**

```ts
import { describe, expect, test } from "bun:test";
import { PANEL_ROLES, SCALAR_ROLES } from "../../src/core/types";
import { resolvePstackPaths } from "../../src/core/paths";

describe("core contracts", () => {
  test("publishes every configured role family", () => {
    expect(SCALAR_ROLES).toContain("feature");
    expect(SCALAR_ROLES).toContain("why-synthesizer");
    expect(PANEL_ROLES).toEqual([
      "how-critics",
      "arena-runners",
      "arena-cross-judges",
      "architect-runners",
      "interrogate-reviewers",
    ]);
  });

  test("keeps pstack files under the active OMP agent directory", () => {
    expect(resolvePstackPaths("/profile/agent")).toEqual({
      agentDir: "/profile/agent",
      configPath: "/profile/agent/pstack/config.yml",
      generatedAgentsDir: "/profile/agent/agents",
      generatedManifestPath: "/profile/agent/pstack/generated-agents.json",
    });
  });
});
```

- [ ] **Step 2: Run the tests and observe missing-module failures**

Run: `bun test tests/unit/core.test.ts`

Expected: FAIL because core modules do not exist.

- [ ] **Step 3: Create strict project configuration**

Use this package shape:

```json
{
  "name": "pstack-omp",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "bun test",
    "typecheck": "tsc --noEmit",
    "build:plugin": "bun scripts/build-plugin.ts",
    "verify:generated": "bun scripts/verify-generated.ts",
    "sync:upstream": "bun scripts/sync-upstream.ts"
  },
  "dependencies": {
    "yaml": "^2.8.1"
  },
  "devDependencies": {
    "@oh-my-pi/pi-coding-agent": "18.0.11",
    "@types/bun": "latest",
    "typescript": "latest"
  }
}
```

`tsconfig.json` must enable `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `moduleResolution: "Bundler"`, and `noEmit`.

- [ ] **Step 4: Implement core types and errors**

`ModelChoice` is a discriminated union:

```ts
export type ModelChoice =
  | { type: "model"; selector: string }
  | { type: "inherit-parent" };
```
`SCALAR_ROLES` is exactly `feature`, `refactoring`, `bug-fix`, `perf-issue`, `hillclimb`, `judgment-prose`, `hardest`, `how-explorer`, `how-explainer`, `why-investigator`, `why-synthesizer`, `reflect-tooling`, `reflect-judgment`, `reflect-divergent`, `reflect-synthesizer`, and `swarm-worker`. `PANEL_ROLES` is exactly `how-critics`, `arena-runners`, `arena-cross-judges`, `architect-runners`, and `interrogate-reviewers`.


`PstackConfig` includes schema version `1`, `autoEnable`, exact upstream commit, every scalar role, and every panel role. Panel arrays are non-empty after validation.

- [ ] **Step 5: Copy the pinned official pstack snapshot**

Copy the exact `pstack/` tree from the cached official checkout at commit `b9ddc83c32972210b8a94d389130713e8eed346e`. Do not include nested Git metadata. Retain `LICENSE`, README, guides, images, agents, skills, scripts, and Benny in the vendor snapshot; Benny is excluded only from generated output.

- [ ] **Step 6: Create the upstream manifest**

Record repository URL, commit, pstack version `0.14.5`, SHA-256 per file, and pinned counts. The manifest's `excludedFromDistribution` must contain `automations/benny/**`.

- [ ] **Step 7: Run core tests and typecheck**

Run: `bun test tests/unit/core.test.ts && bun run typecheck`

Expected: PASS.

- [ ] **Step 8: Commit the baseline**

```bash
git add package.json tsconfig.json .gitignore src/core vendor upstream tests/unit/core.test.ts
git commit -m "chore: establish pstack upstream baseline"
```

---

### Task 2: Build complete classification and deterministic generation

**Files:**
- Create: `upstream/classification.yml`
- Create: `src/build/inventory.ts`
- Create: `src/build/classification.ts`
- Create: `src/build/markdown-adapter.ts`
- Create: `src/build/generate.ts`
- Create: `scripts/build-plugin.ts`
- Create: `tests/unit/build-classification.test.ts`
- Create: `tests/unit/markdown-adapter.test.ts`

**Interfaces:**
- Consumes `UpstreamManifest` and `PstackError`.
- Produces `FileClassification = { path; mode: "verbatim" | "mechanical" | "override" | "excluded"; adapter?: string }`.
- Produces `loadClassification(path): Promise<FileClassification[]>`.
- Produces `validateClassification(vendorRoot, rows): Promise<void>`.
- Produces `adaptMarkdown(input, relativePath): string`.
- Produces `generatePlugin(options): Promise<GenerationReport>`.

- [ ] **Step 1: Write classification coverage tests**

Test that duplicate rows, missing vendored paths, unknown paths, missing override files, and Benny classified as anything except excluded all fail with stable `PstackError` codes.

- [ ] **Step 2: Run and confirm failures**

Run: `bun test tests/unit/build-classification.test.ts tests/unit/markdown-adapter.test.ts`

Expected: FAIL because build modules are absent.

- [ ] **Step 3: Classify every vendored file explicitly**

Use verbatim for pure principles and references without runtime vocabulary. Use mechanical only for invariant paths/links. Use override for runtime-bearing skills/playbooks named in the design. Use excluded for every Benny path. No glob row may hide newly added upstream files: expand globs into explicit validated inventory during sync and persist the expanded classification.

- [ ] **Step 4: Implement safe Markdown adaptation**

Adapters operate on exact known tokens and return an ordered change report. They must not replace generic words like `Task`, `Cursor`, or `cloud` globally. Path adaptation is scoped to recognized pstack path syntax.

- [ ] **Step 5: Implement generation transactionally**

Generate into a temporary sibling directory, validate, then atomically replace `dist/pstack-omp`. The generator copies the plugin shell first, then classified upstream files, then overrides, then runtime extension source. On failure it leaves the previous `dist` untouched.

- [ ] **Step 6: Run focused tests**

Run: `bun test tests/unit/build-classification.test.ts tests/unit/markdown-adapter.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit the generator**

```bash
git add upstream/classification.yml src/build scripts/build-plugin.ts tests/unit
 git commit -m "feat: generate OMP plugin from classified upstream"
```

---

### Task 3: Implement the mandatory role configuration and preserving persistence

**Files:**
- Create: `src/core/yaml.ts`
- Create: `src/setup/schema.ts`
- Create: `src/setup/omp-config.ts`
- Create: `src/setup/agent-generator.ts`
- Create: `tests/unit/setup-schema.test.ts`
- Create: `tests/unit/omp-config.test.ts`
- Create: `tests/unit/agent-generator.test.ts`
- Create: `tests/fixtures/models-complete.yml`

**Interfaces:**
- Consumes `PstackConfig`, role constants, and `PstackPaths`.
- Produces `parsePstackConfig(source: string): PstackConfig`.
- Produces `validateCompleteConfig(value: unknown): PstackConfig`.
- Produces `OmpConfigStore` with `readModelRoles()` and `writeModelRoles()`.
- Produces `buildSemanticModelRoles(config): Record<string, string>`.
- Produces `generateAgentFiles(config): GeneratedAgent[]`.
- Produces `applyGeneratedAgents(paths, agents): Promise<void>`.

- [ ] **Step 1: Write failing config tests**

Cover missing scalar roles, empty panels, blank selectors, invalid choice shapes, schema-version mismatch, explicit inherit-parent, and unknown top-level keys.

- [ ] **Step 2: Write preserving OMP-config tests**

Given existing roles `{ default: "openai-codex/gpt-5.6-sol:max", personal: "@slow" }`, adding pstack roles must preserve both keys byte-for-value. Simulate `omp config get modelRoles --json` and `omp config set modelRoles <merged-json>` through an injected command runner.

- [ ] **Step 3: Write generated-agent golden tests**

Assert exact frontmatter for read-only, MCP-capable posture, writing, coordinator, panel-slot, and inherit-parent agents. Every name is flat and prefixed `pstack-`.

- [ ] **Step 4: Implement strict YAML and schema validation**

YAML parse errors become `PSTACK_CONFIG_PARSE`. Incomplete roles become `PSTACK_CONFIG_INCOMPLETE` with all missing paths in one result. Unknown keys fail instead of being discarded.

- [ ] **Step 5: Implement preserving OMP role writes**

Use an injected runner in tests and `Bun.spawn(["omp", "config", ...])` in production. Parse the JSON envelope's `value`. Read immediately before writing to minimize stale overwrites. Never change `default`, provider settings, or non-pstack keys.

- [ ] **Step 6: Implement generated agents and ownership manifest**

Write into a temporary directory, validate all content, rename files into `~/.omp/agent/agents`, then remove only obsolete paths listed by the previous pstack manifest. A generated manifest contains filename, SHA-256, semantic role, tool profile, and model alias. Refuse to overwrite a changed generated file whose checksum no longer matches the prior manifest.

- [ ] **Step 7: Run setup unit tests**

Run: `bun test tests/unit/setup-schema.test.ts tests/unit/omp-config.test.ts tests/unit/agent-generator.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit setup foundations**

```bash
git add src/core/yaml.ts src/setup tests/unit tests/fixtures/models-complete.yml
git commit -m "feat: persist pstack model roles and agents"
```

---

### Task 4: Validate authenticated models and implement the setup transaction

**Files:**
- Create: `src/setup/catalog.ts`
- Create: `src/setup/service.ts`
- Create: `src/setup/interactive.ts`
- Create: `tests/unit/setup-service.test.ts`
- Create: `tests/fixtures/model-catalog.json`
- Create: `tests/e2e/models.yml`

**Interfaces:**
- Produces `ModelFacade` with `resolve`, `family`, and `list` matching OMP's read-only model facade.
- Produces `SetupService.configure(input, dependencies): Promise<SetupReport>`.
- Produces `runInteractiveSetup(args, commandContext, dependencies): Promise<void>`.
- `SetupReport` includes validated roles, generated agents, model families, changed paths, preserved roles, and `requiresNewSession`.

- [ ] **Step 1: Write failing model-validation tests**

Cover exact selector success, unavailable selector failure, unsupported reasoning suffix, explicit inheritance, four-seat panels, and no contrasting cross-judge family.

- [ ] **Step 2: Write setup-transaction rollback tests**

If generated-agent persistence fails after pstack config staging, assert the previous config and role map remain unchanged. If model-role persistence fails, assert no agent files were installed.

- [ ] **Step 3: Implement model validation**

Resolve every concrete selector using `ctx.models.resolve`. Compare family tokens only during the live setup call; do not persist opaque family tokens. Persist concrete selectors and recompute families during route lookup.

- [ ] **Step 4: Implement setup from file**

Support `/setup-pstack --file /absolute/or/relative/models.yml`. Resolve relative paths against `ctx.cwd`. Parse, validate, show a summary, persist, and request a new session only after success.

- [ ] **Step 5: Implement interactive setup**

Without `--file`, present each scalar role and each panel with OMP UI selections over authenticated models plus explicit inheritance. Reuse current valid choices as defaults. The flow writes once after all choices validate; cancellation writes nothing.

- [ ] **Step 6: Create the real acceptance model file**

Use the exact approved selectors:

```yaml
schemaVersion: 1
autoEnable: true
roles:
  feature: { type: model, selector: opencode-go/glm-5.3-flash }
  refactoring: { type: model, selector: opencode-go/glm-5.3-flash }
  bug-fix: { type: model, selector: cursor/gpt-5.6-sol-fast:xhigh }
  perf-issue: { type: model, selector: cursor/gpt-5.6-sol-fast:xhigh }
  hillclimb: { type: model, selector: cursor/gpt-5.6-sol-fast:xhigh }
  judgment-prose: { type: model, selector: cursor/gpt-5.6-sol:xhigh }
  hardest: { type: model, selector: cursor/gpt-5.6-sol:xhigh }
  how-explorer: { type: model, selector: opencode-go/glm-5.3-flash }
  how-explainer: { type: model, selector: cursor/gpt-5.6-sol:xhigh }
  why-investigator: { type: model, selector: opencode-go/glm-5.3-flash }
  why-synthesizer: { type: model, selector: cursor/gpt-5.6-sol:xhigh }
  reflect-tooling: { type: model, selector: cursor/gpt-5.6-sol-fast:xhigh }
  reflect-judgment: { type: model, selector: cursor/gpt-5.6-sol:xhigh }
  reflect-divergent: { type: model, selector: cursor/gpt-5.6-sol:xhigh }
  reflect-synthesizer: { type: model, selector: cursor/gpt-5.6-sol:xhigh }
  swarm-worker: { type: model, selector: opencode-go/glm-5.3-flash }
panels:
  how-critics: &panel
    - { type: model, selector: opencode-go/deepseek-v4-flash-vision-exp:max }
    - { type: model, selector: cursor/gpt-5.6-sol-fast:xhigh }
    - { type: model, selector: opencode-go/glm-5.3-flash }
    - { type: model, selector: cursor/gpt-5.6-sol:high }
  arena-runners: *panel
  arena-cross-judges: *panel
  architect-runners: *panel
  interrogate-reviewers: *panel
```

If implementation discovers additional official semantic roles, add them explicitly to both the role constant and this file; do not assign a hidden fallback.

- [ ] **Step 7: Run setup tests**

Run: `bun test tests/unit/setup-service.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit complete setup**

```bash
git add src/setup tests/unit/setup-service.test.ts tests/fixtures/model-catalog.json tests/e2e/models.yml
git commit -m "feat: configure pstack from authenticated OMP models"
```

---

### Task 5: Implement sticky automatic mode and route lookup

**Files:**
- Create: `src/extension/mode-state.ts`
- Create: `src/extension/router.ts`
- Create: `src/extension/route-tool.ts`
- Create: `src/extension/status.ts`
- Create: `src/extension/index.ts`
- Create: `tests/unit/mode-state.test.ts`
- Create: `tests/unit/router.test.ts`
- Create: `tests/unit/route-tool.test.ts`

**Interfaces:**
- Consumes setup service, pstack config, and generated-agent manifest.
- Produces `PstackModeState = { enabled: boolean; source: "auto" | "session-on" | "session-off"; routerLoaded: boolean }`.
- Produces `restoreModeState(branch, config): PstackModeState`.
- Produces `buildFullRouter(config, manifest): string` and `buildReminder(config, manifest): string`.
- Registers `/setup-pstack`, `/poteto-mode`, `/pstack-status`, `pstack_route`, and lifecycle handlers.

- [ ] **Step 1: Write mode-state tests**

Cover auto-enable, explicit session off precedence, explicit on, resume, branch reconstruction, setup missing, and router reinjection after compaction.

- [ ] **Step 2: Write router tests**

Assert full router includes the official playbook index, all 21 principle names, local-only execution, parent review ownership, generated agent names, and no unavailable Cursor fields. Reminder must include mode state, setup checksum, and route-tool instruction without duplicating the full principle bodies.

- [ ] **Step 3: Write route-tool tests**

For scalar role, return exactly one generated agent. For panels, preserve configured order and cardinality. Given an excluded model selector, use live `ctx.models.family()` comparison and return only contrasting candidates. Return a stable error when no contrasting candidate exists.

- [ ] **Step 4: Implement durable mode entries**

Use namespaced custom entries `dev.pstack-omp.mode` and `dev.pstack-omp.router`. Reconstruct from `ctx.sessionManager.getBranch()` on session start, branch, and tree events. A corrupted entry disables mode and surfaces `PSTACK_MODE_CORRUPT`.

- [ ] **Step 5: Implement prompt injection**

On the first enabled turn, return the full router as a non-displayed custom message and append the compact routing registry to `event.systemPrompt`. Later turns append the compact reminder. Reset `routerLoaded` after compaction. Never enable routing when setup validation fails.

- [ ] **Step 6: Register commands**

- `/setup-pstack [--file path]` invokes Task 4.
- `/poteto-mode` toggles; `on`, `off`, and `status` are explicit.
- `/pstack-status` reports upstream version, setup checksum, role resolution, generated-agent drift, mode state, OMP version, and external prerequisites.

- [ ] **Step 7: Register `pstack_route`**

Use OMP's injected Zod-compatible schema. Return structured details plus concise text. The tool never spawns agents; it only returns the authorized agent names and current model selectors.

- [ ] **Step 8: Run extension tests and typecheck**

Run: `bun test tests/unit/mode-state.test.ts tests/unit/router.test.ts tests/unit/route-tool.test.ts && bun run typecheck`

Expected: PASS.

- [ ] **Step 9: Commit automatic routing**

```bash
git add src/extension tests/unit
 git commit -m "feat: add automatic pstack mode and routing"
```

---

### Task 6: Implement project-scoped transcript access

**Files:**
- Create: `src/transcripts/session-index.ts`
- Create: `src/transcripts/transcript-reader.ts`
- Create: `src/transcripts/tool.ts`
- Create: `tests/unit/session-index.test.ts`
- Create: `tests/unit/transcript-reader.test.ts`
- Create: `tests/fixtures/sessions/**`

**Interfaces:**
- Produces `listProjectSessions(options): Promise<SessionSummary[]>`.
- Produces `readTranscriptSlice(options): Promise<TranscriptSlice>`.
- Registers `pstack_transcripts` operations `list`, `read`, and `search`.

- [ ] **Step 1: Create fixture session trees**

Include two projects, nested task-agent JSONL, malformed JSONL, a reset boundary, and large tool output. Use no real user content.

- [ ] **Step 2: Write scoping and bounds tests**

Current-project listing must never return the other project. Default reads return metadata and bounded recent messages. Explicit cross-project access is rejected unless the call includes an exact requested project path and the user prompt authorized it.

- [ ] **Step 3: Implement session discovery through stable OMP paths or exported APIs**

Prefer public OMP session-listing exports when present in 18.0.11. If unavailable, isolate path decoding behind `SessionStorageAdapter`; do not spread layout knowledge through skills.

- [ ] **Step 4: Implement bounded transcript reading**

Parse append-only JSONL defensively, retain evidence pointers, cap content by message count and bytes, and summarize oversized tool payloads by type/path without fabricating content.

- [ ] **Step 5: Register the transcript tool**

Tool output names exact session IDs and paths in structured details. Search accepts a time window and literal query; it does not search every project by default.

- [ ] **Step 6: Run transcript tests**

Run: `bun test tests/unit/session-index.test.ts tests/unit/transcript-reader.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit transcript support**

```bash
git add src/transcripts tests/unit tests/fixtures/sessions
git commit -m "feat: add scoped OMP transcript access"
```

---

### Task 7: Create the native plugin shell and manual command aliases

**Files:**
- Create: `plugin/package.json`
- Create: `plugin/commands/*.md`
- Create: `plugin/agents/poteto-agent.md`
- Create: `plugin/agents/comment-sicko.md`
- Create: `plugin/skills/omp-skill-authoring/SKILL.md`
- Create: `plugin/skills/omp-code-cleanup/SKILL.md`
- Create: `plugin/LICENSE`
- Create: `tests/unit/plugin-shell.test.ts`

**Interfaces:**
- Consumes extension source and adapted skill names.
- Produces a valid OMP package with `omp.extensions: ["./extensions/index.ts"]`.
- Produces manual `/how`, `/why`, `/arena`, `/architect`, `/interrogate`, `/swarm`, `/reflect`, and other official entry aliases.

- [ ] **Step 1: Write failing shell tests**

Parse `plugin/package.json`, assert the native `omp` manifest, validate every command name, and require each command body to direct the root agent to the corresponding installed skill without reimplementing it.

- [ ] **Step 2: Implement package metadata**

Use package name `pstack-omp`, include only runtime dependency `yaml`, declare OMP stable compatibility in `engines`/metadata without pretending npm enforces OMP versions, and point the extension at TypeScript source.

- [ ] **Step 3: Port the two static agents**

`poteto-agent` autoloads `poteto-mode`, can spawn only the declared pstack worker agents, and states that root-level orchestrate remains in the main session. Comment Sicko has a read-only tool set and the official review body.

- [ ] **Step 4: Create OMP-native dependency replacements**

The skill-authoring skill writes `.omp/skills`, validates OMP frontmatter, and uses the official pstack prose rules. The cleanup skill implements the documented pstack fallback: remove narrating comments, unsupported guards, dead compatibility paths, and unrelated edits, then verify behavior.

- [ ] **Step 5: Run shell tests**

Run: `bun test tests/unit/plugin-shell.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit the plugin shell**

```bash
git add plugin tests/unit/plugin-shell.test.ts
git commit -m "feat: add native OMP plugin shell"
```

---

### Task 8: Port understanding and design workflows

**Files:**
- Create/modify overrides for:
  - `skills/how/**`
  - `skills/why/**`
  - `skills/arena/**`
  - `skills/architect/**`
  - `skills/interrogate/**`
  - `skills/reflect/**`
  - `skills/swarm/**`
- Create: `tests/unit/workflow-contracts.test.ts`

**Interfaces:**
- Consumes `pstack_route`, native OMP `task`, and native eval `agent()/parallel()`.
- Produces adapted skills with explicit task shape, isolation policy, structured result schema, and aggregation ownership.

- [ ] **Step 1: Write workflow contract tests**

Parse each adapted skill and assert:

- No Cursor Task field remains.
- Every model fan-out first resolves agent names through `pstack_route`.
- `how` uses explorers, explainer, and configured critics.
- `why` uses MCP-capable investigators and synthesizer.
- `arena` uses isolated candidates with `apply:false` and one contrasting judge.
- `architect` gathers evidence before competing designs.
- `interrogate` sends the identical diff/rubric to every reviewer and does not auto-apply findings.
- `reflect` runs tooling, judgment, divergent, and synthesis roles.
- `swarm` distinguishes slices from race arms and isolates writers.

- [ ] **Step 2: Run and observe missing overrides**

Run: `bun test tests/unit/workflow-contracts.test.ts`

Expected: FAIL listing absent contracts.

- [ ] **Step 3: Write complete OMP-native workflow overrides**

Preserve official rubrics, epistemics, prompts, and reply contracts. Replace only runtime/tool/path semantics. Use task batches for persistent workers and eval parallel DAGs for one-shot panels. Reference prompt files by installed plugin path or `skill://`, never inline bulk context repeatedly.

- [ ] **Step 4: Add structured output contracts**

Define actual JSON Schemas in the skill instructions for panel rows and verdicts: evidence pointer, status, findings, confidence, and model/agent identity where not blinded. Arena judge input labels remain blinded.

- [ ] **Step 5: Run workflow tests**

Run: `bun test tests/unit/workflow-contracts.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit understanding/design workflows**

```bash
git add overrides/skills tests/unit/workflow-contracts.test.ts
git commit -m "feat: port pstack understanding and design workflows"
```

---

### Task 9: Port automatic routing, build, verification, and meta workflows

**Files:**
- Create/modify overrides for:
  - `skills/poteto-mode/**`
  - `skills/figure-it-out/**`
  - `skills/tdd/**`
  - `skills/typescript-best-practices/**`
  - `skills/no-comments/**`
  - `skills/create-verification-skill/**`
  - `skills/maintain-verification-skill/**`
  - `skills/recall/**`
  - `skills/automate-me/**`
  - `skills/show-me-your-work/**`
  - every runtime-bearing `poteto-mode/playbooks/*.md`
- Create: `tests/unit/router-content.test.ts`
- Create: `tests/unit/meta-workflows.test.ts`

**Interfaces:**
- Consumes automatic extension routing, transcript tool, OMP-native cleanup/authoring skills, browser/computer/PTY verification, task/hub/todo.
- Produces the complete official playbook index and local-only behavior.

- [ ] **Step 1: Write routing-content tests**

Assert the adapted poteto router covers every official trigger/playbook, includes all principle names, automatically routes natural-language tasks, uses parent-owned todo, and has no cloud/local branch except host-capability checks.

- [ ] **Step 2: Write transcript/meta contract tests**

Require `recall`, `reflect`, `eval`, `automate-me`, session pickup, worktree audit, and show-me-your-work to use `pstack_transcripts`, current-project scope, and evidence pointers. Require `.omp/skills` outputs and OMP skill-authoring validation.

- [ ] **Step 3: Port every build and delivery playbook**

Feature, bug, refactor, performance, hillclimb, prototype, investigation, verification, opening PR, babysit, shipping, autonomous, orchestrate, autopilot-full, autopilot-stack, pause, pickup, trace/runtime forensics, visual parity, multi-phase plan, and worktree cleanup all use OMP-native tools. Preserve Graphite/GitHub prerequisites and fail before mutation when missing.

- [ ] **Step 4: Port automatic routing and external dependency references**

Replace Cursor `/deslop`, `control-cli`, `control-ui`, and `create-skill` dependencies with the OMP-native replacement skills or OMP tools. Retain explicit prerequisite checks for genuine external CLIs.

- [ ] **Step 5: Port meta workflows**

Adapt recall, automate-me, reflect, evaluation, and decision-log audits to the transcript tool and `.omp/skills`. Preserve privacy boundaries and user approval where official pstack requires irreversible/external actions.

- [ ] **Step 6: Run routing/meta tests**

Run: `bun test tests/unit/router-content.test.ts tests/unit/meta-workflows.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit full workflow port**

```bash
git add overrides tests/unit/router-content.test.ts tests/unit/meta-workflows.test.ts
git commit -m "feat: port pstack routing and execution playbooks"
```

---

### Task 10: Port and verify operational scripts

**Files:**
- Modify generated/override sources for:
  - `skills/poteto-mode/scripts/orch/**`
  - `skills/poteto-mode/scripts/watch-pr/**`
  - `skills/poteto-mode/scripts/worktree-audit.sh`
  - `skills/poteto-mode/scripts/check-plan.mjs`
  - `skills/show-me-your-work/scripts/log.sh`
- Create: `tests/integration/scripts.test.ts`

**Interfaces:**
- Preserves upstream `orch` CLI behavior and `watch-pr` JSON verdict contract.
- Replaces Cursor transcript scanning with the transcript adapter or a stable helper CLI.
- Produces deterministic local orchestration state and recovery behavior.

- [ ] **Step 1: Run copied upstream tests against adapted script paths**

Expected: initial failures from imports and Cursor paths, not skipped tests.

- [ ] **Step 2: Port `orch` without changing its state model**

Keep units, ledger, inbox, gates, frontier, status derivation, and idempotency. Adapt package paths and OMP agent identifiers only.

- [ ] **Step 3: Port `watch-pr` and retain all upstream tests**

Keep GitHub readiness, blocker classification, queue semantics, and untrusted-comment handling unchanged.

- [ ] **Step 4: Replace worktree transcript lookup**

Invoke a plugin-provided helper over current-project OMP sessions instead of deriving `~/.cursor/projects` paths. Preserve safe/pinned/in-use precedence.

- [ ] **Step 5: Run script regression tests**

Run: `bun test overrides/skills/poteto-mode/scripts/orch/orch.test.ts overrides/skills/poteto-mode/scripts/watch-pr/cli.test.ts overrides/skills/poteto-mode/scripts/watch-pr/github.test.ts overrides/skills/poteto-mode/scripts/watch-pr/policy.test.ts tests/integration/scripts.test.ts`

Expected: PASS on macOS. Run the pure/script suite in a Linux container or CI-compatible environment when available; platform-specific missing tools must be reported, not silently skipped.

- [ ] **Step 6: Commit operational scripts**

```bash
git add overrides tests/integration/scripts.test.ts
git commit -m "feat: port pstack operational scripts"
```

---

### Task 11: Implement generated-artifact verification and upstream sync

**Files:**
- Create: `src/build/verify.ts`
- Create: `scripts/verify-generated.ts`
- Create: `scripts/sync-upstream.ts`
- Create: `tests/unit/generated-verifier.test.ts`
- Create: `tests/integration/reproducibility.test.ts`

**Interfaces:**
- Produces `verifyGenerated(options): Promise<VerificationReport>`.
- Produces `syncUpstream(options): Promise<SyncReport>`.
- Verification report contains inventory, link/frontmatter failures, forbidden constructs, counts, provenance, and reproducibility diff.

- [ ] **Step 1: Write verifier failure fixtures**

Create fixture plugins with a broken link, missing description, unclassified file, Cursor Task field, Benny path, stale generated output, and missing license. Assert one stable diagnostic per defect.

- [ ] **Step 2: Implement frontmatter and link validation**

Parse every skill and agent. Resolve relative links from their containing file. Ensure commands resolve to registered extension commands or installed skills.

- [ ] **Step 3: Implement forbidden-runtime scanning**

Allow historical mentions only in provenance/documentation allowlists. Reject operational `subagent_type`, `environment: cloud`, `cloud_base_branch`, Cursor transcript paths, `.cursor/skills`, `/automate`, and unresolved cursor-team-kit instructions.

- [ ] **Step 4: Implement reproducibility verification**

Generate into a fresh temporary directory and perform byte-level tree comparison against `dist/pstack-omp`, including file modes where relevant.

- [ ] **Step 5: Implement safe upstream sync**

Verify the remote repository identity, copy the selected pstack tree atomically, recompute manifest checksums, report classification drift, and stop before modifying classification for any new path.

- [ ] **Step 6: Build and verify the real artifact**

Run: `bun run build:plugin && bun run verify:generated`

Expected: PASS and a non-empty `dist/pstack-omp` with no Benny content.

- [ ] **Step 7: Commit verification and generated artifact policy**

```bash
git add src/build scripts upstream dist tests/unit/generated-verifier.test.ts tests/integration/reproducibility.test.ts
git commit -m "feat: verify reproducible pstack plugin builds"
```

---

### Task 12: Prove native OMP plugin loading and setup integration

**Files:**
- Create: `tests/integration/omp-plugin.test.ts`
- Create: `tests/integration/fixtures/agent-dir/**`
- Create: `scripts/test-omp-plugin.ts`

**Interfaces:**
- Runs the installed `omp` CLI as a subprocess.
- Produces a machine-readable integration report with plugin discovery, command/skill/agent inventory, setup changes, and restoration status.

- [ ] **Step 1: Write an integration harness around a disposable OMP profile**

Use a temporary `PI_CODING_AGENT_DIR` for file-mutation tests and controlled fixtures for auth-free discovery. Keep real model authentication for Task 13 only.

- [ ] **Step 2: Link the generated plugin**

Run `omp plugin link <absolute dist/pstack-omp>` against the disposable profile. Assert `omp plugin list --json` reports the package enabled and rooted at the expected path.

- [ ] **Step 3: Verify capability discovery**

Start OMP in an automation-friendly mode and assert extension loading plus expected skills, commands, agents, and tools. Treat any extension error frame as failure.

- [ ] **Step 4: Exercise setup with the fixture model facade**

Run the setup service through its extension command boundary, assert namespaced config and agents, rerun it, and byte-compare unchanged output.

- [ ] **Step 5: Prove preservation and cleanup**

Seed unrelated model roles and a user agent. Confirm setup and generated-agent cleanup do not modify them.

- [ ] **Step 6: Run integration tests**

Run: `bun test tests/integration/omp-plugin.test.ts`

Expected: PASS on installed OMP 18.0.11.

- [ ] **Step 7: Commit OMP integration coverage**

```bash
git add tests/integration/omp-plugin.test.ts tests/integration/fixtures scripts/test-omp-plugin.ts
git commit -m "test: prove native OMP plugin integration"
```

---

### Task 13: Run the separate real-OMP routing and role acceptance matrix

**Files:**
- Create: `tests/e2e/acceptance.ts`
- Create: `tests/e2e/scenarios.ts`
- Create: `tests/e2e/assertions.ts`
- Create: `tests/e2e/README.md`
- Create: `.artifacts/e2e/` at runtime only

**Interfaces:**
- Produces `AcceptanceReport` containing scenario, expected route, observed agent IDs, resolved models, transcript paths, isolation evidence, and verdict.
- Drives a separate real OMP process through PTY or RPC without sharing this development conversation.

- [ ] **Step 1: Define bounded natural-language scenarios**

Each scenario uses a tiny fixture repository and never names the target skill:

- How: ask for an unfamiliar subsystem explanation with evidence.
- Why: ask why a behavior changed using repository history.
- Architect: request a boundary-crossing design and implementation.
- Arena: request competing implementations and selection.
- Swarm: request partitioned independent coverage.
- Interrogate: request skeptical adjudication of a prepared diff.
- Reflect: request improvement extraction from a prepared session fixture.
- Feature, bug, refactor, and performance: each has a deterministic observable contract.
- Verification: exercise the actual CLI fixture.
- Loop: `/loop 2` over an iteration counter with a fixed predicate.
- Goal: create a small objective and complete only after direct verification.

- [ ] **Step 2: Implement transcript/Agent Hub assertions**

Do not trust final prose. Read the separate session and child transcripts. Assert agent type, resolved model, task prompt, tool profile, and final structured output for every scenario.

- [ ] **Step 3: Install/link into the real user OMP profile preserving existing state**

Snapshot only the pstack-owned config keys and generated files for recovery. Link the plugin with native `omp plugin link`. Do not replace or reset unrelated plugins, settings, roles, or auth.

- [ ] **Step 4: Start a separate OMP process and run real setup**

Drive `/setup-pstack --file <absolute tests/e2e/models.yml>`. Confirm every selector resolves against the authenticated catalog. Start a fresh session and confirm `/pstack-status` is clean and automatic mode is on.

- [ ] **Step 5: Run specialist scenarios**

Run how, why, architect, arena, swarm, interrogate, reflect, feature, bug, refactor, performance, and verification. Execute sequentially where rate limits or shared fixtures require it. Persist every report immediately.

- [ ] **Step 6: Prove panel and family behavior**

Confirm the four configured panel seats ran on their configured models. Confirm the chosen cross-judge differs by `ctx.models.family` from the excluded candidate family.

- [ ] **Step 7: Prove isolation**

Hash the parent fixture before arena fan-out. Confirm candidate artifacts exist, unselected changes are absent from the parent, and only selected/grafted changes appear after integration.

- [ ] **Step 8: Prove loop, goal, and resume**

Observe exactly two loop iterations. Observe goal completion only after its predicate passes. Restart/resume the separate session and confirm pstack mode remains automatic with the same role configuration.

- [ ] **Step 9: Produce and validate the acceptance report**

Every required scenario must be `PASS`; `SKIPPED`, `INCONCLUSIVE`, missing transcript evidence, or a model fallback is failure. Store sanitized report artifacts without credentials or raw unrelated conversation content.

- [ ] **Step 10: Commit the acceptance harness and non-secret report**

```bash
git add tests/e2e
# Add only sanitized non-secret report data if appropriate.
git commit -m "test: verify pstack workflows in a separate OMP instance"
```

---

### Task 14: Finish documentation, cleanup, and full verification

**Files:**
- Create: `README.md`
- Create: `docs/updating-upstream.md`
- Create: `docs/troubleshooting.md`
- Create: `CHANGELOG.md`
- Modify: package metadata and ignore rules as proven necessary

**Interfaces:**
- Documents exact install, build, setup, mode, update, prerequisite, recovery, and verification commands.
- Produces the final release-ready repository state.

- [ ] **Step 1: Write documentation from observed commands**

Document only commands exercised during Tasks 11–13. Installation uses native `omp plugin link`/install. Setup has interactive and `--file` examples. Explain automatic mode, off/on/status, local-process lifetime, external Graphite/GitHub prerequisites, and current-project transcript privacy.

- [ ] **Step 2: Document upstream updates**

Explain immutable vendor ownership, classification modes, override review, sync failure behavior, provenance, and reproducibility verification.

- [ ] **Step 3: Run the complete static suite**

Run:

```bash
bun test
bun run typecheck
bun run build:plugin
bun run verify:generated
```

Expected: every command exits 0.

- [ ] **Step 4: Run OMP plugin doctor/integration**

Run native plugin list/doctor checks and the full integration suite. Expected: no warnings attributable to pstack-omp.

- [ ] **Step 5: Re-run the real acceptance smoke after cleanup**

Run a smaller automatic-routing smoke covering one scalar role, one panel, loop, goal, and resume. This guards against documentation/packaging cleanup breaking the installed artifact.

- [ ] **Step 6: Review generated and handwritten code for unnecessary complexity**

Remove dead adapters, compatibility shims without a tested caller, duplicate instructions, unused role aliases, and generated artifacts that are not part of install/reproducibility. Preserve behavior and rerun affected tests after each simplification.

- [ ] **Step 7: Commit final release state**

```bash
git add README.md docs CHANGELOG.md package.json .gitignore dist src plugin overrides scripts tests upstream vendor
git commit -m "feat: complete pstack for OMP"
```

- [ ] **Step 8: Record final evidence**

Report exact OMP version, upstream pstack commit, build/test commands, separate-session acceptance scenarios, model selectors, route/model evidence, loop/goal evidence, and any genuine environmental limitation. Do not claim Linux runtime verification unless it was actually exercised.

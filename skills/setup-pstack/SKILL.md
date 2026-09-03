---
name: setup-pstack
description: Configure which models pstack uses per role. Detects your available models with `pi --list-models` and writes an override file the skills read. Use for /setup-pstack, "configure pstack models", or changing pstack's model choices.
---

# Setup pstack

Write `~/.pi/agent/pstack/models.md`, an override file that sets pstack's model per role. The skills read it and fall back to their inline defaults when a line is absent, so this is an override layer, not a requirement.

## Steps

### 1. Detect available models

Run `pi --list-models`. That table is the dependable source: each row is a provider and a model, and the `provider/model` form is the selector `pi --model` accepts. If it is empty or errors, ask the user to paste the selectors they have access to. Never write a real selector you have not confirmed is available.

### 2. Load current state

The default role-to-model mapping is the rule shape shown in step 5 below. If `~/.pi/agent/pstack/models.md` already exists, read it and treat its values as the current choices. Otherwise start from the role-language defaults: every panel and judgment role uses the strongest judgment model, exploration and mechanical work use the fast mechanical model, and critic/judge roles prefer a model family different from the session's.

### 3. Map and confirm

Show every role with its current model, marking any real selector not in the detected set as needing a choice. Ask in prose whether to accept as-is or change specific roles, offering the detected selectors as the options. For panel roles (how critics, arena runners, architect runners, interrogate reviewers) the value is a list, and one sequential pass runs per entry, so the list length sets the pass count. `arena cross-judge pool` is also a list, but Arena selects one value from it whose model family differs from the session model when possible. `swarm workers` is the default model for every ownership block in a swarm run unless a race or comparison assigns another model per arm.

### 4. Validate

Every real selector written must be in the detected set. If a chosen real selector is not available, stop and ask again. A file pointing at a model the user cannot use breaks every pass that reads it.

### 5. Write the file

Write `~/.pi/agent/pstack/models.md`, one line per role, same line format as before, using the same labels poteto-mode uses. Overwrite the whole file so re-runs stay idempotent. The values are the resolved selectors you confirmed in step 3, never a slug you invented. Shape (values are examples from a fresh `pi --list-models`; write the confirmed choices):

```
# pstack model configuration. One line per role. Delete a line to fall back to the skill default.
feature, refactoring: opencode-go/glm-5.3-flash
bug-fix: opencode-go/gpt-5.6-luna
perf-issue: opencode-go/gpt-5.6-luna
hillclimb: opencode-go/gpt-5.6-luna
judgment and prose: opencode-go/gpt-5.6-luna
hardest tasks: opencode-go/gpt-5.6-luna
how explorer: opencode-go/glm-5.3-flash
how explainer: opencode-go/gpt-5.6-luna
how critics: opencode-go/gpt-5.6-luna, opencode-go/gpt-5.6-sol, opencode-go/glm-5.3-flash, opencode-go/deepseek-v4-flash-vision-exp
why investigators: opencode-go/glm-5.3-flash
why synthesizer: opencode-go/gpt-5.6-luna
reflect tooling: opencode-go/gpt-5.6-sol
reflect judgment, divergent, synthesizer: opencode-go/gpt-5.6-luna
arena runners: opencode-go/gpt-5.6-luna, opencode-go/gpt-5.6-sol, opencode-go/glm-5.3-flash, opencode-go/deepseek-v4-flash-vision-exp
arena cross-judge pool: opencode-go/gpt-5.6-luna, opencode-go/gpt-5.6-sol, opencode-go/glm-5.3-flash, opencode-go/deepseek-v4-flash-vision-exp
swarm workers: opencode-go/glm-5.3-flash
architect runners: opencode-go/gpt-5.6-luna, opencode-go/gpt-5.6-sol, opencode-go/glm-5.3-flash, opencode-go/deepseek-v4-flash-vision-exp
interrogate reviewers: opencode-go/gpt-5.6-luna, opencode-go/gpt-5.6-sol, opencode-go/glm-5.3-flash, opencode-go/deepseek-v4-flash-vision-exp
```

### 6. Enforce delegation guardrails (structural, not prose)

Lauren's roles run as local subagents. These settings make the guardrails
real instead of advisory. Merge, never overwrite: read each file first and
preserve every unrelated key. Confirm each change with the user before
writing (settings edits are hard to review after the fact).

- In PI settings (`~/.pi/agent/settings.json`, `subagents` object): set
  `agentOverrides.<name>.disabled: true` for `claude-code`,
  `claude-code-writer`, `cursor-agent`, `cursor-agent-writer`,
  `codex-exec`, `codex-exec-writer`. These adapter identities shell out to
  other CLIs or external providers; pstack runs local only.
- In the pi-subagents extension config
  (`~/.pi/agent/extensions/subagent/config.json`): set `worktree: true`
  so launches that forget the flag are still isolated, and
  `maxSubagentDepth: 2` (flat panels need 1, track coordinators need 2).
- Require `pi-subagents` installed. Refuse to finish setup when it is
  missing: role delegation without it silently degrades to prose.

### 7. Install companion utilities when missing

These ship separately so they never double-register against the user's own
copies. For each of `@narumitw/pi-goal`, `@trevonistrevon/pi-loop`,
`pi-web-access`, `pi-memory`, `pi-updater`, `@99percentpeople/pi-codex-api`:
skip when already installed, otherwise ask once and run
`pi install npm:<name>`. Never force-install over an objection.

### 8. Confirm

Tell the user the file was written and that it applies to new sessions. Re-running this skill updates it. Then run `/pstack-status`: it must report clean. A drift line names the exact skipped guardrail; fix it before doing pstack work.

### 9. Offer a verification skill (optional)

Check whether the project has a way to drive the real app for proof (a `verify-*` skill, or an existing harness). If not, offer once: "want a project-local verification skill, so agents can drive the app the way a user does and prove changes work? I can generate one with /skill:create-verification-skill." On yes, invoke `/skill:create-verification-skill`. On no, move on without pushing.

---
name: swarm
description: "Run N workers over slices or race arms, drain them, and return one report. Use for /swarm, 'swarm this', or parallel coverage, races, gauntlets, and exploration."
disable-model-invocation: true
---

# Swarm

Run N workers over separate slices or identical race arms, drain them, and return one report. Workers are local subagents launched in one fan-out: the `pstack-swarm-worker` role agent (role agents live in `agents/`), one per slice or race arm, each with its own writable output under `/tmp/<slug>/worker-<n>/`. Each worker gets a standalone brief and reports back with the same envelope. If the `subagent` tool is absent (pi-subagents not installed), run numbered sequential passes instead (see the fallback below).

## Start

Open a todo list (`pstack_todo` when present, else a markdown checklist) with one entry per phase before starting anything.

1. Frame
2. Fan out
3. Aggregate
4. Report

## Phase A: Frame

1. State the done predicate and the artifact or report the swarm must return.
2. Choose the shape. Partition into slices, race N workers on identical briefs, or mix both. For a race or mixed shape, declare `first pass`, `rank all`, or `best-of` before running.
3. Set N from the user or derive it from the shape. N is total workers, not a concurrency limit.
4. Resolve the worker model. Read the `swarm workers` line in `~/.pi/agent/pstack/models.md` when present (written by setup-pstack); otherwise the `pstack-swarm-worker` role agent's pinned model is the worker model. Every launch pins an explicit model: pass the resolved selector per run, never a slug you invented. For a model race, name each arm's model up front — the fan-out pins all arm models at once, so no session-model switching is needed.
5. Give each worker its own writable output at `/tmp/<slug>/worker-<n>/` (create it with bash). Each worker's brief names its own dir; reports and artifacts land there.
6. Decode write isolation. A worker that modifies the repo runs in its own managed git worktree (`worktree: true`) branched from HEAD, with a `gate` (the slice's single verification command) so the runtime records the evidence. A read-only worker (coverage, exploration) launches without `worktree` or `gate`. Managed worktrees require a clean repo state, so commit or stash before launching repo-writing workers.

## Phase B: Fan out

**Subagent fan-out (default).** When the `subagent` tool (pi-subagents) is present, launch all N workers with `workflowScript` `runs.all`, one run per worker. Each run names the `pstack-swarm-worker` role agent, pins an explicit `model` (the resolved swarm worker model), sets `context: "fresh"`, carries the worker's standalone brief as `task`, and sets `worktree: true` plus a `gate` only when the worker writes to the repo. The run's managed git worktree keeps repo writes isolated; never merge a worktree back without explicit user confirmation — show the diff and wait.

```js
subagent({
  async: true,
  workflowScript: `
    const workers = [
      { key: "worker-1", brief: "<slice-1 brief, standalone>", model: "<resolved swarm worker model>", writes: true, gate: "<slice verification command>" },
      { key: "worker-2", brief: "<slice-2 brief, standalone>", model: "<resolved swarm worker model>" }
    ];
    const results = await runs.all(workers.map(w => ({
      key: w.key,
      agent: "pstack-swarm-worker",
      model: w.model,
      task: w.brief,
      context: "fresh",
      ...(w.writes ? { worktree: true, gate: w.gate } : {})
    })));
    return results.map(r => ({ key: r.key, status: r.status, outputReference: r.outputReference, artifactPaths: r.artifactPaths }));
  `
})
```

Every brief stands alone. Include the goal, scope, exact slice or race arm, its output dir under `/tmp/<slug>/worker-<n>/`, how to verify, and what to report. Reports use `PASS`, `ISSUES`, or `BLOCKED` with evidence.

If a worker drops out or returns `BLOCKED`, proceed with N-1 and note it. `runs.all` keeps sibling lanes running when one lane blocks or fails.

For a model race, each arm's `model` differs and the fan-out pins them all up front; record which model each arm ran under from the run results. If every arm shares one model, say so in the report: race signals are weaker with one model.

**Fallback: sequential passes (used only when the `subagent` tool is absent).**

Run all N briefs as numbered sequential passes in one session, in the order declared. Each pass is self-contained: read its brief, do the work, write outputs, report. Do not start a pass until the previous one has reported.

- Give each pass its own output dir at `/tmp/<slug>/worker-<n>/` (create it with bash). Reports and artifacts land there.
- When a pass must modify the repo, create an isolated checkout with `git worktree add /tmp/<slug>/worker-<n>/` and run the pass in it. Never merge a worktree back without explicit user confirmation; show the diff and wait.
- For a model race, the user switches model before each pass (`--model provider/id` on launch, or Ctrl+P to cycle). Record which model each pass ran under. If the user keeps one model for all passes, say so in the report: race signals are weaker with one model.
- A configured worker model of `inherit-parent` or `auto` means the pass runs on the current session model; those values are never broken model slugs.

Every brief stands alone. Include the goal, scope, exact slice or race arm, how to verify, and what to report. Reports use `PASS`, `ISSUES`, or `BLOCKED` with evidence.

If a pass is abandoned or cannot complete, proceed with N-1 and note it.

## Phase C: Aggregate

Read each worker's report file under `/tmp/<slug>/worker-<n>/`; with the fan-out, also read the workflow result (each child's key, status, and output reference). For coverage, every required slice needs a result. For a race, apply the selection rule declared up front. Use first pass, rank all, or best-of. Do not paste raw worker dumps.

Keep a compact result table, one-line evidenced issues, and explicit gaps or dropouts.

## Phase D: Report

Return one consolidated in-chat report with the table, issue one-liners, gaps or dropouts, and the race rule when used.

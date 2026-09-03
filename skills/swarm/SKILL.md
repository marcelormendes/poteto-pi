---
name: swarm
description: "Run N workers over slices or race arms, drain them, and return one report. Use for /swarm, 'swarm this', or parallel coverage, races, gauntlets, and exploration."
disable-model-invocation: true
---

# Swarm

Run N workers over separate slices or identical race arms, in one session, then aggregate and return one report. Workers run as numbered sequential passes: each pass gets a standalone brief, its own writable output, and reports back with the same envelope.

## Start

Open a todo list (`pstack_todo` when present, else a markdown checklist) with one entry per phase before starting anything.

1. Frame
2. Run
3. Aggregate
4. Report

## Phase A: Frame

1. State the done predicate and the artifact or report the swarm must return.
2. Choose the shape. Partition into slices, race N workers on identical briefs, or mix both. For a race or mixed shape, declare `first pass`, `rank all`, or `best-of` before starting.
3. Set N from the user or derive it from the shape. N is total workers, not a concurrency limit.
4. Pick the worker model from `swarm workers` in `~/.pi/agent/pstack/models.md` when present. Otherwise use the fast mechanical model (setup default). For a model race, name each arm's model up front.
5. Give each worker its own writable output when it writes. Use a `git worktree` created via bash, or `/tmp/<slug>/worker-<n>/`.

## Phase B: Run

Run all N briefs as numbered sequential passes in one session, in the order declared. Each pass is self-contained: read its brief, do the work, write outputs, report. Do not start a pass until the previous one has reported.

- Give each pass its own output dir at `/tmp/<slug>/worker-<n>/` (create it with bash). Reports and artifacts land there.
- When a pass must modify the repo, create an isolated checkout with `git worktree add /tmp/<slug>/worker-<n>/` and run the pass in it. Never merge a worktree back without explicit user confirmation; show the diff and wait.
- For a model race, the user switches model before each pass (`--model provider/id` on launch, or Ctrl+P to cycle). Record which model each pass ran under. If the user keeps one model for all passes, say so in the report: race signals are weaker with one model.
- A configured worker model of `inherit-parent` or `auto` means the pass runs on the current session model; those values are never broken model slugs.

Every brief stands alone. Include the goal, scope, exact slice or race arm, how to verify, and what to report. Reports use `PASS`, `ISSUES`, or `BLOCKED` with evidence.

If a pass is abandoned or cannot complete, proceed with N-1 and note it.

## Phase C: Aggregate

Read the terminal results and each pass's report file under `/tmp/<slug>/worker-<n>/`. For coverage, every required slice needs a result. For a race, apply the selection rule declared up front. Use first pass, rank all, or best-of. Do not paste raw worker dumps.

Keep a compact result table, one-line evidenced issues, and explicit gaps or dropouts.

## Phase D: Report

Return one consolidated in-chat report with the table, issue one-liners, gaps or dropouts, and the race rule when used.

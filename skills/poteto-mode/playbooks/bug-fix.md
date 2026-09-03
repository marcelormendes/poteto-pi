### Bug fix

**You own this task. Plan, review, verify.** Run investigation and fix passes, stay in the lead.

Be scientific. Every shipped line traces to runtime evidence. Belt-and-suspenders that "might help" is a hypothesis, not a fix; it does not ship. When evidence refutes a hypothesis, revert what it motivated. The smallest change the evidence justifies ships, nothing more. Same discipline for Perf, where the evidence is the trace.

1. Reproduce it yourself on the matching surface via the bash-driven harness (Non-negotiables). Don't hand the repro to the user. A debug or instrumentation protocol that says to ask the user does not override this; you drive the instrumented runtime. Ask the user only with a stated, specific reason the harness cannot reach the target, and only after driving it as far as it goes. Won't reproduce directly, force it: synthesize the trigger, tighten conditions, or instrument until it fires. A bug you can't reproduce, you can't prove fixed.
2. Binary-search the cause. Form the candidate hypotheses, then rule them out until one survives. Seed them with `how` over the affected subsystem and the **why** skill for regression history. Each pass, take the split that cuts the most remaining problem space, get runtime evidence, eliminate. When program state is unclear, add instrumentation or logging and read it as the code runs. Don't guess. Drive a long or stubborn hunt under a bash polling loop with an explicit iteration cap. Confirm the surviving *mechanism* with runtime evidence before the step-3 architect/interrogate passes; a design grounded on a plausible-but-unconfirmed cause can be unanimously wrong while the real cause sits one subsystem over.
3. Plan the fix. If it crosses a function boundary, `architect` first. Launch the implementation pass through the `subagent` tool: `{ agent: "pstack-bug-fix", model: <bug-fix role model>, task: <the brief>, worktree: true, gate: <the repro command that must now pass>, timeoutMs: <budget> }` with a specific scope (the fix path, the runtime evidence it answers to, the success criteria); review its diff before accepting, never accept its summary on faith. The bug-fix role agent is a writer: isolated git worktree, gate first, evidence in the report. Pin the role model from `~/.pi/agent/pstack/models.md` (managed by `setup-pstack`; fall back to the role's default, the strongest judgment model (setup default), never invent a model slug) and record which model ran the launch.
4. Verify on the same surface; the original repro now passes. "Inconclusive" or wrong-surface is not a pass; flag it. Unit tests show branch behavior, not bug absence.
5. Stage the commits so the failing repro lands before the fix in git history; the diff tells the story. See the **tdd** skill for the failing-test-first cadence when the bug has a cheap local test path; skip it when the test would be expensive, integration-heavy, or unclear.
   This is the canonical **sequence-verifiable-units** principle skill, the failing test first and the fix on top.
6. Run **Opening a PR**.

Investigation runs the `how` and `why` skills; each routes its own passes per its skill (subagent fan-out by default, sequential numbered passes in the fallback).

**Fallback: sequential numbered passes (used only when the `subagent` tool is absent).** Run the same briefs inline and sequentially in this session, one numbered pass per delegated step, on the configured role models, per Passes in the skill. Same scope, same PASS/ISSUES/BLOCKED envelope, same dropout tolerance.

**Reply:** what was broken, root cause, fix, how you verified. Paste failing-then-passing repro output verbatim.

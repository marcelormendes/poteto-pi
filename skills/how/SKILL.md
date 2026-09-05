---
name: how
description: "Use for \"how does X work\", code walkthroughs before changing something, and placement / ownership / layering questions (\"where should this live\", \"which package owns this\", \"is this the right layer\"). Explains subsystem architecture, runtime flow, onboarding mental models. Can critique architecture. Use why for motivation."
disable-model-invocation: true
---

# How

Explore the codebase to answer "how does X work?" questions. Produce clear architectural explanations at the level of a senior engineer onboarding onto a subsystem. Enough to build a working mental model, not annotated source code.

Two modes:

1. **Explain** (default). Run exploration passes and produce a clear explanation
2. **Critique.** Explain first, then run one critic pass per model in your configured critic list to independently identify architectural issues

## Explain Mode

### Step 1. Understand the Question and Assess Complexity

Parse what the user is asking about:

- "How does the rate limiter work?", a subsystem
- "How do we handle billing for on-demand usage?", a feature flow
- "How is the auth service structured?", an architectural overview
- "Walk me through what happens when a user submits a form", a runtime trace

Identify the scope. If ambiguous, state your best-guess interpretation before exploring. Don't ask. Let the user redirect if you're off.

**Assess complexity to decide the approach:**

- **Simple** (a single module, a small utility, a narrow question like "how does function X work"): skip explorer passes; the explainer explores and explains in a single pass. Go to Step 2b.
- **Complex** (a subsystem spanning multiple files/services, a cross-cutting feature, a full architectural overview): run the explorer fan-out first, then hand off to the explainer. Go to Step 2a.

When in doubt, lean simple. You can always run explorer passes if the explainer hits a wall.

### Step 2a. Explore (complex questions only)

Decompose the question into 2-4 exploration angles, each a distinct slice of the subsystem so passes don't duplicate work. Example split for "how does the rate limiter work?":

- Explorer 1: data model and state management
- Explorer 2: request path and enforcement
- Explorer 3: configuration and metrics infrastructure

The right decomposition depends on the question. Use your judgment. Narrow questions: 2 passes is fine. Broad subsystems: up to 4.

**Subagent fan-out (default).** When the `subagent` tool (pi-subagents) is present, launch one explorer per angle with `workflowScript` `runs.all`. Each run uses `context: "fresh"`, names the `pstack-how-explorer` role agent (role agents live in `agents/`), pins the explorer role model from `~/.pi/agent/pstack/models.md` (managed by `setup-pstack`; fall back to the role's default, the fast mechanical model — never invent a model slug), and reads only. State “Do not modify files. Return findings only.” in the task. Build each run's `task` from the same base prompt in `references/explorer-prompt.md` plus a specific exploration angle naming its slice; the briefs stay identical across passes, and every brief is standalone — no explorer references another's findings. Results come back in launch order, each with its PASS / ISSUES / BLOCKED status. Record which model ran which pass.

**Fallback: sequential passes (used only when the `subagent` tool is absent).** Run the explorer passes sequentially, one pass per angle, in this session. Each pass is a numbered block of work run to completion before the next starts (Pass 1, Pass 2, ...). The briefs stay identical across passes; only the exploration angle differs.

Each pass gets the same base prompt from `references/explorer-prompt.md` plus a specific exploration angle naming its slice. Before the passes, switch the session model to the explorer role model when the active model differs from the role (see `~/.pi/agent/pstack/models.md`, managed by `setup-pstack`; default role model: the fast mechanical model). Record which model ran which pass.

Each pass should:
- Start broad: locate relevant directories and files (`find`, `ls`), grep for key types/interfaces/class names
- Follow the thread: from an entry point, trace the call chain (callers, callees, data flow, type definitions)
- Read the actual code, don't guess from file names
- Stop when it can describe the full path from input to output (or trigger to effect) without hand-waving any step
- Note things that are surprising, non-obvious, or that a newcomer would get wrong

Each pass returns structured findings with a PASS / ISSUES / BLOCKED status line: components found, flow traced, files read, anything non-obvious. A pass that can't trace its angle reports BLOCKED; skip it, note the dropout, and continue with the remaining passes. Overlap between passes is fine; the explainer reconciles.

Then proceed to Step 3.

### Step 2b. Direct Explain (simple questions)

**Subagent run (default).** When the `subagent` tool (pi-subagents) is present, launch the explainer as one `runs.run`: name the `pstack-how-explainer` role agent, pin the explainer role model from `~/.pi/agent/pstack/models.md` (default: the strongest judgment model), read-only. Its `task` is the prompt from `references/explainer-prompt.md`; it explores (find + grep + read) and writes the explanation in one go. Same structure, just no explorer findings as input. Record the model. Proceed to Step 4.

**Fallback (used only when the `subagent` tool is absent).** Run one explainer pass that explores and explains in one go. Read `references/explainer-prompt.md` for the communication style and output format. Do your own exploration (find + grep + read), then write the explanation directly. Same structure, just no explorer findings as input.

Run it on the explainer role model (default: the strongest judgment model; `~/.pi/agent/pstack/models.md`) and record the model. Proceed to Step 4.

### Step 3. Synthesize (complex questions only)

**Subagent run (default).** Once all explorer passes return, launch the synthesize pass as one `runs.run` on the `pstack-how-explainer` role agent, pinned to the explainer role model from `~/.pi/agent/pstack/models.md`, read-only. Its `task` collects every pass's findings and the template in `references/explainer-prompt.md`; it reconciles overlapping findings, resolves contradictions, and weaves the slices into one unified picture. Record the model.

**Fallback (used only when the `subagent` tool is absent).** Once all explorer passes return, run one synthesize pass that merges their findings into one coherent explanation. Collect every pass's findings, read `references/explainer-prompt.md` for the full prompt template, reconcile overlapping findings, resolve contradictions, and weave the slices into a unified picture. Run it on the explainer role model and record the model.

### Step 4. Present

Present the explainer's output to the user. You may lightly edit for clarity or add context from the conversation, but don't substantially rewrite. The explainer's communication is the product.

### Output Format

Follow this structure, adapted to the question. Not every section is needed for every question.

**Overview.** 1-2 paragraphs. What it is, what it does, why it exists. Enough to decide whether to keep reading.

**Key Concepts.** The important types, services, or abstractions. Brief definition of each. Not exhaustive, just the ones needed to understand the rest.

**How It Works.** The core of the explanation. Walk through the flow: what triggers it, what happens step by step, where data goes, the decision points. Prose, not pseudocode. Reference specific files and functions so the reader can go look, but don't dump code blocks unless a snippet is genuinely necessary.

**Where Things Live.** A brief map of the relevant files/directories. Not every file, just the ones needed to start working in this area.

**Gotchas.** Non-obvious or surprising things that would trip someone up. Historical context that explains why something looks weird. Known sharp edges.

**Pass log.** One line per pass: pass number, role, angle, model, status. Example: `Pass 1 — explorer — data model and state management — fast mechanical model — PASS`. This lets the reader see which model(s) produced the explanation.

## Critique Mode

Triggered when the user asks for architectural issues, problems, or improvements, not just understanding.

### Step 1. Explain First

Run the full explain flow above (Steps 1-4). You must understand the architecture before critiquing it.

### Step 2. Run Critics

After the explanation is complete, run one critic pass per model in your configured how-critics list (see the how-critics role list in `~/.pi/agent/pstack/models.md`; defaults: the strongest judgment model, the second-family model, the fast mechanical model, and a second strong-judgment model — setup resolves the concrete models, never invent PI model slugs). These are minimum reasoning levels. The lead should escalate any model when the architecture warrants deeper analysis.

**Subagent fan-out (default).** When the `subagent` tool (pi-subagents) is present, launch one critic per seat with `workflowScript` `runs.all`: each run names the matching `pstack-how-critics-<n>` role agent, pins that seat's model from the how-critics list in `~/.pi/agent/pstack/models.md` (setup resolves the concrete models; never invent PI model slugs), and reads only. Use the configured critic list, preserving its model diversity; disclose when all available critics share the author's family. Record which model ran which pass.

**Fallback (used only when the `subagent` tool is absent).** Run the critic passes sequentially, numbered, one per model, each as its own block in this session. Between passes the user switches the session model (`--model provider/id`, or Ctrl+P) so each pass reasons under a different model; record which model ran which pass. Each critic pass reads the code but edits nothing.

Read `references/critic-prompt.md` for the prompt template. Each critic pass gets:
1. The explanation from Step 1 (so it doesn't re-explore)
2. The relevant file paths (so it can read the actual code)
3. The architectural critique rubric from `references/critique-rubric.md`

Each critic pass returns its findings with a PASS / ISSUES / BLOCKED status line. Dropout tolerance: a BLOCKED pass (or a pass the user skips) is noted and the remaining passes continue.

### Step 3. Lead Judgment

Same framework as the interrogate skill. You're a pragmatic lead, not an aggregator.

Categorize findings:
- **Act on.** Architectural problems worth fixing now
- **Consider.** Real concerns, but the cost/benefit is unclear
- **Noted.** Valid observations, low priority
- **Dismissed.** Wrong, missing context, or style preference

Present the explanation first (from Step 1), then the critique verdict below it. The explanation should stand on its own; someone who just wants to understand the system shouldn't wade through critique. The verdict includes the pass log with the model that ran each critic pass.

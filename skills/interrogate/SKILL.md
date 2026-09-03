---
name: interrogate
description: "Use for \"interrogate\", \"adversarial review\", \"multi-model review\", \"challenge this\", \"stress test this code\", \"find blind spots\", or \"tear this apart\". Multiple LLM reviewers challenge changes from independent angles."
disable-model-invocation: true
---

# Interrogate

Run one reviewer pass per configured model to adversarially review code changes. Passes run sequentially in one session; the user switches the session model between passes so each pass applies a different model. Each pass gets the same prompt and rubric. The adversarial signal comes from model diversity, not assigned personas. Models differ in blind spots, priors, and reasoning patterns. Agreement across models is high-confidence signal; lone-model findings are worth reading but lower confidence.

The deliverable is a synthesized verdict. Do NOT auto-apply changes.

## Step 1, Determine Scope

Identify what to review from context:

- If the user points at specific files or a diff, use that
- If on a feature branch, run `git diff main...HEAD` (or the appropriate base branch) for the full changeset
- If the user's message references recent work, gather the relevant files

Package the diff (or file contents) plus any surrounding context files the reviewers need to understand the code.

## Step 2, State the Intent

Before running the reviewers, state the intent explicitly. What is this code trying to accomplish? Derive this from:

- The user's message
- Commit messages
- PR description if one exists
- The code itself

Write one clear paragraph. Reviewers challenge whether the work achieves the intent well, not whether the intent itself is correct. If you're unsure about the intent, ask the user before proceeding.

## Step 3, Run Reviewer Passes

Run the reviewers one at a time as numbered sequential passes in one session. Use the `interrogate reviewers` list from `~/.pi/agent/pstack/models.md` when present, one pass per entry, extending or shrinking the pass labels below to the configured entry count; otherwise use the table defaults.

| Pass | Model role |
|------|------------|
| Pass 1 | strongest judgment model (setup default) |
| Pass 2 | second-family model |
| Pass 3 | fast mechanical model (setup default) |
| Pass 4 | strongest judgment model (setup default) |

For each pass:

- Have the user switch the session model to the pass's configured model before the pass (`--model provider/id`, or Ctrl+P to cycle), then run the review as a direct read-only pass: read, explore, and report, but never write to the repo. If the model cannot be switched, run the pass on the current session model and record that in the verdict.
- A configured entry with value `inherit-parent` or `auto` means the pass runs on the current session model; those values are never broken model slugs. Do not block the review on model availability.
- Record which model each pass ran under, on the todo list (`pstack_todo` when present, else a markdown checklist).

Read `references/reviewer-prompt.md` and fill in the template with:

1. The stated intent
2. The diff or file contents
3. The review rubric from `references/rubric.md`
4. The code-quality lens from `references/code-quality-review.md`

The same filled template goes to every pass, so every model applies the code-quality lens.

Each pass produces structured findings as described in the prompt template.

## Step 4, Synthesize

As results come in, build a unified picture:

1. **Parse all findings** from the passes
2. **Identify consensus**. Findings raised by 2+ models independently are highest signal.
3. **Identify lone-model findings**. Still worth reading, but weight accordingly.
4. **Deduplicate**. Different models may describe the same issue differently. Merge these and note which models raised it.
5. **Note disagreements**. If one model flags something and another explicitly says the opposite, that's useful context for the verdict.

## Step 5, Lead Judgment

You are the lead reviewer, a pragmatic senior engineer, not a neutral aggregator.

Read `references/lead-judgment.md` for the full framework. Reviewers only see a slice of the codebase. You have the full context (the goal, the constraints, the timeline, which tradeoffs were already considered). Use that context aggressively.

Categorize every finding using these buckets:

- **Act on**. Real issues affecting correctness, security, or maintainability given the actual goals. These would block a real PR.
- **Consider**. Legitimate points, but you're not sure they outweigh the cost of addressing them right now. Worth the user's attention.
- **Noted**. Technically valid but not actionable. Context-dependent, premature optimization, or low-impact given the current stage.
- **Dismissed**. Wrong, nitpicky, or missing context. Brief explanation why.

For each finding, include:
- Which model(s) raised it
- The category (act on / consider / noted / dismissed)
- A one-line rationale for the categorization

## Output Format

Present the verdict in this structure:

### Intent
> [The stated intent paragraph from Step 2]

### Passes
- Pass [label]: [model that ran it], [N findings] (one bullet per pass)

### Act On
[Findings that should be addressed. For each: description, which models raised it, why it matters.]

### Consider
[Findings worth thinking about. For each: description, which models raised it, tradeoff involved.]

### Noted
[Valid but low-priority. Brief list.]

### Dismissed
[Rejected findings with brief rationale. This shows the user what was filtered out and why, so they can override your judgment if they disagree.]

### Agreement Map
[Where did models agree, where did they diverge, and what does the pattern of agreement/disagreement tell us?]

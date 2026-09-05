# Pstack to Pi porting rules

`upstream-skills/` is the immutable source snapshot from cursor/plugins at
`7314f72`. Preserve Lauren's methodology; change runtime bindings only.
The upstream pstack tree was compared again at `93b00b89` without source drift.

## Runtime bindings

- Cursor model rules become `pstack/models.md` under `PI_CODING_AGENT_DIR`
  (default `~/.pi/agent`). Resolve catalog models during setup; never invent
  provider selectors. Thinking suffixes are separate from model identities.
- Cursor skills become `.pi/skills/`; users invoke `/skill:name`. Models
  read a skill's SKILL.md through Pi's read tool.
- Panels and independent reviewers use fresh pi-subagents sessions with
  explicit models and standalone briefs. Preserve the number of reviewers,
  identical rubrics, blinding, synthesis, and dropout reporting.
- Writers use per-run managed worktrees and a verification gate. Readers
  omit worktree isolation. Preserve unrelated checkout changes.
- Without pi-subagents, disclose the sequential fallback and its weaker
  independence. Never label an inline pass a completed child model run.
- Todo state uses `pstack_todo`; transcript evidence uses
  `pstack_transcripts` with exact project scope and bounded reads.
- Verification drives the actual local surface with a CLI/PTY, browser
  harness, or HTTP client. Generate project verification skills from the
  runnable app and execute their instructions before claiming completion.
- Preserve supported Agent Skills frontmatter. Drop Cursor-only keys.
- Cloud-specific Grok UI, Benny, and SSH execution remain deferred.

## Verification

Check installed role discovery and execution, not just Markdown syntax.
A role launch needs successful runtime completion, actual model response
metadata, and any artifact or gate required by its skill. Keep failed
attempts as evidence. Run `bun run test`, both documented typechecks, a package
content check, and the affected live scenarios after runtime changes.

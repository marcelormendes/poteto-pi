# Pi adaptation boundaries

Validated runtime: Pi 0.84.4 with pi-subagents 0.64.0.

| Original pstack capability | Local Pi implementation |
|---|---|
| Skills and playbooks | Agent Skills files, invoked with `/skill:name` |
| Parallel model roles | pi-subagents `runs.all` / `runs.run`, explicit model selectors |
| Independent comment review | `pstack-comment-sicko`, parent applies accepted findings |
| Competing writer isolation | Managed Git worktrees with host-run verification gates |
| Todo list | `pstack_todo`, persisted in the active session branch |
| Sticky mode | `/pstack-mode`, restored on resume, fork, reload, and tree navigation |
| Model override rule | `pstack/models.md` under the selected Pi agent directory |
| Conversation lookup | `pstack_transcripts`, exact project scope and bounded streaming |
| Repetition | `/skill:loop`, declared stop predicate and iteration cap |
| Goal runs / web / MCP | Optional separate companion packages |
| Cloud agents and automations | Deferred; no remote execution in the package |

Pi models cannot execute slash commands as tools. The router provides
absolute skill paths and instructs the model to read the relevant SKILL.md.
The parent model stays selected by Pi; role runs choose their models
programmatically through pi-subagents. A sequential fallback cannot provide
the same context isolation or model diversity and must say so.

Agent frontmatter follows pi-subagents' parser: `tools: read, grep, find, ls`
is a comma-separated list, not a bracketed YAML flow list. Non-writing
roles declare `acceptanceRole: read-only` and `completionGuard: false`,
so prose such as “edit nothing” cannot trigger an implementation-only
completion check or an unnecessary writer acceptance report. Read-only
allowlists prevent direct mutation tools; roles that need Git or MCP evidence
retain tool access and a non-writing brief. That brief is not a security
sandbox. Subagent configuration does not make arbitrary shell commands safe.

Package-local skills still contain upstream-style default home examples.
`PI_CODING_AGENT_DIR` always takes precedence. The routing contract supplies
the effective model configuration path, and setup resolves the environment
before any writes.

Historical sequential-only assumptions in `planning/` describe earlier
prototypes. They are not instructions for the current package.

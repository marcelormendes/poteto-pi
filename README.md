# poteto-pi

Pstack methodology as a PI.dev package: 44 skills, 23 playbooks, 36 local
subagent roles, and a routing extension. Ported from upstream
`cursor/plugins` pstack at `7314f72`.

## Credits

All methodology is Lauren Tan's ([@poteto](https://x.com/poteto)) pstack:
go deep first, verify against the real surface, build the lever, then
parallelize with confidence. This package contributes only the PI.dev
adaptation layer (sequential fallbacks, role agents, guardrails, setup).
Upstream: https://github.com/cursor/plugins/tree/main/pstack (MIT).
If pstack makes you faster, the credit is hers.

## Companion bundle

Bundled with this package (pinned, version-sensitive):

| package | role |
|---|---|
| `pi-subagents` | local delegation (`subagent` tool, fleet, missions, `worktree: true` runs) |
| `pi-mcp-adapter` | MCP servers as tools (powers `why` investigators) |

Installed by `/skill:setup-pstack` when missing (version-tolerant utilities,
kept separate so they never double-register against your own copies):

| package | role |
|---|---|
| `@narumitw/pi-goal` | `/goal` autonomous single-objective completion |
| `@trevonistrevon/pi-loop` | scheduled re-wakes, durable workflows, background monitoring |
| `pi-web-access` | web fetch/search tools |
| `pi-memory` | semantic memory across logs and scratchpad (powers `recall`/`reflect`) |
| `pi-updater` | keeps pi and extensions updated |
| `@99percentpeople/pi-codex-api` | Codex subscription models inside PI |

Fresh PI, install this package, run `/skill:setup-pstack`, generate a
verification skill for the project — done. Everything runs local; this
port contains zero cloud constructs by policy.


```bash
pi install -l ./poteto-pi
```

## Use

The extension injects the routing contract at session start. Invoke skills
explicitly (models do not reliably self-load skills):

```text
/skill:poteto-mode build <feature> behind a flag, verify it really works
/skill:how how does the session store work?
/skill:arena compare two designs for the cache
/skill:swarm check every package against its check.sh
/skill:interrogate review this diff
```

`/pstack-mode on|off|status`, `/pstack-status`.

## Layout

- `extension/` — router injection (`before_agent_start`), `pstack_todo` and
  `pstack_transcripts` custom tools, `/pstack-mode`, `/pstack-status`.
- `skills/` — ported skill tree (methodology prose, references, scripts).
- `upstream-skills/` — immutable upstream source at the pinned commit.
- `planning/` — source planning docs plus `STUDY.md` migration notes.
- `PORTING.md`, `PI-DELTA.md` — port rules and platform deltas.

## PI adaptations (vs upstream)

- Delegation runs on bundled `pi-subagents`: fan-out panels target the
  `subagent` tool with `pstack-*` role agents, `worktree: true` isolation
  for writers, explicit per-run models. Sequential passes remain as the
  no-extension fallback path in every skill. (Skill-by-skill retarget at
  the `subagent` tool is in progress; the fallback text is current.)
- No programmatic model routing: the router names a role and `--model`
  selector; the user switches mid-session.
- `/loop` and `/goal` come from the bundled companions, not PI core.
- `make-bot-ui` (Grok/Tailscale) and Benny automations are dropped.
- `~/.pi/agent/pstack/models.md` replaces the Cursor rules override file.
- Guardrails are structural: external-CLI adapter agents disabled via
  settings, worktree isolation defaulted on, `/pstack-status` fails closed
  on drift. See `planning/ANALYSIS-subagents.md`.

If you already installed any companion standalone, remove it first:
bundled copies load from this package and duplicates would double-register
tools. `pi remove npm:<name>` before installing poteto-pi.

## Verify

```bash
bun test
bun run typecheck
```

# poteto-pi

Lauren Tan's [pstack](https://github.com/cursor/plugins/tree/main/pstack)
for the Pi coding harness: 45 skills, 23 playbooks, 37 local role agents,
and a routing extension. The methodology is hers: go deep first, prove
behavior on the real surface, write less code, then parallelize with confidence.
The vendored source is pinned at `7314f72` and matches upstream pstack at
`93b00b89ef425a9c1bac0d0b317dfc49c930ac99` (checked September 4, 2026).

## Install and set up

Validated with Pi 0.84.4. Bun runs the bundled orchestration and PR
watching helpers; Python 3 runs the live verification suite.

From another project, install this checkout with its absolute path:

```bash
pi install /absolute/path/to/poteto-pi
pi
```

Then run:

```text
/skill:setup-pstack
```

Setup detects available models, proposes a role table, verifies credentials
with real child calls, and writes `pstack/models.md` inside the Pi agent
directory. `PI_CODING_AGENT_DIR` overrides the default `~/.pi/agent`.
No credentials belong in that model table.

Companions are separate Pi packages. Setup installs the missing required
companion and preserves existing installations:

| Package | Purpose |
|---|---|
| `pi-subagents@0.64.0` | Required: local subagent execution |
| `pi-mcp-adapter@2.32.1` | Optional: MCP evidence sources |
| `@narumitw/pi-goal@0.54.4` | Optional: goal runs |
| `pi-web-access@0.27.0` | Optional: web research |

After installing a companion during an active session, reload Pi to make
its tools available. Do not remove existing companions to install pstack.

## Use

```text
/skill:poteto-mode fix the blank-input bug; reproduce first and verify the CLI
/skill:how how does the session store work?
/skill:architect compare designs for the cache; sketch only
/skill:arena compare two implementations of the cache
/skill:swarm check each package with its own verification command
/skill:interrogate review this diff
/skill:create-verification-skill
```

The extension enables routing by default. `/pstack-mode on|off|status`
controls it per session; `/pstack-status` checks setup. Agents can use the
`pstack_status` tool for the same check. Mode and todos follow the active
session branch and survive reloads.

Panels use fresh local subagents with explicit per-run model selectors.
Writer runs request managed Git worktrees and verification gates; readers
can work outside Git. The parent reviews and integrates results within the
user's authorized scope. Competing proposals require selection before
integration. If delegation is unavailable, skills disclose their sequential
fallback and the loss of independent context.

The package also supplies `pstack_todo`, bounded project-scoped
`pstack_transcripts`, optional `pstack_memory`, and a bounded `loop` skill.
`loop` is a skill invocation, not a Pi core scheduling command.

## Verify

```bash
bun install --frozen-lockfile
bun run test
bun run typecheck
bun run --cwd skills/poteto-mode/scripts typecheck
```

The live suite installs packages in an isolated Pi agent directory and
copies only the authorized OpenCode Go and OpenAI Codex credentials with
private file permissions. It retains prompts, Pi JSONL sessions, child
metadata, and result summaries. It never deletes an existing evidence root
or changes `HOME`.

```bash
python3 scripts/e2e/run.py --prepare --root /tmp/my-pstack-e2e --skills all --timeout 720
python3 scripts/e2e/run.py --root /tmp/my-pstack-e2e --roles all
```

Use `--run-label retry-1` to retain another attempt without overwriting
previous evidence. Live checks consume model quota. A completed assistant
reply alone does not prove delegated execution; required roles must have
successful child metadata and actual model responses.

The [September 4 audit](docs/audit-2026-09-04.md) records the fixes, tested
versions, per-skill results, and retained evidence paths.

## Source and scope

- `extension/`: Pi tools, session state, and routing.
- `skills/`: the runnable port, references, playbooks, and helpers.
- `agents/`: generated Pi role definitions; regenerate with
  `bun scripts/generate-agents.ts`.
- `upstream-skills/` and `upstream-docs/`: immutable upstream reference.
- `planning/`: historical design notes, including the deferred OMP port.
- `PORTING.md` and `PI-DELTA.md`: current adaptation rules and boundaries.

Cloud agents, SSH/Tailscale execution, Grok UI, and Benny automations are
outside this local port. The experimental `scripts/pi-fleet` is excluded
from the installable package. All upstream methodology remains MIT licensed;
see [LICENSE](LICENSE).

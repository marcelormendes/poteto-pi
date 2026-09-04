#!/usr/bin/env bash
# Clean-PI end-to-end role smoke test.
# Fresh HOME, only poteto-pi + pi-subagents + pi-mcp-adapter installed,
# real setup-pstack run, then one trivial subagent launch per role agent.
# Usage: ./scripts/e2e-roles.sh [--roles a,b,c] [--parent-model m]
set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
E2E_HOME="${E2E_HOME:-/tmp/poteto-e2e-home}"
WORK="$E2E_HOME/work"
PARENT_MODEL="${PARENT_MODEL:-opencode-go/glm-5.3-flash}"
TIMEOUT="${E2E_TIMEOUT:-150}"
PASS=0
FAIL=0
FAILED_ROLES=""

# Portable timeout (macOS has no timeout(1)). Runs argv, kills at deadline.
with_timeout() {
  local secs="$1"; shift
  "$@" &
  local pid=$!
  ( sleep "$secs"; kill "$pid" 2>/dev/null ) &
  local watcher=$!
  wait "$pid" 2>/dev/null
  local code=$?
  kill "$watcher" 2>/dev/null
  wait "$watcher" 2>/dev/null
  return "$code"
}

ALL_ROLES="$(ls "$ROOT"/agents/*.md | xargs -n1 basename | sed 's/.md$//' | sort | tr '\n' ' ')"

if [[ "${1:-}" == "--roles" ]]; then ALL_ROLES="$2"; fi

step() { printf '\n=== %s ===\n' "$1"; }
fail() { FAIL=$((FAIL + 1)); FAILED_ROLES="$FAILED_ROLES $1"; printf 'FAIL: %s\n' "$2"; }
pass() { PASS=$((PASS + 1)); printf 'PASS: %s\n' "$1"; }

step "clean home"
rm -rf "$E2E_HOME"
mkdir -p "$E2E_HOME/.pi/agent" "$WORK"
cp "$HOME/.pi/agent/auth.json" "$E2E_HOME/.pi/agent/auth.json"
chmod 600 "$E2E_HOME/.pi/agent/auth.json"
export HOME="$E2E_HOME"
export PI_CODING_AGENT_DIR="$E2E_HOME/.pi/agent"
cd "$WORK" || exit 1

step "install poteto-pi + delegation substrate only"
for src in "$ROOT" "npm:pi-subagents" "npm:pi-mcp-adapter"; do
  with_timeout 120 pi install "$src" >/dev/null 2>&1 || { fail install "pi install $src failed"; }
done
python3 -c "import json; print(len(json.load(open('$E2E_HOME/.pi/agent/settings.json'))['packages']), 'packages installed')"

step "setup-pstack accepting defaults"
with_timeout 280 pi --model "$PARENT_MODEL" --no-session -p "/skill:setup-pstack. Accept every default without asking any questions. Write all files including guardrail settings. Do not ask for confirmation." >/tmp/poteto-e2e-setup.log 2>&1 || fail setup "setup run failed"
test -f "$E2E_HOME/.pi/agent/pstack/models.md" || fail setup "models.md missing"
ROLE_LINES="$(grep -c ": " "$E2E_HOME/.pi/agent/pstack/models.md" 2>/dev/null || echo 0)"
[[ "$ROLE_LINES" -ge 15 ]] || fail setup "models.md has $ROLE_LINES role lines, need >= 15"
[[ "$FAIL" -eq 0 ]] && pass "setup wrote $ROLE_LINES role lines"

step "guardrail files present"
for f in "$E2E_HOME/.pi/agent/settings.json" "$E2E_HOME/.pi/agent/extensions/subagent/config.json"; do
  [[ -f "$f" ]] || fail guardrails "missing $f"
done
[[ "$FAIL" -eq 0 ]] && pass "guardrail files present"

step "role smoke"
for role in $ALL_ROLES; do
  out="$(with_timeout "$TIMEOUT" pi --model "$PARENT_MODEL" --no-session -p "Use the subagent tool with agent $role and task 'Reply with exactly: agent=$role. Do not read, write, edit, or run anything.' Reply with ONLY the child's exact reply text." 2>&1 | head -6)"
  if printf '%s' "$out" | grep -q "agent=$role"; then
    pass "$role"
  else
    fail "$role" "$(printf '%s' "$out" | head -2 | tr '\n' '|')"
  fi
done

printf '\nE2E RESULT: %d pass, %d fail\n' "$PASS" "$FAIL"
[[ -n "$FAILED_ROLES" ]] && printf 'failed:%s\n' "$FAILED_ROLES"
[[ "$FAIL" -eq 0 ]]

#!/usr/bin/env bash
# Read-only worktree prune audit. Classifies every git worktree by size, merge
# state, uncommitted work, remote/PR state, and the most recent chat that
# operated in it. Emits a table sorted by size with a suggested bucket. Never
# deletes anything; deletion stays a human-gated step in the playbook.
#
# Usage: worktree-audit.sh [repo-path]   (defaults to the current repo)
set -u

repo="${1:-$(git rev-parse --show-toplevel 2>/dev/null)}"
[ -z "$repo" ] && { echo "not in a git repo; pass a repo path" >&2; exit 1; }
cd "$repo" || exit 1

# Main worktree is the first entry; everything else is a candidate.
main_wt=$(git -c core.quotePath=false worktree list --porcelain | sed -n 's/^worktree //p' | head -1)

# Use existing refs; the audit does not fetch or change repository state.

# PR state by branch, fetched once. Empty if gh is unavailable.
prs=$(mktemp)
trap 'rm -f "$prs"' EXIT
gh pr list --author "@me" --state all --limit 1000 \
	--json number,state,headRefName 2>/dev/null > "$prs" || echo "[]" > "$prs"

# Session transcripts dir: PI session trees below ~/.pi/agent/sessions,
# one dir per project with one .jsonl per session. Override via PSTACK_TRANSCRIPTS_DIR.
transcripts="${PSTACK_TRANSCRIPTS_DIR:-${PI_CODING_AGENT_SESSION_DIR:-${PI_CODING_AGENT_DIR:-$HOME/.pi/agent}/sessions}}"
now=$(date +%s)

printf "SIZE\tAGE\tMERGED\tDIRTY\tREMOTE\tPR\tLAST_SESSION\tBUCKET\tWORKTREE\n"

git -c core.quotePath=false worktree list --porcelain | sed -n 's/^worktree //p' | while IFS= read -r wt; do
	[ "$wt" = "$main_wt" ] && continue

	size=$(du -sh "$wt" 2>/dev/null | awk '{print $1}')
	head=$(git -C "$wt" rev-parse HEAD 2>/dev/null)
	head_ts=$(git -C "$wt" log -1 --format='%ct' HEAD 2>/dev/null || echo 0)
	age=$([ "$head_ts" -gt 0 ] 2>/dev/null && echo "$(( (now - head_ts) / 86400 ))d" || echo "?")

	# Squash-merged branches are not ancestors of main, so PR state is the
	# real signal; merge-base only catches fast-forward/rebase merges.
	git merge-base --is-ancestor "$head" origin/main 2>/dev/null && merged=YES || merged=no

	# Both tracked edits and untracked files prevent a prune recommendation.
	porcelain=$(git -C "$wt" status --porcelain 2>/dev/null) || porcelain="?? [unreadable worktree]"
	if [ -z "$porcelain" ]; then dirty=clean
	elif printf '%s\n' "$porcelain" | grep -qv '^??'; then
		dirty="wip:$(printf '%s\n' "$porcelain" | grep -cv '^??')"
	else dirty="scratch:$(printf '%s\n' "$porcelain" | grep -c '^??')"; fi

	branch=$(git -C "$wt" symbolic-ref --quiet --short HEAD 2>/dev/null || echo "")
	if [ -z "$branch" ]; then remote=detached
	elif git -C "$wt" show-ref --verify --quiet "refs/remotes/origin/$branch"; then
		[ "$(git -C "$wt" rev-parse "origin/$branch" 2>/dev/null)" = "$head" ] \
			&& remote=pushed \
			|| remote="ahead$(git -C "$wt" rev-list --count "origin/$branch..HEAD" 2>/dev/null)"
	else remote=no-remote; fi

	pr=$([ -n "$branch" ] && jq -r --arg b "$branch" \
		'.[] | select(.headRefName==$b) | "#\(.number)/\(.state)"' "$prs" 2>/dev/null | head -1)
	[ -z "$pr" ] && pr="-"

	# Match the session header's exact project path, without reading history.
	last="-"; last_ts=0
	if [ -d "$transcripts" ]; then
		last_ts=$(python3 - "$transcripts" "$wt" <<'PY'
import json, os, pathlib, sys
root, worktree = pathlib.Path(sys.argv[1]), os.path.realpath(sys.argv[2])
latest = 0
for file in list(root.glob('*.jsonl')) + list(root.glob('*/*.jsonl')):
    try:
        with file.open() as stream:
            header = json.loads(stream.readline(65536))
        if header.get('type') == 'session' and header.get('cwd') and os.path.realpath(header['cwd']) == worktree:
            latest = max(latest, int(file.stat().st_mtime))
    except (OSError, ValueError):
        pass
print(latest)
PY
)
		if [ "$last_ts" -gt 0 ]; then
			last=$(python3 -c 'import datetime,sys; print(datetime.datetime.fromtimestamp(int(sys.argv[1])).date())' "$last_ts")
		fi
	fi
	recent=$([ "$last_ts" -gt 0 ] 2>/dev/null && [ $(( (now - last_ts) / 86400 )) -le 4 ] && echo yes || echo no)

	case "$dirty" in wip:*) bucket=hold-wip ;; scratch:*) bucket=hold-untracked ;; *)
		case "$pr" in *OPEN*) bucket=hold-open-pr ;; *)
			if [ "$recent" = yes ]; then bucket=verify-recent-session
			elif [ "$merged" = YES ] || [[ "$pr" == */MERGED ]]; then bucket=verify-merged
			else bucket=review; fi ;;
		esac ;;
	esac

	printf "%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n" \
		"$size" "$age" "$merged" "$dirty" "$remote" "$pr" "$last" "$bucket" "$wt"
done | sort -t$'\t' -k1,1 -rh

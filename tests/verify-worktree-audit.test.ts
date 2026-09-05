import { expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { chmodSync, mkdtempSync, mkdirSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("worktree audit preserves spaced paths, holds untracked files, and never equates CLOSED with merged", () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "pstack-worktree-")));
  const repo = join(root, "main repo");
  const worktree = join(root, "candidate with spaces");
  const bin = join(root, "bin");
  mkdirSync(repo); mkdirSync(bin);
  const git = (...args: string[]) => execFileSync("git", args, { cwd: repo, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  try {
    git("init", "-q", "-b", "main");
    git("-c", "user.name=Test", "-c", "user.email=test@localhost", "commit", "--allow-empty", "-qm", "base");
    git("update-ref", "refs/remotes/origin/main", "HEAD");
    git("worktree", "add", "-qb", "candidate", worktree);
    execFileSync("git", ["-c", "user.name=Test", "-c", "user.email=test@localhost", "commit", "--allow-empty", "-qm", "unmerged"], { cwd: worktree });
    writeFileSync(join(bin, "gh"), `#!/bin/sh\nprintf '%s\\n' '[{"number":1,"state":"CLOSED","headRefName":"candidate"}]'\n`);
    chmodSync(join(bin, "gh"), 0o755);
    const run = () => execFileSync("bash", [join(import.meta.dir, "../skills/poteto-mode/scripts/worktree-audit.sh"), repo], {
      env: { ...process.env, PATH: bin + ":" + process.env.PATH, PSTACK_TRANSCRIPTS_DIR: join(root, "no-sessions") }, encoding: "utf8",
    });
    const before = git("show-ref");
    const clean = run();
    expect(clean).toContain("#1/CLOSED");
    expect(clean).toContain("\treview\t" + worktree);
    writeFileSync(join(worktree, "precious-untracked.txt"), "keep");
    expect(run()).toContain("\thold-untracked\t" + worktree);
    expect(git("show-ref")).toBe(before);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

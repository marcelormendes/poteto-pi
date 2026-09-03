import { describe, expect, test } from "bun:test";
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const skillsDir = join(root, "skills");

const skillDirs = (await readdir(skillsDir)).filter(
  async (name) => (await stat(join(skillsDir, name)).catch(() => null))?.isDirectory(),
);

const FORBIDDEN = [
  "subagent_type",
  "run_in_background",
  "cloud_base_branch",
  "generalPurpose",
  "~/.cursor",
  ".cursor/skills",
  "grok-4.6",
  "claude-fable",
  "claude-opus",
  "TodoWrite",
  "agent-transcripts",
];

// opencode-go/* are real PI selectors (verified via pi --list-models); a bare
// gpt-5.6-sol outside that provider is a stale Cursor slug. The AskQuestion
// negation documents a PI limitation on purpose.
const extraChecks = (source: string, path: string, offenders: string[]): void => {
  if (source.replaceAll("opencode-go/gpt-5.6-sol", "").includes("gpt-5.6-sol")) {
    offenders.push(`${path}: gpt-5.6-sol`);
  }
  for (const line of source.split("\n")) {
    if (line.includes("AskQuestion") && !line.includes("no AskQuestion tool on PI")) {
      offenders.push(`${path}: AskQuestion`);
    }
  }
};

const walkSkillFiles = async (
  dir: string,
  visit: (path: string, source: string) => void | Promise<void>,
): Promise<void> => {
  for (const entry of await readdir(dir)) {
    if (entry === "node_modules") continue;
    const path = join(dir, entry);
    if ((await stat(path)).isDirectory()) {
      await walkSkillFiles(path, visit);
      continue;
    }
    if (!/\.(md|ts|mjs|sh)$/.test(entry)) continue;
    await visit(path, await readFile(path, "utf8"));
  }
};

describe("ported skill tree", () => {
  test("every skill has a valid name and description", async () => {
    expect(skillDirs.length).toBeGreaterThan(40);
    for (const dir of skillDirs) {
      const source = await readFile(join(skillsDir, dir, "SKILL.md"), "utf8");
      const match = /^---\n([\s\S]*?)\n---\n/.exec(source);
      expect(match, `${dir}/SKILL.md frontmatter`).not.toBeNull();
      const frontmatter = match?.[1] ?? "";
      expect(frontmatter, `${dir} name`).toMatch(/^name: \S+/m);
      const description = /^description: (.*)$/m.exec(frontmatter)?.[1] ?? "";
      expect(description.length, `${dir} description`).toBeGreaterThan(10);
    }
  });

  test("no Cursor runtime constructs survive", async () => {
    const offenders: string[] = [];
    await walkSkillFiles(skillsDir, (path, source) => {
      for (const pattern of FORBIDDEN) {
        if (source.includes(pattern)) offenders.push(`${path}: ${pattern}`);
      }
      extraChecks(source, path, offenders);
    });
    expect(offenders).toEqual([]);
  });

  test("relative reference links resolve", async () => {
    const missing: string[] = [];
    await walkSkillFiles(skillsDir, async (path, source) => {
      if (!path.endsWith(".md")) return;
      const dir = join(path, "..");
      for (const match of source.matchAll(/\[[^\]]*\]\(([^)#]+)(?:#[^)]*)?\)/g)) {
        const target = match[1] ?? "";
        if (/^(https?:|mailto:)/.test(target)) continue;
        if (target === "url") continue;
        await stat(join(dir, target)).catch(() => missing.push(`${path} -> ${target}`));
      }
    });
    expect(missing).toEqual([]);
  });
});

import { describe, expect, test } from "bun:test";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const agentsDir = join(import.meta.dir, "..", "agents");
const files = (await readdir(agentsDir)).filter((name) => name.endsWith(".md"));

describe("pstack role agents", () => {
  test("roster includes Comment Sicko, 16 workflow roles, and five 4-seat panels", () => {
    expect(files.length).toBe(37);
  });

  test("every agent declares name, description, and model", async () => {
    for (const file of files) {
      const source = await readFile(join(agentsDir, file), "utf8");
      const match = /^---\n([\s\S]*?)\n---\n/.exec(source);
      expect(match, `${file} frontmatter`).not.toBeNull();
      const frontmatter = match?.[1] ?? "";
      expect(frontmatter, `${file} name`).toMatch(/^name: pstack-\S+/m);
      expect(frontmatter, `${file} model`).toMatch(/^model: \S+\/\S+/m);
      expect(frontmatter, `${file} description`).toMatch(/^description: .{10,}/m);
    }
  });

  test("read-only roles carry tool allowlists, writers inherit", async () => {
    const readOnly = [
      "pstack-how-explorer.md",
      "pstack-how-explainer.md",
      "pstack-judgment-prose.md",
      "pstack-how-critics-1.md",
      "pstack-arena-cross-judges-2.md",
      "pstack-architect-runners-3.md",
      "pstack-interrogate-reviewers-4.md",
    ];
    for (const file of readOnly) {
      const source = await readFile(join(agentsDir, file), "utf8");
      const tools = /^tools: (.+)$/m.exec(source)?.[1]?.split(",").map((tool) => tool.trim());
      expect(tools, `${file} Pi tool names`).toEqual(["read", "grep", "find", "ls"]);
    }
    for (const file of ["pstack-feature.md", "pstack-arena-runners-1.md", "pstack-swarm-worker.md"]) {
      const source = await readFile(join(agentsDir, file), "utf8");
      expect(source, `${file} inherits tools`).not.toMatch(/^tools:/m);
    }
  });
});

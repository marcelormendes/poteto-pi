import { expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

test("the installable package contains runtime resources without nested dependencies or remote tools", () => {
  const root = join(import.meta.dir, "..");
  const output = execFileSync("npm", ["pack", "--dry-run", "--ignore-scripts", "--json"], { cwd: root, encoding: "utf8" });
  const [pack] = JSON.parse(output) as { files: { path: string }[] }[];
  const paths = pack!.files.map((file) => file.path);
  expect(paths).toContain("extension/pstack.ts");
  expect(paths).toContain("agents/pstack-comment-sicko.md");
  expect(paths).toContain("skills/poteto-mode/scripts/bun.lock");
  expect(paths).toContain("scripts/e2e/run.py");
  expect(paths.filter((path) => /node_modules|__pycache__|pi-fleet/.test(path))).toEqual([]);
  const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  expect(manifest.scripts.prepack).toBeUndefined();
});

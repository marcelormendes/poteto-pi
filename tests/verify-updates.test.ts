import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { checkCompanionUpdates } from "../extension/update-check";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
  delete process.env.PI_CODING_AGENT_DIR;
});

const useHome = async (): Promise<string> => {
  const home = await mkdtemp(join(tmpdir(), "pstack-updates-"));
  roots.push(home);
  process.env.PI_CODING_AGENT_DIR = join(home, "agent");
  return home;
};

const stubFetch =
  (versions: Record<string, string>) =>
  async (url: string): Promise<{ ok: boolean; json: () => Promise<unknown> }> => {
    const name = url.replace("https://registry.npmjs.org/", "").replace("/latest", "");
    const version = versions[name];
    if (!version) return { ok: false, json: async () => ({}) };
    return { ok: true, json: async () => ({ version }) };
  };

describe("companion update check", () => {
  test("checks own pinned dependencies and caches the verdict", async () => {
    await useHome();
    let calls = 0;
    const first = await checkCompanionUpdates(
      async (url: string) => {
      calls += 1;
        return { ok: true, json: async () => ({ version: "0.0.0" }) };
      },
      { "pi-subagents": "^0.64.0" },
    );
    expect(first.fresh).toBe(false);
    expect(first.stale).toEqual([]);
    expect(first.checkedAt).toBeDefined();
    const second = await checkCompanionUpdates(() => {
      throw new Error("must use cache, not network");
    }, { "pi-subagents": "^0.64.0" });
    expect(second.fresh).toBe(true);
    expect(second.stale).toEqual([]);
    expect(calls).toBe(1);
  });

  test("fails open when the registry is unreachable", async () => {
    await useHome();
    const result = await checkCompanionUpdates(async () => {
      throw new Error("offline");
    });
    expect(result.stale).toEqual([]);
    expect(result.checkedAt).toBeUndefined();
  });

  test("writing the cache requires no pre-existing directory", async () => {
    const home = await useHome();
    await mkdir(join(home, "agent", "pstack"), { recursive: true });
    await writeFile(
      join(home, "agent", "pstack", "update-check.json"),
      JSON.stringify({ at: new Date().toISOString(), stale: [], pins: JSON.stringify([]) }),
    );
    const result = await checkCompanionUpdates(stubFetch({}), {});
    expect(result.fresh).toBe(true);
    expect(result.stale).toEqual([]);
  });

  test("a changed pin set invalidates the cache", async () => {
    await useHome();
    await checkCompanionUpdates(stubFetch({ example: "1.0.0" }), { example: "1.0.0" });
    const result = await checkCompanionUpdates(stubFetch({ other: "2.0.0" }), { other: "1.0.0" });
    expect(result.fresh).toBe(false);
    expect(result.stale).toEqual(["other@2.0.0"]);
  });

  test("partial registry failures never become a cached clean verdict", async () => {
    await useHome();
    const pins = { one: "1.0.0", two: "1.0.0" };
    const result = await checkCompanionUpdates(stubFetch({ one: "1.0.0" }), pins);
    expect(result.checkedAt).toBeUndefined();
    const retry = await checkCompanionUpdates(stubFetch({ one: "1.0.0", two: "2.0.0" }), pins);
    expect(retry.fresh).toBe(false);
    expect(retry.stale).toEqual(["two@2.0.0"]);
  });
});

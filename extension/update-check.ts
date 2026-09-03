import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export interface UpdateStatus {
  readonly fresh: boolean;
  readonly stale: readonly string[];
  readonly checkedAt: string | undefined;
}

const CACHE_NAME = "update-check.json";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const FETCH_BUDGET_MS = 8000;

const agentDir = (): string =>
  process.env.PI_CODING_AGENT_DIR ?? join(homedir(), ".pi", "agent");

const cachePath = (): string => join(agentDir(), "pstack", CACHE_NAME);

const parseVersion = (version: string): [number, number, number] | undefined => {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(version.trim());
  if (!match) return undefined;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
};

const isNewer = (latest: string, pinned: string): boolean => {
  const next = parseVersion(latest);
  const current = parseVersion(pinned.replace(/^[\^~>=< ]+/, ""));
  if (!next || !current) return false;
  for (let index = 0; index < 3; index += 1) {
    if (next[index] !== current[index]) return next[index] > current[index];
  }
  return false;
};

const ownDependencies = async (): Promise<Record<string, string>> => {
  try {
    const root = join(dirname(fileURLToPath(import.meta.url)), "..");
    const manifest = JSON.parse(await readFile(join(root, "package.json"), "utf8")) as unknown;
    if (typeof manifest !== "object" || manifest === null || Array.isArray(manifest)) return {};
    const deps = (manifest as Record<string, unknown>).dependencies;
    if (typeof deps !== "object" || deps === null || Array.isArray(deps)) return {};
    const entries: Record<string, string> = {};
    for (const [name, range] of Object.entries(deps as Record<string, unknown>)) {
      if (typeof range === "string") entries[name] = range;
    }
    return entries;
  } catch {
    return {};
  }
};

type FetchLike = (
  url: string,
  init?: { signal?: AbortSignal },
) => Promise<{ ok: boolean; json: () => Promise<unknown> }>;

// Fail-open update check with a 24h disk cache. Never throws.
// Keep in sync with the pinned installs in skills/setup-pstack/SKILL.md step 7.
export const COMPANION_PINS: Record<string, string> = {
  "pi-subagents": "^0.64.0",
  "pi-mcp-adapter": "^2.32.1",
  "@narumitw/pi-goal": "^0.54.4",
  "pi-web-access": "^0.27.0",
};

export const checkCompanionUpdates = async (
  fetchImpl: FetchLike = fetch as unknown as FetchLike,
  pins: Record<string, string> | undefined = undefined,
): Promise<UpdateStatus> => {
  try {
    const cached = JSON.parse(await readFile(cachePath(), "utf8")) as unknown;
    if (typeof cached === "object" && cached !== null && !Array.isArray(cached)) {
      const entry = cached as { at?: unknown; stale?: unknown };
      if (
        typeof entry.at === "string" &&
        Date.now() - Date.parse(entry.at) < CACHE_TTL_MS &&
        Array.isArray(entry.stale)
      ) {
        return {
          fresh: true,
          stale: entry.stale.filter((name): name is string => typeof name === "string"),
          checkedAt: entry.at,
        };
      }
    }
  } catch {
    // fall through to refresh
  }
  const stale: string[] = [];
  let checkedAt: string | undefined;
  try {
    const deps = pins ?? (await ownDependencies());
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_BUDGET_MS);
    try {
      const results = await Promise.all(
        Object.keys(deps).map(async (name) => {
          const response = await fetchImpl(`https://registry.npmjs.org/${name}/latest`, {
            signal: controller.signal,
          }).catch(() => undefined);
          if (!response || !response.ok) return undefined;
          const payload = (await response.json().catch(() => undefined)) as unknown;
          const version =
            typeof payload === "object" && payload !== null && !Array.isArray(payload)
              ? (payload as Record<string, unknown>).version
              : undefined;
          return typeof version === "string" && isNewer(version, deps[name] ?? "")
            ? `${name}@${version}`
            : undefined;
        }),
      );
      stale.push(...results.filter((name): name is string => typeof name === "string"));
      checkedAt = new Date().toISOString();
      await mkdir(join(agentDir(), "pstack"), { recursive: true });
      await writeFile(cachePath(), JSON.stringify({ at: checkedAt, stale }));
    } finally {
      clearTimeout(timer);
    }
  } catch {
    // fail open: keep previous unknown state
  }
  return { fresh: false, stale, checkedAt };
};

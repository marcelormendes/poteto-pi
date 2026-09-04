export const ADAPTER_IDENTITIES = [
  "claude-code",
  "claude-code-writer",
  "cursor-agent",
  "cursor-agent-writer",
  "codex-exec",
  "codex-exec-writer",
] as const;

export const REQUIRED_MAX_SUBAGENT_DEPTH = 2;

export interface GuardrailFinding {
  readonly where: string;
  readonly key: string;
  readonly expected: string;
  readonly actual: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const describe = (value: unknown): string =>
  typeof value === "string" ? JSON.stringify(value) : String(value);

// Merge pstack guardrails into parsed PI settings without touching
// unrelated keys. Returns the merged settings plus human-readable changes.
// Adapter identities are external-CLI shells: they leave local PI or shell
// to other CLIs, so pstack disables them structurally instead of asking
// prose to avoid them.
export const mergeGuardrailsIntoSettings = (
  settings: Record<string, unknown>,
): { settings: Record<string, unknown>; changes: string[] } => {
  const merged: Record<string, unknown> = { ...settings };
  const subagents: Record<string, unknown> = isRecord(settings.subagents)
    ? { ...settings.subagents }
    : {};
  const overrides: Record<string, unknown> = isRecord(subagents.agentOverrides)
    ? { ...subagents.agentOverrides }
    : {};
  const changes: string[] = [];
  for (const identity of ADAPTER_IDENTITIES) {
    const current: Record<string, unknown> = isRecord(overrides[identity])
      ? { ...(overrides[identity] as Record<string, unknown>) }
      : {};
    if (current.disabled !== true) {
      overrides[identity] = { ...current, disabled: true };
      changes.push(`subagents.agentOverrides.${identity}.disabled=true`);
    }
  }
  if (Object.keys(overrides).length > 0) subagents.agentOverrides = overrides;
  merged.subagents = subagents;
  return { settings: merged, changes };
};

// Merge pstack guardrails into the pi-subagents extension config without
// touching unrelated keys. worktree:true makes managed worktree isolation
// the default so a launch that forgets the flag is still isolated.
export const mergeGuardrailsIntoExtensionConfig = (
  config: Record<string, unknown>,
): { config: Record<string, unknown>; changes: string[] } => {
  const merged = { ...config };
  const changes: string[] = [];
  if (merged.worktree !== true) {
    merged.worktree = true;
    changes.push("worktree=true");
  }
  if (typeof merged.maxSubagentDepth !== "number" || merged.maxSubagentDepth < REQUIRED_MAX_SUBAGENT_DEPTH) {
    merged.maxSubagentDepth = REQUIRED_MAX_SUBAGENT_DEPTH;
    changes.push(`maxSubagentDepth=${REQUIRED_MAX_SUBAGENT_DEPTH}`);
  }
  return { config: merged, changes };
};

// Read-only verification. Every finding is a skipped guardrail made
// visible; callers fail closed on any error.
export const verifyGuardrails = (options: {
  readonly piSettings: unknown;
  readonly extensionConfig: unknown;
}): GuardrailFinding[] => {
  const findings: GuardrailFinding[] = [];
  const settings = isRecord(options.piSettings) ? options.piSettings : {};
  const subagents = isRecord(settings.subagents) ? settings.subagents : {};
  const overrides = isRecord(subagents.agentOverrides) ? subagents.agentOverrides : {};
  for (const identity of ADAPTER_IDENTITIES) {
    const entry = isRecord(overrides[identity]) ? overrides[identity] : {};
    if (entry.disabled !== true) {
      findings.push({
        where: "pi settings",
        key: `subagents.agentOverrides.${identity}.disabled`,
        expected: "true",
        actual: describe(entry.disabled),
      });
    }
  }
  const config = isRecord(options.extensionConfig) ? options.extensionConfig : {};
  if (config.worktree !== true) {
    findings.push({ where: "subagent extension config", key: "worktree", expected: "true", actual: describe(config.worktree) });
  }
  if (typeof config.maxSubagentDepth !== "number" || config.maxSubagentDepth < REQUIRED_MAX_SUBAGENT_DEPTH) {
    findings.push({
      where: "subagent extension config",
      key: "maxSubagentDepth",
      expected: `>= ${REQUIRED_MAX_SUBAGENT_DEPTH}`,
      actual: describe(config.maxSubagentDepth),
    });
  }
  return findings;
};

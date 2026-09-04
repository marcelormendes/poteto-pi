import { describe, expect, test } from "bun:test";
import {
  ADAPTER_IDENTITIES,
  mergeGuardrailsIntoExtensionConfig,
  mergeGuardrailsIntoSettings,
  verifyGuardrails,
} from "../extension/setup-settings";

describe("subagent guardrails", () => {
  test("disables every external-CLI adapter identity without touching other keys", () => {
    const { settings, changes } = mergeGuardrailsIntoSettings({
      other: true,
      subagents: { defaultModel: "x", agentOverrides: { reviewer: { model: "y" } } },
    });
    expect(changes.length).toBe(ADAPTER_IDENTITIES.length);
    const subagents = settings.subagents as Record<string, unknown>;
    expect(subagents.defaultModel).toBe("x");
    const overrides = subagents.agentOverrides as Record<string, Record<string, unknown>>;
    expect(overrides.reviewer).toEqual({ model: "y" });
    for (const identity of ADAPTER_IDENTITIES) {
      expect(overrides[identity]?.disabled).toBe(true);
    }
  });

  test("merge is idempotent", () => {
    const first = mergeGuardrailsIntoSettings({});
    const second = mergeGuardrailsIntoSettings(first.settings);
    expect(second.changes).toEqual([]);
  });

  test("extension config keeps isolation opt-in and depth 2", () => {
    const { config, changes } = mergeGuardrailsIntoExtensionConfig({ missions: { enabled: true } });
    expect(config.worktree).toBeUndefined();
    expect(config.maxSubagentDepth).toBe(2);
    expect(config.missions).toEqual({ enabled: true });
    expect(changes).toEqual(["maxSubagentDepth=2"]);
  });

  test("extension config downgrades a global worktree default", () => {
    const { config, changes } = mergeGuardrailsIntoExtensionConfig({ worktree: true });
    expect(config.worktree).toBe(false);
    expect(changes).toContain("worktree=false");
  });

  test("verification fails closed on missing guardrails but not on absent worktree", () => {
    const findings = verifyGuardrails({ piSettings: {}, extensionConfig: {} });
    const keys = findings.map((finding) => finding.key).sort();
    expect(keys).toEqual(
      [
        ...ADAPTER_IDENTITIES.map((identity) => `subagents.agentOverrides.${identity}.disabled`),
        "maxSubagentDepth",
      ].sort(),
    );
    expect(
      verifyGuardrails({ piSettings: {}, extensionConfig: { worktree: true } }).map((finding) => finding.key),
    ).toContain("worktree");
  });

  test("verification passes on merged output", () => {
    const settings = mergeGuardrailsIntoSettings({}).settings;
    const config = mergeGuardrailsIntoExtensionConfig({}).config;
    expect(verifyGuardrails({ piSettings: settings, extensionConfig: config })).toEqual([]);
  });
});

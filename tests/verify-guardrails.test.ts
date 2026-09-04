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

  test("extension config defaults to worktree isolation and depth 2", () => {
    const { config, changes } = mergeGuardrailsIntoExtensionConfig({ missions: { enabled: true } });
    expect(config.worktree).toBe(true);
    expect(config.maxSubagentDepth).toBe(2);
    expect(config.missions).toEqual({ enabled: true });
    expect(changes).toEqual(["worktree=true", "maxSubagentDepth=2"]);
  });

  test("verification fails closed on every missing guardrail", () => {
    const findings = verifyGuardrails({ piSettings: {}, extensionConfig: {} });
    const keys = findings.map((finding) => finding.key).sort();
    expect(keys).toEqual(
      [
        ...ADAPTER_IDENTITIES.map((identity) => `subagents.agentOverrides.${identity}.disabled`),
        "maxSubagentDepth",
        "worktree",
      ].sort(),
    );
  });

  test("verification passes on merged output", () => {
    const settings = mergeGuardrailsIntoSettings({}).settings;
    const config = mergeGuardrailsIntoExtensionConfig({}).config;
    expect(verifyGuardrails({ piSettings: settings, extensionConfig: config })).toEqual([]);
  });
});

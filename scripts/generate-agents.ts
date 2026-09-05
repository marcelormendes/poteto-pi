// Generates agents/*.md from the pstack role table. Run: bun scripts/generate-agents.ts
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const dir = join(import.meta.dir, "..", "agents");

interface Role {
  name: string;
  description: string;
  model: string;
  thinking: "low" | "medium" | "high";
  tools?: string[];
  prompt: string;
}

const FAST = "opencode-go/glm-5.3-flash";
const JUDGE = "openai-codex/gpt-5.6-sol";
const SECOND = "openai-codex/gpt-5.6-sol";
const VISION = "opencode-go/deepseek-v4-flash-vision-exp";
const READONLY = ["read", "grep", "find", "ls"];

const panelSeats: ReadonlyArray<{ suffix: string; model: string; thinking: Role["thinking"] }> = [
  { suffix: "1", model: JUDGE, thinking: "high" },
  { suffix: "2", model: VISION, thinking: "high" },
  { suffix: "3", model: JUDGE, thinking: "medium" },
  { suffix: "4", model: FAST, thinking: "medium" },
];

const scalars: Role[] = [
  { name: "pstack-feature", description: "Pstack feature role: implement a complete behavior slice with tests", model: FAST, thinking: "medium", prompt: "Implement the assigned behavior slice completely with focused tests. Read the how skill's SKILL.md when the subsystem is unfamiliar. Verify against the real surface and report evidence." },
  { name: "pstack-comment-sicko", description: "Pstack Comment Sicko: independent review of comments and workaround code", model: JUDGE, thinking: "high", tools: READONLY, prompt: "Apply the no-comments skill checklist provided in the brief to the declared scope. Return proposed comment deletions, exact MUST KILL symbols with evidence, protected exceptions, and unresolved constraints. Do not edit files; the parent reviews and applies accepted findings." },
  { name: "pstack-refactoring", description: "Pstack refactoring role: behavior-preserving structural change", model: FAST, thinking: "medium", prompt: "Make the assigned behavior-preserving structural change. Pin behavior before edits, migrate callers, delete legacy paths in the same wave. Verify with the focused suite." },
  { name: "pstack-bug-fix", description: "Pstack bug-fix role: reproduce, root-cause, fix with runtime evidence", model: JUDGE, thinking: "high", prompt: "Reproduce the defect on the real surface first, trace to the root cause, fix there, keep a regression test. Never ship a speculative guard." },
  { name: "pstack-perf-issue", description: "Pstack perf role: trace measured slowness against a baseline", model: JUDGE, thinking: "high", prompt: "Capture the baseline number and trace first, then make one targeted change and re-measure. Report before/after with the sampling method." },
  { name: "pstack-hillclimb", description: "Pstack hillclimb role: sustained metric improvement, one win per step", model: JUDGE, thinking: "high", prompt: "Advance one metric with looped hypotheses and before/after measurement. One change per step; keep a decision log." },
  { name: "pstack-judgment-prose", description: "Pstack judgment role: prose decisions and adjudication", model: JUDGE, thinking: "high", tools: READONLY, prompt: "Return judgment as structured prose with evidence pointers. No workspace mutation." },
  { name: "pstack-hardest", description: "Pstack hardest role: cross-cutting design and subtle algorithms", model: JUDGE, thinking: "high", prompt: "Handle the assigned cross-cutting or algorithmic task end to end: ground first, implement, verify against the real surface." },
  { name: "pstack-how-explorer", description: "Pstack how-explorer role: read-only mechanics or integration evidence", model: FAST, thinking: "medium", tools: READONLY, prompt: "Investigate only the assigned slice. Read code and callers; cite exact paths and lines. Return PASS or ISSUES with evidence pointers. Never modify files." },
  { name: "pstack-how-explainer", description: "Pstack how-explainer role: synthesize explorer evidence", model: JUDGE, thinking: "high", tools: READONLY, prompt: "Synthesize assigned explorer evidence into an end-to-end explanation. Every material claim carries an evidence pointer. Never modify files." },
  { name: "pstack-why-investigator", description: "Pstack why-investigator role: source-control and repository archaeology", model: FAST, thinking: "medium", prompt: "Investigate the assigned evidence category with broad-to-narrow searches. Prefix findings Direct/Indirect/Contradiction/Lead. Workspace mutation is forbidden; use a non-writing posture." },
  { name: "pstack-why-synthesizer", description: "Pstack why-synthesizer role: evidence-backed historical explanation", model: JUDGE, thinking: "high", prompt: "Synthesize investigator evidence with explicit epistemics. Separate statements from inference. Workspace mutation is forbidden; use a non-writing posture." },
  { name: "pstack-reflect-tooling", description: "Pstack reflect-tooling role: review through the tooling lens", model: SECOND, thinking: "medium", prompt: "Review the session through the tooling lens only. Workspace mutation is forbidden; return lens findings with evidence pointers." },
  { name: "pstack-reflect-judgment", description: "Pstack reflect-judgment role: review through the judgment lens", model: JUDGE, thinking: "high", prompt: "Review the session through the judgment lens only. Workspace mutation is forbidden; return lens findings with evidence pointers." },
  { name: "pstack-reflect-divergent", description: "Pstack reflect-divergent role: contrarian review lens", model: FAST, thinking: "medium", prompt: "Review the session as a contrarian: missing alternatives, unchallenged assumptions. Workspace mutation is forbidden; return lens findings." },
  { name: "pstack-reflect-synthesizer", description: "Pstack reflect-synthesizer role: durable lesson synthesis", model: JUDGE, thinking: "high", prompt: "Synthesize lens outputs into durable decision-changing lessons only. Workspace mutation is forbidden; propose precise changes, never apply them." },
  { name: "pstack-swarm-worker", description: "Pstack swarm worker role: one disjoint slice, fully owned", model: FAST, thinking: "medium", prompt: "Complete exactly the assigned slice and nothing else. Stay inside declared ownership. Integrate nothing; return PASS/ISSUES/BLOCKED with evidence and verification." },
];

const panels: ReadonlyArray<{ role: string; job: string; tools?: string[] }> = [
  { role: "how-critics", job: "Skeptically assess the assigned explanation against the critique rubric in one pass. Return a scored verdict with exact evidence pointers. Never modify files.", tools: READONLY },
  { role: "arena-runners", job: "Implement the complete assigned artifact in the assigned isolated checkout only. Return status, artifact pointer, evidence, findings, rationale, rejected alternatives, confidence. Never touch the parent checkout." },
  { role: "arena-cross-judges", job: "Score blinded candidates against the rubric and recommend a base with cited evidence. You were selected from a contrasting model family; say nothing about candidate origins. Never modify files.", tools: READONLY },
  { role: "architect-runners", job: "Produce one complete design from caller usage through module boundaries with rationale, alternatives, and risks. Never modify files.", tools: READONLY },
  { role: "interrogate-reviewers", job: "Skeptically review the assigned identical evidence and rubric. Report findings with severity, exact file evidence, and confidence. Make no edits.", tools: READONLY },
];

const roles: Role[] = [...scalars];
for (const panel of panels) {
  for (const seat of panelSeats) {
    roles.push({
      name: `pstack-${panel.role}-${seat.suffix}`,
      description: `Pstack ${panel.role} seat ${seat.suffix}`,
      model: seat.model,
      thinking: seat.thinking,
      tools: panel.tools,
      prompt: panel.job,
    });
  }
}

await mkdir(dir, { recursive: true });
for (const role of roles) {
  const readOnly = role.tools === READONLY || /^pstack-(why-|reflect-)/.test(role.name);
  const frontmatter = [
    "---",
    `name: ${role.name}`,
    `description: ${JSON.stringify(role.description)}`,
    `model: ${role.model}`,
    `thinking: ${role.thinking}`,
    ...(role.tools ? [`tools: ${role.tools.join(", ")}`] : []),
    ...(readOnly ? ["acceptanceRole: read-only", "completionGuard: false"] : []),
    "---",
    "",
    role.prompt
      + (readOnly ? " Return the report as your final response; the runtime saves any configured output file." : "")
      + (role.tools === READONLY ? " Your tools are read-only. If a claim needs a command you cannot run, return the proposed check and evidence gap for the parent to verify. Do not wait for additional tool access." : ""),
    "",
  ].join("\n");
  await writeFile(join(dir, `${role.name}.md`), frontmatter);
}
console.log(`wrote ${roles.length} role agents`);

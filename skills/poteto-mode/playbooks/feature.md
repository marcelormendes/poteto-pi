### Feature

**You own the design. Plan, review, verify.** Write the code in a numbered pass; stay in the lead.

1. `how` over the affected subsystem.
2. `architect` for design exploration. Skipping stays as `architect skipped: <reason>`; do not fold the design decision silently into implementation.
3. Write the throughput checkpoint as four `pstack_todo` items (four checklist lines when the tool is unavailable). A dimension that genuinely does not apply (single file, no fan-out) keeps its item with `n/a: <reason>` rather than being dropped:
   - **Blocking first steps.** Gates run before the workstreams.
   - **Independent workstreams.** Disjoint files, services, or layers run as separate passes. Shared writes serialize.
   - **Shared mutable state.** Default to splitting the target (the **separate-before-serializing-shared-state** principle skill). Serialize only for real invariants.
   - **Smallest safe decomposition.** If one pass is best, name why.
4. Run the code-writing pass using your configured feature model (default `fast mechanical model (setup default)`) with a specific scope (file paths, named data shape and its organizing structure per **principle-model-the-domain** — a state machine over scattered booleans, a table/registry over branching, a typed model over repeated shape assumptions, chosen before the pass writes logic — and success criteria); review its diff before accepting it. When the implementation admits multiple valid shapes (error handling, abstraction layer, test structure), run it through the **arena** skill instead so the independent passes surface the alternatives and the cross-judge guards the pick. Mandatory: no skip-with-reason escape, and Laziness Protocol does not override it (the gain is review separation, not lines saved). The pass owns the diff with the review as a separate numbered pass before accept, so there is no "standing by" reply that waits on a helper. Comments per **Comments**. Surgical edits, re-ground against the source for upstream-derived files. Port shared-primitive improvements to all consumers and verify each. Commit liberally.
5. Verify on the matching surface. "Inconclusive" or wrong-surface is not a pass; flag it.
6. Rebase into small, ordered commits; stack follow-ups.
   Use the **sequence-verifiable-units** principle skill, building, verifying, and committing each small unit before the next.
7. If the design is contested, `interrogate` before shipping.
8. Run **Opening a PR**.

Code-coupled work (one feature, one migration) goes to a single owner with the checkpoint inline; that owner runs the internal workstreams sequentially after the blocking phase. Parent-level spans are for slices that produce independent artifacts (audits, cross-subsystem investigations, competing experiments). Rewrite the checkpoint at phase boundaries; start a fresh pass rather than chaining interrupts.

**Reply:** what you built, what you chose and why, open decisions. Tables for design alternatives.

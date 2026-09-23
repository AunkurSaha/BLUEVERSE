# AGENTS.md — Rules for Any Coding Agent

These instructions apply to Claude Code, Codex CLI, and any other coding agent working in this repository.

## Core Principle

**Do not optimize for appearing complete. Optimize for being correct, inspectable, and testable.**

This project handles scientific oceanographic data. Plausible-looking wrong output is worse than an explicit error.

---

## Required Workflow

For every task:

1. **Read the task carefully.**
2. **Inspect relevant files before editing.**
3. **Check `CLAUDE.md`, `docs/SCIENTIFIC_RULES.md`, and `docs/ARCHITECTURE.md`.**
4. **State assumptions that affect correctness.**
5. **Make the smallest coherent change.**
6. **Add/update tests when logic changes.**
7. **Run relevant tests or validation commands.**
8. **Review the diff.**
9. **Report limitations and unverified behavior.**

Never skip directly from prompt to large-scale code generation.

---

## Prohibited Behavior

Do not:
- invent APIs that have not been verified;
- invent dataset fields;
- invent file paths;
- fabricate oceanographic values;
- claim external data was downloaded if it was not;
- silently fall back to random/mock data;
- change scientific units without documenting the conversion;
- guess coordinate semantics where metadata is ambiguous;
- remove QC/provenance information;
- delete files without explicit need;
- alter Git history;
- commit secrets;
- place API keys in source files;
- rewrite unrelated code;
- suppress errors just to make a demo appear functional.

---

## Safe Mocking Rule

Mock/synthetic data is allowed only when:
- the task explicitly asks for it, OR
- a test fixture requires deterministic synthetic data.

Every mock dataset must be clearly marked:
- in code;
- in UI if user-visible;
- in documentation.

Use labels such as:
- `DEMO DATA`;
- `SYNTHETIC FIXTURE`;
- `NOT REAL OBSERVATION`.

---

## Scientific Review Checklist

Before approving ocean-data logic, check:
- coordinate names and orientation;
- longitude convention;
- time/calendar interpretation;
- depth/pressure meaning;
- variable units;
- missing-value masks;
- scale/offset decoding;
- observational QC;
- provenance;
- interpolation method;
- out-of-domain behavior.

---

## Frontend Review Checklist

Check:
- displayed unit matches backend unit;
- time is visible and unambiguous;
- depth is visible;
- selected actual model level is shown;
- colorbar has values and units;
- no fake values appear while loading;
- errors are visible;
- map coordinates are correct;
- layers do not imply higher resolution than source data.

---

## Backend Review Checklist

Check:
- large arrays remain lazy where possible;
- API validates parameters;
- no full-array serialization accidentally occurs;
- missing data is preserved;
- exceptions are meaningful;
- returned metadata is sufficient for scientific interpretation.

---

## Completion Standard

A task is complete only if:
- the requested behavior exists;
- relevant tests/validation pass;
- no known critical scientific issue is hidden;
- no unrelated features were added;
- the agent reports exactly what remains uncertain.

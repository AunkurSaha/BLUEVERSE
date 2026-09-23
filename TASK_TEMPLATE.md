# Agent Task Template

Copy this template when assigning a development task to Claude Code.

---

## Task

[Describe exactly one scoped task.]

## Context

Read:
- `CLAUDE.md`
- `AGENTS.md`
- `docs/PROJECT_CONTEXT.md`
- `docs/SCIENTIFIC_RULES.md`
- `docs/ARCHITECTURE.md`

Inspect the relevant existing code before editing.

## Goal

[What should work when the task is complete?]

## Inputs

[Real dataset/file/API/module involved.]

## Requirements

- [Requirement 1]
- [Requirement 2]
- [Requirement 3]

## Scientific Constraints

- Do not fabricate scientific data.
- Preserve source variable names/metadata.
- Preserve units.
- Preserve missing values.
- Preserve QC/provenance where relevant.
- Do not guess ambiguous coordinates or units.

Add any task-specific constraints here.

## Non-Goals

Do not:
- [non-goal]
- [non-goal]

## Tests / Validation

The implementation must verify:
- [test]
- [test]
- [manual validation]

## Completion Report

Return:
1. files changed;
2. summary of implementation;
3. tests/commands run;
4. assumptions;
5. known limitations;
6. anything not verified.

# Development Workflow for Claude Code and Codex CLI

## Roles

### Claude Code
Primary implementation agent.

Best used for:
- feature implementation;
- multi-file edits;
- frontend components;
- backend services;
- refactoring after review;
- documentation updates.

### Codex CLI
Independent reviewer and specialist.

Best used for:
- code review;
- bug hunting;
- scientific edge-case review;
- test review;
- algorithm review;
- performance review;
- debugging.

Do not routinely ask both agents to independently rewrite the same feature.

---

# Standard Feature Workflow

## Step 1 — Define task
Task must include:
- scope;
- success criteria;
- files/areas involved if known;
- scientific constraints;
- explicit non-goals.

## Step 2 — Claude implementation
Claude should:
- inspect first;
- explain plan;
- implement;
- test;
- summarize.

## Step 3 — Manual validation
Run the feature.

For scientific work, inspect actual output.

## Step 4 — Codex review
Ask Codex for review only first.

Suggested review prompt:

> Review the current implementation for correctness. Do not edit files. Check scientific assumptions, units, coordinates, missing values, QC, memory behavior, API contracts, tests, and edge cases. Rank findings by severity and cite relevant files/functions.

## Step 5 — Fix
Give confirmed findings back to Claude or Codex as a targeted fix request.

## Step 6 — Test
Run tests/validation again.

## Step 7 — Commit
Commit only after the checkpoint works.

---

# Agent Prompt Prefix

Use this at the start of important implementation tasks:

> Read `CLAUDE.md`, `AGENTS.md`, `docs/PROJECT_CONTEXT.md`, `docs/SCIENTIFIC_RULES.md`, and `docs/ARCHITECTURE.md` before changing code. Inspect the existing repository. Do not fabricate scientific data or silently create mocks. Preserve metadata, units, QC, and provenance. Make only the requested scoped change, add tests for scientific logic, run relevant validation, and report assumptions and limitations.

---

# Review Prompt Prefix

Use this for Codex:

> Read the repository rules first. Review only; do not modify files. Treat plausible-looking scientific output as untrusted until verified. Check coordinate systems, depth/pressure, time, units, QC, missing data, interpolation, memory behavior, API contracts, tests, and provenance. Return findings by severity with file/function references.

---

# Git Checkpoint Rule

Commit after meaningful working phases.

Example commits:
- `feat: add NetCDF metadata inspection`
- `feat: expose model slice API`
- `feat: render model temperature layer`
- `feat: add time and depth controls`
- `feat: add Argo profile visualization`
- `feat: add model observation collocation`

Avoid giant "complete project" commits.

---

# Permission Safety

Do not auto-approve:
- deleting large directory trees;
- modifying `.git` internals;
- force-push/rebase/reset;
- global package installation;
- changing machine-level configuration;
- secrets;
- destructive database commands;
- downloading huge datasets.

Routine local code edits and test execution may use broader permissions once the workflow is stable.

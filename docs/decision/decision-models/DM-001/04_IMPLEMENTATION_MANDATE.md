# DM-001 — Implementation Mandate

## 1. Purpose

This document defines the official implementation governance for DM-001 — Commercial Attention Allocation.

It governs how implementation work must be executed.

It does not define new business logic.

It does not define new software architecture.

It does not authorize runtime integration, persistence, UI changes, CRM changes, database changes, or Cognitive Core runtime changes.

The mandate answers:

- what is allowed;
- what is forbidden;
- which responsibilities belong to DM-001;
- which responsibilities belong to the platform;
- what constitutes a compliant implementation.

## 2. Authority Hierarchy

All future DM-001 implementation work must follow this precedence order:

1. `01_GOLD_SPECIFICATION.md`
2. `02_ENGINEERING_SPECIFICATION.md`
3. `03_IMPLEMENTATION_SPECIFICATION.md`
4. `DECISION_MODEL_ENGINEERING_PACKAGE_STANDARD.md`
5. Runtime and governance documents under `docs/decision/`, when required for consistency

If documents conflict, the higher authority wins.

The Gold Specification is the canonical business authority.

The Engineering Specification is the canonical computational behavior authority.

The Implementation Specification is the canonical software planning authority.

This Implementation Mandate is the canonical implementation governance authority.

No implementation may introduce behavior that cannot be traced to the approved specification chain.

## 3. Architectural Constraints

The DM-001 implementation must not modify:

- EVOLV application architecture;
- Cognitive Core runtime;
- Decision Engine architecture;
- Decision Context architecture;
- CRM modules;
- UI components;
- database schema;
- migrations;
- SQL files;
- Auth;
- RLS;
- policies;
- Supabase access patterns;
- existing operational workflows;
- existing simulation, task, timeline, dashboard, PDF, or dossier behavior.

DM-001 must remain an isolated Decision Model implementation.

DM-001 must not become:

- a UI feature;
- a CRM service;
- a database module;
- a task automation engine;
- a recommendation engine;
- a prediction engine;
- a replacement for Cognitive Core.

## 4. Allowed Changes

A future implementation Wave may create or modify files only when explicitly authorized by that Wave.

Allowed implementation activities, when authorized:

- create TypeScript contracts for DM-001;
- create stable constants for model identity, version, decisions, recommended actions, and initial defaults;
- implement the model-level operators defined in `02_ENGINEERING_SPECIFICATION.md`;
- implement deterministic scoring using approved `Initial Implementation Defaults`;
- implement confidence calculation using approved criteria;
- implement rationale assembly;
- implement evidence trace validation;
- implement a pure executor for DM-001;
- add unit tests for pure model logic;
- add integration tests for the DM-001 executor boundary;
- update `CHANGELOG.md` with implementation changes;
- update `05_CALIBRATION_LOG.md` only during calibration work;
- update `06_PRODUCTION_REPORT.md` only during production-readiness work.

Allowed changes must remain within DM-001 boundaries unless the authorizing Wave explicitly expands scope.

## 5. Forbidden Changes

The implementation must not:

- redesign EVOLV architecture;
- redesign Cognitive Core;
- redesign Decision Engine;
- redesign Decision Context;
- introduce undocumented heuristics;
- introduce implicit calibration;
- alter Gold-defined decision outputs;
- add new decision states;
- remove decision states;
- change recommended actions without specification approval;
- place business decision logic inside UI components;
- place business decision logic inside CRM components;
- access raw CRM records directly from the model;
- access Supabase directly from the model;
- persist decisions from pure model logic;
- create migrations;
- define SQL;
- modify Auth;
- modify RLS;
- modify policies;
- create React components;
- create API routes;
- create endpoints;
- create automation;
- execute operational actions;
- create tasks automatically;
- modify CRM status;
- hide missing evidence;
- discard conflicting evidence;
- emit recommendations that are not consequences of model output;
- use non-traceable inference;
- use external knowledge not present in the approved documents.

The implementation must not convert `Initial Implementation Defaults` into calibrated business truth.

Any change to weights, thresholds, gate precedence, or confidence thresholds must be handled through calibration governance.

## 6. Responsibility Boundaries

### 6.1 Responsibilities of DM-001

DM-001 is responsible for:

- receiving prepared decision context;
- validating minimum input shape;
- selecting relevant evidence from the prepared context;
- classifying signals;
- evaluating blocking conditions;
- evaluating timing signals;
- calculating attention score;
- resolving one decision output;
- calculating confidence;
- assembling rationale;
- preserving evidence trace;
- returning a deterministic decision artifact.

### 6.2 Responsibilities of the Platform

The platform is responsible for:

- collecting raw data;
- normalizing raw data;
- producing Cognitive Core artifacts;
- preparing Decision Context;
- orchestrating Decision Engine execution;
- handling persistence outside pure model logic;
- applying authorization and organization boundaries;
- exposing outputs to product surfaces;
- handling UI presentation;
- managing recalculation triggers;
- managing duplicate execution prevention;
- managing runtime observability.

DM-001 must not absorb platform responsibilities.

## 7. Engineering Principles

### 7.1 Determinism

Given the same input, model version, and calibration status, DM-001 must produce the same output.

### 7.2 Explainability

Every output must include rationale and evidence trace.

A decision that cannot be explained is not compliant.

### 7.3 Reproducibility

The implementation must preserve enough metadata to reproduce or audit the decision behavior.

### 7.4 Isolation

DM-001 pure logic must not depend on React, Supabase, CRM components, UI state, network calls, or database access.

### 7.5 Versioning

The implementation must expose model version metadata.

Behavior changes must be reflected through versioning and documentation.

### 7.6 Traceability

Evidence references must remain connected to score contributors, confidence factors, rationale, and final decision.

### 7.7 Explicit Uncertainty

Missing evidence, insufficient knowledge, low confidence, and conflicts must remain explicit.

### 7.8 No Hidden Calibration

Weights, thresholds, and gate precedence must remain as approved defaults until calibration formally changes them.

## 8. Documentation Compliance

Implementation must remain aligned with:

- Gold Specification;
- Engineering Specification;
- Implementation Specification;
- this Implementation Mandate;
- Decision Principles;
- Decision Model Catalog;
- Engineering Package Standard.

Any implementation finding that requires behavior change must be documented before being implemented.

Documentation updates must not rewrite historical calibration or production records.

Calibration changes must be additive.

## 9. Implementation Sequence

Future implementation must follow this order:

1. confirm active specification versions;
2. create or update DM-001 contracts;
3. create or update constants and model identity;
4. implement evidence selection;
5. implement signal classification;
6. implement readiness gate evaluation;
7. implement timing evaluation;
8. implement score aggregation using approved defaults;
9. implement priority classification;
10. implement confidence calculation;
11. implement rationale assembly;
12. implement evidence trace validation;
13. implement pure executor;
14. add unit tests;
15. add executor integration tests;
16. run technical validation;
17. update `CHANGELOG.md`;
18. prepare for calibration phase.

No runtime integration, persistence, UI exposure, or product-surface consumption may occur before the pure model implementation is reviewed.

## 10. Quality Requirements

A compliant implementation must:

- be deterministic;
- avoid `any` unless explicitly justified by an approved boundary;
- use narrow TypeScript contracts;
- keep pure logic side-effect free;
- keep model logic independent from UI and CRM;
- validate required input shape;
- preserve missing evidence;
- preserve conflicts;
- expose rationale;
- expose evidence trace;
- expose model identity and version;
- use approved defaults without silent changes;
- keep score contributors inspectable;
- keep confidence calculation inspectable;
- pass project typecheck, lint, build, and diff validation when required by the implementation Wave.

The implementation must favor clarity over cleverness.

The implementation must not optimize prematurely.

## 11. Review Policy

Implementation review is required before DM-001 can move to calibration.

Review must verify:

- compliance with Gold Specification;
- compliance with Engineering Specification;
- compliance with Implementation Specification;
- compliance with this Mandate;
- absence of forbidden imports;
- absence of UI logic;
- absence of database access in pure model logic;
- absence of undocumented heuristics;
- deterministic behavior;
- traceability;
- confidence behavior;
- rationale completeness;
- test coverage for core paths and edge cases.

Any deviation must be documented before correction.

Undocumented behavior is not acceptable even if tests pass.

## 12. Acceptance Conditions

Implementation is not complete until all minimum conditions are satisfied:

1. DM-001 contracts exist and match the approved specifications.
2. Model identity and versioning are explicit.
3. All required operators are implemented.
4. The pure executor runs the approved execution sequence.
5. The model returns exactly one approved decision output.
6. Recommended action matches the approved decision table.
7. Attention score is traceable to contributors.
8. Confidence is traceable to evidence coverage, missing evidence, conflicts, and quality.
9. Rationale includes evidence used, boosters, reducers, blocks, decision reason, and unresolved questions.
10. Evidence trace references remain inspectable.
11. Blocking conditions cannot be hidden by positive score.
12. Non-blocking conditions are not automatically treated as negative.
13. Missing evidence remains explicit.
14. Conflicts are preserved.
15. Tests cover normal, incomplete, blocking, conflict, no-evidence, and non-blocking scenarios.
16. No production runtime integration is introduced unless separately authorized.
17. No UI, CRM, database, Auth/RLS, or Cognitive Core runtime behavior changes are introduced.
18. Technical validation passes according to the implementation Wave.

## 13. Transition to Calibration

After implementation review, DM-001 may move to calibration.

Calibration must not rewrite the implementation history.

Calibration must record:

- model version;
- evaluated cases;
- observed behavior;
- deviations;
- approved adjustments;
- reviewer;
- date.

Calibration may adjust:

- numeric score weights;
- priority thresholds;
- minimum confidence for `ACT_NOW`;
- no-evidence default behavior;
- response speed weight;
- continuity weight;
- recent silence weight;
- product fit role;
- gate precedence order.

Calibration must not:

- add new decision outputs without Gold and Engineering approval;
- hide evidence;
- remove explainability;
- remove traceability;
- introduce non-deterministic reasoning;
- bypass this Mandate.

## 14. Explicit Non-Authorization

This Mandate does not authorize:

- TypeScript implementation in this Wave;
- runtime code in this Wave;
- migrations;
- SQL;
- Decision Engine registration;
- persistence implementation;
- UI implementation;
- CRM changes;
- Auth/RLS changes;
- Cognitive Core runtime changes;
- production deployment.

The next authorized phase must explicitly state its implementation scope before any code is created.

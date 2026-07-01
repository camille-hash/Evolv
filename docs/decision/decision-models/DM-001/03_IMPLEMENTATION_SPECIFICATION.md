# DM-001 — Implementation Specification

## 1. Implementation Objectives

This document defines the future software implementation plan for DM-001 — Commercial Attention Allocation.

This Wave does not implement the model.

The implementation objective is to translate the approved Engineering Specification into a deterministic, traceable, versioned software component that can later be executed by the EVOLV Decision Engineering runtime.

Software responsibilities:

- accept an approved decision context;
- evaluate only traceable evidence;
- classify signals according to the Engineering Specification;
- calculate attention score using calibrated or initial default parameters;
- resolve exactly one DM-001 decision output;
- calculate confidence;
- assemble rationale;
- preserve evidence traceability;
- expose model identity and version metadata.

Implementation boundaries:

- DM-001 must not collect raw CRM data directly.
- DM-001 must not access the database directly.
- DM-001 must not modify CRM state.
- DM-001 must not execute tasks or actions.
- DM-001 must not create UI behavior.
- DM-001 must not replace Cognitive Core operators.
- DM-001 must consume prepared decision context and return a decision artifact.

Expected deliverables in a future implementation Wave:

- TypeScript contracts for DM-001 input and output;
- stable decision constants;
- operator implementations derived from `02_ENGINEERING_SPECIFICATION.md`;
- deterministic executor;
- rationale assembly;
- trace metadata;
- unit and integration tests;
- documentation update in `CHANGELOG.md`.

## 2. Module Organization

The future implementation should be organized around model responsibilities, not UI boundaries.

The following logical modules are expected. This is an implementation organization, not a mandatory folder structure.

| Module | Responsibility |
| --- | --- |
| contracts | DM-001 public input, output, rationale, score, confidence, and trace contracts. |
| types | Internal type aliases and narrow unions specific to DM-001. |
| constants | Model identity, version, decision outputs, recommended actions, initial default parameters. |
| operators | Implementation of the model-level operators defined in the Engineering Specification. |
| scoring | Attention score calculation and score contributor reporting. |
| confidence | Confidence level calculation from evidence coverage, missing evidence, conflicts, and traceability. |
| rationale | Explainability assembly for evidence used, boosters, reducers, blocks, and decision reason. |
| executor | Single deterministic entrypoint that runs the DM-001 execution sequence. |
| persistence | Optional persistence adapter boundary for future decision records, without database-specific logic in the model. |
| pipeline | Runtime integration boundary for the future Decision Engine orchestration. |

The implementation should keep pure decision logic separate from persistence, orchestration, and product surfaces.

## 3. Public Contracts

### 3.1 Model Identity

The implementation must expose stable model identity metadata:

```ts
type Dm001ModelIdentity = {
  modelId: "DM-001";
  modelName: "Commercial Attention Allocation";
  family: "Commercial Decision Models";
  goldVersion: "1.0";
  engineeringVersion: string;
  implementationVersion: string;
};
```

Version values must be maintained by the model package and updated through the Decision Model lifecycle.

### 3.2 Input Contract

The model should receive a prepared decision context.

The input must be independent from UI components, CRM field names, and database records.

Conceptual contract:

```ts
type Dm001Input = {
  leadId: string;
  organizationId: string;
  generatedAt: string;
  executiveSituation?: unknown;
  evidenceSet?: unknown;
  situationContext?: unknown;
  decisionContext: Dm001DecisionContext;
  metadata?: Record<string, unknown>;
};
```

The future implementation must refine `unknown` references only by importing approved Cognitive Core contracts, if available.

### 3.3 Decision Context

DM-001 requires a context already normalized into the business categories defined by the Gold and Engineering Specifications.

Conceptual contract:

```ts
type Dm001DecisionContext = {
  engagement: Dm001EvidenceGroup;
  continuity: Dm001EvidenceGroup;
  operationalReadiness: Dm001EvidenceGroup;
  productFit: Dm001EvidenceGroup;
  timing: Dm001EvidenceGroup;
  confidence: Dm001EvidenceGroup;
};
```

Each group must preserve evidence references and evidence of absence.

### 3.4 Evidence Group

Conceptual contract:

```ts
type Dm001EvidenceGroup = {
  positive: Dm001EvidenceReference[];
  negative: Dm001EvidenceReference[];
  missing: Dm001EvidenceReference[];
  blocking: Dm001EvidenceReference[];
  nonBlocking: Dm001EvidenceReference[];
  conflicts: Dm001EvidenceReference[];
};
```

### 3.5 Evidence Reference

Conceptual contract:

```ts
type Dm001EvidenceReference = {
  evidenceId: string;
  source: string;
  sourceId?: string;
  occurredAt?: string;
  summary: string;
  metadata?: Record<string, unknown>;
};
```

The model must never create a decision without traceable evidence or explicit evidence of absence.

### 3.6 Output Contract

The implementation must produce exactly one decision.

Conceptual contract:

```ts
type Dm001Decision =
  | "ACT_NOW"
  | "NURTURE"
  | "INVESTIGATE"
  | "WAIT"
  | "DISENGAGE";

type Dm001Output = {
  modelId: "DM-001";
  modelName: "Commercial Attention Allocation";
  modelVersion: string;
  decision: Dm001Decision;
  recommendedAction: string;
  attentionScore: number | null;
  confidence: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
  rationale: Dm001Rationale;
  evidenceTrace: string[];
  scoreContributors: Dm001ScoreContributor[];
  calibrationStatus: "INITIAL_DEFAULTS" | "CALIBRATED";
  generatedAt: string;
  metadata: Dm001ExecutionMetadata;
};
```

### 3.7 Internal Interfaces

The future implementation should include internal interfaces for:

- selected evidence;
- classified signals;
- readiness gate result;
- timing evaluation;
- attention score result;
- confidence result;
- decision resolver result;
- rationale assembly result;
- execution metadata.

These interfaces must remain internal unless another approved Decision Model requires reuse.

## 4. Execution Pipeline

DM-001 execution must be deterministic.

Required pipeline:

```text
Decision Context
↓
Evidence Selection
↓
Signal Classification
↓
Readiness Gate Evaluation
↓
Timing Evaluation
↓
Score Aggregation
↓
Priority Classification
↓
Confidence Evaluation
↓
Rationale Assembly
↓
Decision Output
```

### 4.1 Evidence Selection

Select evidence relevant to:

- Engagement;
- Continuity;
- Operational Readiness;
- Product Fit;
- Timing;
- Confidence.

The operator must preserve missing evidence and trace references.

### 4.2 Signal Classification

Classify selected evidence into:

- positive;
- negative;
- blocking;
- non-blocking;
- absence;
- insufficient knowledge.

Non-blocking conditions must not be treated as negative.

### 4.3 Readiness Gate Evaluation

Detect blocking conditions:

- CPF absent;
- invalid contact;
- mandatory documentation absent.

Blocking conditions must remain visible even when positive signals exist.

### 4.4 Timing Evaluation

Evaluate whether timing supports:

- immediate action;
- active nurture;
- investigation;
- scheduled wait;
- disengagement.

Timing logic must use only evidence provided in the decision context.

### 4.5 Score Aggregation

Aggregate classified signals using either:

- calibrated weights, when available; or
- `Initial Implementation Defaults`, before calibration.

The scoring implementation must report score contributors.

### 4.6 Priority Classification

Resolve one decision output:

- `ACT_NOW`;
- `NURTURE`;
- `INVESTIGATE`;
- `WAIT`;
- `DISENGAGE`.

Gate-first logic must be preserved until calibration changes it.

### 4.7 Confidence Evaluation

Calculate confidence from:

- evidence coverage;
- evidence quality;
- missing evidence;
- unresolved conflicts;
- blocking conditions;
- recency, when available.

Confidence measures reliability of the decision, not opportunity value.

### 4.8 Rationale Assembly

The rationale must explain:

- evidence used;
- factors that increased confidence;
- factors that reduced confidence;
- blocking conditions;
- non-blocking conditions;
- why the recommendation was selected;
- unresolved questions.

## 5. Persistence Strategy

DM-001 implementation must be persistence-capable but not persistence-coupled.

The model itself should return a decision artifact.

Persistence, when implemented in a later Wave, should occur outside pure model logic.

### 5.1 What May Be Persisted

Future persistence may store:

- model identity;
- model version;
- input context reference;
- final decision;
- recommended action;
- attention score;
- confidence;
- rationale;
- evidence trace;
- score contributors;
- calibration status;
- execution metadata;
- generated timestamp.

### 5.2 What Must Not Be Persisted by the Model

The pure DM-001 model must not persist:

- raw CRM records;
- UI state;
- unapproved external data;
- generated tasks;
- CRM status changes;
- simulation changes;
- operational side effects.

### 5.3 When Persistence Occurs

Persistence should occur only after:

1. model execution completes successfully;
2. output contract validation passes;
3. evidence trace validation passes.

Failed or invalid outputs should not be persisted as valid decisions.

### 5.4 Versioning

Every persisted decision record should include:

- model ID;
- model version;
- engineering version;
- implementation version;
- calibration status;
- generated timestamp.

### 5.5 Traceability

Persistence must preserve evidence references, not just the final decision.

The decision must remain auditable even after later knowledge changes.

This document does not define database migrations, SQL, table names, indexes, RLS, or storage schema.

## 6. Recalculation Strategy

DM-001 must support deterministic recalculation.

Given the same input and model version, it must produce the same output.

### 6.1 Supported Triggers

Future execution may be triggered by approved runtime events such as:

- Decision Context refreshed;
- evidence set changed;
- lead situation changed;
- explicit user or system request for re-evaluation;
- model version changed;
- calibration version changed.

These triggers are conceptual only. This Wave does not implement event handling.

### 6.2 Execution Lifecycle

Expected lifecycle:

```text
Prepare Decision Context
↓
Validate Context
↓
Execute DM-001
↓
Validate Output
↓
Optionally Persist Decision Artifact
↓
Expose to Approved Consumer
```

### 6.3 Duplicate Execution Prevention

Future runtime should prevent duplicate persisted decisions by comparing:

- lead ID;
- organization ID;
- model ID;
- model version;
- input context fingerprint;
- execution timestamp window, if applicable.

The pure model does not enforce deduplication. It must be deterministic so the runtime can deduplicate safely.

## 7. Runtime Integration

DM-001 belongs to Decision Engineering.

It consumes Cognitive Core artifacts and returns a Decision Model output.

It must not change Cognitive Core architecture.

### 7.1 Decision Engine

The future Decision Engine should call DM-001 through a stable executor interface.

Conceptual interface:

```ts
type DecisionModelExecutor<I, O> = {
  modelId: string;
  version: string;
  execute(input: I): O;
};
```

DM-001 should implement this shape or an approved equivalent.

### 7.2 Decision Context

Decision Context is the prepared input boundary.

DM-001 should not collect, normalize, or enrich raw data.

The runtime must prepare context before invoking the model.

### 7.3 Executive Situation

DM-001 may consume `ExecutiveSituation` as supporting input.

It must not treat `ExecutiveSituation` as an unchallengeable final answer.

It must preserve evidence, absence, uncertainty, and conflicts according to DEC-001.

### 7.4 Product Surfaces

Product surfaces may consume DM-001 outputs only after the Decision Engine or approved runtime exposes them.

DM-001 must not import React, UI components, CRM modules, Supabase clients, or product-surface code.

## 8. Error Handling

### 8.1 Invalid Context

Invalid context includes:

- missing lead ID;
- missing organization ID;
- missing decision context;
- malformed evidence references;
- unsupported model version.

Expected behavior:

- fail deterministically;
- return or throw a typed implementation error, depending on future runtime convention;
- do not emit partial valid decisions;
- do not persist as a valid decision.

### 8.2 Incomplete Context

Incomplete context is not always invalid.

Missing evidence should become explicit absence or insufficient knowledge when the model can still run.

Expected behavior:

- preserve missing evidence;
- reduce confidence;
- route toward `INVESTIGATE`, `WAIT`, or `DISENGAGE` according to calibrated rules;
- explain uncertainty in rationale.

### 8.3 Persistence Failures

Persistence failures must not change the model result.

Expected behavior:

- pure execution result remains valid;
- persistence adapter reports failure separately;
- runtime decides retry or operational handling;
- no silent success.

### 8.4 Execution Failures

Execution failures should be observable and deterministic.

Expected behavior:

- preserve error metadata;
- avoid swallowing errors silently;
- avoid fallback decisions that look valid;
- avoid UI-specific error handling in the model.

## 9. Observability

DM-001 should emit execution metadata through approved runtime boundaries.

No logging implementation is required in this Wave.

Expected metadata:

- model ID;
- model version;
- execution ID;
- lead ID;
- organization ID;
- generated timestamp;
- calibration status;
- input context fingerprint;
- evidence count;
- missing evidence count;
- blocking condition count;
- conflict count;
- final decision;
- confidence;
- execution duration, if measured by runtime;
- error code, if execution fails.

Observability must not expose sensitive raw client data unnecessarily.

Logs should prefer identifiers, counts, and decision metadata over full evidence content.

## 10. Testing Strategy

No tests are created during this Wave.

The future implementation should include the following test layers.

### 10.1 Unit Testing

Unit tests should cover:

- signal classification;
- readiness gate evaluation;
- timing evaluation;
- score aggregation;
- confidence calculation;
- decision resolution;
- rationale assembly;
- output contract validation.

### 10.2 Integration Testing

Integration tests should cover:

- executor running the full DM-001 pipeline;
- valid prepared decision context;
- incomplete but valid context;
- blocking conditions;
- conflicting evidence;
- output traceability;
- deterministic repeated execution.

### 10.3 Regression Testing

Regression tests should lock behavior for:

- the five decision outputs;
- initial default thresholds;
- gate precedence;
- confidence downgrade behavior;
- non-blocking conditions not reducing score;
- no-evidence behavior once calibrated.

### 10.4 Acceptance Testing

Acceptance tests should verify:

- outputs align with Gold Specification;
- implementation follows Engineering Specification;
- every decision is explainable;
- evidence trace exists;
- no UI, CRM, database, or Auth/RLS dependency exists in pure model logic;
- behavior can be calibrated without architectural change.

## 11. Implementation Boundaries

This Implementation Specification does not authorize:

- TypeScript file creation;
- operator implementation;
- scoring implementation;
- persistence implementation;
- Decision Engine integration;
- database migrations;
- runtime code;
- React components;
- Cognitive Core runtime changes;
- UI changes;
- CRM changes;
- Auth/RLS changes.

Future implementation must remain within the Engineering Specification and Implementation Mandate.

## 12. Sections Deferred to Future Waves

The following items are intentionally deferred:

- physical file paths and folder creation;
- concrete TypeScript implementation;
- final imported Cognitive Core contract names;
- persistence adapter implementation;
- database schema;
- Decision Engine runtime integration;
- test files;
- production observability tooling;
- calibration changes;
- production readiness report.

## 13. Acceptance Criteria

This Implementation Specification is complete when:

1. it is derived from the Gold Specification, Engineering Specification, and Engineering Package Standard;
2. it defines software responsibilities and boundaries;
3. it describes expected logical modules;
4. it defines conceptual public contracts;
5. it describes execution pipeline and model flow;
6. it defines persistence strategy without database migrations or SQL;
7. it defines recalculation strategy without implementing triggers;
8. it describes runtime integration without changing architecture;
9. it defines error handling expectations;
10. it defines observability metadata;
11. it defines testing strategy;
12. it clearly states deferred implementation sections;
13. it creates no production code;
14. it changes no UI, CRM, database, Auth/RLS, or Cognitive Core runtime behavior.

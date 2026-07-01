# DMC-001 — Decision Model Catalog

## 1. Purpose

This document defines the official structure of the Decision Model Catalog for ERA III-B Decision Engineering in EVOLV.

The catalog is the controlled registry where Decision Models are documented, reviewed, approved, and tracked before becoming executable knowledge.

DMC-001 does not create executable Decision Models. It defines how future models must be described and governed.

## 2. Relationship with DEC-001

DEC-001 defines the Decision Principles.

DMC-001 defines the catalog structure that applies those principles to future Decision Models.

Every model in the catalog must respect DEC-001:

- Decisions must be evidence-based.
- Absence must be treated as evidence.
- Uncertainty must remain explicit.
- Conflicts must be preserved.
- Explainability must come before action.
- Reasoning must be deterministic.
- Recommendations must be consequences of decision models.

No Decision Model should be approved unless it can demonstrate compliance with DEC-001.

## 3. Architectural Position

The Decision Model Catalog belongs to Decision Engineering.

It sits after Cognitive Core artifacts and before any product surface or executable recommendation.

Architectural sequence:

```text
Sources
→ Cognitive Core
→ ExecutiveSituation
→ Decision Engineering
→ Decision Model Catalog
→ Implemented Decision Models
→ Product Surfaces
```

The catalog is documentation-first. It is not runtime infrastructure, a database schema, or a UI module.

## 4. Catalog Structure

### Commercial Models

Commercial Models evaluate commercial readiness, buying signals, negotiation conditions, and sales-stage decisions.

They must remain evidence-based and must not substitute CRM state without explicit rules.

### Relationship Models

Relationship Models evaluate the state of the relationship, continuity, engagement quality, and interaction patterns.

They must preserve uncertainty and avoid emotional assumptions not supported by evidence.

### Risk Models

Risk Models identify operational, commercial, informational, or relationship risks.

They must distinguish between confirmed risks, missing evidence, unresolved conflicts, and low-confidence signals.

### Opportunity Models

Opportunity Models identify possible favorable conditions, follow-up openings, proposal momentum, or completion opportunities.

They must not create recommendations without evidence and confidence rules.

### Operational Models

Operational Models determine execution-related decisions such as next action readiness, follow-up gaps, task coverage, and pending operational work.

They must preserve the separation between knowledge and execution.

### Documentation Models

Documentation Models evaluate whether records, notes, evidence, knowledge items, and decision traces are sufficient for auditability.

They must not generate operational action by themselves.

### Executive Models

Executive Models synthesize decision outputs for leadership or high-level operational review.

They must be traceable to underlying Decision Models and Cognitive Core artifacts.

## 5. Decision Model Contract

Every Decision Model must be documented using the following contract.

### Model ID

Stable identifier for the model.

Example format:

```text
DM-001
```

### Name

Human-readable model name.

The name must be concise and stable.

### Family

Catalog family where the model belongs.

Allowed families:

- Commercial
- Relationship
- Risk
- Opportunity
- Operational
- Documentation
- Executive

### Business Question

The exact question the model answers.

The question must be narrow enough to produce deterministic output.

### Input Evidence

Evidence types, sources, artifacts, or Cognitive Core outputs required by the model.

This section must identify required evidence, optional evidence, and evidence of absence.

### Activation Criteria

Conditions required for the model to run.

Activation criteria must not rely on hidden assumptions.

### Decision Outputs

Structured outputs produced by the model.

Outputs may include state, classification, decision result, attention level, recommendation eligibility, or explanation fields.

### Confidence Rules

Rules used to calculate confidence.

Confidence must reflect evidence quality, evidence coverage, uncertainty, and conflicts.

### Explainability Requirements

Minimum explanation required for the decision to be considered usable.

This must include traceability to evidence and unresolved limitations.

### Recommended Actions

Actions that may result from the decision.

Recommended actions must be consequences of the decision, not independent guesses.

### Non-Goals

Explicit boundaries of the model.

Non-goals prevent scope drift and avoid hidden implementation assumptions.

## 6. Model Lifecycle

### Draft

The model is documented but not reviewed.

Draft models are not approved for implementation.

### Reviewed

The model has been reviewed for scope, evidence requirements, determinism, confidence rules, and alignment with DEC-001.

Reviewed models are not automatically approved.

### Approved

The model is approved for implementation planning.

Approval must include evidence requirements, outputs, confidence rules, and non-goals.

### Implemented

The model has been implemented according to its approved contract.

Implementation must preserve traceability and deterministic behavior.

### Deprecated

The model is retired or replaced.

Deprecated models must remain documented for historical auditability.

## 7. Governance Rules

1. No model may be implemented before being documented in the catalog.
2. Every model must comply with DEC-001.
3. Every model must define a single primary business question.
4. Every model must identify its input evidence.
5. Every model must define evidence of absence where relevant.
6. Every model must define confidence rules.
7. Every model must preserve unresolved conflicts.
8. Every model must define explainability requirements.
9. Recommended actions must be consequences, not independent outputs.
10. Model lifecycle status must be explicit.
11. Changes to approved models require review.
12. Deprecated models must remain auditable.

## 8. Initial Model Backlog

The following models are initial backlog candidates only.

They are not approved, not implemented, and not executable.

### DM-001 — Commercial Attention Allocation

Family: Commercial.

Business question:

```text
Where should the consultant invest the next commercial action?
```

Package status: Engineering Package approved.

Package location:

```text
docs/decision/decision-models/DM-001/
```

### DM-002 — Relationship Temperature

Family: Relationship.

Business question:

```text
What is the current relationship engagement condition?
```

Initial status: Draft candidate.

### DM-003 — Commercial Priority

Family: Operational.

Business question:

```text
How urgent is commercial attention for this relationship?
```

Initial status: Draft candidate.

### DM-004 — Opportunity Detection

Family: Opportunity.

Business question:

```text
Is there evidence of a current opportunity?
```

Initial status: Draft candidate.

### DM-005 — Risk Assessment

Family: Risk.

Business question:

```text
What risks may limit relationship or commercial progress?
```

Initial status: Draft candidate.

### DM-006 — Information Sufficiency

Family: Documentation.

Business question:

```text
Is there enough information to support a reliable decision?
```

Initial status: Draft candidate.

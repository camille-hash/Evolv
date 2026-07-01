# DM-001 — Engineering Specification

## 1. Model Identity

**Model ID:** DM-001

**Name:** Commercial Attention Allocation

**Family:** Commercial Decision Models

**Engineering Status:** Draft Engineering Specification

**Gold Source:** `01_GOLD_SPECIFICATION.md`

**Gold Version:** 1.0

**Engineering Version:** 0.1

## 2. Decision Purpose

DM-001 determines where the consultant should invest the next unit of commercial attention.

The model does not estimate closing probability.

The model does not calculate opportunity value.

The model produces a commercial attention decision based on traceable evidence, explicit absences, and deterministic reasoning.

Primary business question:

```text
Onde devo investir minha proxima acao comercial?
```

## 3. Required Inputs

DM-001 uses business concepts, not UI components and not CRM-specific field names.

Required input categories:

| Input Category | Purpose | Evidence Examples from Gold Specification |
| --- | --- | --- |
| Engagement | Identify active interaction between client and consultant. | Client replies, asks questions, requests comparisons, attends meetings. |
| Continuity | Identify whether the relationship continues to evolve. | Follow-up performed, conversation continuity, absence of cooling. |
| Operational Readiness | Identify minimum conditions to proceed. | CPF available, valid contact, minimum documentation. |
| Product Fit | Identify alignment between client expectation and product characteristics. | Immediate contemplation expectation. |
| Timing | Identify whether action should happen now, later, or stop. | New lead, requested return in three months, recently stopped responding. |
| Confidence | Represent perceived confidence based on evidence quality. | Explicit specialist confidence factors from interaction evidence. |

Required evidence must be traceable. The model must not rely on implicit inference.

## 4. Decision Context Dependencies

DM-001 depends on the following decision context categories:

1. EvidenceSet
   - Positive evidence.
   - Negative evidence.
   - Missing evidence.
   - Blocking evidence.
   - Non-blocking evidence.

2. SituationContext
   - Current generic situation state.
   - Momentum.
   - Risks.
   - Opportunities.
   - Conflicts.
   - Evidence coverage.

3. ExecutiveSituation
   - Current state.
   - Momentum.
   - Risks.
   - Opportunities.
   - Recommended attention.
   - Evidence trace.

DM-001 may consume Cognitive Core outputs, but it must not duplicate Cognitive Core collection, normalization, evidence building, situation analysis, synthesis, or trace assembly.

## 5. Signal Taxonomy

### 5.1 Positive Signals

Positive signals increase commercial attention when supported by evidence.

Gold-defined positive signals:

- Cadastro realizado.
- Qualificacao SDR concluida.
- Primeira reuniao agendada.
- Resposta rapida.
- Solicitacao de comparacoes.
- Interesse demonstrado durante a conversa.

### 5.2 Negative Signals

Negative signals reduce attention or indicate disengagement risk.

Gold-defined negative signals:

- Cliente deixa de responder.
- Cliente nao aceita conversar.

### 5.3 Blocking Conditions

Blocking conditions indicate operational impossibility or insufficient readiness.

Gold-defined blocking conditions:

- CPF ausente.
- Contato invalido.
- Documentacao obrigatoria ausente.

### 5.4 Non-Blocking Conditions

Non-blocking conditions must not automatically reduce commercial attention.

Gold-defined non-blocking conditions:

- Parcela baixa.
- Pouco conhecimento sobre consorcio.
- Renda ainda nao discutida.

### 5.5 Absence Signals

Absence is evidence.

Absence signals must remain explicit and must influence confidence and rationale.

Examples:

- Missing follow-up evidence.
- Missing operational readiness evidence.
- Missing client response evidence.
- Missing documentation evidence.

### 5.6 Insufficient Knowledge

The Gold Specification states that false positives do not yet have a consistent pattern.

The model must represent:

```text
Conhecimento insuficiente para modelagem.
```

This state affects confidence and may lead to `INVESTIGATE`.

## 6. Operators

DM-001 is specified as a deterministic decision model composed of engineering operators.

These are model-level operators, not necessarily Cognitive Core runtime operators.

### 6.1 Evidence Selection Operator

Responsibility:

- Select evidence relevant to Engagement, Continuity, Operational Readiness, Product Fit, Timing, and Confidence.
- Preserve evidence references.
- Preserve missing evidence.

Output:

- Selected evidence grouped by signal category.

### 6.2 Signal Classification Operator

Responsibility:

- Classify selected evidence as positive, negative, blocking, non-blocking, absence, or insufficient knowledge.
- Avoid treating non-blocking conditions as negative.

Output:

- Classified signal set.

### 6.3 Readiness Gate Operator

Responsibility:

- Detect blocking operational conditions.
- Prevent an immediate commercial attention decision when minimum readiness is not present.

Output:

- Blocking state.
- Blocking rationale.

### 6.4 Attention Scoring Operator

Responsibility:

- Calculate a deterministic commercial attention score from classified signals.
- Use initial default weights until calibration.

Output:

- Attention score.
- Score contributors.

### 6.5 Confidence Operator

Responsibility:

- Calculate confidence from evidence coverage, evidence quality, missing evidence, and conflicts.
- Reduce confidence when evidence is insufficient or contradictory.

Output:

- Confidence level.
- Confidence rationale.

### 6.6 Decision Resolver Operator

Responsibility:

- Resolve the final decision state:
  - `ACT_NOW`
  - `NURTURE`
  - `INVESTIGATE`
  - `WAIT`
  - `DISENGAGE`

Output:

- Decision state.
- Recommended action.
- Rationale.

### 6.7 Rationale Assembly Operator

Responsibility:

- Assemble explainability output.
- Identify evidence used, confidence boosters, confidence reducers, blocks, and decision reason.

Output:

- Rationale model.

## 7. Scoring Model

The Gold Specification does not define numeric weights, formulas, or thresholds.

Therefore, this Engineering Specification defines the computational structure and marks numeric values as `Initial Implementation Defaults`.

These defaults must be calibrated later in `05_CALIBRATION_LOG.md`.

### 7.1 Score Components

| Component | Direction | Gold Basis |
| --- | --- | --- |
| Engagement | Positive | Active interaction, response, questions, meetings. |
| Continuity | Positive | Follow-up, conversation continuity, absence of cooling. |
| Operational Readiness | Gate and positive | CPF, valid contact, required documentation. |
| Product Fit | Positive or negative | Alignment between expectation and product characteristics. |
| Timing | Positive, neutral, wait, or negative | New lead, requested later return, recently stopped responding. |
| Confidence | Modifier | Specialist confidence and evidence quality. |
| Blocking Conditions | Gate | CPF absent, invalid contact, mandatory documentation absent. |
| Negative Signals | Negative | Stops responding, refuses conversation. |
| Non-Blocking Conditions | Neutral | Low installment, little knowledge about consorcio, income not discussed. |

### 7.2 Initial Implementation Defaults

These values are structural defaults only.

They are not calibrated business truth.

| Signal Group | Initial Default Effect |
| --- | --- |
| Strong positive signal | +2 |
| Standard positive signal | +1 |
| Continuity signal | +2 |
| Timing favorable now | +1 |
| Product fit signal | +1 |
| Negative signal | -2 |
| Timing indicates wait | Decision pressure toward `WAIT` |
| Blocking condition | Decision gate toward `INVESTIGATE` |
| Non-blocking condition | 0 |
| Insufficient knowledge | Decision pressure toward `INVESTIGATE` |

Calibration required:

- Validate whether continuity should carry greater weight than other positive factors.
- Validate whether fast response should be `+1` or `+2`.
- Validate whether recent silence should be `-2` or produce a stronger disengagement signal.
- Validate whether Product Fit should be a score contributor or a separate gate.

### 7.3 Score Constraints

- Blocking conditions must not be hidden by high positive score.
- Missing information must reduce confidence even if score is high.
- Non-blocking conditions must not lower the score automatically.
- Score must be explainable by source evidence.

## 8. Priority Bands

The Gold Specification defines final decision states but does not define numeric thresholds.

The following bands are `Initial Implementation Defaults` and require calibration.

| Decision | Initial Default Condition |
| --- | --- |
| `ACT_NOW` | High positive score, no blocking condition, favorable timing, sufficient confidence. |
| `NURTURE` | Positive score, relationship still active, no immediate urgency, sufficient continuity. |
| `INVESTIGATE` | Blocking condition, insufficient information, unresolved objection, or low confidence. |
| `WAIT` | Evidence of interest exists, but timing indicates action should be scheduled later. |
| `DISENGAGE` | Negative evidence dominates and no sufficient interest or continuity remains. |

Initial numeric thresholds, if implementation requires numbers:

| Band | Initial Default Score Range |
| --- | --- |
| `ACT_NOW` | score >= 5 |
| `NURTURE` | score 2 to 4 |
| `INVESTIGATE` | blocking condition present or confidence insufficient |
| `WAIT` | timing indicates deferred action |
| `DISENGAGE` | score <= -2 with negative evidence |

Calibration required:

- Validate all numeric thresholds with real evaluated cases.
- Confirm whether score-based bands are sufficient or whether gate-first decision resolution must dominate.
- Confirm minimum confidence required for `ACT_NOW`.

## 9. Confidence Model

Confidence must represent reliability of the decision, not commercial desirability.

### 9.1 Confidence Inputs

Confidence increases when:

- Evidence is recent and traceable.
- Engagement evidence exists.
- Continuity evidence exists.
- Operational readiness evidence is complete.
- Timing evidence is explicit.
- Positive signals are consistent.

Confidence decreases when:

- Evidence is missing.
- Required sources are unavailable.
- There are unresolved conflicts.
- Evidence is old or incomplete.
- The model detects insufficient knowledge.

### 9.2 Confidence Levels

| Confidence | Meaning |
| --- | --- |
| `HIGH` | Evidence is sufficient, consistent, and traceable. |
| `MEDIUM` | Evidence supports a decision but relevant gaps remain. |
| `LOW` | Evidence is weak, incomplete, or partially conflicting. |
| `UNKNOWN` | Evidence is insufficient for reliable decisioning. |

### 9.3 Initial Implementation Defaults

Initial confidence should be computed from:

- evidence coverage;
- number of used evidence items;
- missing evidence count;
- blocking conditions;
- unresolved conflicts;
- recency when available.

Calibration required:

- Define exact confidence thresholds after evaluating real examples.
- Determine whether certain evidence types should be mandatory for `HIGH`.

## 10. Rationale Model

Every output must include rationale.

The rationale must answer:

1. Which evidence was used?
2. Which factors increased confidence?
3. Which factors reduced confidence?
4. Which blocking conditions were found?
5. Why was the recommendation chosen?

### 10.1 Rationale Structure

```ts
type Dm001Rationale = {
  evidenceUsed: string[];
  confidenceBoosters: string[];
  confidenceReducers: string[];
  blockingConditions: string[];
  nonBlockingConditions: string[];
  decisionReason: string;
  unresolvedQuestions: string[];
};
```

This is an engineering shape, not an implementation mandate.

## 11. Output Contract

DM-001 must produce one final decision.

### 11.1 Decision States

```ts
type Dm001Decision =
  | "ACT_NOW"
  | "NURTURE"
  | "INVESTIGATE"
  | "WAIT"
  | "DISENGAGE";
```

### 11.2 Recommended Actions

| Decision | Recommended Action |
| --- | --- |
| `ACT_NOW` | Contato imediato |
| `NURTURE` | Manter follow-up ativo |
| `INVESTIGATE` | Identificar e trabalhar objecoes |
| `WAIT` | Programar retorno na data adequada |
| `DISENGAGE` | Encerrar acompanhamento ativo |

### 11.3 Output Shape

```ts
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
  calibrationStatus: "INITIAL_DEFAULTS" | "CALIBRATED";
};
```

This output contract is conceptual and must be refined in `03_IMPLEMENTATION_SPECIFICATION.md`.

## 12. Execution Sequence

Deterministic execution sequence:

1. Receive Cognitive Core decision context.
2. Select relevant evidence.
3. Classify signals.
4. Evaluate blocking conditions.
5. Evaluate timing.
6. Calculate attention score using current weights.
7. Calculate confidence.
8. Resolve final decision.
9. Attach recommended action.
10. Assemble rationale.
11. Return output with evidence trace.

Gate order:

1. Missing operational readiness or blocking condition may force `INVESTIGATE`.
2. Explicit delayed timing may force `WAIT`.
3. Strong negative evidence with low continuity may force `DISENGAGE`.
4. Otherwise score and confidence determine `ACT_NOW` or `NURTURE`.

This gate order is an `Initial Implementation Default` and requires calibration.

## 13. Non-Goals

DM-001 does not answer:

- Probability of closing.
- Opportunity value.
- Administrator selection.
- Patrimonial strategy.
- Financial recommendation.
- Best product configuration.
- Proposal generation.
- Simulation strategy.

DM-001 must not:

- Replace CRM status.
- Execute tasks automatically.
- Create operational actions by itself.
- Use UI state.
- Use non-traceable inference.
- Use unapproved external knowledge.

## 14. Edge Cases

### 14.1 No Evidence

Expected behavior:

- Decision: `INVESTIGATE` or `DISENGAGE` depending on implementation governance.
- Confidence: `UNKNOWN`.
- Rationale: insufficient knowledge.

Calibration required:

- Confirm whether no evidence should default to `INVESTIGATE` or `DISENGAGE`.

### 14.2 Positive Signals with Blocking Condition

Expected behavior:

- Blocking condition must remain visible.
- Decision should not be `ACT_NOW` until readiness is resolved.
- Likely decision: `INVESTIGATE`.

### 14.3 Client Interested but Timing Deferred

Expected behavior:

- Interest remains positive evidence.
- Timing directs decision toward `WAIT`.
- Recommended action: schedule return.

### 14.4 Non-Blocking Financial Concern

Examples:

- Parcela baixa.
- Pouco conhecimento sobre consorcio.
- Renda ainda nao discutida.

Expected behavior:

- Do not reduce score automatically.
- Preserve as context or unresolved question.

### 14.5 Negative Silence After Previous Engagement

Expected behavior:

- Reduce continuity.
- Lower confidence if recency is unclear.
- Possible decisions: `NURTURE`, `INVESTIGATE`, or `DISENGAGE` depending on calibrated thresholds.

### 14.6 Conflicting Evidence

Expected behavior:

- Preserve conflict.
- Reduce confidence.
- Do not hide positive or negative evidence.

### 14.7 False Positive Pattern

Gold Specification states:

```text
Conhecimento insuficiente para modelagem.
```

Expected behavior:

- Do not create false-positive logic yet.
- Route uncertain cases through confidence and rationale.

## 15. Acceptance Criteria

The Engineering Specification is acceptable when:

1. It is derived only from `01_GOLD_SPECIFICATION.md` and official decision documents.
2. It preserves the five Gold decision outputs.
3. It identifies required inputs and evidence categories.
4. It defines signal taxonomy without adding external business knowledge.
5. It defines deterministic operators.
6. It defines a scoring structure.
7. It marks uncalibrated weights and thresholds as `Initial Implementation Defaults`.
8. It defines confidence and rationale models.
9. It defines a conceptual output contract.
10. It defines execution sequence and gate order.
11. It documents edge cases.
12. It does not implement code.
13. It does not alter runtime behavior.

## Calibration Register

The following items must be calibrated in `05_CALIBRATION_LOG.md` after implementation:

- Numeric score weights.
- Priority band thresholds.
- Minimum confidence for `ACT_NOW`.
- Whether no evidence defaults to `INVESTIGATE` or `DISENGAGE`.
- Weight of response speed.
- Weight of relationship continuity.
- Weight of recent silence.
- Whether Product Fit is a score contributor or gate.
- Gate precedence order.

import type {
  CognitiveOperator,
  CollectedContext,
  EvidenceSet,
  ExecutiveSituation,
  NormalizedContext,
  OperationalContext,
  SituationContext,
  TraceAssemblyInput,
} from "../../contracts";
import {
  CollectOperator,
  EvidenceBuilderOperator,
  ExecutiveSynthesisOperator,
  NormalizeOperator,
  SituationAnalysisOperator,
  TraceAssemblyOperator,
} from "../../operators";

const collectOperator = CollectOperator as SyncCognitiveOperator<
  OperationalContext,
  CollectedContext
>;
const normalizeOperator = NormalizeOperator as SyncCognitiveOperator<
  CollectedContext,
  NormalizedContext
>;
const evidenceBuilderOperator = EvidenceBuilderOperator as SyncCognitiveOperator<
  NormalizedContext,
  EvidenceSet
>;
const situationAnalysisOperator = SituationAnalysisOperator as SyncCognitiveOperator<
  EvidenceSet,
  SituationContext
>;
const executiveSynthesisOperator =
  ExecutiveSynthesisOperator as SyncCognitiveOperator<
    SituationContext,
    ExecutiveSituation
  >;
const traceAssemblyOperator = TraceAssemblyOperator as SyncCognitiveOperator<
  TraceAssemblyInput,
  ExecutiveSituation
>;

export const SituationIntegrationPipeline = {
  execute(input: OperationalContext): ExecutiveSituation {
    const collectedContext = collectOperator.execute(input);
    const normalizedContext = normalizeOperator.execute(collectedContext);
    const evidenceSet = evidenceBuilderOperator.execute(normalizedContext);
    const situationContext = situationAnalysisOperator.execute(evidenceSet);
    const executiveSituation =
      executiveSynthesisOperator.execute(situationContext);

    return traceAssemblyOperator.execute({
      evidenceSet,
      executiveSituation: {
        ...executiveSituation,
        pipelineVersion: SituationIntegrationPipeline.version,
        sourceOperators: [
          ...executiveSituation.sourceOperators,
          SituationIntegrationPipeline.id,
        ],
      },
      situationContext,
    });
  },
  id: "cognitive.pipeline.situation-integration",
  version: "0.1.0",
};

type SyncCognitiveOperator<I, O> = Omit<CognitiveOperator<I, O>, "execute"> & {
  execute: (input: I, context?: OperationalContext) => O;
};

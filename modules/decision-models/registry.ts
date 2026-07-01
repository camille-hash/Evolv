export type RegisteredDecisionModel<I, O> = {
  modelId: string;
  modelVersion: string;
  execute(input: I): O;
};

export type DecisionModelRegistry = {
  get<I, O>(modelId: string): RegisteredDecisionModel<I, O> | null;
  list(): Array<RegisteredDecisionModel<unknown, unknown>>;
  register<I, O>(model: RegisteredDecisionModel<I, O>): void;
};

export function createDecisionModelRegistry(): DecisionModelRegistry {
  const models = new Map<string, RegisteredDecisionModel<unknown, unknown>>();

  return {
    get<I, O>(modelId: string): RegisteredDecisionModel<I, O> | null {
      return (models.get(modelId) as RegisteredDecisionModel<I, O> | undefined) ?? null;
    },
    list(): Array<RegisteredDecisionModel<unknown, unknown>> {
      return Array.from(models.values());
    },
    register<I, O>(model: RegisteredDecisionModel<I, O>): void {
      if (!model.modelId.trim()) {
        throw new Error("Decision model registration requires modelId.");
      }

      if (!model.modelVersion.trim()) {
        throw new Error("Decision model registration requires modelVersion.");
      }

      models.set(
        model.modelId,
        model as RegisteredDecisionModel<unknown, unknown>,
      );
    },
  };
}

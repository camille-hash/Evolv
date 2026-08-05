export type MetaProcessorFailureCode =
  | "processor_persistence_not_configured"
  | "processor_client_initialization_failed"
  | "processor_claim_rpc_failed"
  | "processor_supabase_transport_failed"
  | "processor_materialization_failed"
  | "processor_unexpected_failure";

export type MetaProcessorFailureStage =
  | "configuration"
  | "client_initialization"
  | "claim"
  | "enrichment"
  | "failure_recording"
  | "materialization"
  | "retry"
  | "unexpected";

export class MetaProcessorFailure extends Error {
  readonly code: MetaProcessorFailureCode;
  readonly retryable: boolean;
  readonly stage: MetaProcessorFailureStage;

  constructor(
    code: MetaProcessorFailureCode,
    stage: MetaProcessorFailureStage,
    retryable: boolean,
  ) {
    super(code);
    this.name = "MetaProcessorFailure";
    this.code = code;
    this.retryable = retryable;
    this.stage = stage;
  }
}

export function normalizeMetaProcessorFailure(error: unknown) {
  return error instanceof MetaProcessorFailure
    ? error
    : new MetaProcessorFailure(
      "processor_unexpected_failure",
      "unexpected",
      false,
    );
}

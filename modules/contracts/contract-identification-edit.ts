export type ContractIdentificationEdit = {
  contractNumber?: string;
  contractQuota?: string;
};

export type ContractIdentificationEditState = {
  kind: "completed" | "corrected" | "removal_blocked" | "unchanged";
  changes: ContractIdentificationEdit;
};

export type ContractIdentificationState = "complete" | "partial" | "pending";

export function getContractIdentificationState(
  contractNumber: string | null,
  contractQuota: string | null,
): ContractIdentificationState {
  if (contractNumber && contractQuota) return "complete";
  if (contractNumber || contractQuota) return "partial";
  return "pending";
}

export function getContractIdentificationInteraction(
  canManage: boolean,
  state: ContractIdentificationState,
  editing: boolean,
) {
  return {
    showCorrectionAction: canManage && state === "complete" && !editing,
    showEditor: canManage && editing,
  };
}

export function classifyContractIdentificationEdit(input: {
  editedNumber: string;
  editedQuota: string;
  persistedNumber: string | null;
  persistedQuota: string | null;
}): ContractIdentificationEditState {
  const number = classifyField(input.persistedNumber, input.editedNumber);
  const quota = classifyField(input.persistedQuota, input.editedQuota);
  const fields = [number, quota];
  const changes: ContractIdentificationEdit = {
    ...(number.kind === "completion" || number.kind === "correction" ? { contractNumber: number.value } : {}),
    ...(quota.kind === "completion" || quota.kind === "correction" ? { contractQuota: quota.value } : {}),
  };

  if (fields.some((field) => field.kind === "removal")) return { kind: "removal_blocked", changes: {} };
  if (fields.some((field) => field.kind === "correction")) return { kind: "corrected", changes };
  if (fields.some((field) => field.kind === "completion")) return { kind: "completed", changes };
  return { kind: "unchanged", changes: {} };
}

function classifyField(persisted: string | null, edited: string) {
  const value = edited.trim();
  if (persisted === null) return value ? { kind: "completion" as const, value } : { kind: "unchanged" as const };
  if (!value) return { kind: "removal" as const };
  return value === persisted ? { kind: "unchanged" as const } : { kind: "correction" as const, value };
}

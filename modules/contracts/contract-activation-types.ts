import type { Contract } from "./types";

export type ContractFinancialAuthority="commission_engine"|"legacy_revenue"|"not_applicable";
export type ContractActivationOperation="activate"|"deactivate"|"reactivate";
export type ContractActivationResolutionOutcome="resolved"|"selection_required"|"reconciliation_required"|"configuration_required";
export type ContractActivationFinancialOutcome="pending"|"completed"|"not_applicable"|"failed";
export type ContractActivationInput={operation:ContractActivationOperation;idempotencyKey:string;selectedFinancialAuthority?:ContractFinancialAuthority|null};
export type ContractActivationResult={
  intentId:string;contract:Contract;operation:ContractActivationOperation;financialAuthority:ContractFinancialAuthority|null;
  resolutionOutcome:ContractActivationResolutionOutcome;financialOutcome:ContractActivationFinancialOutcome;
  failureCode:string|null;message:string|null;
};

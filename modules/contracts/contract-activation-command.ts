import type {ContractActivationInput,ContractActivationOperation,ContractFinancialAuthority} from "./contract-activation-types";

const operations=new Set<ContractActivationOperation>(["activate","deactivate","reactivate"]);
const authorities=new Set<ContractFinancialAuthority>(["commission_engine","legacy_revenue","not_applicable"]);
export function parseContractActivationInput(value:unknown){
 if(!value||typeof value!=="object"||Array.isArray(value))return null;
 const row=value as Record<string,unknown>,operation=row.operation,idempotencyKey=typeof row.idempotencyKey==="string"?row.idempotencyKey.trim():"",selected=row.selectedFinancialAuthority;
 if(typeof operation!=="string"||!operations.has(operation as ContractActivationOperation)||idempotencyKey.length<8||idempotencyKey.length>200)return null;
 if(selected!==undefined&&selected!==null&&(typeof selected!=="string"||!authorities.has(selected as ContractFinancialAuthority)))return null;
 return{operation:operation as ContractActivationOperation,idempotencyKey,selectedFinancialAuthority:(selected??null) as ContractFinancialAuthority|null} satisfies ContractActivationInput;
}

export type CompleteDraftContractIdentificationInput = {
  contractId: string;
  contractNumber?: string;
  contractQuota?: string;
  reason?: string;
};

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const identifier=(value:unknown)=>typeof value==="string"&&value.trim().length>0&&value.trim().length<=128&&!/[\u0000-\u001f\u007f]/.test(value);
export function parseCompleteDraftContractIdentificationInput(value:unknown,contractId?:string):CompleteDraftContractIdentificationInput|null {
  if(!object(value)||Object.keys(value).some(k=>!["contractNumber","contractQuota","reason"].includes(k))) return null;
  if(!contractId||!UUID.test(contractId)) return null;
  const hasNumber=Object.hasOwn(value,"contractNumber"),hasQuota=Object.hasOwn(value,"contractQuota");
  if(!hasNumber&&!hasQuota) return null;
  if(hasNumber&&!identifier(value.contractNumber)||hasQuota&&!identifier(value.contractQuota)) return null;
  if(value.reason!==undefined&&(typeof value.reason!=="string"||!value.reason.trim()||value.reason.trim().length>1000)) return null;
  return {contractId,...(hasNumber?{contractNumber:(value.contractNumber as string).trim()}:{}),...(hasQuota?{contractQuota:(value.contractQuota as string).trim()}:{}),...(value.reason===undefined?{}:{reason:value.reason.trim()})};
}
const object=(v:unknown):v is Record<string,unknown>=>typeof v==="object"&&v!==null&&!Array.isArray(v);

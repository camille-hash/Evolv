import type {ContractEvidenceLineage,ContractEvidenceReadModel,ContractEvidenceRequirement,ContractEvidenceType,ContractEvidenceVisualState} from "./contract-evidence-read-model";

const catalog:ReadonlyArray<{type:ContractEvidenceType;label:string;description:string}>=[
  {type:"signed_contract",label:"Contrato assinado",description:"Documento que formaliza a assinatura do contrato."},
  {type:"first_installment_payment",label:"Primeiro boleto pago",description:"Comprovante do pagamento da primeira parcela."},
  {type:"patrion_commission_receipt",label:"Recebimento Patrion",description:"Evidência reservada ao fluxo financeiro."},
];
export const evidenceStateLabels:Record<ContractEvidenceVisualState,string>={pending:"Pendente de envio",awaiting_validation:"Aguardando validação",validated:"Validada",invalidated:"Invalidada",superseded:"Substituída",reserved:"Reservado ao fluxo financeiro"};

export function buildContractEvidenceRequirements(input:ContractEvidenceReadModel[]):ContractEvidenceRequirement[]{
  const supersededBy=new Map(input.filter(item=>item.supersedesEvidenceId).map(item=>[item.supersedesEvidenceId!,item.evidenceId]));
  const enriched=input.map(item=>({...item,supersededByEvidenceId:supersededBy.get(item.evidenceId)??null}) as ContractEvidenceReadModel);
  return catalog.map(item=>{
    const versions=enriched.filter(version=>version.type===item.type).sort(byNewest);
    const current=versions.find(version=>version.isCurrent)??null;
    const history=versions.filter(version=>version!==current);
    const newest=current??versions[0]??null;
    const reserved=item.type==="patrion_commission_receipt"&&!newest;
    return{...item,reserved,state:reserved?"reserved":stateOf(newest),lineage:{current,history,versions}};
  });
}
export function summarizeEvidenceRequirements(requirements:ContractEvidenceRequirement[]){return{
  validated:requirements.filter(item=>item.state==="validated").length,
  awaitingValidation:requirements.filter(item=>item.state==="awaiting_validation").length,
  pending:requirements.filter(item=>item.state==="pending").length,
};}
export function formatEvidenceFileSize(value:number|null){if(value===null||!Number.isFinite(value)||value<0)return"Tamanho não informado";if(value<1024)return`${value} B`;if(value<1024*1024)return`${new Intl.NumberFormat("pt-BR",{maximumFractionDigits:1}).format(value/1024)} KB`;return`${new Intl.NumberFormat("pt-BR",{maximumFractionDigits:1}).format(value/(1024*1024))} MB`;}
export function formatEvidenceDate(value:string|null){if(!value)return"Não informada";const date=new Date(value);return Number.isNaN(date.getTime())?"Não informada":new Intl.DateTimeFormat("pt-BR",{dateStyle:"short",timeStyle:"short"}).format(date);}
export function formatEvidenceMoney(cents:number){return new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(cents/100);}
export function safeSignatoryNames(value:ReadonlyArray<Record<string,unknown>>){return value.map(item=>typeof item.name==="string"?item.name.trim():"").filter(Boolean);}
function stateOf(value:ContractEvidenceReadModel|null):ContractEvidenceVisualState{if(!value)return"pending";if(value.status==="recorded")return"awaiting_validation";return value.status;}
function byNewest(a:ContractEvidenceReadModel,b:ContractEvidenceReadModel){return Date.parse(b.recordedAt)-Date.parse(a.recordedAt);}
export function emptyEvidenceLineage():ContractEvidenceLineage{return{current:null,history:[],versions:[]};}

export type WorkbenchBucketId =
  | "para_fazer_agora"
  | "aguardando_retorno"
  | "com_problema"
  | "concluido_hoje";

export type WorkbenchItemTone = "critico" | "atencao" | "neutro" | "concluido";

export type WorkbenchDestinationType =
  | "contrato"
  | "receita"
  | "integridade"
  | "lista";

export type WorkbenchItemContext = {
  contractId?: string;
  contractNumber?: string;
  focus?: string;
  issueCode?: string;
  revenueId?: string;
  sourceStatus?: string;
};

export type WorkbenchItem = {
  actionLabel?: string;
  id: string;
  bucket: WorkbenchBucketId;
  context?: WorkbenchItemContext;
  destinationType?: WorkbenchDestinationType;
  href?: string;
  proximaAcao: string;
  recordId?: string;
  resumo: string;
  situacao: string;
  tone: WorkbenchItemTone;
  tipo: string;
  titulo: string;
};

export type WorkbenchBucket = {
  id: WorkbenchBucketId;
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
  items: WorkbenchItem[];
};

export type OperationsWorkbenchResponse = {
  buckets: WorkbenchBucket[];
  generatedAt: string;
};

export type OperationsWorkbenchResult =
  | { ok: true; response: OperationsWorkbenchResponse }
  | { ok: false; error: string; status: number };

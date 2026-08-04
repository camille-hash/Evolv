export const metaGraphApiVersion = "v26.0" as const;
export const metaGraphHost = "https://graph.facebook.com" as const;

export const metaGraphLeadFields = [
  "id",
  "created_time",
  "ad_id",
  "form_id",
  "field_data",
] as const;

export type MetaGraphErrorCategory =
  | "graph_configuration_missing"
  | "graph_invalid_lead_id"
  | "graph_timeout"
  | "graph_rate_limited"
  | "graph_auth_failed"
  | "graph_permission_denied"
  | "graph_lead_not_found"
  | "graph_invalid_response"
  | "graph_fetch_failed";

export type MetaGraphSafeError = {
  category: MetaGraphErrorCategory;
  graphCode?: number;
  graphSubcode?: number;
  message: string;
  requestId?: string;
  retryable: boolean;
  status?: number;
};
export type MetaGraphFieldData = {
  name: string;
  values: string[];
};

export type MetaGraphLead = {
  adId?: string;
  createdTime?: string;
  fieldData: MetaGraphFieldData[];
  formId?: string;
  id: string;
};

export type MetaGraphLeadResult =
  | { lead: MetaGraphLead; ok: true }
  | ({ ok: false } & MetaGraphSafeError);

export type MetaGraphFetch = (
  input: string | URL,
  init?: RequestInit,
) => Promise<Response>;

export type OperationsSearchCategory =
  | "administrators"
  | "clients"
  | "contracts"
  | "receipts"
  | "revenues";

export type OperationsSearchItem = {
  href: string;
  id: string;
  identifier?: string;
  subtitle: string;
  title: string;
  type: OperationsSearchCategory;
};

export type OperationsSearchGroup = {
  id: OperationsSearchCategory;
  items: OperationsSearchItem[];
  label: string;
};

export type OperationsSearchResponse = {
  groups: OperationsSearchGroup[];
  query: string;
  totalResults: number;
};

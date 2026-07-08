alter table public.contracts
  add column if not exists contract_group text,
  add column if not exists contract_quota text;

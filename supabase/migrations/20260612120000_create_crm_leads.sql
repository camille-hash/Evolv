create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.crm_leads (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  assigned_user_id uuid null references public.users(id) on delete set null,
  name text not null,
  phone text null,
  email text null,
  origin text null,
  consultant text null,
  pipeline text null,
  stage text null,
  desired_credit numeric null,
  notes text null,
  status text not null default 'active',
  source_system text null,
  external_id text null,
  piperun_id text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index crm_leads_company_id_idx
  on public.crm_leads(company_id);

create index crm_leads_assigned_user_id_idx
  on public.crm_leads(assigned_user_id);

create index crm_leads_pipeline_stage_idx
  on public.crm_leads(pipeline, stage);

create index crm_leads_email_idx
  on public.crm_leads(email);

create index crm_leads_phone_idx
  on public.crm_leads(phone);

create unique index crm_leads_source_external_id_unique_idx
  on public.crm_leads(source_system, external_id)
  where external_id is not null;

create trigger crm_leads_set_updated_at
before update on public.crm_leads
for each row
execute function public.set_updated_at();

alter table public.crm_leads enable row level security;

comment on table public.crm_leads is
  'CRM leads for future shared Supabase persistence. RLS is enabled and policies must be added before browser-side access.';

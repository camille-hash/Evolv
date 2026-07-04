alter table public.commission_plan_schedule_items
  add column if not exists offset_months integer,
  add column if not exists offset_days integer;

alter table public.commission_plan_schedule_items
  drop constraint if exists commission_plan_schedule_items_offset_months_check,
  add constraint commission_plan_schedule_items_offset_months_check
    check (offset_months is null or offset_months >= 0);

alter table public.commission_plan_schedule_items
  drop constraint if exists commission_plan_schedule_items_offset_days_check,
  add constraint commission_plan_schedule_items_offset_days_check
    check (offset_days is null or offset_days >= 0);

comment on column public.commission_plan_schedule_items.offset_months is
  'Relative offset in months from contract effectiveness for commission template events.';

comment on column public.commission_plan_schedule_items.offset_days is
  'Optional relative offset in days from contract effectiveness for commission template events.';

alter table public.contracts
  drop constraint if exists contracts_status_check;

alter table public.contracts
  add constraint contracts_status_check
  check (status in (
    'draft',
    'pending_documentation',
    'submitted',
    'approved',
    'active',
    'inactive',
    'completed',
    'cancelled',
    'rejected'
  ));

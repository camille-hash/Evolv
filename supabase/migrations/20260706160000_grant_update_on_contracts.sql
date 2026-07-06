-- DB-FIX-001
-- Formaliza o grant manual necessario para o PATCH /api/contracts/[id].

grant update on table public.contracts to authenticated;

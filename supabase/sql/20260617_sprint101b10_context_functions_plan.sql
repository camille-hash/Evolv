-- Sprint 101B.10
-- CONTEXT FUNCTIONS PLAN
-- Documento pseudo-SQL. Nao executar.
-- Este arquivo contem apenas comentarios, pseudo-DDL e estrategia.

-- Objetivo:
-- Introduzir duas funcoes canonicas para contexto organizacional:
--   1. public.evolv_current_organization_id()
--   2. public.evolv_current_role()

-- Estado atual observado:
-- - profiles existe
-- - profiles possui 2 registros admin na mesma organization_id
-- - crm_lead_notes ja usa isolamento por organizacao baseado em profiles
-- - as funcoes canonicas ainda nao existem

-- Estrategia alvo:
-- 1. criar as funcoes em public
-- 2. usar auth.uid() para localizar o profile do usuario autenticado
-- 3. retornar organization_id e role de forma canonica
-- 4. reutilizar as funcoes em policies de crm_leads e das futuras tabelas do Dual Pipeline

-- Pseudo-DDL ilustrativo:
--
-- create function public.evolv_current_organization_id()
-- returns uuid
-- language sql
-- stable
-- as $$
--   select p.organization_id
--   from public.profiles p
--   where p.id = auth.uid()
--     and p.is_active = true
--   limit 1
-- $$;
--
-- create function public.evolv_current_role()
-- returns text
-- language sql
-- stable
-- as $$
--   select p.role
--   from public.profiles p
--   where p.id = auth.uid()
--     and p.is_active = true
--   limit 1
-- $$;

-- Regras arquiteturais:
-- - as funcoes devem ser pequenas, deterministicas e auditaveis;
-- - devem depender apenas de profiles;
-- - devem evitar logica comercial ou efeitos colaterais;
-- - devem ser o unico contrato oficial para contexto organizacional em policies futuras.

-- Validacao planejada:
-- - confirmar retorno correto para Camille e Bruno;
-- - confirmar comportamento quando profile nao existir;
-- - confirmar comportamento quando is_active = false;
-- - confirmar consistencia com crm_lead_notes.

-- Riscos a observar:
-- - dependencia implicita de profile ausente;
-- - divergencia entre auth.uid() e profiles.id;
-- - introducao prematura em policies antes da validacao paralela.

begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(34);

select has_function('public', 'revise_commercial_proposal_transaction', array['uuid','uuid','jsonb','text'], 'revision RPC exists');
select has_function('public', 'approve_commercial_proposal_transaction', array['uuid'], 'approval RPC has authenticated signature');
select has_function('public', 'revoke_commercial_proposal_approval_transaction', array['uuid','text'], 'revocation RPC exists');
select has_column('public', 'crm_lead_commercial_proposals', 'approval_revoked_at', 'revocation timestamp exists');
select has_column('public', 'commercial_proposal_audit_events', 'root_proposal_id', 'audit carries canonical root');

insert into public.organizations (id, name, slug) values
 ('e1000000-0000-4000-8000-000000000001','C2 Org A','c2-org-a'),
 ('e1000000-0000-4000-8000-000000000002','C2 Org B','c2-org-b');
insert into auth.users (id) values
 ('e2000000-0000-4000-8000-000000000001'),
 ('e2000000-0000-4000-8000-000000000002'),
 ('e2000000-0000-4000-8000-000000000003');
insert into public.profiles (id,organization_id,name,email,role) values
 ('e2000000-0000-4000-8000-000000000001','e1000000-0000-4000-8000-000000000001','Master','master@c2.test','master'),
 ('e2000000-0000-4000-8000-000000000002','e1000000-0000-4000-8000-000000000001','SDR','sdr@c2.test','sdr'),
 ('e2000000-0000-4000-8000-000000000003','e1000000-0000-4000-8000-000000000002','Other','other@c2.test','master');
insert into public.crm_leads (id,organization_id,nome) values
 ('e3000000-0000-4000-8000-000000000001','e1000000-0000-4000-8000-000000000001','Lead A'),
 ('e3000000-0000-4000-8000-000000000002','e1000000-0000-4000-8000-000000000002','Lead B');

create function pg_temp.c2_root(p_id uuid, p_org uuid, p_lead uuid, p_status text)
returns void language plpgsql as $$
begin
 insert into public.crm_lead_commercial_proposals(
  id,organization_id,lead_id,title,source_suggestion,status,proposal_number,
  root_proposal_id,version,original_snapshot,saved_snapshot,summary,metadata
 ) values (p_id,p_org,p_lead,'C2 Proposal','recommended',p_status,
  'PROP-'||p_id::text,p_id,1,'{"original":true}','{"revision":0}','{}','{}');
end $$;

select set_config('request.jwt.claim.sub','e2000000-0000-4000-8000-000000000001',true);
select pg_temp.c2_root('e4000000-0000-4000-8000-000000000001','e1000000-0000-4000-8000-000000000001','e3000000-0000-4000-8000-000000000001','generated');
select lives_ok($$select public.revise_commercial_proposal_transaction(
 'e4000000-0000-4000-8000-000000000001','e4000000-0000-4000-8000-000000000001','{"revision":1}','commercial change')$$,'normal revision succeeds');
select is((select status from public.crm_lead_commercial_proposals where id='e4000000-0000-4000-8000-000000000001'),'superseded','previous version is superseded');
select is((select status from public.crm_lead_commercial_proposals where root_proposal_id='e4000000-0000-4000-8000-000000000001' order by version desc limit 1),'generated','new version is generated');
select is((select max(version) from public.crm_lead_commercial_proposals where root_proposal_id='e4000000-0000-4000-8000-000000000001'),2,'version increments exactly once');
select is((select count(distinct root_proposal_id)::integer from public.crm_lead_commercial_proposals where root_proposal_id='e4000000-0000-4000-8000-000000000001'),1,'canonical root is preserved');
select is((select count(distinct proposal_number)::integer from public.crm_lead_commercial_proposals where root_proposal_id='e4000000-0000-4000-8000-000000000001'),1,'commercial number is preserved');
select is((select saved_snapshot from public.crm_lead_commercial_proposals where root_proposal_id='e4000000-0000-4000-8000-000000000001' order by version desc limit 1),'{"revision":1}'::jsonb,'new snapshot is preserved');
select throws_ok($$select public.revise_commercial_proposal_transaction(
 'e4000000-0000-4000-8000-000000000001','e4000000-0000-4000-8000-000000000001','{}',null)$$,'P0001','CP_REVISION_BASE_STALE','old version cannot be revised');

select pg_temp.c2_root('e4000000-0000-4000-8000-000000000010','e1000000-0000-4000-8000-000000000001','e3000000-0000-4000-8000-000000000001','approved');
select throws_ok($$select public.revise_commercial_proposal_transaction(
 'e4000000-0000-4000-8000-000000000010','e4000000-0000-4000-8000-000000000010','{}','  ')$$,'P0001','CP_REVISION_REASON_REQUIRED','approved revision requires reason');
select lives_ok($$select public.revise_commercial_proposal_transaction(
 'e4000000-0000-4000-8000-000000000010','e4000000-0000-4000-8000-000000000010','{"approvedRevision":true}','  required   correction ')$$,'approved revision with reason succeeds');

select pg_temp.c2_root('e4000000-0000-4000-8000-000000000020','e1000000-0000-4000-8000-000000000001','e3000000-0000-4000-8000-000000000001','rejected');
select lives_ok($$select public.revise_commercial_proposal_transaction(
 'e4000000-0000-4000-8000-000000000020','e4000000-0000-4000-8000-000000000020','{}',null)$$,'rejected current version can be revised');
select pg_temp.c2_root('e4000000-0000-4000-8000-000000000030','e1000000-0000-4000-8000-000000000001','e3000000-0000-4000-8000-000000000001','expired');
select lives_ok($$select public.revise_commercial_proposal_transaction(
 'e4000000-0000-4000-8000-000000000030','e4000000-0000-4000-8000-000000000030','{}',null)$$,'expired current version can be revised');

select pg_temp.c2_root('e4000000-0000-4000-8000-000000000040','e1000000-0000-4000-8000-000000000001','e3000000-0000-4000-8000-000000000001','generated');
select throws_ok($$select public.revise_commercial_proposal_transaction(
 'e4000000-0000-4000-8000-000000000040','e4000000-0000-4000-8000-000000000040','[]',null)$$,'P0001','CP_SNAPSHOT_INVALID','invalid snapshot aborts revision');
select is((select count(*)::integer from public.crm_lead_commercial_proposals where root_proposal_id='e4000000-0000-4000-8000-000000000040'),1,'failed revision is atomic');
select is((select status from public.crm_lead_commercial_proposals where id='e4000000-0000-4000-8000-000000000040'),'generated','failed revision does not supersede current');

select lives_ok($$select public.approve_commercial_proposal_transaction(
 (select id from public.crm_lead_commercial_proposals where root_proposal_id='e4000000-0000-4000-8000-000000000001' order by version desc limit 1))$$,'current version can be approved');
select throws_ok($$select public.approve_commercial_proposal_transaction('e4000000-0000-4000-8000-000000000001')$$,'P0001','CP_VERSION_NOT_CURRENT','old version cannot be approved');
select lives_ok($$select public.approve_commercial_proposal_transaction(
 (select id from public.crm_lead_commercial_proposals where root_proposal_id='e4000000-0000-4000-8000-000000000001' order by version desc limit 1))$$,'duplicate approval is idempotent');
select is((select count(*)::integer from public.commercial_proposal_audit_events where root_proposal_id='e4000000-0000-4000-8000-000000000001' and event_type='proposal_approved'),1,'approval retry does not duplicate audit');

select lives_ok($$select public.revoke_commercial_proposal_approval_transaction(
 (select id from public.crm_lead_commercial_proposals where root_proposal_id='e4000000-0000-4000-8000-000000000001' order by version desc limit 1),' commercial correction ')$$,'approval revocation succeeds');
select ok((select approved_at is not null from public.crm_lead_commercial_proposals where root_proposal_id='e4000000-0000-4000-8000-000000000001' order by version desc limit 1),'revocation preserves approval timestamp');
select throws_ok($$select public.revoke_commercial_proposal_approval_transaction(
 (select id from public.crm_lead_commercial_proposals where root_proposal_id='e4000000-0000-4000-8000-000000000040' limit 1),' ')$$,'P0001','CP_REVOCATION_REASON_REQUIRED','revocation requires reason');
select lives_ok($$select public.revoke_commercial_proposal_approval_transaction(
 (select id from public.crm_lead_commercial_proposals where root_proposal_id='e4000000-0000-4000-8000-000000000001' order by version desc limit 1),'retry')$$,'duplicate revocation is idempotent');
select is((select count(*)::integer from public.commercial_proposal_audit_events where root_proposal_id='e4000000-0000-4000-8000-000000000001' and event_type='proposal_approval_revoked'),1,'revocation retry does not duplicate audit');
select lives_ok($$select public.approve_commercial_proposal_transaction(
 (select id from public.crm_lead_commercial_proposals where root_proposal_id='e4000000-0000-4000-8000-000000000001' order by version desc limit 1))$$,'revoked version can be explicitly reapproved');
select is((select count(*)::integer from public.commercial_proposal_audit_events where root_proposal_id='e4000000-0000-4000-8000-000000000001' and event_type in ('version_superseded','version_created')),2,'revision writes both audit events atomically');

select pg_temp.c2_root('e4000000-0000-4000-8000-000000000050','e1000000-0000-4000-8000-000000000002','e3000000-0000-4000-8000-000000000002','generated');
select throws_ok($$select public.approve_commercial_proposal_transaction('e4000000-0000-4000-8000-000000000050')$$,'P0001','CP_CURRENT_VERSION_NOT_FOUND','cross-tenant reference is hidden');
select set_config('request.jwt.claim.sub','e2000000-0000-4000-8000-000000000002',true);
select throws_ok($$select public.approve_commercial_proposal_transaction(
 (select id from public.crm_lead_commercial_proposals where root_proposal_id='e4000000-0000-4000-8000-000000000040' limit 1))$$,'P0001','CP_ACTOR_FORBIDDEN','SDR cannot approve');
select lives_ok($$select public.revise_commercial_proposal_transaction(
 'e4000000-0000-4000-8000-000000000040','e4000000-0000-4000-8000-000000000040','{"sdr":true}',null)$$,'SDR can revise');

select * from finish();
rollback;

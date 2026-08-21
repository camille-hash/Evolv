param(
  [Parameter(Mandatory = $true)][string]$Database,
  [string]$Container = "supabase_db_Evolv"
)

$ErrorActionPreference = "Stop"

if ($Container -notmatch '^supabase_db_[A-Za-z0-9_.-]+$') {
  throw "C8B concurrency target must be a local Supabase CLI database container"
}
if ($Database -notmatch '^evolv_c8b_validation_[A-Za-z0-9_]+$') {
  throw "C8B concurrency target must be an explicitly isolated local validation database"
}

$labelsJson = docker inspect $Container '--format={{json .Config.Labels}}' 2>$null
$labels = if ($LASTEXITCODE -eq 0) { $labelsJson | ConvertFrom-Json } else { $null }
$localProject = if ($null -ne $labels) { $labels.'com.supabase.cli.project' } else { $null }
if ([string]::IsNullOrWhiteSpace($localProject)) {
  throw "C8B concurrency target is not a Supabase CLI local container"
}

function Invoke-C8bSql {
  param([Parameter(Mandatory = $true)][string]$Sql)
  $output = $Sql | docker exec -i $Container psql -v ON_ERROR_STOP=1 -U postgres -d $Database -X -q -A -t 2>&1
  if ($LASTEXITCODE -ne 0) { throw ($output | Out-String) }
  return $output
}

function Start-C8bSqlJob {
  param([Parameter(Mandatory = $true)][string]$Sql)
  Start-Job -ScriptBlock {
    param($JobContainer, $JobDatabase, $JobSql)
    $output = $JobSql | docker exec -i $JobContainer psql -v ON_ERROR_STOP=1 -U postgres -d $JobDatabase -X -q -A -t 2>&1
    if ($LASTEXITCODE -ne 0) { throw ($output | Out-String) }
  } -ArgumentList $Container, $Database, $Sql
}

function Invoke-C8bPair {
  param([string]$First, [string]$Second)
  $firstJob = Start-C8bSqlJob -Sql $First
  Start-Sleep -Milliseconds 150
  $secondJob = Start-C8bSqlJob -Sql $Second
  Wait-Job -Job $firstJob, $secondJob | Out-Null
  try {
    Receive-Job -Job $firstJob -ErrorAction Stop | Out-Null
    Receive-Job -Job $secondJob -ErrorAction Stop | Out-Null
  } finally {
    Remove-Job -Job $firstJob, $secondJob -Force
  }
}

$setup = @'
create table public.c8b_concurrency_results(
  label text primary key, outcome text not null, evidence_id uuid, error_code text
);
create table public.c8b_concurrency_subjects(label text primary key, evidence_id uuid not null);
insert into organizations(id,name,slug) values('cc800000-0000-4000-8000-000000000001','C8B Concurrency','c8b-concurrency');
insert into auth.users(id) values('cc810000-0000-4000-8000-000000000001');
insert into profiles(id,organization_id,name,email,role) values(
 'cc810000-0000-4000-8000-000000000001','cc800000-0000-4000-8000-000000000001','Master','master@c8b-concurrency.test','master'
);
insert into administrators(id,organization_id,name,slug) values(
 'cc820000-0000-4000-8000-000000000001','cc800000-0000-4000-8000-000000000001','Administrator','c8b-concurrency-admin'
);
insert into contracts(id,organization_id,administrator_id,status,credit_amount) values
 ('cc830000-0000-4000-8000-000000000001','cc800000-0000-4000-8000-000000000001','cc820000-0000-4000-8000-000000000001','draft',0),
 ('cc830000-0000-4000-8000-000000000002','cc800000-0000-4000-8000-000000000001','cc820000-0000-4000-8000-000000000001','draft',0);
select set_config('request.jwt.claim.role','service_role',false);
create or replace function pg_temp.record_receipt(p_key text,p_ref text,p_correlation uuid,p_time timestamptz)
returns jsonb language sql as $$select record_manual_contract_evidence_transaction(
 'cc810000-0000-4000-8000-000000000001','cc830000-0000-4000-8000-000000000001','patrion_commission_receipt',p_key,p_correlation,p_time,
 null,null,null,null,null,null,jsonb_build_object('expectedRevenueEntryId',null,'amountCents',1000,'currency','BRL','receivedAt',p_time,
 'receiptReference',p_ref,'competenceDate','2026-08-01','attributableAmountCents',1000))$$;
with r as (select pg_temp.record_receipt('c8b-concurrent-validate','concurrent-validate','cc840000-0000-4000-8000-000000000010','2026-08-21T10:00:00Z') result)
insert into c8b_concurrency_subjects select 'validate',(result->>'evidenceId')::uuid from r;
with r as (select pg_temp.record_receipt('c8b-concurrent-mixed','concurrent-mixed','cc840000-0000-4000-8000-000000000011','2026-08-21T11:00:00Z') result)
insert into c8b_concurrency_subjects select 'mixed',(result->>'evidenceId')::uuid from r;
with r as (select record_manual_contract_evidence_transaction(
 'cc810000-0000-4000-8000-000000000001','cc830000-0000-4000-8000-000000000001','first_installment_payment','c8b-concurrent-super','cc840000-0000-4000-8000-000000000012','2026-08-21T12:00:00Z',
 null,null,null,null,null,null,'{"administratorId":"cc820000-0000-4000-8000-000000000001","billingReference":"super-old","amountCents":1000,"currency":"BRL","dueAt":"2026-08-20T12:00:00Z","paidAt":"2026-08-21T12:00:00Z","confirmationReference":"super-old"}'::jsonb) result)
insert into c8b_concurrency_subjects select 'supersede',(result->>'evidenceId')::uuid from r;
with r as (select record_manual_contract_evidence_transaction(
 'cc810000-0000-4000-8000-000000000001','cc830000-0000-4000-8000-000000000002','first_installment_payment','c8b-concurrent-super-mixed','cc840000-0000-4000-8000-000000000013','2026-08-21T13:00:00Z',
 null,null,null,null,null,null,'{"administratorId":"cc820000-0000-4000-8000-000000000001","billingReference":"super-mixed-old","amountCents":1000,"currency":"BRL","dueAt":"2026-08-20T13:00:00Z","paidAt":"2026-08-21T13:00:00Z","confirmationReference":"super-mixed-old"}'::jsonb) result)
insert into c8b_concurrency_subjects select 'supersede_mixed',(result->>'evidenceId')::uuid from r;
with r as (select record_manual_contract_evidence_transaction(
 'cc810000-0000-4000-8000-000000000001','cc830000-0000-4000-8000-000000000002','signed_contract','c8b-concurrent-signed-a','cc840000-0000-4000-8000-000000000014','2026-08-21T14:00:00Z','signed-a',null,null,null,null,null,
 '{"signatureMethod":"electronic","documentVersion":"1","providerName":"Provider","providerReference":"signed-a","effectiveSignedAt":"2026-08-21T14:00:00Z","signatories":[{"name":"A"}]}'::jsonb) result)
insert into c8b_concurrency_subjects select 'signed_a',(result->>'evidenceId')::uuid from r;
with r as (select record_manual_contract_evidence_transaction(
 'cc810000-0000-4000-8000-000000000001','cc830000-0000-4000-8000-000000000002','signed_contract','c8b-concurrent-signed-b','cc840000-0000-4000-8000-000000000015','2026-08-21T15:00:00Z','signed-b',null,null,null,null,null,
 '{"signatureMethod":"electronic","documentVersion":"1","providerName":"Provider","providerReference":"signed-b","effectiveSignedAt":"2026-08-21T15:00:00Z","signatories":[{"name":"B"}]}'::jsonb) result)
insert into c8b_concurrency_subjects select 'signed_b',(result->>'evidenceId')::uuid from r;
'@
Invoke-C8bSql -Sql $setup | Out-Null

function New-CaptureSql {
  param([string]$Label,[string]$Body,[string]$Before = "")
  @"
do `$do`$ declare v jsonb; begin
 perform set_config('request.jwt.claim.role','service_role',true);
 $Before
 v := $Body;
 insert into c8b_concurrency_results(label,outcome,evidence_id) values('$Label',v->>'outcome',(v->>'evidenceId')::uuid);
exception when others then
 insert into c8b_concurrency_results(label,outcome,error_code) values('$Label','error',sqlerrm);
end `$do`$;
"@
}

$recordBody = "record_manual_contract_evidence_transaction('cc810000-0000-4000-8000-000000000001','cc830000-0000-4000-8000-000000000001','patrion_commission_receipt','c8b-concurrent-record','cc840000-0000-4000-8000-000000000020','2026-08-21T16:00:00Z',null,null,null,null,null,null,'{`"expectedRevenueEntryId`":null,`"amountCents`":1000,`"currency`":`"BRL`",`"receivedAt`":`"2026-08-21T16:00:00Z`",`"receiptReference`":`"concurrent-record`",`"competenceDate`":`"2026-08-01`",`"attributableAmountCents`":1000}'::jsonb)"
$recordLock = "perform pg_advisory_xact_lock(hashtextextended('cc800000-0000-4000-8000-000000000001:record_manual_evidence:c8b-concurrent-record',0)); perform pg_sleep(0.5);"
Invoke-C8bPair (New-CaptureSql 'record-a' $recordBody $recordLock) (New-CaptureSql 'record-b' $recordBody)

$conflictBody = $recordBody.Replace('"receiptReference":"concurrent-record"','"receiptReference":"concurrent-record-changed"')
Invoke-C8bSql -Sql (New-CaptureSql 'record-conflict' $conflictBody) | Out-Null

$validateId = (Invoke-C8bSql -Sql "select evidence_id from c8b_concurrency_subjects where label='validate'" | Select-Object -Last 1).ToString().Trim()
$validateBodyA = "validate_contract_evidence_transaction('cc810000-0000-4000-8000-000000000001','$validateId','c8b-concurrent-validate-a','cc840000-0000-4000-8000-000000000021',null)"
$validateBodyB = "validate_contract_evidence_transaction('cc810000-0000-4000-8000-000000000001','$validateId','c8b-concurrent-validate-b','cc840000-0000-4000-8000-000000000022',null)"
Invoke-C8bPair (New-CaptureSql 'validate-a' $validateBodyA "perform 1 from contract_evidences where id='$validateId' for update; perform pg_sleep(0.5);") (New-CaptureSql 'validate-b' $validateBodyB)

$mixedId = (Invoke-C8bSql -Sql "select evidence_id from c8b_concurrency_subjects where label='mixed'" | Select-Object -Last 1).ToString().Trim()
$mixedValidateSql = New-CaptureSql 'mixed-validate' "validate_contract_evidence_transaction('cc810000-0000-4000-8000-000000000001','$mixedId','c8b-mixed-validate','cc840000-0000-4000-8000-000000000023',null)" "perform 1 from contract_evidences where id='$mixedId' for update; perform pg_sleep(0.5);"
$mixedInvalidateSql = New-CaptureSql 'mixed-invalidate' "invalidate_contract_evidence_transaction('cc810000-0000-4000-8000-000000000001','$mixedId','Concurrent invalidation','c8b-mixed-invalidate','cc840000-0000-4000-8000-000000000024')"
Invoke-C8bPair $mixedValidateSql $mixedInvalidateSql

$superId = (Invoke-C8bSql -Sql "select evidence_id from c8b_concurrency_subjects where label='supersede'" | Select-Object -Last 1).ToString().Trim()
$superDetailA = "'{`"administratorId`":`"cc820000-0000-4000-8000-000000000001`",`"billingReference`":`"super-a`",`"amountCents`":1000,`"currency`":`"BRL`",`"dueAt`":`"2026-08-20T17:00:00Z`",`"paidAt`":`"2026-08-21T17:00:00Z`",`"confirmationReference`":`"super-a`"}'::jsonb"
$superDetailB = $superDetailA.Replace('super-a','super-b')
$superA = "supersede_contract_evidence_transaction('cc810000-0000-4000-8000-000000000001','$superId','c8b-super-a','cc840000-0000-4000-8000-000000000025','Correction A','2026-08-21T17:00:00Z',null,null,null,null,null,null,$superDetailA)"
$superB = "supersede_contract_evidence_transaction('cc810000-0000-4000-8000-000000000001','$superId','c8b-super-b','cc840000-0000-4000-8000-000000000026','Correction B','2026-08-21T17:00:00Z',null,null,null,null,null,null,$superDetailB)"
Invoke-C8bPair (New-CaptureSql 'super-a' $superA "perform 1 from contract_evidences where id='$superId' for update; perform pg_sleep(0.5);") (New-CaptureSql 'super-b' $superB)

$superMixedId = (Invoke-C8bSql -Sql "select evidence_id from c8b_concurrency_subjects where label='supersede_mixed'" | Select-Object -Last 1).ToString().Trim()
$superMixed = "supersede_contract_evidence_transaction('cc810000-0000-4000-8000-000000000001','$superMixedId','c8b-super-mixed','cc840000-0000-4000-8000-000000000027','Correction mixed','2026-08-21T18:00:00Z',null,null,null,null,null,null," + $superDetailA.Replace('17:00:00','18:00:00').Replace('super-a','super-mixed') + ")"
Invoke-C8bPair (New-CaptureSql 'super-mixed' $superMixed "perform 1 from contract_evidences where id='$superMixedId' for update; perform pg_sleep(0.5);") (New-CaptureSql 'super-mixed-invalidate' "invalidate_contract_evidence_transaction('cc810000-0000-4000-8000-000000000001','$superMixedId','Concurrent invalidation','c8b-super-mixed-invalidate','cc840000-0000-4000-8000-000000000028')")

$signedA = (Invoke-C8bSql -Sql "select evidence_id from c8b_concurrency_subjects where label='signed_a'" | Select-Object -Last 1).ToString().Trim()
$signedB = (Invoke-C8bSql -Sql "select evidence_id from c8b_concurrency_subjects where label='signed_b'" | Select-Object -Last 1).ToString().Trim()
Invoke-C8bPair (New-CaptureSql 'signed-validate-a' "validate_contract_evidence_transaction('cc810000-0000-4000-8000-000000000001','$signedA','c8b-signed-validate-a','cc840000-0000-4000-8000-000000000029',null)" "perform pg_sleep(0.25);") (New-CaptureSql 'signed-validate-b' "validate_contract_evidence_transaction('cc810000-0000-4000-8000-000000000001','$signedB','c8b-signed-validate-b','cc840000-0000-4000-8000-000000000030',null)" "perform pg_sleep(0.25);")

Invoke-C8bSql -Sql (New-CaptureSql 'retry-after-commit' $recordBody) | Out-Null

$assertions = @'
do $assert$
declare v_record_id uuid;
begin
 if (select count(*) from c8b_concurrency_results where label in('record-a','record-b') and outcome in('completed','already_completed'))<>2 then raise exception 'C8B_CONCURRENCY_RECORD_FAILED'; end if;
 if (select count(distinct evidence_id) from c8b_concurrency_results where label in('record-a','record-b'))<>1 then raise exception 'C8B_CONCURRENCY_RECORD_DUPLICATED'; end if;
 if (select error_code from c8b_concurrency_results where label='record-conflict')<>'CE_IDEMPOTENCY_CONFLICT' then raise exception 'C8B_CONCURRENCY_IDEMPOTENCY_CONFLICT_MISSING'; end if;
 if (select count(*) from c8b_concurrency_results where label in('validate-a','validate-b') and outcome='completed')<>1 then raise exception 'C8B_CONCURRENCY_VALIDATE_FAILED'; end if;
 if (select count(*) from c8b_concurrency_results where label in('mixed-validate','mixed-invalidate') and outcome='completed')<>2 then raise exception 'C8B_CONCURRENCY_VALIDATE_INVALIDATE_FAILED'; end if;
 if (select e.status from contract_evidences e join c8b_concurrency_results r on r.evidence_id=e.id where r.label='mixed-validate')<>'invalidated' then raise exception 'C8B_CONCURRENCY_VALIDATE_INVALIDATE_STATE_FAILED'; end if;
 if (select count(*) from c8b_concurrency_results where label in('super-a','super-b') and outcome='completed')<>1 then raise exception 'C8B_CONCURRENCY_SUPERSEDE_FAILED'; end if;
 if (select count(*) from c8b_concurrency_results where label in('super-mixed','super-mixed-invalidate') and outcome='completed')<>1 then raise exception 'C8B_CONCURRENCY_SUPERSEDE_INVALIDATE_FAILED'; end if;
 if (select count(*) from c8b_concurrency_results where label in('signed-validate-a','signed-validate-b') and outcome='completed')<>1 then raise exception 'C8B_CONCURRENCY_VALIDATED_UNIQUE_FAILED'; end if;
 if (select outcome from c8b_concurrency_results where label='retry-after-commit')<>'already_completed' then raise exception 'C8B_CONCURRENCY_RETRY_FAILED'; end if;
 if exists(select 1 from contract_evidence_audit_events group by evidence_id,previous_event_hash having count(*)>1) then raise exception 'C8B_CONCURRENCY_AUDIT_FORK'; end if;
 if exists(select 1 from contract_evidences e where
   (select count(*) from contract_signed_evidence_details d where d.evidence_id=e.id)+
   (select count(*) from contract_first_installment_payment_evidence_details d where d.evidence_id=e.id)+
   (select count(*) from contract_patrion_receipt_evidence_details d where d.evidence_id=e.id)<>1) then raise exception 'C8B_CONCURRENCY_DETAIL_CARDINALITY'; end if;
 if exists(select 1 from contract_signed_evidence_details d left join contract_evidences e on e.id=d.evidence_id where e.id is null)
   or exists(select 1 from contract_first_installment_payment_evidence_details d left join contract_evidences e on e.id=d.evidence_id where e.id is null)
   or exists(select 1 from contract_patrion_receipt_evidence_details d left join contract_evidences e on e.id=d.evidence_id where e.id is null) then raise exception 'C8B_CONCURRENCY_ORPHAN_DETAIL'; end if;
 if exists(select 1 from contracts where organization_id='cc800000-0000-4000-8000-000000000001' and status<>'draft') then raise exception 'C8B_CONCURRENCY_CONTRACT_CHANGED'; end if;
 if (select count(*) from contract_commission_snapshots)+(select count(*) from expected_revenue_entries)+(select count(*) from recognized_revenue_entries)+(select count(*) from revenue_entries)<>0 then raise exception 'C8B_CONCURRENCY_FINANCIAL_EFFECT'; end if;
end $assert$;
select 'C8B_CONCURRENCY_OK';
'@
$result = Invoke-C8bSql -Sql $assertions | Out-String
if ($result -notmatch "C8B_CONCURRENCY_OK") { throw "C8B concurrency certification did not complete" }
Write-Output "C8B_CONCURRENCY_OK"

# META-ADS-001 migration archive

This directory preserves SQL files removed from the executable Supabase migration chain during the Production chain remediation on 2026-08-06.

Production has `20260803120000_create_lead_ingestion_foundation.sql` recorded as its historical Meta ingestion baseline. No known remote environment recorded any file archived here. No `migration repair` was used or is intended.

| Original migration | Reason for archival | Replacement |
|---|---|---|
| `20260803130000_assert_canonical_foundations.sql` | Global EVOLV assertion gate from an unfinished canonical stabilization effort; outside the Meta Ads domain. | None in the Meta chain. The global initiative must be reconsidered independently. |
| `20260803140000_harden_public_table_structural_privileges.sql` | Global privilege hardening across 31 tables; outside the Meta Ads domain and dependent on incomplete legacy foundations. | Only the Meta-specific privilege requirements are enforced by `20260806120000_finalize_meta_lead_ingestion_foundation.sql`. |
| `20260804120000_harden_meta_lead_ingestion_foundation.sql` | Intermediate Meta state with data backfills and caller-controlled clock overloads. | Consolidated final evolution in `20260806120000_finalize_meta_lead_ingestion_foundation.sql`. |
| `20260804130000_authoritative_meta_claim_lease_enforcement.sql` | Finalized the intermediate overloads but cannot run independently from the archived `20260804120000`. | Consolidated final evolution in `20260806120000_finalize_meta_lead_ingestion_foundation.sql`. |
| `20260805130000_create_compensatory_lead_ingestion_final_foundation.sql` | Created missing tables or accepted already-final tables, but did not evolve the initial tables already created in Production by `20260803120000`. | `20260806120000_finalize_meta_lead_ingestion_foundation.sql`. |

The original contents are preserved verbatim in this non-executable documentation directory and remain traceable through Git history. Production has not been updated by this remediation. Local validation must pass before a separate authorization may consider any database application.

## Active Meta chain and local proof

The executable Meta sequence is now:

1. `20260803120000_create_lead_ingestion_foundation.sql` — historical baseline already recorded in Production;
2. `20260805120000_compensate_crm_leads_canonical_gap.sql` — pending CRM compatibility evolution;
3. `20260806120000_finalize_meta_lead_ingestion_foundation.sql` — pending consolidated evolution of the existing ingestion tables.

Local validation uses two isolated, disposable PostgreSQL databases: one applies the complete active migration chain from an empty application schema; the other reproduces the Production gap after `20260803120000`, preserves synthetic sentinel rows, and applies only the two pending migrations above. Both paths must produce the same normalized Meta-domain catalog signature and pass the Meta pgTAP, TypeScript, typecheck, lint, and whitespace gates.

Neither pending migration has been applied in Production by this remediation. A separate code review and explicit Production database application gate are required before any `db push`. `migration repair` must not be used to represent SQL that was never executed.

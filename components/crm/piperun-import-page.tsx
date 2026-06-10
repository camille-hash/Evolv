"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  buildPiperunImportPreview,
  executePiperunImport,
  loadExistingCrmExternalIds,
  type PiperunImportExecutionReport,
  type PiperunImportWarning,
  type PiperunMappedLeadPreview,
} from "@/modules/crm/import";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  style: "currency",
});

const warningLabels: Record<PiperunImportWarning, string> = {
  "missing-phone": "Sem telefone",
  "repeated-email": "E-mail repetido",
  "unknown-status": "Status desconhecido",
  "empty-pipeline": "Pipeline vazio",
  "empty-stage": "Etapa vazia",
  "empty-value": "Valor P&S vazio",
  "duplicate-external-id": "ExternalId ja existente",
};

const phoneSourceLabels = {
  email: "Telefone por e-mail",
  hash: "Telefone por Hash",
  name: "Telefone por nome",
  none: "Sem telefone",
};

export function PiperunImportPage() {
  const [existingExternalIds, setExistingExternalIds] = useState<string[]>([]);
  const [executionReport, setExecutionReport] =
    useState<PiperunImportExecutionReport | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setExistingExternalIds(loadExistingCrmExternalIds());
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const preview = useMemo(
    () => buildPiperunImportPreview({ existingExternalIds }),
    [existingExternalIds],
  );

  function handleConfirmImport() {
    const confirmed = window.confirm(
      `Confirmar importacao de ${preview.summary.validRows} oportunidades PipeRun para o EVOLV? Um backup do CRM atual sera criado antes da gravacao.`,
    );

    if (!confirmed) {
      return;
    }

    const report = executePiperunImport(preview);
    setExecutionReport(report);
    setExistingExternalIds(loadExistingCrmExternalIds());
  }

  return (
    <section className="grid gap-6">
      <section className="executive-surface rounded-md p-5 text-card-foreground sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Importacao PipeRun
            </p>
            <h2 className="mt-2 text-xl font-semibold">
              Pre-visualizacao assistida
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Esta tela apenas le o snapshot local do arquivo auditado e valida
              os registros. Nenhum lead e criado ou alterado nesta sprint.
            </p>
          </div>

          <div className="rounded-md border bg-background/70 p-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2 text-foreground">
              <FileSpreadsheet className="h-4 w-4" aria-hidden />
              <span className="font-medium">{preview.summary.sourceFile}</span>
            </div>
            <p className="mt-1">
              Oportunidades: {preview.summary.sheetName} · Contatos:
              Banco Piperun telefone.xlsx
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-md border border-brand-gold/40 bg-background/70 p-4 text-sm leading-6 text-muted-foreground">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-brand-ink" aria-hidden />
            <p>
              A importacao real so ocorre apos clique em Confirmar Importacao.
              Antes disso, esta tela apenas consolida oportunidades e contatos,
              valida telefones, calcula duplicidades por externalId e exibe a
              revisao pre-importacao.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <ImportMetric label="Total no arquivo" value={preview.summary.totalRows} />
        <ImportMetric label="Validos para importar" value={preview.summary.validRows} />
        <ImportMetric
          label="Ignorados sem telefone"
          value={preview.summary.ignoredMissingPhone}
        />
        <ImportMetric label="Com telefone" value={preview.summary.phoneRows} />
        <ImportMetric
          label="E-mails repetidos"
          value={preview.summary.repeatedEmailRows}
        />
        <ImportMetric
          label="Valor P&S vazio"
          value={preview.summary.emptyValueRows}
        />
        <ImportMetric
          label="ExternalId duplicado"
          value={preview.summary.warningCounts["duplicate-external-id"]}
        />
        <ImportMetric
          label="Status desconhecido"
          value={preview.summary.warningCounts["unknown-status"]}
        />
        <ImportMetric
          label="Preview exibido"
          value={preview.previewRows.length}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <DistributionCard title="Registros por status PipeRun" values={preview.summary.statusCounts} />
        <DistributionCard title="Registros por status EVOLV" values={preview.summary.statusCrmCounts} />
        <DistributionCard title="Total por responsavel" values={preview.summary.consultantCounts} />
        <DistributionCard title="Registros por pipeline" values={preview.summary.pipelineCounts} />
        <DistributionCard title="Registros por etapa" values={preview.summary.stageCounts} />
      </section>

      {executionReport ? (
        <section className="executive-surface rounded-md p-5 text-card-foreground sm:p-6">
          <h3 className="font-semibold">Relatorio pos-importacao</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <ImportMetric label="Processados" value={executionReport.processed} />
            <ImportMetric label="Importados" value={executionReport.imported} />
            <ImportMetric
              label="Bloqueados sem telefone"
              value={executionReport.blockedMissingPhone}
            />
            <ImportMetric
              label="Ignorados por externalId"
              value={executionReport.ignoredDuplicateExternalId}
            />
            <ImportMetric label="Ganhas" value={executionReport.gained} />
            <ImportMetric label="Perdidas" value={executionReport.lost} />
            <ImportMetric label="Ativas" value={executionReport.active} />
            <ImportMetric
              label="Backup criado"
              value={executionReport.backupCreated ? "Sim" : "Nao"}
            />
          </div>
        </section>
      ) : null}

      <section className="executive-surface rounded-md p-5 text-card-foreground sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="font-semibold">Preview dos primeiros 50 registros</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Mapeamento PipeRun para EVOLV antes de qualquer persistencia.
            </p>
          </div>

          <Button
            disabled={!preview.summary.validRows}
            onClick={handleConfirmImport}
            type="button"
          >
            Confirmar Importacao
          </Button>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-[1280px] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.08em] text-muted-foreground">
              <tr className="border-b">
                <th className="px-3 py-3">Nome</th>
                <th className="px-3 py-3">Telefone</th>
                <th className="px-3 py-3">E-mail</th>
                <th className="px-3 py-3">Pipeline</th>
                <th className="px-3 py-3">Etapa</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Origem</th>
                <th className="px-3 py-3">Consultor</th>
                <th className="px-3 py-3">Valor</th>
                <th className="px-3 py-3">Tags</th>
                <th className="px-3 py-3">Telefone fonte</th>
                <th className="px-3 py-3">ExternalId</th>
                <th className="px-3 py-3">Validacoes</th>
              </tr>
            </thead>
            <tbody>
              {preview.previewRows.map((row) => (
                <PreviewRow key={row.externalId} row={row} />
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}

function ImportMetric({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <article className="executive-surface rounded-md p-4 text-card-foreground">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
    </article>
  );
}

function DistributionCard({
  title,
  values,
}: {
  title: string;
  values: Record<string, number>;
}) {
  return (
    <article className="executive-surface rounded-md p-5 text-card-foreground">
      <h3 className="font-semibold">{title}</h3>
      <div className="mt-4 grid gap-2">
        {Object.entries(values)
          .sort((left, right) => right[1] - left[1])
          .slice(0, 8)
          .map(([label, value]) => (
            <div
              className="flex items-center justify-between gap-4 rounded-md border bg-background/70 px-3 py-2 text-sm"
              key={label}
            >
              <span className="truncate text-muted-foreground">{label}</span>
              <span className="font-semibold text-foreground">{value}</span>
            </div>
          ))}
      </div>
    </article>
  );
}

function PreviewRow({ row }: { row: PiperunMappedLeadPreview }) {
  return (
    <tr className="border-b align-top last:border-b-0">
      <td className="px-3 py-3 font-medium text-foreground">{row.nome}</td>
      <td className="px-3 py-3 text-muted-foreground">
        {row.telefone || "-"}
      </td>
      <td className="px-3 py-3 text-muted-foreground">{row.email || "-"}</td>
      <td className="px-3 py-3 text-muted-foreground">{row.pipeline || "-"}</td>
      <td className="px-3 py-3 text-muted-foreground">{row.etapa || "-"}</td>
      <td className="px-3 py-3 text-muted-foreground">{row.status}</td>
      <td className="px-3 py-3 text-muted-foreground">{row.origem || "-"}</td>
      <td className="px-3 py-3 text-muted-foreground">{row.consultor || "-"}</td>
      <td className="px-3 py-3 text-muted-foreground">
        {currencyFormatter.format(row.valorPotencial)}
      </td>
      <td className="px-3 py-3 text-muted-foreground">
        {row.tags.length ? row.tags.join(", ") : "-"}
      </td>
      <td className="px-3 py-3 text-muted-foreground">
        {phoneSourceLabels[row.phoneMatchSource]}
      </td>
      <td className="px-3 py-3 font-mono text-xs text-muted-foreground">
        {row.externalId}
      </td>
      <td className="px-3 py-3">
        <div className="flex flex-wrap gap-1.5">
          {row.warnings.length ? (
            row.warnings.map((warning) => (
              <span
                className="rounded-full border border-brand-gold/40 bg-background px-2 py-0.5 text-xs text-muted-foreground"
                key={warning}
              >
                {warningLabels[warning]}
              </span>
            ))
          ) : (
            <span className="rounded-full border bg-background px-2 py-0.5 text-xs text-muted-foreground">
              OK
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}

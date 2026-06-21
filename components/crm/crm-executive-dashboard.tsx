import type { CrmExecutiveDashboardReadModel } from "@/modules/crm";

const percentFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
  style: "percent",
});

export function CrmExecutiveDashboard({
  data,
  isOperationalDataAvailable,
  isOperationalDataLoading,
  isSimulationDataLoading,
  operationalDataError,
  simulationDataError,
}: {
  data: CrmExecutiveDashboardReadModel;
  isOperationalDataAvailable: boolean;
  isOperationalDataLoading: boolean;
  isSimulationDataLoading: boolean;
  operationalDataError: string | null;
  simulationDataError: string | null;
}) {
  const operationalValue = (value: number) =>
    isOperationalDataAvailable ? String(value) : "—";
  const simulationValue = (value: number) =>
    !isSimulationDataLoading && !simulationDataError ? String(value) : "—";

  return (
    <section className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ExecutiveMetricCard
          label="Leads Totais"
          value={String(data.leads.total)}
        />
        <ExecutiveMetricCard
          detail={percentFormatter.format(data.leads.hotPercentage)}
          label="Leads Quentes"
          value={String(data.leads.hot)}
        />
        <ExecutiveMetricCard
          label="Acoes Vencidas"
          value={operationalValue(data.tasks.leadsWithOverdueAction)}
        />
        <ExecutiveMetricCard
          label="Sem Proxima Acao"
          value={operationalValue(data.tasks.leadsWithoutPendingAction)}
        />
      </div>

      {isOperationalDataLoading ? (
        <DashboardNotice text="Carregando dados operacionais..." />
      ) : null}
      {operationalDataError ? <DashboardNotice text={operationalDataError} /> : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <DistributionPanel
          items={data.temperatures}
          title="Distribuicao de Temperaturas"
          total={data.leads.total}
        />
        <DistributionPanel
          emptyText="Nenhuma etapa encontrada na base atual."
          items={data.stages}
          title="Distribuicao por Etapa"
          total={data.leads.total}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ExecutiveGroup title="Check Points">
          <GroupMetric
            label="Leads com Check Points"
            value={operationalValue(data.checkpoints.leadsWithCheckpoints)}
          />
          <GroupMetric
            label="Leads sem Check Points"
            value={operationalValue(data.checkpoints.leadsWithoutCheckpoints)}
          />
          <GroupMetric
            label="Total de Check Points encontrados"
            value={operationalValue(data.checkpoints.totalCheckpoints)}
          />
        </ExecutiveGroup>

        <ExecutiveGroup title="Simulacoes">
          {isSimulationDataLoading ? (
            <p className="text-sm text-muted-foreground">Carregando simulacoes...</p>
          ) : null}
          {simulationDataError ? (
            <p className="text-sm text-muted-foreground">{simulationDataError}</p>
          ) : null}
          <GroupMetric
            label="Leads simulados"
            value={simulationValue(data.simulations.leadsSimulated)}
          />
          <GroupMetric
            label="Total de simulacoes"
            value={simulationValue(data.simulations.totalSimulations)}
          />
          <GroupMetric
            label="Leads com Multi-Cotas"
            value={simulationValue(data.simulations.leadsWithMultiCotas)}
          />
        </ExecutiveGroup>

        <ExecutiveGroup title="Atividade Recente">
          <GroupMetric
            label="Atualizados nos ultimos 30 dias"
            value={String(data.activity.recentlyUpdated)}
          />
          <GroupMetric
            label="Sem atualizacao nos ultimos 30 dias"
            value={String(data.activity.withoutRecentUpdate)}
          />
        </ExecutiveGroup>
      </div>
    </section>
  );
}

function ExecutiveMetricCard({
  detail,
  label,
  value,
}: {
  detail?: string;
  label: string;
  value: string;
}) {
  return (
    <article className="executive-surface rounded-md p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold text-foreground">{value}</p>
      {detail ? (
        <p className="mt-2 text-sm text-muted-foreground">{detail} da base</p>
      ) : null}
    </article>
  );
}

function DistributionPanel({
  emptyText = "Nenhum dado encontrado.",
  items,
  title,
  total,
}: {
  emptyText?: string;
  items: CrmExecutiveDashboardReadModel["temperatures"];
  title: string;
  total: number;
}) {
  return (
    <section className="executive-surface rounded-md p-5 sm:p-6">
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {items.length > 0 ? (
        <div className="mt-5 grid gap-4">
          {items.map((item) => {
            const width = total > 0 ? (item.count / total) * 100 : 0;

            return (
              <div key={item.key}>
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-foreground">{item.label}</span>
                  <span className="font-semibold text-foreground">{item.count}</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">{emptyText}</p>
      )}
    </section>
  );
}

function ExecutiveGroup({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="executive-surface rounded-md p-5 sm:p-6">
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <div className="mt-4 grid gap-3">{children}</div>
    </section>
  );
}

function GroupMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b pb-3 last:border-b-0 last:pb-0">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

function DashboardNotice({ text }: { text: string }) {
  return (
    <section className="executive-surface rounded-md border-dashed p-4 text-sm text-muted-foreground">
      {text}
    </section>
  );
}

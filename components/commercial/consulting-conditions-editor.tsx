"use client";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  style: "currency",
});

export type CommercialConsultingConditionsState = {
  enabled: boolean;
  installmentAmount: string;
  installmentCount: string;
  exemptionEnabled: boolean;
  exemptionDays: string;
};

export type CommercialConsultingConditionsSnapshot = {
  enabled: boolean;
  installmentAmount: number;
  installmentCount: number;
  totalAmount: number;
  exemptionEnabled: boolean;
  exemptionDays: number;
};

export const initialCommercialConsultingConditions: CommercialConsultingConditionsState =
  {
    enabled: false,
    exemptionDays: "7",
    exemptionEnabled: true,
    installmentAmount: "500",
    installmentCount: "12",
  };

export function ConsultingConditionsEditor({
  conditions,
  onChange,
  specialConditionText,
}: {
  conditions: CommercialConsultingConditionsState;
  onChange: (state: Partial<CommercialConsultingConditionsState>) => void;
  specialConditionText?: string;
}) {
  const totalAmount = calculateCommercialConsultingTotal(conditions);

  return (
    <div className="border-t pt-3">
      <div className="flex flex-col gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Condicoes comerciais
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-foreground">
          <input
            checked={conditions.enabled}
            className="h-4 w-4 accent-primary"
            onChange={(event) => onChange({ enabled: event.target.checked })}
            type="checkbox"
          />
          Incluir consultoria patrimonial
        </label>
      </div>

      {conditions.enabled ? (
        <div className="mt-4 grid gap-3">
          <div className="grid gap-3">
            <ConsultingConditionInput
              label="Quantidade de parcelas"
              onChange={(installmentCount) => onChange({ installmentCount })}
              value={conditions.installmentCount}
            />
            <ConsultingConditionInput
              label="Valor da parcela"
              onChange={(installmentAmount) => onChange({ installmentAmount })}
              value={conditions.installmentAmount}
            />
            <div className="rounded-md border bg-card p-3">
              <p className="text-xs text-muted-foreground">
                Total da consultoria
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {currencyFormatter.format(totalAmount)}
              </p>
            </div>
          </div>

          <div className="rounded-md border bg-primary/[0.04] p-3">
            <p className="text-sm font-semibold text-foreground">
              Condicao Especial Patrion
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {specialConditionText ??
                `Fechando esta proposta em ate ${
                  conditions.exemptionDays || "7"
                } dias corridos, o investimento referente a consultoria patrimonial sera integralmente isentado.`}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function calculateCommercialConsultingTotal(
  conditions: CommercialConsultingConditionsState,
) {
  const installmentCount = parsePositiveInteger(conditions.installmentCount) ?? 0;
  const installmentAmount = parseCurrencyNumber(conditions.installmentAmount);

  return installmentCount * installmentAmount;
}

export function toCommercialConsultingConditionsSnapshot(
  conditions: CommercialConsultingConditionsState,
): CommercialConsultingConditionsSnapshot {
  const installmentCount = parsePositiveInteger(conditions.installmentCount) ?? 0;
  const installmentAmount = parseCurrencyNumber(conditions.installmentAmount);
  const exemptionDays = parsePositiveInteger(conditions.exemptionDays) ?? 7;
  const totalAmount =
    conditions.enabled && installmentCount > 0 && installmentAmount > 0
      ? installmentCount * installmentAmount
      : 0;

  return {
    enabled: conditions.enabled,
    exemptionDays,
    exemptionEnabled: conditions.exemptionEnabled,
    installmentAmount: conditions.enabled ? installmentAmount : 0,
    installmentCount: conditions.enabled ? installmentCount : 0,
    totalAmount,
  };
}

export function parseCommercialConsultingConditionsSnapshot(
  snapshot: Partial<CommercialConsultingConditionsSnapshot> | null | undefined,
): CommercialConsultingConditionsState {
  if (!snapshot) {
    return initialCommercialConsultingConditions;
  }

  return {
    enabled: snapshot.enabled ?? false,
    exemptionDays: String(snapshot.exemptionDays ?? 7),
    exemptionEnabled: snapshot.exemptionEnabled ?? true,
    installmentAmount: snapshot.installmentAmount
      ? String(snapshot.installmentAmount)
      : initialCommercialConsultingConditions.installmentAmount,
    installmentCount: snapshot.installmentCount
      ? String(snapshot.installmentCount)
      : initialCommercialConsultingConditions.installmentCount,
  };
}

function ConsultingConditionInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <input
        className="h-10 rounded-md border bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-ring"
        inputMode="decimal"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

function parsePositiveInteger(value: string) {
  const parsedValue = Number(value.replace(",", "."));

  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : null;
}

function parseCurrencyNumber(value: string) {
  const normalized = value
    .replace(/\s/g, "")
    .replace(/[R$]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const parsedValue = Number(normalized);

  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 0;
}

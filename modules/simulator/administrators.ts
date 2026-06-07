export const ADMINISTRATORS_STORAGE_KEY = "evolv.administrators.v1";

export type SimulatorAdministratorKind = "default" | "custom";

export type SimulatorAdministratorParameters = {
  administrativeFeePercent: string;
  reserveFundPercent: string;
  termMonths: string;
  monthlyInsurancePercent: string;
};

export type SimulatorAdministrator = {
  id: string;
  name: string;
  kind: SimulatorAdministratorKind;
  parameters: SimulatorAdministratorParameters;
  insuranceRequired: boolean;
};

export type SimulatorAdministratorFormFields = SimulatorAdministratorParameters;

export type SimulatorSavedAdministratorData = {
  selectedAdministratorId: string;
  selectedAdministratorName: string;
  administratorKind: SimulatorAdministratorKind;
  appliedParameters: SimulatorAdministratorParameters;
  insuranceRequired: boolean;
};

const genericParameters: SimulatorAdministratorParameters = {
  administrativeFeePercent: "26",
  reserveFundPercent: "2",
  termMonths: "197",
  monthlyInsurancePercent: "0,03",
};

const defaultAdministrators: SimulatorAdministrator[] = [
  {
    id: "canopus",
    name: "Canopus",
    kind: "default",
    parameters: genericParameters,
    insuranceRequired: false,
  },
  {
    id: "ancora",
    name: "Ancora",
    kind: "default",
    parameters: genericParameters,
    insuranceRequired: false,
  },
  {
    id: "rodobens",
    name: "Rodobens",
    kind: "default",
    parameters: genericParameters,
    insuranceRequired: false,
  },
  {
    id: "custom",
    name: "Personalizada",
    kind: "custom",
    parameters: genericParameters,
    insuranceRequired: false,
  },
];

export function listAdministrators(): SimulatorAdministrator[] {
  if (!canUseLocalStorage()) {
    return cloneAdministrators(defaultAdministrators);
  }

  const rawValue = window.localStorage.getItem(ADMINISTRATORS_STORAGE_KEY);

  if (!rawValue) {
    const defaults = cloneAdministrators(defaultAdministrators);

    saveAdministrators(defaults);

    return defaults;
  }

  try {
    const parsedValue = JSON.parse(rawValue);

    if (!Array.isArray(parsedValue)) {
      return resetAdministratorsDefaults();
    }

    const normalizedAdministrators = parsedValue
      .map(normalizeAdministrator)
      .filter((administrator): administrator is SimulatorAdministrator =>
        Boolean(administrator),
      );

    return mergeWithMissingDefaults(normalizedAdministrators);
  } catch {
    return resetAdministratorsDefaults();
  }
}

export function saveAdministrator(administrator: SimulatorAdministrator) {
  const administrators = listAdministrators();
  const normalizedAdministrator = normalizeAdministrator(administrator);

  if (!normalizedAdministrator) {
    return administrators;
  }

  const exists = administrators.some(
    (currentAdministrator) =>
      currentAdministrator.id === normalizedAdministrator.id,
  );
  const nextAdministrators = exists
    ? administrators.map((currentAdministrator) =>
        currentAdministrator.id === normalizedAdministrator.id
          ? normalizedAdministrator
          : currentAdministrator,
      )
    : [...administrators, normalizedAdministrator];

  saveAdministrators(nextAdministrators);

  return nextAdministrators;
}

export function updateAdministrator(
  administratorId: string,
  partialAdministrator: Partial<Omit<SimulatorAdministrator, "id" | "kind">>,
) {
  const administrator = getAdministratorById(administratorId);

  if (!administrator) {
    return listAdministrators();
  }

  return saveAdministrator({
    ...administrator,
    ...partialAdministrator,
    parameters: {
      ...administrator.parameters,
      ...(partialAdministrator.parameters ?? {}),
    },
  });
}

export function resetAdministratorsDefaults() {
  const defaults = cloneAdministrators(defaultAdministrators);

  saveAdministrators(defaults);

  return defaults;
}

export function getAdministratorById(administratorId: string) {
  return (
    listAdministrators().find(
      (administrator) => administrator.id === administratorId,
    ) ?? null
  );
}

export function applyAdministratorToSimulationForm<
  TFormState extends SimulatorAdministratorFormFields,
>(formState: TFormState, administrator: SimulatorAdministrator): TFormState {
  return {
    ...formState,
    administrativeFeePercent:
      administrator.parameters.administrativeFeePercent,
    reserveFundPercent: administrator.parameters.reserveFundPercent,
    termMonths: administrator.parameters.termMonths,
    monthlyInsurancePercent: administrator.parameters.monthlyInsurancePercent,
  };
}

export function createSavedAdministratorData(
  administrator: SimulatorAdministrator,
): SimulatorSavedAdministratorData {
  return {
    selectedAdministratorId: administrator.id,
    selectedAdministratorName: administrator.name,
    administratorKind: administrator.kind,
    appliedParameters: { ...administrator.parameters },
    insuranceRequired: administrator.insuranceRequired,
  };
}

export function createDefaultSavedAdministratorData() {
  return createSavedAdministratorData(defaultAdministrators[3]);
}

function saveAdministrators(administrators: SimulatorAdministrator[]) {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.setItem(
    ADMINISTRATORS_STORAGE_KEY,
    JSON.stringify(administrators),
  );
}

function mergeWithMissingDefaults(administrators: SimulatorAdministrator[]) {
  const mergedAdministrators = cloneAdministrators(defaultAdministrators).map(
    (defaultAdministrator) =>
      administrators.find(
        (administrator) => administrator.id === defaultAdministrator.id,
      ) ?? defaultAdministrator,
  );
  const customAdministrators = administrators.filter(
    (administrator) =>
      !mergedAdministrators.some(
        (mergedAdministrator) => mergedAdministrator.id === administrator.id,
      ),
  );

  return [...mergedAdministrators, ...customAdministrators];
}

function normalizeAdministrator(
  value: unknown,
): SimulatorAdministrator | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const administrator = value as Partial<SimulatorAdministrator>;

  if (!administrator.id || !administrator.name) {
    return null;
  }

  return {
    id: administrator.id,
    name: administrator.name,
    kind: administrator.kind === "custom" ? "custom" : "default",
    parameters: normalizeParameters(administrator.parameters),
    insuranceRequired: Boolean(administrator.insuranceRequired),
  };
}

function normalizeParameters(
  parameters: Partial<SimulatorAdministratorParameters> | undefined,
): SimulatorAdministratorParameters {
  return {
    administrativeFeePercent:
      normalizeParameter(parameters?.administrativeFeePercent) ??
      genericParameters.administrativeFeePercent,
    reserveFundPercent:
      normalizeParameter(parameters?.reserveFundPercent) ??
      genericParameters.reserveFundPercent,
    termMonths:
      normalizeParameter(parameters?.termMonths) ?? genericParameters.termMonths,
    monthlyInsurancePercent:
      normalizeParameter(parameters?.monthlyInsurancePercent) ??
      genericParameters.monthlyInsurancePercent,
  };
}

function normalizeParameter(value: unknown) {
  return typeof value === "string" ? value : null;
}

function cloneAdministrators(administrators: SimulatorAdministrator[]) {
  return administrators.map((administrator) => ({
    ...administrator,
    parameters: { ...administrator.parameters },
  }));
}

function canUseLocalStorage() {
  return typeof window !== "undefined" && "localStorage" in window;
}

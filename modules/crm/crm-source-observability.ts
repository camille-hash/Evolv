export type CrmRepositorySource =
  | "authenticated"
  | "anon"
  | "localStorage"
  | "unknown";

const CRM_REPOSITORY_SOURCE_EVENT = "evolv:crm-repository-source";

let currentCrmRepositorySource: CrmRepositorySource = "unknown";

export function getCrmRepositorySource(): CrmRepositorySource {
  return currentCrmRepositorySource;
}

export function setCrmRepositorySource(source: CrmRepositorySource) {
  currentCrmRepositorySource = source;

  if (typeof window === "undefined") {
    return;
  }

  try {
    window.dispatchEvent(
      new CustomEvent<CrmRepositorySource>(CRM_REPOSITORY_SOURCE_EVENT, {
        detail: source,
      }),
    );
  } catch {
    // Observability must never affect CRM runtime behavior.
  }
}

export function subscribeCrmRepositorySource(
  listener: (source: CrmRepositorySource) => void,
) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  function handleSourceChange(event: Event) {
    const nextSource = (event as CustomEvent<CrmRepositorySource>).detail;

    if (
      nextSource === "authenticated" ||
      nextSource === "anon" ||
      nextSource === "localStorage" ||
      nextSource === "unknown"
    ) {
      listener(nextSource);
    }
  }

  window.addEventListener(CRM_REPOSITORY_SOURCE_EVENT, handleSourceChange);

  return () => {
    window.removeEventListener(CRM_REPOSITORY_SOURCE_EVENT, handleSourceChange);
  };
}

export async function executeContractFinancialAdapterSafely(
  adapter: () => Promise<{ ok: true } | { ok: false; message: string }>,
) {
  try {
    return await adapter();
  } catch {
    return {
      message: "O processamento financeiro encontrou uma falha inesperada.",
      ok: false as const,
    };
  }
}

export async function executeContractFinancialEffect<T>(
  adapter: () => Promise<{ ok: true } | { ok: false; message: string }>,
  finish: (
    execution: { ok: true } | { ok: false; message: string },
  ) => Promise<T>,
) {
  const execution = await executeContractFinancialAdapterSafely(adapter);
  return { execution, finishResult: await finish(execution) };
}

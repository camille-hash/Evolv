import { NextResponse, type NextRequest } from "next/server";
import {
  calculateCommercialProposalEditorPreview,
  type BidType,
  type InsuranceOption,
  type SimulatorInput,
  type SimulatorScenarioKey,
} from "@/modules/simulator";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | Partial<{
        baseInput: SimulatorInput;
        bidType: BidType;
        contemplationMonth: number;
        credit: number | null;
        insuranceOption: InsuranceOption;
        scenarioKey: SimulatorScenarioKey;
        targetInstallment: number | null;
        termMonths: number | null;
      }>
    | null;

  if (
    !isSimulatorInput(body?.baseInput) ||
    !isScenarioKey(body?.scenarioKey) ||
    !isInsuranceOption(body?.insuranceOption) ||
    !isBidType(body?.bidType)
  ) {
    return NextResponse.json(
      { error: "Informe os parametros da proposta." },
      { status: 400 },
    );
  }

  try {
    const preview = calculateCommercialProposalEditorPreview({
      baseInput: body.baseInput,
      bidType: body.bidType,
      contemplationMonth: normalizePositiveInteger(
        body.contemplationMonth,
        1,
      ),
      credit: normalizePositiveNumber(body.credit),
      insuranceOption: body.insuranceOption,
      scenarioKey: body.scenarioKey,
      targetInstallment: normalizePositiveNumber(body.targetInstallment),
      termMonths: normalizePositiveInteger(body.termMonths, null),
    });

    return NextResponse.json({ preview });
  } catch {
    return NextResponse.json(
      { error: "Nao foi possivel recalcular a proposta." },
      { status: 400 },
    );
  }
}

function isSimulatorInput(value: unknown): value is SimulatorInput {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<SimulatorInput>;

  return (
    isPositiveNumber(candidate.credit) &&
    isNonNegativeNumber(candidate.administrativeFeeRate) &&
    isNonNegativeNumber(candidate.reserveFundRate) &&
    typeof candidate.termMonths === "number" &&
    Number.isInteger(candidate.termMonths) &&
    candidate.termMonths > 0 &&
    isNonNegativeNumber(candidate.monthlyInsuranceRate)
  );
}

function isScenarioKey(value: unknown): value is SimulatorScenarioKey {
  return value === "full" || value === "seventy" || value === "half";
}

function isInsuranceOption(value: unknown): value is InsuranceOption {
  return value === "with-insurance" || value === "without-insurance";
}

function isBidType(value: unknown): value is BidType {
  return value === "none" || value === "embedded" || value === "cash";
}

function normalizePositiveNumber(value: unknown) {
  return isPositiveNumber(value) ? value : null;
}

function normalizePositiveInteger(value: unknown, fallback: number): number;
function normalizePositiveInteger(value: unknown, fallback: null): number | null;
function normalizePositiveInteger(value: unknown, fallback: number | null) {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value > 0
    ? value
    : fallback;
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

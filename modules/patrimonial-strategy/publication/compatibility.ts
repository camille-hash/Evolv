import type { StrategyArtifactReference } from "../types.ts";
import type { PatrimonialPublication } from "./types.ts";
import { assertValidPublicationSnapshot } from "./validation.ts";

export const patrimonialPublicationSnapshotKey =
  "patrimonialStrategyPublications";

export function publicationArtifactReference(input: {
  publicationId: string;
  version?: number | null;
}): StrategyArtifactReference {
  return {
    artifactId: input.publicationId,
    artifactType: "publication",
    source: "patrimonial_strategy_publication_builder",
    version: input.version ?? null,
  };
}

export function attachPublicationToStrategySnapshot(input: {
  publication: PatrimonialPublication;
  strategySnapshot: Record<string, unknown>;
}): Record<string, unknown> {
  assertValidPublicationSnapshot(input.publication);

  const strategySnapshot = clone(input.strategySnapshot);
  const existingPublications = readPublicationsFromStrategySnapshot(
    strategySnapshot,
  );
  const nextPublications = [
    ...existingPublications.filter(
      (publication) => publication.id !== input.publication.id,
    ),
    clone(input.publication),
  ].sort((left, right) => {
    if (left.strategyVersion !== right.strategyVersion) {
      return left.strategyVersion - right.strategyVersion;
    }

    return left.publicationVersion - right.publicationVersion;
  });

  return {
    ...strategySnapshot,
    [patrimonialPublicationSnapshotKey]: nextPublications,
  };
}

export function readPublicationsFromStrategySnapshot(
  snapshot: Record<string, unknown>,
): PatrimonialPublication[] {
  const rawPublications = snapshot[patrimonialPublicationSnapshotKey];

  if (!Array.isArray(rawPublications)) {
    return [];
  }

  return rawPublications
    .map((publication) => {
      if (!isPlainObject(publication)) {
        return null;
      }

      const candidate = clone(publication) as PatrimonialPublication;
      const validation = assertPublicationCandidate(candidate);

      return validation ? candidate : null;
    })
    .filter((publication): publication is PatrimonialPublication =>
      Boolean(publication),
    );
}

export function findLatestPublicationForStrategyVersion(input: {
  snapshot: Record<string, unknown>;
  strategyVersion: number;
}) {
  return readPublicationsFromStrategySnapshot(input.snapshot)
    .filter((publication) => publication.strategyVersion === input.strategyVersion)
    .sort((left, right) => right.publicationVersion - left.publicationVersion)[0] ??
    null;
}

function assertPublicationCandidate(candidate: PatrimonialPublication) {
  try {
    assertValidPublicationSnapshot(candidate);
    return true;
  } catch {
    return false;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

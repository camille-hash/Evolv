import {
  cloneDefaultCrmPipelineConfig,
  createCrmStageId,
  normalizeCrmPipelineConfig,
} from "./crm-pipeline-engine";
import type {
  CrmConfigurablePipeline,
  CrmConfigurableStage,
  CrmPipeline,
  CrmStage,
} from "./crm-types";

const CRM_PIPELINES_STORAGE_KEY = "evolv.crm.pipelines.v1";

export function loadCrmPipelineConfig(): CrmConfigurablePipeline[] {
  if (typeof window === "undefined") {
    return cloneDefaultCrmPipelineConfig();
  }

  try {
    const rawValue = window.localStorage.getItem(CRM_PIPELINES_STORAGE_KEY);

    if (!rawValue) {
      const defaults = cloneDefaultCrmPipelineConfig();
      saveCrmPipelineConfig(defaults);
      return defaults;
    }

    return normalizeCrmPipelineConfig(JSON.parse(rawValue));
  } catch {
    return cloneDefaultCrmPipelineConfig();
  }
}

export function saveCrmPipelineConfig(pipelines: CrmConfigurablePipeline[]) {
  const normalizedPipelines = normalizeCrmPipelineConfig(pipelines);

  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      CRM_PIPELINES_STORAGE_KEY,
      JSON.stringify(normalizedPipelines),
    );
  }

  return normalizedPipelines;
}

export function resetCrmPipelineConfig() {
  const defaults = cloneDefaultCrmPipelineConfig();

  return saveCrmPipelineConfig(defaults);
}

export function updateCrmPipelineName(
  pipelineId: CrmPipeline,
  nome: string,
) {
  return saveCrmPipelineConfig(
    loadCrmPipelineConfig().map((pipeline) =>
      pipeline.id === pipelineId
        ? { ...pipeline, nome: nome.trim() || pipeline.nome }
        : pipeline,
    ),
  );
}

export function addCrmStageToPipeline(pipelineId: CrmPipeline, nome: string) {
  const trimmedName = nome.trim();

  if (!trimmedName) {
    return loadCrmPipelineConfig();
  }

  return saveCrmPipelineConfig(
    loadCrmPipelineConfig().map((pipeline) => {
      if (pipeline.id !== pipelineId) {
        return pipeline;
      }

      const nextStage: CrmConfigurableStage = {
        id: ensureUniqueStageId(
          createCrmStageId(trimmedName),
          pipeline.etapas.map((stage) => stage.id),
        ),
        nome: trimmedName,
        ordem: pipeline.etapas.length + 1,
      };

      return {
        ...pipeline,
        etapas: [...pipeline.etapas, nextStage],
      };
    }),
  );
}

export function updateCrmStageName(
  pipelineId: CrmPipeline,
  stageId: CrmStage,
  nome: string,
) {
  return saveCrmPipelineConfig(
    loadCrmPipelineConfig().map((pipeline) =>
      pipeline.id === pipelineId
        ? {
            ...pipeline,
            etapas: pipeline.etapas.map((stage) =>
              stage.id === stageId
                ? { ...stage, nome: nome.trim() || stage.nome }
                : stage,
            ),
          }
        : pipeline,
    ),
  );
}

export function removeCrmStage(pipelineId: CrmPipeline, stageId: CrmStage) {
  return saveCrmPipelineConfig(
    loadCrmPipelineConfig().map((pipeline) =>
      pipeline.id === pipelineId
        ? {
            ...pipeline,
            etapas: pipeline.etapas
              .filter((stage) => stage.id !== stageId)
              .map((stage, index) => ({ ...stage, ordem: index + 1 })),
          }
        : pipeline,
    ),
  );
}

export function moveCrmStage(
  pipelineId: CrmPipeline,
  stageId: CrmStage,
  direction: "up" | "down",
) {
  return saveCrmPipelineConfig(
    loadCrmPipelineConfig().map((pipeline) => {
      if (pipeline.id !== pipelineId) {
        return pipeline;
      }

      const etapas = [...pipeline.etapas].sort(
        (left, right) => left.ordem - right.ordem,
      );
      const currentIndex = etapas.findIndex((stage) => stage.id === stageId);
      const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

      if (
        currentIndex < 0 ||
        nextIndex < 0 ||
        nextIndex >= etapas.length
      ) {
        return pipeline;
      }

      const [stage] = etapas.splice(currentIndex, 1);
      etapas.splice(nextIndex, 0, stage);

      return {
        ...pipeline,
        etapas: etapas.map((item, index) => ({ ...item, ordem: index + 1 })),
      };
    }),
  );
}

function ensureUniqueStageId(stageId: CrmStage, existingStageIds: CrmStage[]) {
  if (!existingStageIds.includes(stageId)) {
    return stageId;
  }

  let index = 2;
  let nextStageId = `${stageId}-${index}` as CrmStage;

  while (existingStageIds.includes(nextStageId)) {
    index += 1;
    nextStageId = `${stageId}-${index}` as CrmStage;
  }

  return nextStageId;
}

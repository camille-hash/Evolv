export type Simulation = {
  id: string;
  companyId: string;
  userId: string | null;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export type Scenario = {
  id: string;
  simulationId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type Comparison = {
  simulationId: string;
  scenarioIds: string[];
};

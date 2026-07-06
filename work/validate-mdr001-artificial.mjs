const cases = [
  {
    name: "plano inexistente com lookup cross-org disponivel",
    planId: "00000000-0000-0000-0000-000000000000",
    sameOrgPlan: null,
    anyOrgPlan: null,
    lookupAvailable: true,
  },
  {
    name: "mesma organizacao com lookup cross-org indisponivel",
    planId: "e7102ef3-3b86-45d2-91fe-b844194d55c6",
    sameOrgPlan: { id: "e7102ef3-3b86-45d2-91fe-b844194d55c6" },
    anyOrgPlan: null,
    lookupAvailable: false,
  },
  {
    name: "sem commission_plan_id",
    planId: null,
    sameOrgPlan: null,
    anyOrgPlan: null,
    lookupAvailable: true,
  },
];

const results = cases.map((item) => {
  const planFound = Boolean(item.sameOrgPlan || item.anyOrgPlan);
  const mdr001 = Boolean(item.planId && !planFound && item.lookupAvailable);
  return {
    name: item.name,
    mdr001,
  };
});

console.log(JSON.stringify(results, null, 2));

export type SimulatorSavedFormState = {
  credit: string;
  administrativeFeePercent: string;
  reserveFundPercent: string;
  termMonths: string;
  monthlyInsurancePercent: string;
  inccPercent: string;
  cardSalePercent: string;
  embeddedBidPercent: string;
  cashBidPercent: string;
};

export type SimulatorCommercialData = {
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  consultantName: string;
  commercialNotes: string;
};

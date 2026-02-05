export interface AgeDistribution {
  under18: number;
  age18to34: number;
  age35to54: number;
  age55to74: number;
  age75plus: number;
}

export interface IncomeDistribution {
  under25k: number;
  income25kTo50k: number;
  income50kTo75k: number;
  income75kTo100k: number;
  over100k: number;
}

export interface StateAverages {
  medianIncome: number;
  medianAge: number;
  populationPerSqMi: number;
}

export interface CountyDemographics {
  fips: string;
  name: string;
  state: string;
  population: number;
  medianIncome: number;
  medianAge: number;
  householdSize: number;
  populationGrowth: number;
  ageDistribution: AgeDistribution;
  incomeDistribution: IncomeDistribution;
  stateAverages: StateAverages;
}

export type AllCountyDemographics = Record<string, CountyDemographics>;

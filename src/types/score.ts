export interface CountyScore {
  fips: string;
  name: string;
  state: string;
  score: number;
  establishmentCount: number;
  populationPerBiz: number;
}

export type IndustryScores = Record<string, CountyScore>;

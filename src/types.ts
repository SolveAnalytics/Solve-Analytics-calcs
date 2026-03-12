export interface Portfolio {
  name: string;
  cpiTarget: number;
}

export interface DeductionValue {
  type: 'percentage' | 'rand';
  value: number;
}

export interface ScenarioData {
  memberContributionRate: number; // %
  employerGrossContributionRate: number; // %
  groupLifeCover: DeductionValue;
  disabilityCover: DeductionValue;
  funeralPremiums: DeductionValue;
  administrationFees: DeductionValue;
  consultingFees: DeductionValue;
  otherExpenses: DeductionValue;
  additionalVoluntaryContribution: number; // Rand
}

export interface CalculatorInputs {
  fundName: string;
  memberName: string;
  dateOfBirth: string;
  normalRetirementAge: number;
  calculationDate: string;
  fundCredit: number;
  pensionableSalary: number;
  salaryIncreaseAboveCPI: number;
  portfolio: string;
  current: ScenarioData;
  adjusted: ScenarioData;
}

export interface ProjectionResult {
  age: number;
  date: Date;
  currentFundCredit: number;
  adjustedFundCredit: number;
  currentSalary: number;
  adjustedSalary: number;
  differential: number;
}

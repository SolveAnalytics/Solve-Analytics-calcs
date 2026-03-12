import { Portfolio } from './types';

export const PORTFOLIOS: Portfolio[] = [
  { name: 'Coldstream Aggressive (CPI + 6%)', cpiTarget: 6.0 },
  { name: 'Coldstream Growth (CPI + 5%)', cpiTarget: 5.0 },
  { name: 'Coldstream Consolidator (CPI + 3%)', cpiTarget: 3.0 },
  { name: 'Coldstream Money Market (CPI + 1%)', cpiTarget: 1.0 },
  { name: 'MenteNova High Growth (CPI + 6%)', cpiTarget: 6.0 },
  { name: 'MenteNova Growth (CPI + 4%)', cpiTarget: 4.0 },
  { name: 'MenteNova Defensive Growth (CPI + 2%)', cpiTarget: 2.0 },
];

export const ASSUMED_CPI = 4.5;

export const DISCLAIMER_POINTS = [
  'This calculator is for illustrative purposes only and is intended to show the potential impact of changes in contribution rates on retirement outcomes.',
  'The calculation assumes that contribution rates and deductions remain unchanged until retirement.',
  'Investment returns are assumed to be in line with the target CPI-linked objectives of the selected portfolios (e.g. Aggressive – CPI + 6%; Growth – CPI + 5%). Actual returns will differ and are not guaranteed.',
  'Salary increases are assumed to occur annually in line with CPI plus the selected increase. Bonuses, promotions, discretionary increases, or periods of reduced income are not included.',
  'It is assumed that the member remains invested in the selected portfolios until retirement, with no changes to investment strategy.',
  'No allowance is made for changes in legislation, tax, fund rules, fees, or charges that may occur in the future.',
  'The calculation does not consider member-specific events, such as contribution breaks, additional voluntary contributions beyond those modelled, benefit withdrawals, early retirement, or portfolio switches.',
  'Results should not be relied upon as a guarantee or forecast of actual benefits and should be considered together with professional financial advice and official fund benefit statements.'
];

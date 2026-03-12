import React, { useState, useMemo, useEffect } from 'react';
import { 
  ComposedChart,
  Line, 
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ReferenceLine,
  Label
} from 'recharts';
import { 
  Calculator, 
  TrendingUp, 
  User, 
  Briefcase, 
  Calendar, 
  PiggyBank, 
  Info, 
  ChevronRight,
  ChevronDown,
  AlertCircle,
  ArrowRightLeft,
  LayoutDashboard
} from 'lucide-react';
import { format, addMonths, differenceInMonths, parseISO, startOfMonth, lastDayOfMonth } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { cloneDeep } from 'lodash';

import { CalculatorInputs, ScenarioData, ProjectionResult, DeductionValue } from './types';
import { PORTFOLIOS, ASSUMED_CPI, DISCLAIMER_POINTS } from './constants';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const initialScenario: ScenarioData = {
  memberContributionRate: 7.5,
  employerGrossContributionRate: 7.5,
  groupLifeCover: { type: 'percentage', value: 2.0 },
  disabilityCover: { type: 'percentage', value: 1.0 },
  funeralPremiums: { type: 'rand', value: 15 },
  administrationFees: { type: 'rand', value: 60 },
  consultingFees: { type: 'rand', value: 25 },
  otherExpenses: { type: 'rand', value: 30 },
  additionalVoluntaryContribution: 0,
};

const initialInputs: CalculatorInputs = {
  fundName: 'Coolstream Retirement Fund',
  memberName: 'John Doe',
  dateOfBirth: '1985-07-05',
  normalRetirementAge: 65,
  calculationDate: '2026-01-31',
  fundCredit: 3000000,
  pensionableSalary: 80000,
  salaryIncreaseAboveCPI: 0.5,
  portfolio: PORTFOLIOS[0].name,
  current: cloneDeep(initialScenario),
  adjusted: { 
    ...cloneDeep(initialScenario), 
    groupLifeCover: { type: 'percentage', value: 1.0 },
    additionalVoluntaryContribution: 1000 
  },
};

export default function App() {
  const [inputs, setInputs] = useState<CalculatorInputs>(initialInputs);
  const [activeTab, setActiveTab] = useState<'inputs' | 'results'>('inputs');

  const handleInputChange = (path: string, value: any) => {
    setInputs(prev => {
      const newInputs = { ...prev };
      const parts = path.split('.');
      let current: any = newInputs;
      for (let i = 0; i < parts.length - 1; i++) {
        current = current[parts[i]];
      }
      current[parts[parts.length - 1]] = value;
      return newInputs;
    });
  };

  const calculateDeduction = (deduction: DeductionValue, salary: number) => {
    if (deduction.type === 'percentage') {
      return (salary * deduction.value) / 100;
    }
    return deduction.value;
  };

  const projection = useMemo(() => {
    const dob = parseISO(inputs.dateOfBirth);
    const calcDate = parseISO(inputs.calculationDate);
    const retirementDate = lastDayOfMonth(addMonths(dob, inputs.normalRetirementAge * 12));
    const monthsToRetirement = differenceInMonths(retirementDate, calcDate);

    if (monthsToRetirement <= 0) return [];

    const portfolio = PORTFOLIOS.find(p => p.name === inputs.portfolio) || PORTFOLIOS[0];
    const annualReturn = (ASSUMED_CPI + portfolio.cpiTarget) / 100;
    const monthlyReturn = Math.pow(1 + annualReturn, 1 / 12) - 1;
    
    const annualSalaryIncrease = (ASSUMED_CPI + inputs.salaryIncreaseAboveCPI) / 100;
    const monthlySalaryIncrease = Math.pow(1 + annualSalaryIncrease, 1 / 12) - 1;

    const results: ProjectionResult[] = [];
    let currentFundCredit = inputs.fundCredit;
    let adjustedFundCredit = inputs.fundCredit;
    let currentSalary = inputs.pensionableSalary;

    // Initial state
    results.push({
      age: differenceInMonths(calcDate, dob) / 12,
      date: calcDate,
      currentFundCredit,
      adjustedFundCredit,
      currentSalary,
      adjustedSalary: currentSalary,
      differential: 0
    });

    for (let m = 1; m <= monthsToRetirement; m++) {
      const currentDate = addMonths(calcDate, m);
      
      // Update salary (assuming monthly compounding for simplicity or annual step)
      // Let's do smooth monthly increase for a better looking graph
      currentSalary *= (1 + monthlySalaryIncrease);

      // Current Scenario Contributions
      const currentDeductions = 
        calculateDeduction(inputs.current.groupLifeCover, currentSalary) +
        calculateDeduction(inputs.current.disabilityCover, currentSalary) +
        calculateDeduction(inputs.current.funeralPremiums, currentSalary) +
        calculateDeduction(inputs.current.administrationFees, currentSalary) +
        calculateDeduction(inputs.current.consultingFees, currentSalary) +
        calculateDeduction(inputs.current.otherExpenses, currentSalary);
      
      const currentGrossContrib = (inputs.current.memberContributionRate + inputs.current.employerGrossContributionRate) / 100 * currentSalary;
      const currentNetContrib = currentGrossContrib - currentDeductions + inputs.current.additionalVoluntaryContribution;

      // Adjusted Scenario Contributions
      const adjustedDeductions = 
        calculateDeduction(inputs.adjusted.groupLifeCover, currentSalary) +
        calculateDeduction(inputs.adjusted.disabilityCover, currentSalary) +
        calculateDeduction(inputs.adjusted.funeralPremiums, currentSalary) +
        calculateDeduction(inputs.adjusted.administrationFees, currentSalary) +
        calculateDeduction(inputs.adjusted.consultingFees, currentSalary) +
        calculateDeduction(inputs.adjusted.otherExpenses, currentSalary);
      
      const adjustedGrossContrib = (inputs.adjusted.memberContributionRate + inputs.adjusted.employerGrossContributionRate) / 100 * currentSalary;
      const adjustedNetContrib = adjustedGrossContrib - adjustedDeductions + inputs.adjusted.additionalVoluntaryContribution;

      // Apply returns and add contributions
      currentFundCredit = currentFundCredit * (1 + monthlyReturn) + currentNetContrib;
      adjustedFundCredit = adjustedFundCredit * (1 + monthlyReturn) + adjustedNetContrib;

      // Only push every 12 months or the last month to keep data points manageable
      if (m % 12 === 0 || m === monthsToRetirement) {
        results.push({
          age: differenceInMonths(currentDate, dob) / 12,
          date: currentDate,
          currentFundCredit,
          adjustedFundCredit,
          currentSalary,
          adjustedSalary: currentSalary,
          differential: adjustedFundCredit - currentFundCredit
        });
      }
    }

    return results;
  }, [inputs]);

  const finalResult = projection[projection.length - 1];
  
  const totalAdditionalNetContributions = useMemo(() => {
    const dob = parseISO(inputs.dateOfBirth);
    const calcDate = parseISO(inputs.calculationDate);
    const retirementDate = lastDayOfMonth(addMonths(dob, inputs.normalRetirementAge * 12));
    const monthsToRetirement = differenceInMonths(retirementDate, calcDate);
    
    let totalCurrent = 0;
    let totalAdjusted = 0;
    let salary = inputs.pensionableSalary;
    const annualSalaryIncrease = (ASSUMED_CPI + inputs.salaryIncreaseAboveCPI) / 100;
    const monthlySalaryIncrease = Math.pow(1 + annualSalaryIncrease, 1 / 12) - 1;

    for (let m = 1; m <= monthsToRetirement; m++) {
      salary *= (1 + monthlySalaryIncrease);
      
      const currentDeductions = 
        calculateDeduction(inputs.current.groupLifeCover, salary) +
        calculateDeduction(inputs.current.disabilityCover, salary) +
        calculateDeduction(inputs.current.funeralPremiums, salary) +
        calculateDeduction(inputs.current.administrationFees, salary) +
        calculateDeduction(inputs.current.consultingFees, salary) +
        calculateDeduction(inputs.current.otherExpenses, salary);
      const currentNet = ((inputs.current.memberContributionRate + inputs.current.employerGrossContributionRate) / 100 * salary) - currentDeductions + inputs.current.additionalVoluntaryContribution;
      
      const adjustedDeductions = 
        calculateDeduction(inputs.adjusted.groupLifeCover, salary) +
        calculateDeduction(inputs.adjusted.disabilityCover, salary) +
        calculateDeduction(inputs.adjusted.funeralPremiums, salary) +
        calculateDeduction(inputs.adjusted.administrationFees, salary) +
        calculateDeduction(inputs.adjusted.consultingFees, salary) +
        calculateDeduction(inputs.adjusted.otherExpenses, salary);
      const adjustedNet = ((inputs.adjusted.memberContributionRate + inputs.adjusted.employerGrossContributionRate) / 100 * salary) - adjustedDeductions + inputs.adjusted.additionalVoluntaryContribution;
      
      totalCurrent += currentNet;
      totalAdjusted += adjustedNet;
    }
    
    return totalAdjusted - totalCurrent;
  }, [inputs]);

  const additionalReturn = finalResult ? (finalResult.adjustedFundCredit - finalResult.currentFundCredit) - totalAdditionalNetContributions : 0;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(val).replace('R', 'R ');
  };

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat('en-ZA').format(val);
  };

  const calculateNetRate = (scenario: ScenarioData, salary: number) => {
    const deductions = [
      scenario.groupLifeCover,
      scenario.disabilityCover,
      scenario.funeralPremiums,
      scenario.administrationFees,
      scenario.consultingFees,
      scenario.otherExpenses
    ];

    const totalDeductionPercent = deductions.reduce((acc, d) => {
      if (d.type === 'percentage') return acc + d.value;
      return acc + (d.value / salary * 100);
    }, 0);

    return scenario.memberContributionRate + scenario.employerGrossContributionRate - totalDeductionPercent;
  };

  const DeductionInput = ({ label, path, current, adjusted }: { label: string, path: string, current: DeductionValue, adjusted: DeductionValue }) => (
    <div className="flex flex-col sm:grid sm:grid-cols-3 gap-3 sm:gap-4 py-4 sm:py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm font-bold text-gray-700">{label}</span>
      
      <div className="grid grid-cols-2 gap-3 sm:col-span-2">
        {/* Current Column */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-tight">Current</span>
          <div className="flex items-center gap-1.5">
            <select 
              className="text-[10px] border border-gray-200 rounded p-1 bg-gray-50 focus:ring-1 focus:ring-brand-blue outline-none"
              value={current.type}
              onChange={(e) => handleInputChange(`current.${path}.type`, e.target.value)}
            >
              <option value="percentage">%</option>
              <option value="rand">R</option>
            </select>
            <div className="relative w-full">
              {current.type === 'rand' && <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">R</span>}
              <input 
                type="text"
                className={cn(
                  "w-full text-xs border border-gray-200 rounded p-1.5 focus:ring-1 focus:ring-brand-blue outline-none",
                  current.type === 'rand' ? "pl-4" : ""
                )}
                value={current.value === 0 ? '' : formatNumber(current.value)}
                onChange={(e) => {
                  const val = parseFloat(e.target.value.replace(/,/g, '')) || 0;
                  handleInputChange(`current.${path}.value`, val);
                }}
              />
            </div>
          </div>
        </div>

        {/* Adjusted Column */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-black text-brand-blue uppercase tracking-tight">Adjusted</span>
          <div className="flex items-center gap-1.5">
            <select 
              className="text-[10px] border border-gray-200 rounded p-1 bg-gray-50 focus:ring-1 focus:ring-brand-blue outline-none"
              value={adjusted.type}
              onChange={(e) => handleInputChange(`adjusted.${path}.type`, e.target.value)}
            >
              <option value="percentage">%</option>
              <option value="rand">R</option>
            </select>
            <div className="relative w-full">
              {adjusted.type === 'rand' && <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-brand-blue/50">R</span>}
              <input 
                type="text"
                className={cn(
                  "w-full text-xs border border-brand-blue/30 rounded p-1.5 focus:ring-1 focus:ring-brand-blue outline-none bg-brand-blue/5 text-brand-blue font-bold",
                  adjusted.type === 'rand' ? "pl-4" : ""
                )}
                value={adjusted.value === 0 ? '' : formatNumber(adjusted.value)}
                onChange={(e) => {
                  const val = parseFloat(e.target.value.replace(/,/g, '')) || 0;
                  handleInputChange(`adjusted.${path}.value`, val);
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-gray-900 font-sans selection:bg-brand-blue/10">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 md:h-20 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="h-10 md:h-14 w-auto flex items-center justify-center">
              <img 
                src="https://drive.google.com/thumbnail?id=1ptGLRD640AG0bdIdxNbmGV_RbID-TSj7&sz=w1000" 
                alt="Seshego Logo" 
                className="h-full w-auto object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-black tracking-tight text-brand-dark leading-tight">Contribution Impact</h1>
              <p className="text-[10px] md:text-xs text-gray-500 font-bold uppercase tracking-widest">Seshego Retirement Tool</p>
            </div>
          </div>
          
          <nav className="flex bg-gray-100 p-1 rounded-xl w-full md:w-auto">
            <button 
              onClick={() => setActiveTab('inputs')}
              className={cn(
                "flex-1 md:flex-none px-4 md:px-5 py-2 rounded-lg text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2",
                activeTab === 'inputs' ? "bg-white text-brand-blue shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              <LayoutDashboard className="w-4 h-4" />
              Inputs
            </button>
            <button 
              onClick={() => setActiveTab('results')}
              className={cn(
                "flex-1 md:flex-none px-4 md:px-5 py-2 rounded-lg text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2",
                activeTab === 'results' ? "bg-white text-brand-blue shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              <TrendingUp className="w-4 h-4" />
              Results
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-4 md:py-8">
        {activeTab === 'inputs' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Member Details */}
            <div className="lg:col-span-1 space-y-6">
              <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-6">
                  <User className="w-5 h-5 text-brand-blue" />
                  <h2 className="text-base font-bold text-brand-dark">Member Details</h2>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fund Name</label>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all outline-none"
                      value={inputs.fundName}
                      onChange={(e) => handleInputChange('fundName', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Member Name</label>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all outline-none"
                      value={inputs.memberName}
                      onChange={(e) => handleInputChange('memberName', e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Date of Birth</label>
                      <input 
                        type="date" 
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all outline-none"
                        value={inputs.dateOfBirth}
                        onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Retirement Age</label>
                      <input 
                        type="number" 
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all outline-none"
                        value={inputs.normalRetirementAge}
                        onChange={(e) => handleInputChange('normalRetirementAge', parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                </div>
              </section>

              <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Briefcase className="w-5 h-5 text-brand-blue" />
                  <h2 className="text-base font-bold text-brand-dark">Financial Data</h2>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Calculation Date</label>
                    <input 
                      type="date" 
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all outline-none"
                      value={inputs.calculationDate}
                      onChange={(e) => handleInputChange('calculationDate', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fund Credit (ZAR)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">R</span>
                      <input 
                        type="text" 
                        className="w-full pl-7 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all outline-none"
                        value={formatNumber(inputs.fundCredit)}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value.replace(/,/g, '')) || 0;
                          handleInputChange('fundCredit', val);
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Pensionable Salary p.m.</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">R</span>
                      <input 
                        type="text" 
                        className="w-full pl-7 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all outline-none"
                        value={formatNumber(inputs.pensionableSalary)}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value.replace(/,/g, '')) || 0;
                          handleInputChange('pensionableSalary', val);
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Salary Increase (% above CPI)</label>
                    <input 
                      type="number" 
                      step="0.1"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all outline-none"
                      value={inputs.salaryIncreaseAboveCPI}
                      onChange={(e) => handleInputChange('salaryIncreaseAboveCPI', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Investment Portfolio</label>
                    <div className="relative">
                      <select 
                        className="w-full pl-3 pr-10 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all outline-none appearance-none cursor-pointer"
                        value={inputs.portfolio}
                        onChange={(e) => handleInputChange('portfolio', e.target.value)}
                      >
                        {PORTFOLIOS.map(p => (
                          <option key={p.name} value={p.name}>{p.name}</option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* Right Column: Comparison Table */}
            <div className="lg:col-span-2 space-y-6">
              <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                  <div className="flex items-center gap-2">
                    <ArrowRightLeft className="w-5 h-5 text-brand-blue" />
                    <h2 className="text-base font-bold text-brand-dark">Contributions & Expenses</h2>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Column Headings */}
                  <div className="hidden md:grid grid-cols-3 gap-4 mb-2">
                    <div />
                    <div className="text-center text-sm font-black uppercase text-gray-400 tracking-tight">Current Scenario</div>
                    <div className="text-center text-sm font-black uppercase text-brand-blue tracking-tight">Adjusted Scenario</div>
                  </div>

                  {/* Contribution Rates */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Contribution Rates (%)</h3>
                    
                    <div className="flex flex-col sm:grid sm:grid-cols-3 gap-3 sm:gap-4 py-2">
                      <span className="text-sm font-bold text-gray-700">Member Contribution</span>
                      <div className="grid grid-cols-2 gap-3 sm:col-span-2">
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-tight">Current</span>
                          <div className="relative">
                            <input 
                              type="number" 
                              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue outline-none text-xs"
                              value={inputs.current.memberContributionRate}
                              onChange={(e) => handleInputChange('current.memberContributionRate', parseFloat(e.target.value) || 0)}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">%</span>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-black text-brand-blue uppercase tracking-tight">Adjusted</span>
                          <div className="relative">
                            <input 
                              type="number" 
                              className="w-full px-3 py-2 bg-brand-blue/5 border border-brand-blue/20 rounded-xl focus:ring-2 focus:ring-brand-blue outline-none text-brand-blue font-bold text-xs"
                              value={inputs.adjusted.memberContributionRate}
                              onChange={(e) => handleInputChange('adjusted.memberContributionRate', parseFloat(e.target.value) || 0)}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-blue/50 text-[10px]">%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:grid sm:grid-cols-3 gap-3 sm:gap-4 py-2">
                      <span className="text-sm font-bold text-gray-700">Employer Gross</span>
                      <div className="grid grid-cols-2 gap-3 sm:col-span-2">
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-tight">Current</span>
                          <div className="relative">
                            <input 
                              type="number" 
                              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue outline-none text-xs"
                              value={inputs.current.employerGrossContributionRate}
                              onChange={(e) => handleInputChange('current.employerGrossContributionRate', parseFloat(e.target.value) || 0)}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">%</span>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-black text-brand-blue uppercase tracking-tight">Adjusted</span>
                          <div className="relative">
                            <input 
                              type="number" 
                              className="w-full px-3 py-2 bg-brand-blue/5 border border-brand-blue/20 rounded-xl focus:ring-2 focus:ring-brand-blue outline-none text-brand-blue font-bold text-xs"
                              value={inputs.adjusted.employerGrossContributionRate}
                              onChange={(e) => handleInputChange('adjusted.employerGrossContributionRate', parseFloat(e.target.value) || 0)}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-blue/50 text-[10px]">%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Deductions */}
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Deductions</h3>
                    <DeductionInput label="Group Life Cover" path="groupLifeCover" current={inputs.current.groupLifeCover} adjusted={inputs.adjusted.groupLifeCover} />
                    <DeductionInput label="Disability Cover" path="disabilityCover" current={inputs.current.disabilityCover} adjusted={inputs.adjusted.disabilityCover} />
                    <DeductionInput label="Funeral Premiums" path="funeralPremiums" current={inputs.current.funeralPremiums} adjusted={inputs.adjusted.funeralPremiums} />
                    <DeductionInput label="Administration Fees" path="administrationFees" current={inputs.current.administrationFees} adjusted={inputs.adjusted.administrationFees} />
                    <DeductionInput label="Consulting Fees" path="consultingFees" current={inputs.current.consultingFees} adjusted={inputs.adjusted.consultingFees} />
                    <DeductionInput label="Other Expenses" path="otherExpenses" current={inputs.current.otherExpenses} adjusted={inputs.adjusted.otherExpenses} />
                  </div>

                  {/* Net Contribution Rate */}
                  <div className="py-4 border-t border-gray-100 bg-gray-50/30 -mx-6 px-6">
                    <div className="flex flex-col sm:grid sm:grid-cols-3 gap-3 sm:gap-4 items-center">
                      <span className="text-sm font-black text-brand-dark uppercase tracking-tight">Net Contribution Rate</span>
                      <div className="grid grid-cols-2 gap-3 sm:col-span-2 w-full">
                        <div className="text-center py-2 bg-white border border-gray-200 rounded-xl font-bold text-gray-600 text-sm">
                          {calculateNetRate(inputs.current, inputs.pensionableSalary).toFixed(2)}%
                        </div>
                        <div className="text-center py-2 bg-brand-blue border border-brand-blue rounded-xl font-black text-white shadow-md shadow-brand-blue/20 text-sm">
                          {calculateNetRate(inputs.adjusted, inputs.pensionableSalary).toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4">
                    <div className="flex flex-col sm:grid sm:grid-cols-3 gap-3 sm:gap-4 items-center">
                      <div className="flex items-center gap-2">
                        <PiggyBank className="w-4 h-4 text-brand-blue" />
                        <span className="text-sm font-bold text-gray-700">Additional Voluntary (Rand)</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 sm:col-span-2">
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-tight">Current</span>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">R</span>
                            <input 
                              type="text" 
                              className="w-full pl-7 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue outline-none text-xs"
                              value={formatNumber(inputs.current.additionalVoluntaryContribution)}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value.replace(/,/g, '')) || 0;
                                handleInputChange('current.additionalVoluntaryContribution', val);
                              }}
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-black text-brand-blue uppercase tracking-tight">Adjusted</span>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-blue/50 text-[10px]">R</span>
                            <input 
                              type="text" 
                              className="w-full pl-7 pr-3 py-2 bg-brand-blue/5 border border-brand-blue/20 rounded-xl focus:ring-2 focus:ring-brand-blue outline-none text-brand-blue font-bold text-xs"
                              value={formatNumber(inputs.adjusted.additionalVoluntaryContribution)}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value.replace(/,/g, '')) || 0;
                                handleInputChange('adjusted.additionalVoluntaryContribution', val);
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <div className="flex justify-end">
                <button 
                  onClick={() => setActiveTab('results')}
                  className="bg-brand-blue hover:bg-brand-blue/90 text-white px-10 py-4 rounded-2xl font-black shadow-xl shadow-brand-blue/20 transition-all flex items-center gap-3 group"
                >
                  Calculate Impact
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-200">
                <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Current Projection</p>
                <h3 className="text-xl md:text-2xl font-black text-brand-dark">{formatCurrency(finalResult?.currentFundCredit || 0)}</h3>
                <p className="text-[10px] md:text-xs text-gray-500 mt-1 md:mt-2">At age {inputs.normalRetirementAge}</p>
              </div>
              <div className="bg-brand-blue p-4 md:p-6 rounded-2xl shadow-xl shadow-brand-blue/20 ring-4 ring-brand-blue/10">
                <p className="text-[10px] md:text-xs font-bold text-white/80 uppercase tracking-wider mb-1">Adjusted Projection</p>
                <h3 className="text-xl md:text-2xl font-black text-white">{formatCurrency(finalResult?.adjustedFundCredit || 0)}</h3>
                <p className="text-[10px] md:text-xs text-white/70 mt-1 md:mt-2">Impact: +{formatCurrency((finalResult?.adjustedFundCredit || 0) - (finalResult?.currentFundCredit || 0))}</p>
              </div>
              <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-200">
                <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Add. Contributions</p>
                <h3 className="text-xl md:text-2xl font-black text-brand-blue">{formatCurrency(totalAdditionalNetContributions)}</h3>
                <p className="text-[10px] md:text-xs text-gray-500 mt-1 md:mt-2">Net capital invested</p>
              </div>
              <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-200">
                <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Additional Return Earned</p>
                <h3 className="text-xl md:text-2xl font-black text-brand-blue">{formatCurrency(additionalReturn)}</h3>
                <p className="text-[10px] md:text-xs text-gray-500 mt-1 md:mt-2">Compound growth benefit</p>
              </div>
            </div>

            {/* Chart Section */}
            <div className="bg-white p-4 md:p-8 rounded-3xl shadow-sm border border-gray-200">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
                <div>
                  <h2 className="text-lg md:text-xl font-black text-gray-900">Projected Fund Growth</h2>
                  <p className="text-sm text-gray-500">Comparing current vs adjusted scenarios</p>
                </div>
                <div className="flex items-center gap-4 md:gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gray-300" />
                    <span className="text-[10px] md:text-xs font-bold text-gray-500 uppercase">Current</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-indigo-500" />
                    <span className="text-[10px] md:text-xs font-bold text-indigo-500 uppercase">Adjusted</span>
                  </div>
                </div>
              </div>
              
              <div className="h-[300px] md:h-[450px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={projection} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <defs>
                      <linearGradient id="colorCurrent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#94A3B8" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#94A3B8" stopOpacity={0.05}/>
                      </linearGradient>
                      <linearGradient id="colorGap" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00AEEF" stopOpacity={0.6}/>
                        <stop offset="95%" stopColor="#00AEEF" stopOpacity={0.2}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis 
                      dataKey="age" 
                      type="number" 
                      domain={['dataMin', 'dataMax']} 
                      tick={{fontSize: 11, fontWeight: 600, fill: '#64748B'}}
                      axisLine={false}
                      tickLine={false}
                      label={{ value: 'Age', position: 'insideBottom', offset: -10, fontSize: 12, fontWeight: 800, fill: '#475569' }}
                    />
                    <YAxis 
                      tickFormatter={(val) => `R${(val/1000000).toFixed(1)}M`}
                      tick={{fontSize: 11, fontWeight: 600, fill: '#64748B'}}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const current = payload.find(p => p.dataKey === 'currentFundCredit')?.value as number;
                          const adjusted = payload.find(p => p.dataKey === 'adjustedFundCredit')?.value as number;
                          const diff = adjusted - current;
                          return (
                            <div className="bg-white p-4 rounded-2xl shadow-xl border border-gray-100 min-w-[200px]">
                              <p className="text-xs font-black text-gray-400 uppercase mb-2">Age {label.toFixed(1)}</p>
                              <div className="space-y-2">
                                <div className="flex justify-between items-center gap-4">
                                  <span className="text-xs font-bold text-gray-500">Current Scenario</span>
                                  <span className="text-sm font-bold text-gray-700">{formatCurrency(current)}</span>
                                </div>
                                <div className="flex justify-between items-center gap-4">
                                  <span className="text-xs font-bold text-brand-blue">Adjusted Scenario</span>
                                  <span className="text-sm font-black text-brand-blue">{formatCurrency(adjusted)}</span>
                                </div>
                                <div className="pt-2 border-t border-gray-50 flex justify-between items-center gap-4">
                                  <span className="text-xs font-black text-emerald-600 uppercase">Differential</span>
                                  <span className="text-sm font-black text-emerald-600">+{formatCurrency(diff)}</span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    
                    {/* The "Current" Area */}
                    <Area 
                      type="monotone" 
                      dataKey="currentFundCredit" 
                      stroke="#94A3B8" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorCurrent)" 
                      name="Current"
                    />

                    {/* The "Gap" Area - using a trick to fill between current and adjusted */}
                    <Area 
                      type="monotone" 
                      dataKey="currentFundCredit" 
                      stackId="1"
                      stroke="transparent"
                      fill="transparent"
                      fillOpacity={0}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="differential" 
                      stackId="1"
                      stroke="transparent"
                      fill="url(#colorGap)" 
                      fillOpacity={1}
                      name="Impact Gap"
                    />

                    {/* The "Adjusted" Line to give a sharp top edge */}
                    <Line 
                      type="monotone" 
                      dataKey="adjustedFundCredit" 
                      stroke="#00AEEF" 
                      strokeWidth={4} 
                      dot={false}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />

                    {/* Final Impact Marker */}
                    {finalResult && (
                      <ReferenceLine 
                        x={finalResult.age} 
                        stroke="#00AEEF" 
                        strokeDasharray="5 5"
                      >
                        <Label 
                          value={`Impact: +${formatCurrency(finalResult.differential)}`} 
                          position="top" 
                          fill="#00AEEF" 
                          fontSize={14} 
                          fontWeight={900}
                        />
                      </ReferenceLine>
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Disclaimer Section */}
            <div className="mt-12 bg-white p-8 rounded-3xl border border-gray-100">
              <div className="flex items-center gap-2 mb-6">
                <Info className="w-5 h-5 text-gray-400" />
                <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">Important Disclaimer</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                {DISCLAIMER_POINTS.map((point, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-200 mt-1.5 shrink-0" />
                    <p className="text-xs text-gray-500 leading-relaxed">{point}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

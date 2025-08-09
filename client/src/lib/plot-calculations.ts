import { differenceInDays, addDays, parseISO, format } from "date-fns";

/**
 * PROGENY AGROTECH Standard Calculation Logic
 * This module contains the standardized calculations used across all plot management components
 * to ensure consistency in DAP, WAP, progress tracking, and harvest metrics.
 */

export interface PlotMetrics {
  // Core PROGENY calculations
  daysSincePlanting: number;
  dapDays: number;
  wapWeeks: number;
  
  // Progress tracking
  harvestProgress: number;
  
  // Date calculations
  calculatedHarvestDate: Date;
  calculatedNettingDate: Date;
  
  // Days remaining
  daysToHarvest: number;
  daysToOpenShade: number;
  
  // Alert conditions
  isShadeOpeningSoon: boolean;
  shouldOpenNetting: boolean;
  isReadyForHarvest: boolean;
  
  // Harvest tracking
  currentCycleHarvest: number;
  totalHarvest: number;
  
  // Cycle information
  completedCycles: number;
}

// Plot interface for the calculation functions
export interface Plot {
  id: string;
  name: string;
  plantingDate: string;
  expectedHarvestDate: string;
  actualHarvestDate?: string;
  nettingOpenDate?: string;
  daysToMaturity: number;
  daysToOpenNetting: number;
  status: string;
  currentCycle: number;
  harvestAmountKg?: number | string;
  totalHarvestedKg?: number | string;
}

/**
 * Calculate comprehensive plot metrics using PROGENY AGROTECH standards
 * This function implements the exact calculation logic used in Plot A card
 */
export function calculatePlotMetrics(plot: Plot, referenceDate: Date = new Date()): PlotMetrics {
  const plantingDate = parseISO(plot.plantingDate);
  const expectedHarvestDate = parseISO(plot.expectedHarvestDate);
  const actualHarvestDate = plot.actualHarvestDate ? parseISO(plot.actualHarvestDate) : null;
  const nettingOpenDate = plot.nettingOpenDate ? parseISO(plot.nettingOpenDate) : null;
  
  // PROGENY AGROTECH Calculation Standards (supports negative values for future dates)
  const daysSincePlanting = differenceInDays(referenceDate, plantingDate); // Can be negative for future dates
  const dapDays = daysSincePlanting; // DAP (Days After Planting) - negative means days until planting
  const wapWeeks = Math.floor(daysSincePlanting / 7); // WAP (Weeks After Planting) - negative means weeks until planting
  
  // Calculate Expected Harvest Date and Netting Open Date from planting date
  const calculatedHarvestDate = addDays(plantingDate, plot.daysToMaturity);
  const calculatedNettingDate = addDays(plantingDate, plot.daysToOpenNetting);
  
  // Days remaining calculations
  const daysToHarvest = Math.max(0, differenceInDays(calculatedHarvestDate, referenceDate));
  const daysToOpenShade = Math.max(0, differenceInDays(calculatedNettingDate, referenceDate));
  
  // Progress calculations (handle negative values for future planting)
  const harvestProgress = daysSincePlanting >= 0 
    ? Math.min((daysSincePlanting / plot.daysToMaturity) * 100, 100)
    : 0; // Future plantings show 0% progress
  
  // Status indicators
  const isShadeOpeningSoon = daysToOpenShade <= 7 && daysToOpenShade > 0;
  const shouldOpenNetting = !!(nettingOpenDate && referenceDate >= nettingOpenDate && !actualHarvestDate);
  const isReadyForHarvest = daysToHarvest === 0 && !actualHarvestDate;
  
  // Harvest tracking
  const currentCycleHarvest = parseFloat(plot.harvestAmountKg?.toString() || "0");
  const totalHarvest = parseFloat(plot.totalHarvestedKg?.toString() || "0");
  
  // Completed cycles calculation (matching dashboard logic)
  let completedCycles = 0;
  if (plot.status === 'harvesting') {
    completedCycles = plot.currentCycle;
  } else if (plot.currentCycle > 1) {
    // For plots in other statuses, count previously completed cycles
    completedCycles = plot.currentCycle - 1;
  }
  
  return {
    daysSincePlanting,
    dapDays,
    wapWeeks,
    harvestProgress,
    calculatedHarvestDate,
    calculatedNettingDate,
    daysToHarvest,
    daysToOpenShade,
    isShadeOpeningSoon,
    shouldOpenNetting,
    isReadyForHarvest,
    currentCycleHarvest,
    totalHarvest,
    completedCycles,
  };
}

/**
 * Get status badge colors using PROGENY standards
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case "plot_preparation": return "bg-orange-500";
    case "planted": return "bg-green-500";
    case "growing": return "bg-blue-500";
    case "ready_for_harvest": return "bg-yellow-500";
    case "harvesting": return "bg-purple-500";
    case "dormant": return "bg-gray-500";
    default: return "bg-gray-400";
  }
}

/**
 * Get status labels using PROGENY standards
 */
export function getStatusLabel(status: string): string {
  switch (status) {
    case "plot_preparation": return "Plot Preparation";
    case "planted": return "Planted";
    case "growing": return "Growing";
    case "ready_for_harvest": return "Ready for Harvest";
    case "harvesting": return "Harvesting";
    case "dormant": return "Dormant";
    default: return status;
  }
}

/**
 * Calculate total completed cycles across all plots (dashboard metric)
 */
export function calculateTotalCompletedCycles(plots: any[]): number {
  return plots.reduce((sum: number, plot: Plot) => {
    const metrics = calculatePlotMetrics(plot);
    return sum + metrics.completedCycles;
  }, 0);
}

/**
 * Calculate total harvest across all plots (dashboard metric)
 */
export function calculateTotalHarvest(plots: any[]): number {
  return plots.reduce((sum: number, plot: Plot) => {
    const metrics = calculatePlotMetrics(plot);
    return sum + metrics.totalHarvest;
  }, 0);
}

/**
 * Format date for display using PROGENY standards
 */
export function formatPlotDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, "MMM dd, yyyy");
}

/**
 * Format harvest amount for display
 */
export function formatHarvestAmount(amount: number | string): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return numAmount.toFixed(1);
}
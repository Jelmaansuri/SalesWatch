import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { CalendarIcon, Plus, Sprout, Clock, Target, AlertTriangle, CheckCircle, MapPin, BarChart3, Eye, Edit, Trash2, Package, RefreshCw, TreePine, ArrowRight, FileText } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, addDays, differenceInDays, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { insertPlotSchema, insertHarvestLogSchema } from "@shared/schema";
import { z } from "zod";
import MainLayout from "@/components/layout/main-layout";
import { 
  calculatePlotMetrics, 
  getStatusColor, 
  getStatusLabel, 
  calculateTotalCompletedCycles,
  formatPlotDate,
  formatHarvestAmount
} from "@/lib/plot-calculations";

const plotFormSchema = z.object({
  userId: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  polybagCount: z.number().min(1, "Polybag count must be at least 1"),
  location: z.string().min(1, "Location is required"),
  cropType: z.string().min(1, "Crop type is required"),
  plantingDate: z.date(),
  expectedHarvestDate: z.date().optional(),
  actualHarvestDate: z.date().optional(),
  daysToMaturity: z.number().min(1, "Days to maturity must be at least 1"),
  daysToOpenNetting: z.number().min(1, "Days to open netting must be at least 1"),
  nettingOpenDate: z.date().optional(),
  status: z.enum(["plot_preparation", "planted", "growing", "ready_for_harvest", "harvesting", "dormant"]),
  notes: z.string().optional(),
  // Cycle tracking fields
  currentCycle: z.number().min(1, "Current cycle must be at least 1").default(1),
  totalCycles: z.number().min(1, "Total cycles must be at least 1").default(1),
  isMultiCycle: z.boolean().default(true),
});

type PlotFormData = z.infer<typeof plotFormSchema>;

// Harvest Modal Schema
const harvestSchema = z.object({
  harvestAmountKg: z.number().min(0.1, "Harvest amount must be at least 0.1 kg"),
  actualHarvestDate: z.date(),
  proceedToNextCycle: z.boolean().default(false),
});

type HarvestFormData = z.infer<typeof harvestSchema>;

// Enhanced Harvest Log Schema matching the detailed format from PDF
const harvestLogSchema = z.object({
  plotId: z.string(),
  cycleNumber: z.number().min(1),
  harvestDate: z.date(),
  gradeAKg: z.number().min(0, "Grade A amount must be 0 or more"),
  gradeBKg: z.number().min(0, "Grade B amount must be 0 or more"),
  pricePerKgGradeA: z.number().min(0, "Price per kg Grade A must be 0 or more"),
  pricePerKgGradeB: z.number().min(0, "Price per kg Grade B must be 0 or more"),
  totalAmountGradeA: z.number().min(0, "Total Grade A amount must be 0 or more"),
  totalAmountGradeB: z.number().min(0, "Total Grade B amount must be 0 or more"),
  grandTotal: z.number().min(0, "Grand total must be 0 or more"),
  comments: z.string().optional(),
});

// Next Cycle Schema
const nextCycleSchema = z.object({
  plantingDate: z.date(),
  daysToMaturity: z.number().min(1),
  daysToOpenNetting: z.number().min(1),
  polybagCount: z.number().min(1),
  notes: z.string().optional(),
});

interface Plot {
  id: string;
  userId: string;
  name: string;
  polybagCount: number;
  location: string;
  cropType: string;
  plantingDate: string;
  expectedHarvestDate: string;
  actualHarvestDate?: string;
  daysToMaturity: number;
  daysToOpenNetting: number;
  nettingOpenDate?: string;
  status: string;
  notes?: string;
  // Cycle tracking fields
  currentCycle: number;
  totalCycles: number;
  cycleHistory?: string;
  isMultiCycle: boolean;
  // Harvest tracking fields
  harvestAmountKg?: number;
  totalHarvestedKg: number;
  createdAt: string;
  updatedAt: string;
}

// HarvestEventDialog Component
function HarvestEventDialog({ plot, selectedCycle }: {
  plot: Plot;
  selectedCycle: number;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSuccess = () => {
    setIsOpen(false); // Close the dialog
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          size="sm" 
          variant="default"
          className="w-full text-xs bg-green-600 hover:bg-green-700 text-white"
          data-testid={`button-add-harvest-${plot.id}`}
        >
          <Package className="h-3 w-3 mr-1" />
          Add Harvest Event - Cycle {selectedCycle}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Harvest Event for {plot.name}</DialogTitle>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Recording harvest event for Cycle {selectedCycle}
          </div>
        </DialogHeader>
        <HarvestLogForm 
          plot={plot} 
          selectedCycle={selectedCycle}
          onSuccess={handleSuccess}
        />
      </DialogContent>
    </Dialog>
  );
}

// NextCycleDialog Component
function NextCycleDialog({ plot }: { plot: Plot }) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSuccess = () => {
    setIsOpen(false); // Close the dialog after successful next cycle progression
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          size="sm" 
          variant="secondary"
          className="w-full text-xs bg-blue-600 hover:bg-blue-700 text-white"
          data-testid={`button-next-cycle-${plot.id}`}
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Start Next Cycle ({plot.currentCycle + 1})
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Start Next Cycle for {plot.name}</DialogTitle>
        </DialogHeader>
        <NextCycleForm 
          plot={plot} 
          nextCycle={plot.currentCycle + 1}
          onSuccess={handleSuccess}
        />
      </DialogContent>
    </Dialog>
  );
}

function PlotCard({ plot, onEdit, onDelete, onHarvest, onNextCycle }: { 
  plot: Plot; 
  onEdit: (plot: Plot) => void; 
  onDelete: (plotId: string) => void; 
  onHarvest?: (plot: Plot) => void;
  onNextCycle?: (plot: Plot) => void;
}) {
  // State for selected cycle in this plot card
  const [selectedCycle, setSelectedCycle] = useState(plot.currentCycle);
  
  // Auto-update selected cycle when plot's current cycle changes (after next cycle progression)
  React.useEffect(() => {
    setSelectedCycle(plot.currentCycle);
  }, [plot.currentCycle]);
  
  // Query harvest logs for the selected cycle with staleTime to ensure fresh data
  const { data: cycleHarvestLogs = [] } = useQuery({
    queryKey: [`/api/harvest-logs/plot/${plot.id}/cycle/${selectedCycle}`],
    enabled: !!plot.id && selectedCycle > 0,
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache data for long
  });

  // Query all harvest logs for the plot to calculate overall totals
  const { data: allPlotHarvestLogs = [] } = useQuery({
    queryKey: [`/api/harvest-logs/${plot.id}`],
    enabled: !!plot.id,
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache data for long
  });

  // Calculate cycle-specific harvest totals
  const cycleHarvestTotals = cycleHarvestLogs.reduce((total, log) => {
    const gradeATotal = parseFloat(log.totalAmountGradeA || "0");
    const gradeBTotal = parseFloat(log.totalAmountGradeB || "0");
    return total + gradeATotal + gradeBTotal;
  }, 0);

  const cycleHarvestKg = cycleHarvestLogs.reduce((total, log) => {
    const gradeAKg = parseFloat(log.grade_a_kg || log.gradeAKg || "0");
    const gradeBKg = parseFloat(log.grade_b_kg || log.gradeBKg || "0");
    return total + gradeAKg + gradeBKg;
  }, 0);

  // Calculate Grade A and Grade B totals for current cycle
  const cycleGradeAKg = cycleHarvestLogs.reduce((total, log) => {
    return total + parseFloat(log.grade_a_kg || log.gradeAKg || "0");
  }, 0);

  const cycleGradeBKg = cycleHarvestLogs.reduce((total, log) => {
    return total + parseFloat(log.grade_b_kg || log.gradeBKg || "0");
  }, 0);

  // Calculate overall plot harvest totals from all cycles
  const overallHarvestTotals = allPlotHarvestLogs.reduce((total, log) => {
    const gradeATotal = parseFloat(log.totalAmountGradeA || "0");
    const gradeBTotal = parseFloat(log.totalAmountGradeB || "0");
    return total + gradeATotal + gradeBTotal;
  }, 0);

  const overallHarvestKg = allPlotHarvestLogs.reduce((total, log) => {
    const gradeAKg = parseFloat(log.grade_a_kg || log.gradeAKg || "0");
    const gradeBKg = parseFloat(log.grade_b_kg || log.gradeBKg || "0");
    return total + gradeAKg + gradeBKg;
  }, 0);

  // Calculate overall Grade A and Grade B totals for all cycles
  const overallGradeAKg = allPlotHarvestLogs.reduce((total, log) => {
    return total + parseFloat(log.grade_a_kg || log.gradeAKg || "0");
  }, 0);

  const overallGradeBKg = allPlotHarvestLogs.reduce((total, log) => {
    return total + parseFloat(log.grade_b_kg || log.gradeBKg || "0");
  }, 0);

  // Calculate totals by cycle for summary
  const cycleWiseTotals = React.useMemo(() => {
    const cycleMap: { [key: number]: { kg: number; value: number; events: number } } = {};
    
    allPlotHarvestLogs.forEach(log => {
      const cycle = log.cycleNumber;
      if (!cycleMap[cycle]) {
        cycleMap[cycle] = { kg: 0, value: 0, events: 0 };
      }
      
      const gradeAKg = parseFloat(log.grade_a_kg || log.gradeAKg || "0");
      const gradeBKg = parseFloat(log.grade_b_kg || log.gradeBKg || "0");
      const gradeATotal = parseFloat(log.totalAmountGradeA || "0");
      const gradeBTotal = parseFloat(log.totalAmountGradeB || "0");
      
      cycleMap[cycle].kg += gradeAKg + gradeBKg;
      cycleMap[cycle].value += gradeATotal + gradeBTotal;
      cycleMap[cycle].events += 1;
    });
    
    return cycleMap;
  }, [allPlotHarvestLogs]);
  
  // Use centralized PROGENY AGROTECH calculation logic
  const metrics = calculatePlotMetrics(plot);
  const {
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
    totalHarvest
  } = metrics;

  // Parse dates for display
  const plantingDate = parseISO(plot.plantingDate);
  const expectedHarvestDate = parseISO(plot.expectedHarvestDate);
  const actualHarvestDate = plot.actualHarvestDate ? parseISO(plot.actualHarvestDate) : null;
  const nettingOpenDate = plot.nettingOpenDate ? parseISO(plot.nettingOpenDate) : null;


  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {plot.name}
              </CardTitle>

            </div>
            <CardDescription className="flex items-center gap-2 mt-1">
              <MapPin className="h-4 w-4" />
              {plot.location} • {plot.polybagCount} polybags • {plot.cropType}
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge className={cn("text-white", getStatusColor(plot.status))}>
              {getStatusLabel(plot.status)}
            </Badge>
            {plot.isMultiCycle && (
              <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                Multi-Cycle
              </div>
            )}
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(plot)}
                data-testid={`button-edit-plot-${plot.id}`}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(plot.id)}
                data-testid={`button-delete-plot-${plot.id}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* PROGENY Standard Metrics: DAP and WAP Display */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
            <div className="text-2xl font-bold text-green-700 dark:text-green-400" data-testid={`text-dap-${plot.id}`}>
              {dapDays}
            </div>
            <div className="text-sm text-green-600 dark:text-green-500">
              {dapDays < 0 ? "Days Until Planting" : "DAP (Days After Planting)"}
            </div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400" data-testid={`text-wap-${plot.id}`}>
              {wapWeeks}
            </div>
            <div className="text-sm text-blue-600 dark:text-blue-500">
              {wapWeeks < 0 ? "Weeks Until Planting" : "WAP (Weeks After Planting)"}
            </div>
          </div>
        </div>
        
        {/* Calculated Dates Display */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
            <div className="text-sm font-medium text-amber-700 dark:text-amber-400" data-testid={`text-harvest-date-${plot.id}`}>
              {format(calculatedHarvestDate, "MMM dd, yyyy")}
            </div>
            <div className="text-xs text-amber-600 dark:text-amber-500">Expected Harvest Date</div>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
            <div className="text-sm font-medium text-purple-700 dark:text-purple-400" data-testid={`text-netting-date-${plot.id}`}>
              {format(calculatedNettingDate, "MMM dd, yyyy")}
            </div>
            <div className="text-xs text-purple-600 dark:text-purple-500">Netting Open Date</div>
          </div>
        </div>
        
        {/* Days Remaining Tracking */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
            <div className="text-xl font-bold text-orange-700 dark:text-orange-400" data-testid={`text-days-harvest-${plot.id}`}>
              {daysToHarvest}
            </div>
            <div className="text-sm text-orange-600 dark:text-orange-500">
              {dapDays < 0 ? "Days Until Harvest (from planting)" : "Days Remaining to Harvest"}
            </div>
          </div>
          <div className={cn("p-3 rounded-lg", 
            isShadeOpeningSoon ? "bg-red-50 dark:bg-red-900/20" : "bg-purple-50 dark:bg-purple-900/20"
          )}>
            <div className={cn("text-xl font-bold", 
              isShadeOpeningSoon ? "text-red-700 dark:text-red-400" : "text-purple-700 dark:text-purple-400"
            )} data-testid={`text-days-shade-${plot.id}`}>
              {daysToOpenShade}
            </div>
            <div className={cn("text-sm", 
              isShadeOpeningSoon ? "text-red-600 dark:text-red-500" : "text-purple-600 dark:text-purple-500"
            )}>
              {dapDays < 0 ? "Days Until Shade Opening (from planting)" : "Days to Open Shade"}
            </div>
          </div>
        </div>

        {/* Harvest Progress (PROGENY Standard) */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress to Harvest</span>
            <span>{Math.round(harvestProgress)}%</span>
          </div>
          <Progress value={harvestProgress} className="w-full" />
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {daysToHarvest > 0 
              ? `${daysToHarvest} days remaining to harvest`
              : "Ready for harvest!"
            }
          </div>
        </div>

        {/* Key Dates */}
        <div className="grid grid-cols-1 gap-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Planted:</span>
            <span data-testid={`text-planted-date-${plot.id}`}>{formatPlotDate(plantingDate)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Expected Harvest:</span>
            <span data-testid={`text-expected-harvest-${plot.id}`}>{formatPlotDate(expectedHarvestDate)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Actual Harvest:</span>
            <span className={actualHarvestDate ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-500"} data-testid={`text-actual-harvest-${plot.id}`}>
              {actualHarvestDate ? formatPlotDate(actualHarvestDate) : "Not available"}
            </span>
          </div>
          {nettingOpenDate && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Netting Open:</span>
              <span className={cn(
                shouldOpenNetting ? "text-orange-600 dark:text-orange-400 font-medium" : ""
              )} data-testid={`text-netting-date-${plot.id}`}>
                {formatPlotDate(nettingOpenDate)}
                {shouldOpenNetting && " (Due!)"}
              </span>
            </div>
          )}
        </div>

        {/* PROGENY Alert System */}
        {isShadeOpeningSoon && (
          <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <span className="text-sm text-red-700 dark:text-red-300 font-medium">
              Urgent: Open shade in {daysToOpenShade} days!
            </span>
          </div>
        )}

        {shouldOpenNetting && (
          <div className="flex items-center gap-2 p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
            <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            <span className="text-sm text-orange-700 dark:text-orange-300">
              Time to open shade netting for protection!
            </span>
          </div>
        )}

        {isReadyForHarvest && (
          <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <span className="text-sm text-green-700 dark:text-green-300">
              Harvest day reached! Ready for collection.
            </span>
          </div>
        )}

        {/* Enhanced Cycle Information with Dynamic Selection */}
        <div className="border-t pt-4 mt-4">
          <div className="space-y-2 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-600" />
                <Select value={selectedCycle.toString()} onValueChange={(value) => setSelectedCycle(parseInt(value))}>
                  <SelectTrigger className="w-32 h-6 bg-transparent border-blue-300 text-blue-800 dark:text-blue-200 text-sm font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: plot.currentCycle }, (_, i) => i + 1).map((cycle) => (
                      <SelectItem key={cycle} value={cycle.toString()}>
                        Cycle {cycle}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-1">
                {plot.status === "harvesting" && (
                  <Badge variant="default" className="text-xs bg-green-600 text-white">
                    Harvesting
                  </Badge>
                )}
                {plot.isMultiCycle && (
                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-300">
                    Multi-Cycle
                  </Badge>
                )}
              </div>
            </div>
            

            
            {/* Next Planting Date for Multi-cycle */}
            {plot.isMultiCycle && plot.status === "harvesting" && (
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-600 dark:text-gray-400">Next Planting:</span>
                <span className="font-medium text-blue-600">30 days after harvest</span>
              </div>
            )}
            
            {/* Selected Cycle Harvest Data */}
            {cycleHarvestKg > 0 && (
              <div className="space-y-1 mb-3">
                <div className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">
                  Cycle {selectedCycle} Summary:
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-600 dark:text-gray-400">Grade A:</span>
                  <span className="font-medium text-green-600">{formatHarvestAmount(cycleGradeAKg)} kg</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-600 dark:text-gray-400">Grade B:</span>
                  <span className="font-medium text-green-600">{formatHarvestAmount(cycleGradeBKg)} kg</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-600 dark:text-gray-400">Total Weight:</span>
                  <span className="font-medium text-green-600">{formatHarvestAmount(cycleHarvestKg)} kg</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-600 dark:text-gray-400">Total Value:</span>
                  <span className="font-medium text-green-600">RM {cycleHarvestTotals.toFixed(2)}</span>
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-400">
                  {cycleHarvestLogs.length} harvest {cycleHarvestLogs.length === 1 ? 'event' : 'events'} recorded
                </div>
              </div>
            )}
            
            {/* No data message for cycle */}
            {selectedCycle > 0 && cycleHarvestKg === 0 && (
              <div className="text-xs text-gray-500 dark:text-gray-400 italic mb-3">
                No harvest events recorded for Cycle {selectedCycle}
              </div>
            )}
            
            {/* Overall Plot Harvest Summary */}
            {overallHarvestKg > 0 && (
              <div className="space-y-1 border-t pt-2 mt-2">
                <div className="text-xs font-medium text-purple-700 dark:text-purple-300 mb-1">
                  Plot Total Summary:
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-600 dark:text-gray-400">Grade A Total:</span>
                  <span className="font-semibold text-purple-600">{formatHarvestAmount(overallGradeAKg)} kg</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-600 dark:text-gray-400">Grade B Total:</span>
                  <span className="font-semibold text-purple-600">{formatHarvestAmount(overallGradeBKg)} kg</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-600 dark:text-gray-400">All Cycles Weight:</span>
                  <span className="font-semibold text-purple-600">{formatHarvestAmount(overallHarvestKg)} kg</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-600 dark:text-gray-400">All Cycles Value:</span>
                  <span className="font-semibold text-purple-600">RM {overallHarvestTotals.toFixed(2)}</span>
                </div>
                
                {/* Cycle-wise breakdown if multiple cycles have data */}
                {Object.keys(cycleWiseTotals).length > 1 && (
                  <div className="mt-2 space-y-1">
                    <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      By Cycle:
                    </div>
                    {Object.entries(cycleWiseTotals)
                      .sort(([a], [b]) => parseInt(a) - parseInt(b))
                      .map(([cycle, data]) => (
                        <div key={cycle} className="flex justify-between items-center text-xs pl-2">
                          <span className="text-gray-600 dark:text-gray-400">
                            Cycle {cycle}: {formatHarvestAmount(data.kg)} kg
                          </span>
                          <span className="text-gray-600 dark:text-gray-400">
                            RM {data.value.toFixed(2)}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Multiple Harvest Events System - Available for all plots that can have harvest events */}
        {(plot.status === "planted" || plot.status === "growing" || plot.status === "ready_for_harvest" || plot.status === "harvesting") && (
          <div className="space-y-2 mt-4">
            <HarvestEventDialog 
              plot={plot} 
              selectedCycle={selectedCycle}
            />
            
            {/* View Harvest Summary Table */}
            {cycleHarvestKg > 0 && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="w-full text-xs border-green-600 text-green-700 hover:bg-green-50"
                    data-testid={`button-view-summary-${plot.id}`}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Manage Harvest Data - Cycle {selectedCycle}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Harvest Summary - {plot.name} (Cycle {selectedCycle})</DialogTitle>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Interactive harvest data - you can edit or delete entries as needed
                    </div>
                  </DialogHeader>
                  <InteractiveHarvestTable 
                    plot={plot} 
                    selectedCycle={selectedCycle}
                    harvestLogs={cycleHarvestLogs}
                  />
                </DialogContent>
              </Dialog>
            )}
            
            {/* Proceed to Next Cycle Button - Available when current cycle has harvest data */}
            {selectedCycle === plot.currentCycle && cycleHarvestKg > 0 && plot.isMultiCycle && (
              <NextCycleDialog plot={plot} />
            )}
          </div>
        )}

        {/* Completion Message */}
        {plot.currentCycle === plot.totalCycles && cycleHarvestKg > 0 && (
          <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 mt-3">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <span className="text-sm text-green-700 dark:text-green-300">
              All {plot.totalCycles} cycles completed with harvest data recorded!
            </span>
          </div>
        )}

        {plot.notes && (
          <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-2 rounded mt-4">
            <strong>Notes:</strong> {plot.notes}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// HarvestLogForm Component
function HarvestLogForm({ plot, selectedCycle, onSuccess }: {
  plot: Plot;
  selectedCycle: number;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [formDataToSubmit, setFormDataToSubmit] = useState<z.infer<typeof insertHarvestLogSchema> | null>(null);
  
  const form = useForm<z.infer<typeof insertHarvestLogSchema>>({
    resolver: zodResolver(insertHarvestLogSchema),
    defaultValues: {
      plotId: plot.id,
      cycleNumber: selectedCycle,
      harvestDate: new Date(),
      gradeAKg: 0,
      gradeBKg: 0,
      pricePerKgGradeA: 7.00, // Default price from PDF
      pricePerKgGradeB: 4.00, // Default price from PDF
      comments: "",
    },
  });

  // Track calculated values for display
  const watchedValues = form.watch();
  
  // Calculate totals for display purposes
  const gradeATotal = (watchedValues.gradeAKg || 0) * (watchedValues.pricePerKgGradeA || 0);
  const gradeBTotal = (watchedValues.gradeBKg || 0) * (watchedValues.pricePerKgGradeB || 0);
  const grandTotal = gradeATotal + gradeBTotal;

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertHarvestLogSchema>) => {
      // Calculate totals and add them to the request data
      const enrichedData = {
        ...data,
        totalAmountGradeA: gradeATotal,
        totalAmountGradeB: gradeBTotal,
        grandTotal: grandTotal,
      };
      
      const response = await fetch("/api/harvest-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(enrichedData),
      });
      if (!response.ok) throw new Error("Failed to record harvest log");
      return response.json();
    },
    onSuccess: async (newHarvestLog) => {
      // Optimistic updates for instant UI response
      try {
        // 1. Update harvest logs cache
        queryClient.setQueryData([`/api/harvest-logs/${plot.id}`], (oldData: any) => {
          return oldData ? [...oldData, newHarvestLog] : [newHarvestLog];
        });
        
        queryClient.setQueryData([`/api/harvest-logs/plot/${plot.id}/cycle/${selectedCycle}`], (oldData: any) => {
          return oldData ? [...oldData, newHarvestLog] : [newHarvestLog];
        });
        
        // 2. Update dashboard metrics optimistically (no invalidation to prevent refresh)
        queryClient.setQueryData(["/api/analytics/dashboard"], (oldData: any) => {
          if (!oldData) return oldData;
          const gradeAKg = Number(newHarvestLog.gradeAKg || 0);
          const gradeBKg = Number(newHarvestLog.gradeBKg || 0);
          const totalAddedKg = gradeAKg + gradeBKg;
          return {
            ...oldData,
            totalHarvestKg: Number(oldData.totalHarvestKg || 0) + totalAddedKg,
            totalGradeAKg: Number(oldData.totalGradeAKg || 0) + gradeAKg,
            totalGradeBKg: Number(oldData.totalGradeBKg || 0) + gradeBKg,
          };
        });
        
        console.log(`✅ Instantly updated UI after harvest recording for ${plot.name} - Cycle ${selectedCycle}`);
        
        toast({
          title: "Harvest Event Recorded!",
          description: `Harvest data saved for ${plot.name} - Cycle ${selectedCycle}`,
          duration: 3000,
        });
      } catch (error) {
        console.error("Error with optimistic updates:", error);
        // No invalidation to prevent refresh - errors shouldn't trigger data refresh
        
        toast({
          title: "Harvest Recorded",
          description: "Data saved successfully",
          duration: 3000,
        });
      }
      
      form.reset();
      setShowConfirmation(false);
      setFormDataToSubmit(null);
      onSuccess();
    },
    onError: () => {
      toast({
        title: "Error", 
        description: "Failed to record harvest log",
        variant: "destructive",
        duration: 5000,
      });
      setShowConfirmation(false);
      setFormDataToSubmit(null);
    },
  });

  const onSubmit = (data: z.infer<typeof insertHarvestLogSchema>) => {
    // Show confirmation dialog with the data
    setFormDataToSubmit(data);
    setShowConfirmation(true);
  };

  const handleConfirmSubmit = () => {
    if (formDataToSubmit) {
      mutation.mutate(formDataToSubmit);
    }
  };

  const handleCancelSubmit = () => {
    setShowConfirmation(false);
    setFormDataToSubmit(null);
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Recording harvest for <strong>{plot.name}</strong> - Cycle {selectedCycle}
          </div>

          <FormField
            control={form.control}
            name="harvestDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Harvest Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                      variant="outline"
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Grade A Section */}
        <div className="grid grid-cols-3 gap-4 p-4 border rounded-lg bg-green-50 dark:bg-green-950">
          <h4 className="col-span-3 font-semibold text-green-800 dark:text-green-200">Grade A Ginger</h4>
          
          <FormField
            control={form.control}
            name="gradeAKg"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Grade A (kg)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="pricePerKgGradeA"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price/kg (RM)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="7.00"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-2">
            <Label>Total (RM)</Label>
            <Input
              type="number"
              step="0.01"
              readOnly
              className="bg-gray-100 dark:bg-gray-800"
              value={gradeATotal.toFixed(2)}
            />
          </div>
        </div>

        {/* Grade B Section */}
        <div className="grid grid-cols-3 gap-4 p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-950">
          <h4 className="col-span-3 font-semibold text-yellow-800 dark:text-yellow-200">Grade B Ginger</h4>
          
          <FormField
            control={form.control}
            name="gradeBKg"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Grade B (kg)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="pricePerKgGradeB"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price/kg (RM)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="4.00"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-2">
            <Label>Total (RM)</Label>
            <Input
              type="number"
              step="0.01"
              readOnly
              className="bg-gray-100 dark:bg-gray-800"
              value={gradeBTotal.toFixed(2)}
            />
          </div>
        </div>

        {/* Grand Total */}
        <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950">
          <div className="space-y-2">
            <Label className="text-lg font-semibold text-blue-800 dark:text-blue-200">Grand Total (RM)</Label>
            <Input
              type="number"
              step="0.01"
              readOnly
              className="bg-gray-100 dark:bg-gray-800 text-lg font-bold"
              value={grandTotal.toFixed(2)}
            />
          </div>
        </div>

        <FormField
          control={form.control}
          name="comments"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Comments (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="e.g., P.B, Pel, or other notes..."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <DialogFooter>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Recording..." : "Record Harvest"}
          </Button>
        </DialogFooter>
      </form>
    </Form>

    {/* Confirmation Dialog */}
    <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Confirm Harvest Recording
          </DialogTitle>
          <DialogDescription>
            Please confirm the harvest data you want to record:
          </DialogDescription>
        </DialogHeader>
        
        {formDataToSubmit && (
          <div className="space-y-3 py-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Plot:</span> {plot.name}
              </div>
              <div>
                <span className="font-medium">Cycle:</span> {selectedCycle}
              </div>
              <div>
                <span className="font-medium">Date:</span> {format(new Date(formDataToSubmit.harvestDate), "PPP")}
              </div>
              <div>
                <span className="font-medium">Grade A:</span> {formDataToSubmit.gradeAKg} kg
              </div>
              <div>
                <span className="font-medium">Grade B:</span> {formDataToSubmit.gradeBKg} kg
              </div>
              <div>
                <span className="font-medium">Total Value:</span> RM {((formDataToSubmit.gradeAKg * formDataToSubmit.pricePerKgGradeA) + (formDataToSubmit.gradeBKg * formDataToSubmit.pricePerKgGradeB)).toFixed(2)}
              </div>
            </div>
            
            {formDataToSubmit.comments && (
              <div className="text-sm">
                <span className="font-medium">Comments:</span> {formDataToSubmit.comments}
              </div>
            )}
            
            <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg text-sm">
              <p className="text-blue-800 dark:text-blue-200">
                After recording, all harvest summaries and plot information will automatically update with the latest data.
              </p>
            </div>
          </div>
        )}
        
        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleCancelSubmit} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={handleConfirmSubmit} disabled={mutation.isPending} className="bg-green-600 hover:bg-green-700">
            {mutation.isPending ? "Recording..." : "Confirm & Record"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

// NextCycleForm Component
function NextCycleForm({ plot, nextCycle, onSuccess }: {
  plot: Plot;
  nextCycle: number;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm<z.infer<typeof nextCycleSchema>>({
    resolver: zodResolver(nextCycleSchema),
    defaultValues: {
      plantingDate: addDays(new Date(), 30), // 30 days from now
      daysToMaturity: plot.daysToMaturity,
      daysToOpenNetting: plot.daysToOpenNetting,
      polybagCount: plot.polybagCount,
      notes: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof nextCycleSchema>) => {
      const payload = {
        currentCycle: nextCycle,
        status: "plot_preparation",
        plantingDate: data.plantingDate.toISOString(),
        expectedHarvestDate: addDays(data.plantingDate, data.daysToMaturity).toISOString(),
        nettingOpenDate: addDays(data.plantingDate, data.daysToOpenNetting).toISOString(),
        daysToMaturity: data.daysToMaturity,
        daysToOpenNetting: data.daysToOpenNetting,
        polybagCount: data.polybagCount,
        notes: data.notes,
        isMultiCycle: true,
        actualHarvestDate: null,
        harvestAmountKg: null,
      };

      const response = await fetch(`/api/plots/${plot.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Failed to start next cycle");
      return response.json();
    },
    onSuccess: (updatedPlot) => {
      // Optimistic update for instant UI response (no invalidation to prevent refresh)
      queryClient.setQueryData(["/api/plots"], (oldData: Plot[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map(plot => 
          plot.id === updatedPlot.id ? updatedPlot : plot
        );
      });
      
      // Update dashboard metrics optimistically
      queryClient.setQueryData(["/api/analytics/dashboard"], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          completedCycles: Number(oldData.completedCycles || 0) + 1
        };
      });
      
      toast({
        title: "Next Cycle Started",
        description: `${plot.name} has been set up for Cycle ${nextCycle}`,
        duration: 3000, // Auto-dismiss after 3 seconds
      });
      onSuccess();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to start next cycle",
        variant: "destructive",
        duration: 5000, // Keep error messages visible longer
      });
    },
  });

  const onSubmit = (data: z.infer<typeof nextCycleSchema>) => {
    mutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Setting up <strong>{plot.name}</strong> for Cycle {nextCycle}
        </div>

        <FormField
          control={form.control}
          name="plantingDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>New Planting Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="daysToMaturity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Days to Maturity</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="daysToOpenNetting"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Days to Open Shade</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="polybagCount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Polybag Count</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes for New Cycle</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Any notes for this new cycle..."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <DialogFooter>
          <Button type="submit" disabled={mutation.isPending}>
            <ArrowRight className="h-4 w-4 mr-2" />
            {mutation.isPending ? "Starting..." : `Start Cycle ${nextCycle}`}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

function PlotForm({ 
  plot, 
  open, 
  onOpenChange, 
  onSubmit 
}: { 
  plot?: Plot; 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  onSubmit: (data: PlotFormData) => void; 
}) {
  const form = useForm<PlotFormData>({
    resolver: zodResolver(plotFormSchema),
    defaultValues: plot ? {
      name: plot.name,
      polybagCount: plot.polybagCount,
      location: plot.location,
      cropType: plot.cropType,
      plantingDate: parseISO(plot.plantingDate),
      expectedHarvestDate: plot.expectedHarvestDate ? parseISO(plot.expectedHarvestDate) : undefined,
      actualHarvestDate: plot.actualHarvestDate ? parseISO(plot.actualHarvestDate) : undefined,
      currentCycle: plot.currentCycle || 1,
      totalCycles: plot.totalCycles || 1,
      isMultiCycle: plot.isMultiCycle || false,

      daysToMaturity: plot.daysToMaturity,
      daysToOpenNetting: plot.daysToOpenNetting,
      nettingOpenDate: plot.nettingOpenDate ? parseISO(plot.nettingOpenDate) : undefined,
      status: plot.status,
      notes: plot.notes || "",
    } : {
      name: "",
      polybagCount: 100,
      location: "",
      cropType: "ginger",
      plantingDate: new Date(),
      daysToMaturity: 135, // PROGENY standard for ginger
      daysToOpenNetting: 75, // PROGENY standard for shade netting
      status: "planted",
      notes: "",
      currentCycle: 1,
      totalCycles: 9999, // Unlimited cycles by default
      isMultiCycle: true, // Multi-cycle activated automatically
    }
  });

  // Reset form when plot changes (for editing)
  React.useEffect(() => {
    if (plot) {
      form.reset({
        name: plot.name,
        polybagCount: plot.polybagCount,
        location: plot.location,
        cropType: plot.cropType,
        plantingDate: parseISO(plot.plantingDate),
        expectedHarvestDate: plot.expectedHarvestDate ? parseISO(plot.expectedHarvestDate) : undefined,
        actualHarvestDate: plot.actualHarvestDate ? parseISO(plot.actualHarvestDate) : undefined,
        daysToMaturity: plot.daysToMaturity,
        daysToOpenNetting: plot.daysToOpenNetting,
        nettingOpenDate: plot.nettingOpenDate ? parseISO(plot.nettingOpenDate) : undefined,
        status: plot.status,
        notes: plot.notes || "",
        // Cycle tracking fields  
        currentCycle: plot.currentCycle || 1,
        totalCycles: plot.totalCycles || 1,
        isMultiCycle: plot.isMultiCycle || false,
      });
    } else {
      form.reset({
        name: "",
        polybagCount: 100,
        location: "",
        cropType: "ginger",
        plantingDate: new Date(),
        daysToMaturity: 135,
        daysToOpenNetting: 75,
        status: "planted",
        notes: "",
        // Cycle tracking defaults
        currentCycle: 1,
        totalCycles: 1,
        isMultiCycle: false,
      });
    }
  }, [plot, form]);

  // Watch for changes to auto-calculate dates
  const watchedValues = form.watch(["plantingDate", "daysToMaturity", "daysToOpenNetting"]);
  
  useEffect(() => {
    const [plantingDate, daysToMaturity, daysToOpenNetting] = watchedValues;
    if (plantingDate && daysToMaturity && daysToOpenNetting) {
      const calculatedHarvestDate = addDays(plantingDate, daysToMaturity);
      const calculatedNettingDate = addDays(plantingDate, daysToOpenNetting);
      
      form.setValue("expectedHarvestDate", calculatedHarvestDate);
      form.setValue("nettingOpenDate", calculatedNettingDate);
    }
  }, [watchedValues, form]);

  const handleSubmit = (data: PlotFormData) => {
    console.log("Form data being submitted:", data);
    console.log("Form errors:", form.formState.errors);
    
    // Calculate expected harvest and netting dates based on planting date
    const plantingDate = new Date(data.plantingDate);
    const expectedHarvestDate = addDays(plantingDate, data.daysToMaturity);
    const nettingOpenDate = addDays(plantingDate, data.daysToOpenNetting);

    // Auto-set isMultiCycle based on totalCycles
    const isMultiCycle = data.totalCycles > 1;

    // Enrich the data with calculated dates and multi-cycle flag
    const enrichedData = {
      ...data,
      expectedHarvestDate,
      nettingOpenDate,
      isMultiCycle,
    };

    console.log("Enriched data with calculated dates:", enrichedData);
    onSubmit(enrichedData);
    onOpenChange(false);
    form.reset();
  };

  // Update expected harvest date when days to maturity or planting date changes
  const handleDaysToMaturityChange = (value: string) => {
    const days = parseInt(value);
    if (!isNaN(days)) {
      const plantingDate = form.getValues("plantingDate");
      const expectedHarvestDate = addDays(plantingDate, days);
      form.setValue("expectedHarvestDate", expectedHarvestDate);
      form.setValue("daysToMaturity", days);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{plot ? "Edit Plot" : "Add New Plot"}</DialogTitle>
          <DialogDescription>
            {plot ? "Update the plot information below." : "Create a new agricultural plot for tracking."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plot Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., North Field A" {...field} data-testid="input-plot-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="polybagCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Polybags</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="100" {...field} value={field.value || ""} onChange={e => field.onChange(parseInt(e.target.value) || 0)} data-testid="input-polybag-count" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Cameron Highlands, Pahang" {...field} data-testid="input-plot-location" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cropType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Crop Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-crop-type">
                          <SelectValue placeholder="Select crop type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ginger">Fresh Young Ginger</SelectItem>
                        <SelectItem value="turmeric">Turmeric</SelectItem>
                        <SelectItem value="galangal">Galangal</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-plot-status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="plot_preparation">Plot Preparation</SelectItem>
                        <SelectItem value="planted">Planted</SelectItem>
                        <SelectItem value="growing">Growing</SelectItem>
                        <SelectItem value="ready_for_harvest">Ready for Harvest</SelectItem>
                        <SelectItem value="harvesting">Harvesting</SelectItem>
                        <SelectItem value="dormant">Dormant</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="plantingDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Planting Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                            data-testid="button-planting-date"
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />


            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="daysToMaturity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Days to Harvest</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="135" 
                        {...field}
                        value={field.value || ""}
                        onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                        data-testid="input-days-harvest"
                      />
                    </FormControl>
                    <FormDescription>
                      Days from planting to harvest (e.g., 135 for ginger)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="daysToOpenNetting"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Days to Open Netting</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="75" 
                        {...field}
                        value={field.value || ""}
                        onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                        data-testid="input-days-netting"
                      />
                    </FormControl>
                    <FormDescription>
                      Days from planting to open shade netting (e.g., 75 for ginger)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Auto-calculated Display Fields */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="expectedHarvestDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expected Harvest Date (Auto-calculated)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Auto-calculated from planting date + days to harvest" 
                        value={field.value ? format(field.value, "PPP") : "Will be calculated automatically"}
                        disabled
                        data-testid="input-harvest-date-readonly"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nettingOpenDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Netting Open Date (Auto-calculated)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Auto-calculated from planting date + days to open netting" 
                        value={field.value ? format(field.value, "PPP") : "Will be calculated automatically"}
                        disabled
                        data-testid="input-netting-date-readonly"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {(plot?.status === "harvested") && (
              <FormField
                control={form.control}
                name="actualHarvestDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Actual Harvest Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                            data-testid="button-actual-harvest-date"
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Multi-Cycle Planning Section */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-3 text-gray-900 dark:text-gray-100">Multi-Cycle Planning</h4>
              <div className="grid grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="currentCycle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Cycle</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="1" 
                          min="1"
                          {...field} 
                          value={field.value || ""} 
                          onChange={e => field.onChange(parseInt(e.target.value) || 1)} 
                          data-testid="input-current-cycle" 
                        />
                      </FormControl>
                      <FormDescription>Current cycle number - unlimited cycles supported</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Add any additional notes about this plot..."
                      className="resize-none"
                      {...field}
                      value={field.value || ""}
                      data-testid="textarea-plot-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                data-testid="button-save-plot"
                onClick={(e) => {
                  console.log("Submit button clicked");
                  console.log("Form valid:", form.formState.isValid);
                  console.log("Form errors:", form.formState.errors);
                  console.log("Form values:", form.getValues());
                }}
              >
                {plot ? "Update Plot" : "Create Plot"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Harvest Log Modal Component (for editing individual harvest logs)
function HarvestLogModal({ 
  plot, 
  harvestLog,
  isOpen, 
  onClose, 
  onSubmit 
}: { 
  plot: any; 
  harvestLog: any;
  isOpen: boolean; 
  onClose: () => void; 
  onSubmit: () => void; 
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/harvest-logs/${harvestLog.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update harvest log');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Harvest log updated successfully",
      });
      // Optimistic update - update harvest logs cache
      queryClient.setQueryData([`/api/harvest-logs/plot/${plot.id}/cycle/${plot.currentCycle}`], (oldData: any[]) => {
        return oldData ? oldData.map(log => log.id === harvestLog.id ? { ...log, ...data } : log) : oldData;
      });
      queryClient.setQueryData([`/api/harvest-logs/${plot.id}`], (oldData: any[]) => {
        return oldData ? oldData.map(log => log.id === harvestLog.id ? { ...log, ...data } : log) : oldData;
      });
      onSubmit();
    },
    onError: (error) => {
      console.error('Error updating harvest log:', error);
      toast({
        title: "Error",
        description: "Failed to update harvest log",
        variant: "destructive",
      });
    },
  });

  const form = useForm({
    defaultValues: {
      harvestDate: harvestLog.harvestDate ? format(new Date(harvestLog.harvestDate), "yyyy-MM-dd") : "",
      gradeAKg: harvestLog.gradeAKg || 0,
      gradeBKg: harvestLog.gradeBKg || 0,
      pricePerKgGradeA: harvestLog.pricePerKgGradeA || harvestLog.priceGradeA || 0,
      pricePerKgGradeB: harvestLog.pricePerKgGradeB || harvestLog.priceGradeB || 0,
      comments: harvestLog.comments || "",
    },
  });

  const handleSubmit = (data: any) => {
    updateMutation.mutate({
      ...data,
      harvestDate: new Date(data.harvestDate).toISOString(),
      gradeAKg: Number(data.gradeAKg) || 0,
      gradeBKg: Number(data.gradeBKg) || 0,
      pricePerKgGradeA: Number(data.pricePerKgGradeA) || 0,
      pricePerKgGradeB: Number(data.pricePerKgGradeB) || 0,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5 text-green-600" />
            Edit Harvest Log - {plot.name}
          </DialogTitle>
          <DialogDescription>
            Update the harvest details for this entry
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {/* Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Harvest Date</label>
              <input
                type="date"
                {...form.register("harvestDate")}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                data-testid="input-edit-harvest-date"
              />
            </div>
          </div>

          {/* Quantities */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Grade A Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                {...form.register("gradeAKg", { valueAsNumber: true })}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                data-testid="input-edit-grade-a-kg"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Grade B Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                {...form.register("gradeBKg", { valueAsNumber: true })}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                data-testid="input-edit-grade-b-kg"
              />
            </div>
          </div>

          {/* Prices */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Grade A Price (RM/kg)</label>
              <input
                type="number"
                step="0.01"
                {...form.register("pricePerKgGradeA", { valueAsNumber: true })}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                data-testid="input-edit-price-grade-a"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Grade B Price (RM/kg)</label>
              <input
                type="number"
                step="0.01"
                {...form.register("pricePerKgGradeB", { valueAsNumber: true })}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                data-testid="input-edit-price-grade-b"
              />
            </div>
          </div>

          {/* Comments */}
          <div>
            <label className="text-sm font-medium">Comments</label>
            <textarea
              {...form.register("comments")}
              rows={3}
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder="Any comments about this harvest..."
              data-testid="textarea-edit-comments"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={updateMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
              data-testid="button-update-harvest-log"
            >
              {updateMutation.isPending ? "Updating..." : "Update Harvest Log"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Harvest Modal Component
function HarvestModal({ 
  plot, 
  isOpen, 
  onClose, 
  onSubmit 
}: { 
  plot: Plot | null; 
  isOpen: boolean; 
  onClose: () => void; 
  onSubmit: (data: HarvestFormData) => void; 
}) {
  const harvestForm = useForm<HarvestFormData>({
    resolver: zodResolver(harvestSchema),
    defaultValues: {
      harvestAmountKg: plot?.harvestAmountKg || 0,
      actualHarvestDate: plot?.actualHarvestDate ? new Date(plot.actualHarvestDate) : new Date(),
      proceedToNextCycle: false,
    },
  });

  const handleSubmit = (data: HarvestFormData) => {
    onSubmit(data);
    harvestForm.reset();
  };

  if (!plot) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-green-600" />
            {plot.status === "harvested" ? "Update" : "Record"} Harvest - {plot.name}
          </DialogTitle>
          <DialogDescription>
            {plot.status === "harvested" 
              ? `Update harvest data for Cycle ${plot.currentCycle} and optionally proceed to next cycle.`
              : `Capture harvest data for Cycle ${plot.currentCycle} and optionally proceed to the next cycle.`
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...harvestForm}>
          <form onSubmit={harvestForm.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={harvestForm.control}
                name="harvestAmountKg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Harvest Amount (kg)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.1"
                        placeholder="e.g., 125.5" 
                        {...field}
                        value={field.value || ""}
                        onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                        data-testid="input-harvest-amount"
                      />
                    </FormControl>
                    <FormDescription>
                      Total weight harvested in kilograms
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={harvestForm.control}
                name="actualHarvestDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Harvest Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {plot.isMultiCycle && (
              <FormField
                control={harvestForm.control}
                name="proceedToNextCycle"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Start Next Cycle</FormLabel>
                      <FormDescription>
                        Automatically setup for Cycle {plot.currentCycle + 1}
                      </FormDescription>
                    </div>
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" className="bg-green-600 hover:bg-green-700">
                {plot.status === "harvested" ? "Update Harvest" : "Record Harvest"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Next Cycle Modal Component
function NextCycleModal({ 
  plot, 
  isOpen, 
  onClose, 
  onSubmit 
}: { 
  plot: Plot | null; 
  isOpen: boolean; 
  onClose: () => void; 
  onSubmit: (data: PlotFormData) => void; 
}) {
  if (!plot) return null;

  const nextCycleForm = useForm<PlotFormData>({
    resolver: zodResolver(plotFormSchema),
    defaultValues: {
      name: plot.name,
      polybagCount: plot.polybagCount,
      location: plot.location,
      cropType: plot.cropType,
      plantingDate: new Date(), // Default to today for new cycle
      daysToMaturity: plot.daysToMaturity,
      daysToOpenNetting: plot.daysToOpenNetting,
      status: "plot_preparation", // Automatically set to preparation status for new cycle
      currentCycle: plot.currentCycle + 1,
      totalCycles: plot.totalCycles,
      isMultiCycle: plot.isMultiCycle,
      notes: "",
    },
  });

  const onNextCycleSubmit = (data: PlotFormData) => {
    onSubmit(data);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-blue-600" />
            Start Next Cycle - {plot.name}
          </DialogTitle>
          <DialogDescription>
            Proceeding to Cycle {plot.currentCycle + 1}. Update the planting date and any other details for the new cycle.
          </DialogDescription>
        </DialogHeader>

        <Form {...nextCycleForm}>
          <form onSubmit={nextCycleForm.handleSubmit(onNextCycleSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Planting Date */}
              <FormField
                control={nextCycleForm.control}
                name="plantingDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>New Planting Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      Select any date for future planning - today, tomorrow, or any future date
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Days to Maturity */}
              <FormField
                control={nextCycleForm.control}
                name="daysToMaturity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Days to Maturity</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        value={field.value || ""} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Days to Open Netting */}
              <FormField
                control={nextCycleForm.control}
                name="daysToOpenNetting"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Days to Open Shade</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        value={field.value || ""} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Polybag Count */}
              <FormField
                control={nextCycleForm.control}
                name="polybagCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Polybag Count</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        value={field.value || ""} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Notes */}
            <FormField
              control={nextCycleForm.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes for New Cycle</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Any notes for this new cycle..."
                      {...field} 
                      value={field.value || ""} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Future Planning:</strong> You can select any future date for planning purposes. The system allows scheduling cycles weeks or months ahead for better operational planning.
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                <RefreshCw className="h-4 w-4 mr-2" />
                Start Cycle {plot.currentCycle + 1}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function Plots() {
  const [showForm, setShowForm] = useState(false);
  const [editingPlot, setEditingPlot] = useState<Plot | undefined>();
  const [harvestModalOpen, setHarvestModalOpen] = useState(false);
  const [harvestingPlot, setHarvestingPlot] = useState<Plot | null>(null);
  
  // State for next cycle modal
  const [nextCycleModalOpen, setNextCycleModalOpen] = useState(false);
  const [nextCyclePlot, setNextCyclePlot] = useState<Plot | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Handle harvest modal opening
  const handleHarvest = (plot: Plot) => {
    setHarvestingPlot(plot);
    setHarvestModalOpen(true);
  };

  const handleNextCycle = (plot: Plot) => {
    setNextCyclePlot(plot);
    setNextCycleModalOpen(true);
  };

  const handleNextCycleSubmit = (data: PlotFormData) => {
    if (nextCyclePlot) {
      updateMutation.mutate({ id: nextCyclePlot.id, data });
    }
    setNextCycleModalOpen(false);
    setNextCyclePlot(null);
  };

  // Handle harvest submission
  const handleHarvestSubmit = async (data: HarvestFormData) => {
    if (!harvestingPlot) return;

    try {
      // Calculate total harvested amount (accumulate across cycles)
      const currentTotal = parseFloat(harvestingPlot.totalHarvestedKg?.toString() || "0");
      const currentCycleAmount = parseFloat(harvestingPlot.harvestAmountKg?.toString() || "0");
      
      // PROGENY AGROTECH HARVEST ACCUMULATION LOGIC
      // FIXED: Proper per-cycle harvest tracking and accumulation
      let newTotal: number;
      
      // Parse cycle history to get previous cycle harvests
      let cycleHistory: Array<{cycle: number, harvest: number}> = [];
      try {
        cycleHistory = JSON.parse(harvestingPlot.cycleHistory || "[]");
      } catch (e) {
        cycleHistory = [];
      }
      
      // Calculate total from completed previous cycles
      const totalFromPreviousCycles = cycleHistory.reduce((sum, entry) => {
        if (entry.cycle < harvestingPlot.currentCycle) {
          return sum + entry.harvest;
        }
        return sum;
      }, 0);
      
      // For current cycle: replace existing or add new
      newTotal = totalFromPreviousCycles + data.harvestAmountKg;
      
      console.log(`Plot ${harvestingPlot.name}: Cycle ${harvestingPlot.currentCycle} - Previous cycles total: ${totalFromPreviousCycles}kg, Current cycle: ${data.harvestAmountKg}kg, New total: ${newTotal}kg`);
      
      // Update cycle history with current cycle harvest
      const updatedHistory = cycleHistory.filter(entry => entry.cycle !== harvestingPlot.currentCycle);
      updatedHistory.push({
        cycle: harvestingPlot.currentCycle,
        harvest: data.harvestAmountKg
      });

      let payload: any = {
        status: "harvested",
        actualHarvestDate: data.actualHarvestDate.toISOString(),
        harvestAmountKg: data.harvestAmountKg,
        totalHarvestedKg: newTotal.toString(),
        cycleHistory: JSON.stringify(updatedHistory), // Store per-cycle harvest data
      };

      // If proceeding to next cycle, setup next cycle data (auto-convert to multi-cycle)
      if (data.proceedToNextCycle) {
        const nextPlantingDate = addDays(data.actualHarvestDate, 30); // 30-day rest period
        payload = {
          ...payload,
          currentCycle: harvestingPlot.currentCycle + 1,
          totalCycles: 9999, // Unlimited cycles
          isMultiCycle: true, // Auto-convert to multi-cycle
          status: "plot_preparation", // Automatically set to preparation status
          plantingDate: nextPlantingDate.toISOString(),
          expectedHarvestDate: addDays(nextPlantingDate, harvestingPlot.daysToMaturity).toISOString(),
          nettingOpenDate: addDays(nextPlantingDate, harvestingPlot.daysToOpenNetting).toISOString(),
          actualHarvestDate: null,
          harvestAmountKg: null, // Reset current cycle harvest amount for new cycle
          // CRITICAL: totalHarvestedKg remains as newTotal to preserve accumulation
        };
        console.log(`Plot ${harvestingPlot.name}: Starting next cycle ${harvestingPlot.currentCycle + 1} - Total accumulated: ${newTotal}kg`);
      }

      const response = await fetch(`/api/plots/${harvestingPlot.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to record harvest");
      }

      // Optimistic update for instant UI response
      const updatedPlot = { ...harvestingPlot, ...payload };
      queryClient.setQueryData(["/api/plots"], (oldData: Plot[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map(plot => 
          plot.id === harvestingPlot.id ? updatedPlot : plot
        );
      });
      
      // Update dashboard metrics optimistically (no invalidation to prevent refresh)
      queryClient.setQueryData(["/api/analytics/dashboard"], (oldData: any) => {
        if (!oldData) return oldData;
        // Calculate proper grade distribution from harvest amount
        const harvestKg = Number(data.harvestAmountKg);
        // Assume 95% Grade A, 5% Grade B for optimistic update
        const gradeAIncrement = harvestKg * 0.95;
        const gradeBIncrement = harvestKg * 0.05;
        
        return {
          ...oldData,
          totalHarvestKg: Number(oldData.totalHarvestKg || 0) + harvestKg,
          totalGradeAKg: Number(oldData.totalGradeAKg || 0) + gradeAIncrement,
          totalGradeBKg: Number(oldData.totalGradeBKg || 0) + gradeBIncrement,
          completedCycles: data.proceedToNextCycle ? Number(oldData.completedCycles) + 1 : Number(oldData.completedCycles)
        };
      });
      
      setHarvestModalOpen(false);
      setHarvestingPlot(null);
      
      const message = data.proceedToNextCycle 
        ? `Harvest recorded and Cycle ${harvestingPlot.currentCycle + 1} started for ${harvestingPlot.name}`
        : `Harvest of ${data.harvestAmountKg}kg recorded for ${harvestingPlot.name}`;
      
      toast({ 
        title: "Success", 
        description: message,
        variant: "default",
        duration: 3000,
      });
    } catch (error) {
      console.error("Error recording harvest:", error);
      toast({ 
        title: "Error", 
        description: "Failed to record harvest",
        variant: "destructive",
        duration: 5000, // Keep error messages visible longer
      });
    }
  };

  const { data: plotsData = [], isLoading } = useQuery<Plot[]>({
    queryKey: ["/api/plots"],
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes to prevent unnecessary refetches
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  // Sort plots alphabetically by name
  const plots = plotsData.sort((a, b) => a.name.localeCompare(b.name));

  // Fetch dashboard metrics to synchronize completed cycles count
  const { data: dashboardMetrics } = useQuery({
    queryKey: ["/api/analytics/dashboard"],
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes to prevent excessive refreshing
  });

  // Use dashboard data for completed cycles to ensure synchronization
  const completedCycles = dashboardMetrics?.completedCycles || 0;

  const createMutation = useMutation({
    mutationFn: async (data: PlotFormData) => {
      console.log("Sending data to server:", data);
      const payload = {
        name: data.name,
        polybagCount: data.polybagCount,
        location: data.location,
        cropType: data.cropType,
        plantingDate: data.plantingDate.toISOString(),
        expectedHarvestDate: data.expectedHarvestDate?.toISOString() || null,
        actualHarvestDate: data.actualHarvestDate?.toISOString() || null,
        daysToMaturity: data.daysToMaturity,
        daysToOpenNetting: data.daysToOpenNetting,
        nettingOpenDate: data.nettingOpenDate?.toISOString() || null,
        status: data.status,
        notes: data.notes || null,
        // Cycle tracking fields
        currentCycle: data.currentCycle || 1,
        totalCycles: data.totalCycles || 1,
        isMultiCycle: data.isMultiCycle || false,
        // PROGENY AGROTECH: Initialize harvest tracking fields properly
        harvestAmountKg: null, // Current cycle harvest starts as null
        totalHarvestedKg: "0.00", // Total accumulated harvest starts at 0
      };
      console.log("Payload being sent:", payload);
      
      const response = await fetch("/api/plots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Server error:", errorData);
        throw new Error(errorData.message || "Failed to create plot");
      }
      return response.json();
    },
    onSuccess: (newPlot) => {
      // Optimistic update for instant UI response
      queryClient.setQueryData(["/api/plots"], (oldData: Plot[] | undefined) => {
        return oldData ? [...oldData, newPlot] : [newPlot];
      });
      
      // Update dashboard metrics optimistically (no invalidation to prevent refresh)
      
      toast({ 
        title: "Success", 
        description: "Plot created successfully",
        duration: 3000,
      });
    },
    onError: () => {
      toast({ 
        title: "Error", 
        description: "Failed to create plot", 
        variant: "destructive",
        duration: 5000, // Keep error messages visible longer
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: PlotFormData }) => {
      const payload = {
        name: data.name,
        polybagCount: data.polybagCount,
        location: data.location,
        cropType: data.cropType,
        plantingDate: data.plantingDate.toISOString(),
        expectedHarvestDate: data.expectedHarvestDate?.toISOString() || null,
        actualHarvestDate: data.actualHarvestDate?.toISOString() || null,
        daysToMaturity: data.daysToMaturity,
        daysToOpenNetting: data.daysToOpenNetting,
        nettingOpenDate: data.nettingOpenDate?.toISOString() || null,
        status: data.status,
        notes: data.notes || null,
        // Cycle tracking fields
        currentCycle: data.currentCycle || 1,
        totalCycles: data.totalCycles || 1,
        isMultiCycle: data.isMultiCycle || false,
      };
      
      const response = await fetch(`/api/plots/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Server error:", errorData);
        throw new Error(errorData.message || "Failed to update plot");
      }
      return response.json();
    },
    onSuccess: (updatedPlot) => {
      // Optimistic update for instant UI response
      queryClient.setQueryData(["/api/plots"], (oldData: Plot[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map(plot => 
          plot.id === updatedPlot.id ? updatedPlot : plot
        );
      });
      
      // Update dashboard metrics optimistically (no invalidation to prevent refresh)
      queryClient.setQueryData(["/api/analytics/dashboard"], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          completedCycles: updatedPlot.status === 'plot_preparation' && updatedPlot.currentCycle > 1 
            ? Number(oldData.completedCycles || 0) + 1 
            : Number(oldData.completedCycles || 0)
        };
      });
      
      toast({ 
        title: "Success", 
        description: "Plot updated successfully",
        duration: 3000,
      });
      setEditingPlot(undefined);
    },
    onError: () => {
      toast({ 
        title: "Error", 
        description: "Failed to update plot", 
        variant: "destructive",
        duration: 5000, // Keep error messages visible longer
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/plots/${id}`, { 
        method: "DELETE",
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${response.status}: ${errorText}`);
      }
      // Don't try to parse JSON for 204 responses
      return response.status === 204 ? null : response.json();
    },
    onSuccess: () => {
      // Optimistic update - remove from cache
      queryClient.setQueryData(["/api/plots"], (oldData: Plot[] | undefined) => {
        return oldData ? oldData.filter(plot => plot.id !== deletingPlot?.id) : oldData;
      });
      
      toast({ 
        title: "Success", 
        description: "Plot deleted successfully",
        duration: 3000,
      });
    },
    onError: (error) => {
      // Extract detailed error message from API response
      let errorMessage = "Failed to delete plot";
      if (error instanceof Error) {
        if (error.message?.includes("404:")) {
          errorMessage = "Plot not found or already deleted";
        } else if (error.message?.includes("400:")) {
          // Extract the actual error message from the API
          const match = error.message.match(/400: (.+)/);
          errorMessage = match ? match[1] : "Cannot delete plot - check for related records";
        } else if (error.message?.includes("500:")) {
          errorMessage = "Server error occurred while deleting plot";
        } else if (error.message) {
          // Use the full error message if available
          errorMessage = error.message;
        }
      }
      
      toast({ 
        title: "Error", 
        description: errorMessage, 
        variant: "destructive",
        duration: 8000,
      });
    },
  });

  const handleSubmit = (data: PlotFormData) => {
    // Auto-calculate Expected Harvest Date and Netting Open Date
    const calculatedHarvestDate = addDays(data.plantingDate, data.daysToMaturity || 135);
    const calculatedNettingDate = addDays(data.plantingDate, data.daysToOpenNetting || 75);
    
    const enrichedData = {
      ...data,
      expectedHarvestDate: calculatedHarvestDate,
      nettingOpenDate: calculatedNettingDate,
      totalCycles: 9999, // Always unlimited cycles for all new plots
      isMultiCycle: true // All new plots are multi-cycle by default
    };

    console.log("Enriched data with calculated dates:", enrichedData);

    // Check if status is being changed to "harvested" to trigger harvest modal
    const isStatusChangingToHarvested = enrichedData.status === "harvested" && 
      (!editingPlot || editingPlot.status !== "harvested");

    if (editingPlot) {
      updateMutation.mutate({ id: editingPlot.id, data: enrichedData });
      
      // Trigger harvest modal if status changed to harvested
      if (isStatusChangingToHarvested) {
        setTimeout(() => {
          setHarvestingPlot({ 
            ...editingPlot, 
            ...enrichedData,
            plantingDate: enrichedData.plantingDate.toISOString(),
            expectedHarvestDate: enrichedData.expectedHarvestDate.toISOString(),
            nettingOpenDate: enrichedData.nettingOpenDate.toISOString(),
            actualHarvestDate: enrichedData.actualHarvestDate 
              ? (typeof enrichedData.actualHarvestDate === 'object' 
                  ? enrichedData.actualHarvestDate.toISOString() 
                  : enrichedData.actualHarvestDate)
              : undefined
          });
          setHarvestModalOpen(true);
        }, 500); // Small delay to allow form close animation
      }
    } else {
      createMutation.mutate(enrichedData);
    }
  };

  const handleEdit = (plot: Plot) => {
    setEditingPlot(plot);
    setShowForm(true);
  };

  const handleDelete = (plotId: string) => {
    if (confirm("Are you sure you want to delete this plot?")) {
      deleteMutation.mutate(plotId);
    }
  };

  const handleAddNew = () => {
    setEditingPlot(undefined);
    setShowForm(true);
  };

  // Calculate summary statistics
  const activePlots = plots.filter((plot: Plot) => 
    ["planted", "growing", "ready_to_harvest"].includes(plot.status)
  );
  const harvestedPlots = plots.filter((plot: Plot) => plot.status === "harvesting");
  const totalPolybags = plots.reduce((sum: number, plot: Plot) => sum + plot.polybagCount, 0);
  // Use dashboard data for total harvest to ensure synchronization  
  const totalHarvestedKg = dashboardMetrics?.totalHarvestKg || 0;
  
  // Dashboard calculations are now working correctly
  // All plot totals are automatically updated when harvest events are recorded
  
  // Plots needing attention (netting open due or ready for harvest)
  const plotsNeedingAttention = plots.filter((plot: Plot) => {
    const today = new Date();
    const nettingOpenDate = plot.nettingOpenDate ? parseISO(plot.nettingOpenDate) : null;
    const plantingDate = parseISO(plot.plantingDate);
    const daysSincePlanting = differenceInDays(today, plantingDate);
    const readyForHarvest = daysSincePlanting >= plot.daysToMaturity;
    const nettingDue = nettingOpenDate && today >= nettingOpenDate && !plot.actualHarvestDate;
    
    return (readyForHarvest && !plot.actualHarvestDate) || nettingDue;
  });

  return (
    <MainLayout title="Plot Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                Plot Management
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Track and manage your agricultural land plots
              </p>
            </div>
          </div>
        </div>

        {/* Tabs for Plot Management */}
        <Tabs defaultValue="manage" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manage">Manage Plots</TabsTrigger>
            <TabsTrigger value="harvest-reports">Harvest Reports</TabsTrigger>
          </TabsList>

          {/* Manage Plots Tab */}
          <TabsContent value="manage" className="space-y-6">
            <div className="flex justify-end">
              <Button onClick={handleAddNew} data-testid="button-add-plot">
                <Plus className="h-4 w-4 mr-2" />
                Add New Plot
              </Button>
            </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Plots</CardTitle>
              <Sprout className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-plots">{plots.length}</div>
              <p className="text-xs text-muted-foreground">
                {totalPolybags} polybags total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Plots</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600" data-testid="text-active-plots">
                {activePlots.length}
              </div>
              <p className="text-xs text-muted-foreground">
                Currently growing
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Needs Attention</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600" data-testid="text-attention-plots">
                {plotsNeedingAttention.length}
              </div>
              <p className="text-xs text-muted-foreground">
                Action required
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Harvested</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600" data-testid="text-completed-cycles">
                {completedCycles}
              </div>
              <p className="text-xs text-muted-foreground">
                Completed cycles
              </p>
            </CardContent>
          </Card>
          <Card className="md:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Harvest</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Grade A</p>
                  <p className="text-lg font-bold text-green-600" data-testid="text-grade-a-harvest">
                    {dashboardMetrics?.totalGradeAKg?.toFixed(1) || '0.0'} kg
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Grade B</p>
                  <p className="text-lg font-bold text-blue-600" data-testid="text-grade-b-harvest">
                    {dashboardMetrics?.totalGradeBKg?.toFixed(1) || '0.0'} kg
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Total</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white" data-testid="text-total-harvest">
                    {totalHarvestedKg.toFixed(1)} kg
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                All plots combined
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Plots Grid */}
        {isLoading ? (
          <div className="text-center py-8">Loading plots...</div>
        ) : plots.length === 0 ? (
          <Card className="p-8 text-center">
            <Sprout className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No plots yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Start tracking your agricultural land by creating your first plot.
            </p>
            <Button onClick={handleAddNew}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Plot
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {plots.map((plot) => (
              <PlotCard
                key={plot.id}
                plot={plot}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onHarvest={handleHarvest}
                onNextCycle={handleNextCycle}
              />
            ))}
          </div>
        )}

        {/* Plot Form Modal */}
        <PlotForm
          plot={editingPlot}
          open={showForm}
          onOpenChange={(open) => {
            setShowForm(open);
            if (!open) setEditingPlot(undefined);
          }}
          onSubmit={handleSubmit}
        />

        {/* Harvest Modal */}
        <HarvestModal
          plot={harvestingPlot}
          isOpen={harvestModalOpen}
          onClose={() => {
            setHarvestModalOpen(false);
            setHarvestingPlot(null);
          }}
          onSubmit={handleHarvestSubmit}
        />

        {/* Next Cycle Modal */}
        <NextCycleModal
          plot={nextCyclePlot}
          isOpen={nextCycleModalOpen}
          onClose={() => {
            setNextCycleModalOpen(false);
            setNextCyclePlot(null);
          }}
          onSubmit={handleNextCycleSubmit}
        />
          </TabsContent>

          {/* Harvest Reports Tab */}
          <TabsContent value="harvest-reports" className="space-y-6">
            <HarvestReportsContent plots={plots} />
          </TabsContent>

        </Tabs>
      </div>
    </MainLayout>
  );
}

// Harvest Reports Content Component
interface HarvestReportsContentProps {
  plots: any[];
}

function HarvestReportsContent({ plots }: HarvestReportsContentProps) {
  const [selectedPlot, setSelectedPlot] = useState<any>(null);
  const [selectedCycle, setSelectedCycle] = useState<number>(1);

  // Get harvest logs for the selected plot and cycle
  const { data: harvestLogs = [], isLoading } = useQuery({
    queryKey: ['/api/harvest-logs/plot', selectedPlot?.id, 'cycle', selectedCycle],
    enabled: !!selectedPlot?.id,
  });

  // Set default plot selection when plots load
  useEffect(() => {
    if (plots.length > 0 && !selectedPlot) {
      setSelectedPlot(plots[0]);
    }
  }, [plots, selectedPlot]);

  if (plots.length === 0) {
    return (
      <Card className="p-8 text-center">
        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          No plots available
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Create plots first to view harvest reports.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Plot and Cycle Selection */}
      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <Label htmlFor="plot-select">Select Plot</Label>
          <Select
            value={selectedPlot?.id || ""}
            onValueChange={(plotId) => {
              const plot = plots.find(p => p.id === plotId);
              setSelectedPlot(plot);
              setSelectedCycle(1); // Reset to cycle 1
            }}
          >
            <SelectTrigger id="plot-select">
              <SelectValue placeholder="Choose a plot" />
            </SelectTrigger>
            <SelectContent>
              {plots.map((plot) => (
                <SelectItem key={plot.id} value={plot.id}>
                  {plot.name} - {plot.location}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedPlot && (
          <div className="flex-1">
            <Label htmlFor="cycle-select">Select Cycle</Label>
            <Select
              value={selectedCycle.toString()}
              onValueChange={(cycle) => setSelectedCycle(parseInt(cycle))}
            >
              <SelectTrigger id="cycle-select">
                <SelectValue placeholder="Choose cycle" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: selectedPlot.currentCycle }, (_, i) => i + 1).map((cycle) => (
                  <SelectItem key={cycle} value={cycle.toString()}>
                    Cycle {cycle}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Harvest Report Display */}
      {selectedPlot && (
        <Card className="p-6">
          {isLoading ? (
            <div className="text-center py-8">Loading harvest data...</div>
          ) : harvestLogs.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No harvest data
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                No harvest logs found for {selectedPlot.name} Cycle {selectedCycle}.
              </p>
            </div>
          ) : (
            <InteractiveHarvestTable 
              plot={selectedPlot} 
              selectedCycle={selectedCycle} 
              harvestLogs={harvestLogs} 
            />
          )}
        </Card>
      )}
    </div>
  );
}

// Interactive Harvest Table Component
interface InteractiveHarvestTableProps {
  plot: any;
  selectedCycle: number;
  harvestLogs: any[];
}

function InteractiveHarvestTable({ plot, selectedCycle, harvestLogs }: InteractiveHarvestTableProps) {
  const [editingLog, setEditingLog] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Sort harvest logs by date
  const sortedLogs = harvestLogs.sort((a, b) => new Date(a.harvestDate).getTime() - new Date(b.harvestDate).getTime());

  // Calculate totals
  const totalGradeA = sortedLogs.reduce((sum, log) => sum + Number(log.gradeAKg || 0), 0);
  const totalGradeB = sortedLogs.reduce((sum, log) => sum + Number(log.gradeBKg || 0), 0);
  const totalValueGradeA = sortedLogs.reduce((sum, log) => sum + (Number(log.gradeAKg || 0) * Number(log.pricePerKgGradeA || log.priceGradeA || 0)), 0);
  const totalValueGradeB = sortedLogs.reduce((sum, log) => sum + (Number(log.gradeBKg || 0) * Number(log.pricePerKgGradeB || log.priceGradeB || 0)), 0);
  const grandTotal = totalValueGradeA + totalValueGradeB;

  const handleEdit = (log: any) => {
    setEditingLog(log);
    setShowEditModal(true);
  };

  const handleDelete = async (logId: string) => {
    if (!confirm('Are you sure you want to delete this harvest log?')) return;

    try {
      const response = await fetch(`/api/harvest-logs/${logId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete harvest log');

      toast({
        title: "Success",
        description: "Harvest log deleted successfully",
      });

      // Optimistic update - remove from harvest logs cache
      queryClient.setQueryData([`/api/harvest-logs/${plot.id}`], (oldData: any[]) => {
        return oldData ? oldData.filter(log => log.id !== logId) : oldData;
      });
      queryClient.setQueryData([`/api/harvest-logs/plot/${plot.id}/cycle/${selectedCycle}`], (oldData: any[]) => {
        return oldData ? oldData.filter(log => log.id !== logId) : oldData;
      });
    } catch (error) {
      console.error('Error deleting harvest log:', error);
      toast({
        title: "Error",
        description: "Failed to delete harvest log",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Plot Summary Header */}
      <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <h3 className="font-semibold text-green-800 dark:text-green-200">Plot Information</h3>
            <p><span className="font-medium">Plot:</span> {plot.name}</p>
            <p><span className="font-medium">Location:</span> {plot.location}</p>
            <p><span className="font-medium">Polybags:</span> {plot.polybagCount}</p>
          </div>
          <div>
            <h3 className="font-semibold text-green-800 dark:text-green-200">Cycle Information</h3>
            <p><span className="font-medium">Cycle:</span> {selectedCycle}</p>
            <p><span className="font-medium">Planting Date:</span> {plot.plantingDate ? format(new Date(plot.plantingDate), "dd/MM/yyyy") : "-"}</p>
            <p><span className="font-medium">Status:</span> <Badge variant={getStatusColor(plot.status)}>{getStatusLabel(plot.status)}</Badge></p>
          </div>
          <div>
            <h3 className="font-semibold text-green-800 dark:text-green-200">Harvest Summary</h3>
            <p><span className="font-medium">Total Events:</span> {sortedLogs.length}</p>
            <p><span className="font-medium">Total Weight:</span> {(totalGradeA + totalGradeB).toFixed(1)} kg</p>
            <p><span className="font-medium">Total Revenue:</span> RM {grandTotal.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Interactive Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-center font-medium">Grade A (kg)</th>
                <th className="px-4 py-3 text-center font-medium">Grade B (kg)</th>
                <th className="px-4 py-3 text-center font-medium">Price A (RM/kg)</th>
                <th className="px-4 py-3 text-center font-medium">Price B (RM/kg)</th>
                <th className="px-4 py-3 text-center font-medium">Value A (RM)</th>
                <th className="px-4 py-3 text-center font-medium">Value B (RM)</th>
                <th className="px-4 py-3 text-center font-medium">Total (RM)</th>
                <th className="px-4 py-3 text-center font-medium">Comments</th>
                <th className="px-4 py-3 text-center font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {sortedLogs.map((log, index) => {
                const gradeATotal = Number(log.gradeAKg || 0) * Number(log.pricePerKgGradeA || log.priceGradeA || 0);
                const gradeBTotal = Number(log.gradeBKg || 0) * Number(log.pricePerKgGradeB || log.priceGradeB || 0);
                const rowTotal = gradeATotal + gradeBTotal;

                return (
                  <tr key={log.id} className={index % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50 dark:bg-gray-800"}>
                    <td className="px-4 py-3">
                      {format(new Date(log.harvestDate), "dd/MM/yyyy")}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {log.gradeAKg > 0 ? log.gradeAKg : "-"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {log.gradeBKg > 0 ? log.gradeBKg : "-"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {log.gradeAKg > 0 ? `RM${Number(log.pricePerKgGradeA || log.priceGradeA || 0).toFixed(2)}` : "-"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {log.gradeBKg > 0 ? `RM${Number(log.pricePerKgGradeB || log.priceGradeB || 0).toFixed(2)}` : "-"}
                    </td>
                    <td className="px-4 py-3 text-center font-medium">
                      {gradeATotal > 0 ? `RM${gradeATotal.toFixed(2)}` : "-"}
                    </td>
                    <td className="px-4 py-3 text-center font-medium">
                      {gradeBTotal > 0 ? `RM${gradeBTotal.toFixed(2)}` : "-"}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-green-600">
                      RM{rowTotal.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center max-w-32 truncate">
                      {log.comments || "-"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex gap-2 justify-center">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleEdit(log)}
                          data-testid={`button-edit-harvest-${log.id}`}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleDelete(log.id)}
                          data-testid={`button-delete-harvest-${log.id}`}
                        >
                          <Trash2 className="h-3 w-3 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {/* Totals Row */}
              <tr className="bg-green-100 dark:bg-green-900 font-bold border-t-2 border-green-300">
                <td className="px-4 py-3 text-center font-bold">TOTAL</td>
                <td className="px-4 py-3 text-center">{totalGradeA.toFixed(1)}</td>
                <td className="px-4 py-3 text-center">{totalGradeB.toFixed(1)}</td>
                <td className="px-4 py-3"></td>
                <td className="px-4 py-3"></td>
                <td className="px-4 py-3 text-center">RM{totalValueGradeA.toFixed(2)}</td>
                <td className="px-4 py-3 text-center">RM{totalValueGradeB.toFixed(2)}</td>
                <td className="px-4 py-3 text-center text-lg text-green-700 dark:text-green-300">
                  RM{grandTotal.toFixed(2)}
                </td>
                <td className="px-4 py-3"></td>
                <td className="px-4 py-3"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Harvest Log Modal */}
      {editingLog && (
        <HarvestLogModal
          plot={plot}
          harvestLog={editingLog}
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingLog(null);
          }}
          onSubmit={() => {
            setShowEditModal(false);
            setEditingLog(null);
          }}
        />
      )}
    </div>
  );
}

// Component to display harvest summary table in PDF format
interface HarvestSummaryTableProps {
  plot: any;
  selectedCycle: number;
  harvestLogs: any[];
}

function HarvestSummaryTable({ plot, selectedCycle, harvestLogs }: HarvestSummaryTableProps) {
  const plotStartDate = plot.plantingDate ? new Date(plot.plantingDate) : new Date();
  const expectedStartDate = addDays(plotStartDate, plot.daysToMaturity || 135);
  
  // Sort harvest logs by date
  const sortedLogs = harvestLogs
    .sort((a, b) => new Date(a.harvestDate).getTime() - new Date(b.harvestDate).getTime());

  // Calculate totals
  const totalGradeA = sortedLogs.reduce((sum, log) => sum + Number(log.gradeAKg || 0), 0);
  const totalGradeB = sortedLogs.reduce((sum, log) => sum + Number(log.gradeBKg || 0), 0);
  const totalValueGradeA = sortedLogs.reduce((sum, log) => sum + (Number(log.gradeAKg || 0) * Number(log.pricePerKgGradeA || log.priceGradeA || 0)), 0);
  const totalValueGradeB = sortedLogs.reduce((sum, log) => sum + (Number(log.gradeBKg || 0) * Number(log.pricePerKgGradeB || log.priceGradeB || 0)), 0);
  const grandTotal = totalValueGradeA + totalValueGradeB;

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-green-700">HALIA MUDA</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="text-left space-y-1">
            <div><span className="font-semibold">Musim:</span> {selectedCycle}/2025</div>
            <div><span className="font-semibold">Plot:</span> {plot.name}</div>
            <div><span className="font-semibold">Pokok:</span> {plot.polybagCount}</div>
            <div><span className="font-semibold">Tempoh:</span> {Math.round((plot.daysToMaturity || 135) / 30 * 10) / 10} bulan</div>
          </div>
          <div className="text-left space-y-1">
            <div><span className="font-semibold">Tanam:</span> {format(plotStartDate, "dd/M/yyyy")}</div>
            <div className="ml-4"><span className="font-semibold">Mula:</span> {format(expectedStartDate, "dd/M/yyyy")}</div>
            <div className="ml-4"><span className="font-semibold">Tuai Tamat:</span> {sortedLogs.length > 0 ? format(new Date(sortedLogs[sortedLogs.length - 1].harvestDate), "dd/M/yyyy") : "-"}</div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="border border-gray-300 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 dark:bg-gray-800">
            <tr>
              <th className="border border-gray-300 px-2 py-2 text-center">Tarikh</th>
              <th className="border border-gray-300 px-2 py-2 text-center">Gred A (kg)</th>
              <th className="border border-gray-300 px-2 py-2 text-center">Gred B (kg)</th>
              <th className="border border-gray-300 px-2 py-2 text-center">Harga/kg</th>
              <th className="border border-gray-300 px-2 py-2 text-center">Harga A</th>
              <th className="border border-gray-300 px-2 py-2 text-center">Harga B</th>
              <th className="border border-gray-300 px-2 py-2 text-center">Jumlah (RM)</th>
              <th className="border border-gray-300 px-2 py-2 text-center">Komen</th>
            </tr>
          </thead>
          <tbody>
            {sortedLogs.map((log, index) => {
              const gradeATotal = (log.gradeAKg || 0) * Number(log.pricePerKgGradeA || log.priceGradeA || 0);
              const gradeBTotal = (log.gradeBKg || 0) * Number(log.pricePerKgGradeB || log.priceGradeB || 0);
              const rowTotal = gradeATotal + gradeBTotal;
              
              return (
                <tr key={log.id} className={index % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50 dark:bg-gray-800"}>
                  <td className="border border-gray-300 px-2 py-2 text-center">
                    {format(new Date(log.harvestDate), "dd/M/yyyy")}
                  </td>
                  <td className="border border-gray-300 px-2 py-2 text-center">
                    {log.gradeAKg > 0 ? log.gradeAKg : ""}
                  </td>
                  <td className="border border-gray-300 px-2 py-2 text-center">
                    {log.gradeBKg > 0 ? log.gradeBKg : ""}
                  </td>
                  <td className="border border-gray-300 px-2 py-2 text-center">
                    {log.gradeAKg > 0 ? `RM${Number(log.pricePerKgGradeA || log.priceGradeA || 0).toFixed(2)}` : ""}
                    {log.gradeBKg > 0 && log.gradeAKg > 0 ? " / " : ""}
                    {log.gradeBKg > 0 ? `RM${Number(log.pricePerKgGradeB || log.priceGradeB || 0).toFixed(2)}` : ""}
                  </td>
                  <td className="border border-gray-300 px-2 py-2 text-right">
                    {gradeATotal > 0 ? `RM${gradeATotal.toFixed(2)}` : ""}
                  </td>
                  <td className="border border-gray-300 px-2 py-2 text-right">
                    {gradeBTotal > 0 ? `RM${gradeBTotal.toFixed(2)}` : ""}
                  </td>
                  <td className="border border-gray-300 px-2 py-2 text-right font-medium">
                    RM{rowTotal.toFixed(2)}
                  </td>
                  <td className="border border-gray-300 px-2 py-2 text-center">
                    {log.comments || ""}
                  </td>
                </tr>
              );
            })}
            
            {/* Final totals row */}
            <tr className="bg-yellow-100 dark:bg-yellow-900 font-bold">
              <td className="border border-gray-300 px-2 py-2 text-center">Final</td>
              <td className="border border-gray-300 px-2 py-2 text-center">{totalGradeA}</td>
              <td className="border border-gray-300 px-2 py-2 text-center">{totalGradeB}</td>
              <td className="border border-gray-300 px-2 py-2"></td>
              <td className="border border-gray-300 px-2 py-2 text-right">RM{totalValueGradeA.toFixed(2)}</td>
              <td className="border border-gray-300 px-2 py-2 text-right">RM{totalValueGradeB.toFixed(2)}</td>
              <td className="border border-gray-300 px-2 py-2 text-right text-lg">RM {grandTotal.toFixed(2)}</td>
              <td className="border border-gray-300 px-2 py-2"></td>
            </tr>
          </tbody>
        </table>
      </div>
      
      {/* Summary */}
      <div className="text-center space-y-2 text-sm text-gray-600 dark:text-gray-400">
        <div>Total harvest events: {sortedLogs.length}</div>
        <div>Total weight: {(totalGradeA + totalGradeB).toFixed(1)} kg</div>
        <div>Total revenue: RM {grandTotal.toFixed(2)}</div>
      </div>
    </div>
  );
}


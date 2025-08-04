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
import { CalendarIcon, Plus, Sprout, Clock, Target, AlertTriangle, CheckCircle, MapPin, BarChart3, Eye, Edit, Trash2, Package, RefreshCw } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, addDays, differenceInDays, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { insertPlotSchema } from "@shared/schema";
import { z } from "zod";
import MainLayout from "@/components/layout/main-layout";

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
  status: z.string().min(1, "Status is required"),
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

function PlotCard({ plot, onEdit, onDelete, onHarvest, onNextCycle }: { 
  plot: Plot; 
  onEdit: (plot: Plot) => void; 
  onDelete: (plotId: string) => void; 
  onHarvest?: (plot: Plot) => void;
  onNextCycle?: (plot: Plot) => void;
}) {
  const plantingDate = parseISO(plot.plantingDate);
  const expectedHarvestDate = parseISO(plot.expectedHarvestDate);
  const actualHarvestDate = plot.actualHarvestDate ? parseISO(plot.actualHarvestDate) : null;
  const nettingOpenDate = plot.nettingOpenDate ? parseISO(plot.nettingOpenDate) : null;
  const today = new Date();
  
  // PROGENY AGROTECH Calculation Standards (supports negative values for future dates)
  const daysSincePlanting = differenceInDays(today, plantingDate); // Can be negative for future dates
  const dapDays = daysSincePlanting; // DAP (Days After Planting) - negative means days until planting
  const wapWeeks = Math.floor(daysSincePlanting / 7); // WAP (Weeks After Planting) - negative means weeks until planting
  
  // Calculate Expected Harvest Date and Netting Open Date from planting date
  const calculatedHarvestDate = addDays(plantingDate, plot.daysToMaturity);
  const calculatedNettingDate = addDays(plantingDate, plot.daysToOpenNetting);
  
  // Days remaining calculations
  const daysToHarvest = Math.max(0, differenceInDays(calculatedHarvestDate, today));
  const daysToOpenShade = Math.max(0, differenceInDays(calculatedNettingDate, today));
  
  // Progress calculations (handle negative values for future planting)
  const harvestProgress = daysSincePlanting >= 0 
    ? Math.min((daysSincePlanting / plot.daysToMaturity) * 100, 100)
    : 0; // Future plantings show 0% progress
  
  // Status indicators
  const isShadeOpeningSoon = daysToOpenShade <= 7 && daysToOpenShade > 0;
  
  // Status badge colors
  const getStatusColor = (status: string) => {
    switch (status) {
      case "plot_preparation": return "bg-orange-500";
      case "planted": return "bg-green-500";
      case "growing": return "bg-blue-500";
      case "ready_for_harvest": return "bg-yellow-500";
      case "harvested": return "bg-purple-500";
      case "dormant": return "bg-gray-500";
      default: return "bg-gray-400";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "plot_preparation": return "Plot Preparation";
      case "planted": return "Planted";
      case "growing": return "Growing";
      case "ready_for_harvest": return "Ready for Harvest";
      case "harvested": return "Harvested";
      case "dormant": return "Dormant";
      default: return status;
    }
  };

  // Check if netting should be opened
  const shouldOpenNetting = nettingOpenDate && today >= nettingOpenDate && !actualHarvestDate;

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
            <span data-testid={`text-planted-date-${plot.id}`}>{format(plantingDate, "MMM dd, yyyy")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Expected Harvest:</span>
            <span data-testid={`text-expected-harvest-${plot.id}`}>{format(expectedHarvestDate, "MMM dd, yyyy")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Actual Harvest:</span>
            <span className={actualHarvestDate ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-500"} data-testid={`text-actual-harvest-${plot.id}`}>
              {actualHarvestDate ? format(actualHarvestDate, "MMM dd, yyyy") : "Not available"}
            </span>
          </div>
          {nettingOpenDate && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Netting Open:</span>
              <span className={cn(
                shouldOpenNetting ? "text-orange-600 dark:text-orange-400 font-medium" : ""
              )} data-testid={`text-netting-date-${plot.id}`}>
                {format(nettingOpenDate, "MMM dd, yyyy")}
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

        {daysToHarvest === 0 && !actualHarvestDate && (
          <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <span className="text-sm text-green-700 dark:text-green-300">
              Harvest day reached! Ready for collection.
            </span>
          </div>
        )}

        {/* Cycle Information - Always Show for ALL Plots */}
        <div className="border-t pt-4 mt-4">
          <div className="space-y-2 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                  Cycle {plot.currentCycle}
                </span>
              </div>
              <div className="flex gap-1">
                {plot.status === "harvested" && (
                  <Badge variant="default" className="text-xs bg-green-600 text-white">
                    Harvested
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
            {plot.isMultiCycle && plot.status === "harvested" && (
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-600 dark:text-gray-400">Next Planting:</span>
                <span className="font-medium text-blue-600">30 days after harvest</span>
              </div>
            )}
            
            {/* Harvest Amount if Available */}
            {plot.status === "harvested" && plot.harvestAmountKg && parseFloat(plot.harvestAmountKg.toString()) > 0 && (
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-600 dark:text-gray-400">This Cycle:</span>
                <span className="font-medium text-green-600">{parseFloat(plot.harvestAmountKg.toString()).toFixed(1)} kg</span>
              </div>
            )}
            
            {/* Total Harvest if Available */}
            {plot.totalHarvestedKg && parseFloat(plot.totalHarvestedKg.toString()) > 0 && (
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-600 dark:text-gray-400">Total Harvested:</span>
                <span className="font-semibold text-green-700">{parseFloat(plot.totalHarvestedKg.toString()).toFixed(1)} kg</span>
              </div>
            )}
          </div>
        </div>

        {/* Harvest Action Buttons */}
        {(plot.status === "ready_for_harvest" || plot.status === "harvested") && (
          <div className="space-y-2 mt-4">
            <Button 
              size="sm" 
              variant={plot.status === "harvested" ? "outline" : "default"}
              className={`w-full text-xs ${plot.status === "harvested" ? "border-green-600 text-green-600 hover:bg-green-50" : "bg-green-600 hover:bg-green-700"}`}
              onClick={() => onHarvest?.(plot)}
              data-testid={`button-harvest-${plot.id}`}
            >
              <Package className="h-3 w-3 mr-1" />
              {plot.status === "harvested" ? "Update Harvest" : "Record Harvest"}
            </Button>
            
            {/* Proceed to Next Cycle Button - For all harvested plots (can convert to multi-cycle) */}
            {plot.status === "harvested" && (
              <Button 
                size="sm" 
                variant="secondary"
                className="w-full text-xs bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => onNextCycle?.(plot)}
                data-testid={`button-next-cycle-${plot.id}`}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Proceed to Next Cycle ({plot.currentCycle + 1})
              </Button>
            )}
          </div>
        )}

        {/* Completion Message */}
        {plot.currentCycle === plot.totalCycles && plot.status === "harvested" && (
          <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 mt-3">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <span className="text-sm text-green-700 dark:text-green-300">
              All cycles completed successfully!
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
                        <SelectItem value="harvested">Harvested</SelectItem>
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
      // NEXT CYCLE LOGIC: Always ADD to total (this handles the ADD_NEW_CYCLE case)
      console.log(`🔄 NEXT CYCLE: ${nextCyclePlot.name} advancing from cycle ${nextCyclePlot.currentCycle} to ${data.currentCycle}`);
      updateMutation.mutate({ id: nextCyclePlot.id, data });
    }
    setNextCycleModalOpen(false);
    setNextCyclePlot(null);
    toast({
      title: "Next cycle started!",
      description: `${data.name} has been set up for Cycle ${data.currentCycle}`,
    });
  };

  // Handle harvest submission
  const handleHarvestSubmit = async (data: HarvestFormData) => {
    if (!harvestingPlot) return;

    try {
      // 🔒 MANDATORY HARVEST LOGIC FOR ALL PLOTS (EXISTING AND NEW)
      // This logic is documented in replit.md and must be applied consistently
      const currentTotal = parseFloat(harvestingPlot.totalHarvestedKg?.toString() || "0");
      const currentCycleAmount = parseFloat(harvestingPlot.harvestAmountKg?.toString() || "0");
      
      // CORRECT HARVEST LOGIC: Update cycle amount + recalculate total from all cycles
      let newTotal;
      
      // SIMPLIFIED LOGIC: 
      // 1. For SAME cycle: Replace the cycle amount, recalculate total
      // 2. For NEW cycle: Add new cycle amount to total
      
      // For harvest submissions, we're always updating the CURRENT cycle
      // (Next cycle advances are handled by handleNextCycleSubmit, not handleHarvestSubmit)
      const isEditingCurrentCycle = true; // Harvest modal always edits current cycle
      
      if (isEditingCurrentCycle) {
        // EDITING CURRENT CYCLE: Replace current cycle amount, recalculate total
        // Total = Previous Total - Old Current Cycle Amount + New Current Cycle Amount
        newTotal = currentTotal - currentCycleAmount + data.harvestAmountKg;
        console.log(`UPDATE CYCLE ${harvestingPlot.currentCycle}: ${currentCycleAmount}kg → ${data.harvestAmountKg}kg`);
      } else {
        // This path should never be reached in harvest modal
        newTotal = currentTotal + data.harvestAmountKg;
        console.log(`FALLBACK: Adding ${data.harvestAmountKg}kg to total`);
      }
      
      // Logic is now handled above with cycle detection
      
      // Critical safety check - newTotal should never be negative or less than new harvest
      if (newTotal < 0) {
        console.error(`ERROR: Negative total calculated (${newTotal}). Resetting to new harvest amount.`);
        newTotal = data.harvestAmountKg;
      }
      
      console.log(`✓ HARVEST ACCUMULATION for ${harvestingPlot.name}:`, {
        plotName: harvestingPlot.name,
        currentCycle: harvestingPlot.currentCycle,
        plotStatus: harvestingPlot.status,
        hasActualHarvestDate: !!harvestingPlot.actualHarvestDate,
        previousTotal: currentTotal,
        currentCycleOldAmount: currentCycleAmount,
        newHarvestAmount: data.harvestAmountKg,
        calculatedNewTotal: newTotal,
        operation: isEditingCurrentCycle ? 'UPDATE_CURRENT_CYCLE' : 'ADD_NEW_CYCLE',
        cycleDetails: {
          plotCycle: harvestingPlot.currentCycle,
          isCurrentCycle: isEditingCurrentCycle,
          modalType: 'HARVEST_MODAL'
        },
        formula: isEditingCurrentCycle ? 
          `UPDATE: ${currentTotal} - ${currentCycleAmount} + ${data.harvestAmountKg} = ${newTotal}` :
          `ADD: ${currentTotal} + ${data.harvestAmountKg} = ${newTotal}`
      });

      let payload: any = {
        status: "harvested",
        actualHarvestDate: data.actualHarvestDate.toISOString(),
        harvestAmountKg: data.harvestAmountKg,
        totalHarvestedKg: newTotal.toString(),
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
          harvestAmountKg: null,
          // Keep the total accumulated harvest amount
        };
      }

      const response = await fetch(`/api/plots/${harvestingPlot.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to record harvest");
      }

      queryClient.invalidateQueries({ queryKey: ["/api/plots"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/dashboard"] });
      setHarvestModalOpen(false);
      setHarvestingPlot(null);
      
      const message = data.proceedToNextCycle 
        ? `Harvest recorded and Cycle ${harvestingPlot.currentCycle + 1} started for ${harvestingPlot.name}`
        : `Harvest of ${data.harvestAmountKg}kg recorded for ${harvestingPlot.name}`;
      
      toast({ 
        title: "Success", 
        description: message,
        variant: "default"
      });
    } catch (error) {
      console.error("Error recording harvest:", error);
      toast({ 
        title: "Error", 
        description: "Failed to record harvest",
        variant: "destructive"
      });
    }
  };

  const { data: plotsData = [], isLoading } = useQuery<Plot[]>({
    queryKey: ["/api/plots"],
  });

  // Sort plots alphabetically by name
  const plots = plotsData.sort((a, b) => a.name.localeCompare(b.name));

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plots"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/dashboard"] });
      toast({ title: "Success", description: "Plot created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create plot", variant: "destructive" });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plots"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/dashboard"] });
      toast({ title: "Success", description: "Plot updated successfully" });
      setEditingPlot(undefined);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update plot", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/plots/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete plot");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plots"] });
      toast({ title: "Success", description: "Plot deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete plot", variant: "destructive" });
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
            actualHarvestDate: enrichedData.actualHarvestDate instanceof Date ? 
              enrichedData.actualHarvestDate.toISOString() : enrichedData.actualHarvestDate,
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
    plot.status !== "harvested" && plot.status !== "dormant"
  );
  const harvestedPlots = plots.filter((plot: Plot) => plot.status === "harvested");
  const totalPolybags = plots.reduce((sum: number, plot: Plot) => sum + plot.polybagCount, 0);
  const totalHarvestedKg = plots.reduce((sum: number, plot: Plot) => 
    sum + parseFloat(plot.totalHarvestedKg?.toString() || "0"), 0
  );
  
  // Calculate completed cycles using the same logic as main dashboard
  const completedCycles = plots.reduce((sum: number, plot: Plot) => {
    let cyclesForThisPlot = 0;
    // For plots with "harvested" status, the currentCycle represents completed cycles
    // For other statuses, we only count cycles that have been fully harvested (currentCycle - 1)
    if (plot.status === 'harvested') {
      cyclesForThisPlot = plot.currentCycle;
    } else if (plot.currentCycle > 1) {
      // For plots in other statuses, count previously completed cycles
      cyclesForThisPlot = plot.currentCycle - 1;
    }
    return sum + cyclesForThisPlot;
  }, 0);
  
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
            <Button onClick={handleAddNew} data-testid="button-add-plot">
              <Plus className="h-4 w-4 mr-2" />
              Add New Plot
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
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
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Harvest</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600" data-testid="text-total-harvest">
                {totalHarvestedKg.toFixed(1)} kg
              </div>
              <p className="text-xs text-muted-foreground">
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
      </div>
    </MainLayout>
  );
}
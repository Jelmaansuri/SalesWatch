import { useState } from "react";
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { CalendarIcon, Plus, Sprout, Clock, Target, AlertTriangle, CheckCircle, MapPin, BarChart3, Eye, Edit, Trash2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, addDays, differenceInDays, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { insertPlotSchema } from "@shared/schema";
import { z } from "zod";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";

const plotFormSchema = insertPlotSchema.extend({
  plantingDate: z.date(),
  expectedHarvestDate: z.date(),
  actualHarvestDate: z.date().optional(),
  nettingOpenDate: z.date().optional(),
});

type PlotFormData = z.infer<typeof plotFormSchema>;

interface Plot {
  id: string;
  userId: string;
  name: string;
  size: string;
  location: string;
  cropType: string;
  plantingDate: string;
  expectedHarvestDate: string;
  actualHarvestDate?: string;
  daysToMaturity: number;
  nettingOpenDate?: string;
  status: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

function PlotCard({ plot, onEdit, onDelete }: { 
  plot: Plot; 
  onEdit: (plot: Plot) => void; 
  onDelete: (plotId: string) => void; 
}) {
  const plantingDate = parseISO(plot.plantingDate);
  const expectedHarvestDate = parseISO(plot.expectedHarvestDate);
  const actualHarvestDate = plot.actualHarvestDate ? parseISO(plot.actualHarvestDate) : null;
  const nettingOpenDate = plot.nettingOpenDate ? parseISO(plot.nettingOpenDate) : null;
  const today = new Date();
  
  // Calculate days since planting (HST - Hours Since Transplant equivalent)
  const daysSincePlanting = differenceInDays(today, plantingDate);
  const weeksPlanted = Math.floor(daysSincePlanting / 7);
  
  // Calculate progress towards harvest
  const totalDaysToMaturity = plot.daysToMaturity;
  const harvestProgress = Math.min((daysSincePlanting / totalDaysToMaturity) * 100, 100);
  
  // Status badge colors
  const getStatusColor = (status: string) => {
    switch (status) {
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
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {plot.name}
            </CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              <MapPin className="h-4 w-4" />
              {plot.location} • {plot.size} hectares • {plot.cropType}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={cn("text-white", getStatusColor(plot.status))}>
              {getStatusLabel(plot.status)}
            </Badge>
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
        {/* HST and Weeks Display */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
            <div className="text-2xl font-bold text-green-700 dark:text-green-400" data-testid={`text-hst-${plot.id}`}>
              {daysSincePlanting} HST
            </div>
            <div className="text-sm text-green-600 dark:text-green-500">Days Since Planting</div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400" data-testid={`text-weeks-${plot.id}`}>
              {weeksPlanted} Weeks
            </div>
            <div className="text-sm text-blue-600 dark:text-blue-500">Weeks After Planted</div>
          </div>
        </div>

        {/* Harvest Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress to Harvest</span>
            <span>{Math.round(harvestProgress)}%</span>
          </div>
          <Progress value={harvestProgress} className="w-full" />
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {totalDaysToMaturity - daysSincePlanting > 0 
              ? `${totalDaysToMaturity - daysSincePlanting} days remaining`
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
          {actualHarvestDate && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Actual Harvest:</span>
              <span className="text-green-600 dark:text-green-400" data-testid={`text-actual-harvest-${plot.id}`}>
                {format(actualHarvestDate, "MMM dd, yyyy")}
              </span>
            </div>
          )}
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

        {/* Alerts */}
        {shouldOpenNetting && (
          <div className="flex items-center gap-2 p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
            <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            <span className="text-sm text-orange-700 dark:text-orange-300">
              Time to open netting for protection!
            </span>
          </div>
        )}

        {harvestProgress >= 100 && !actualHarvestDate && (
          <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <span className="text-sm text-green-700 dark:text-green-300">
              Plot is ready for harvest!
            </span>
          </div>
        )}

        {plot.notes && (
          <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-2 rounded">
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
      size: plot.size,
      location: plot.location,
      cropType: plot.cropType,
      plantingDate: parseISO(plot.plantingDate),
      expectedHarvestDate: parseISO(plot.expectedHarvestDate),
      actualHarvestDate: plot.actualHarvestDate ? parseISO(plot.actualHarvestDate) : undefined,
      daysToMaturity: plot.daysToMaturity,
      nettingOpenDate: plot.nettingOpenDate ? parseISO(plot.nettingOpenDate) : undefined,
      status: plot.status,
      notes: plot.notes || "",
    } : {
      name: "",
      size: "",
      location: "",
      cropType: "ginger",
      plantingDate: new Date(),
      expectedHarvestDate: addDays(new Date(), 240), // Default 8 months for ginger
      daysToMaturity: 240,
      status: "planted",
      notes: "",
    }
  });

  const handleSubmit = (data: PlotFormData) => {
    onSubmit(data);
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
                name="size"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Size (hectares)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="2.5" {...field} data-testid="input-plot-size" />
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
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="daysToMaturity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Days to Maturity</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="240" 
                        {...field}
                        onChange={(e) => handleDaysToMaturityChange(e.target.value)}
                        data-testid="input-days-maturity"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="expectedHarvestDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Expected Harvest Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                            data-testid="button-expected-harvest-date"
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

              <FormField
                control={form.control}
                name="nettingOpenDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Netting Open Date (Optional)</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                            data-testid="button-netting-date"
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
              <Button type="submit" data-testid="button-save-plot">
                {plot ? "Update Plot" : "Create Plot"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function PlotsPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingPlot, setEditingPlot] = useState<Plot | undefined>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: plots = [], isLoading } = useQuery<Plot[]>({
    queryKey: ["/api/plots"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: PlotFormData) => {
      const response = await fetch("/api/plots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          plantingDate: data.plantingDate.toISOString(),
          expectedHarvestDate: data.expectedHarvestDate.toISOString(),
          actualHarvestDate: data.actualHarvestDate?.toISOString(),
          nettingOpenDate: data.nettingOpenDate?.toISOString(),
        }),
      });
      if (!response.ok) throw new Error("Failed to create plot");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plots"] });
      toast({ title: "Success", description: "Plot created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create plot", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: PlotFormData }) => {
      const response = await fetch(`/api/plots/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          plantingDate: data.plantingDate.toISOString(),
          expectedHarvestDate: data.expectedHarvestDate.toISOString(),
          actualHarvestDate: data.actualHarvestDate?.toISOString(),
          nettingOpenDate: data.nettingOpenDate?.toISOString(),
        }),
      });
      if (!response.ok) throw new Error("Failed to update plot");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plots"] });
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
    if (editingPlot) {
      updateMutation.mutate({ id: editingPlot.id, data });
    } else {
      createMutation.mutate(data);
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
  const totalSize = plots.reduce((sum: number, plot: Plot) => sum + parseFloat(plot.size), 0);
  
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
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Plot Management" />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Plots</CardTitle>
                  <Sprout className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-total-plots">{plots.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {totalSize.toFixed(2)} hectares total
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
                  <div className="text-2xl font-bold text-purple-600" data-testid="text-harvested-plots">
                    {harvestedPlots.length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Completed cycles
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
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

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
    </div>
  );
}
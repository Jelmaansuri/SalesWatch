import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import MainLayout from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Package, FileText, Download, Calculator } from "lucide-react";
import { format, addDays } from "date-fns";

interface Plot {
  id: string;
  name: string;
  currentCycle: number;
  status: string;
  polybagCount: number;
  plantingDate: string;
  daysToMaturity: number;
  location: string;
  cropType: string;
}

interface HarvestLog {
  id: string;
  plotId: string;
  cycleNumber: number;
  harvestDate: string;
  gradeAKg: number;
  gradeBKg: number;
  priceGradeA: number;
  priceGradeB: number;
  comments: string;
}

export default function HarvestReports() {
  const [selectedPlotId, setSelectedPlotId] = useState<string>("");
  const [selectedCycle, setSelectedCycle] = useState<number>(1);
  
  // Fetch plots
  const { data: plots = [], isLoading: plotsLoading } = useQuery<Plot[]>({
    queryKey: ["/api/plots"],
  });

  // Fetch harvest logs for selected plot and cycle
  const { data: harvestLogs = [], isLoading: logsLoading } = useQuery<HarvestLog[]>({
    queryKey: ["/api/harvest-logs/plot", selectedPlotId, "cycle", selectedCycle],
    enabled: !!selectedPlotId && selectedCycle > 0,
  });

  const selectedPlot = plots.find(plot => plot.id === selectedPlotId);
  
  // Calculate totals
  const totals = harvestLogs.reduce((acc, log) => {
    const gradeAValue = (log.gradeAKg || 0) * (log.priceGradeA || 0);
    const gradeBValue = (log.gradeBKg || 0) * (log.priceGradeB || 0);
    
    return {
      totalGradeAKg: acc.totalGradeAKg + (log.gradeAKg || 0),
      totalGradeBKg: acc.totalGradeBKg + (log.gradeBKg || 0),
      totalGradeAValue: acc.totalGradeAValue + gradeAValue,
      totalGradeBValue: acc.totalGradeBValue + gradeBValue,
      grandTotal: acc.grandTotal + gradeAValue + gradeBValue
    };
  }, {
    totalGradeAKg: 0,
    totalGradeBKg: 0, 
    totalGradeAValue: 0,
    totalGradeBValue: 0,
    grandTotal: 0
  });

  if (plotsLoading) {
    return (
      <MainLayout title="Harvest Reports">
        <div className="text-center py-8">Loading...</div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Harvest Reports">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Harvest Reports
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Detailed harvest data formatted like your PDF reports
            </p>
          </div>
        </div>

        {/* Filter Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Select Plot & Cycle
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Plot</label>
                <Select value={selectedPlotId} onValueChange={setSelectedPlotId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a plot" />
                  </SelectTrigger>
                  <SelectContent>
                    {plots.map(plot => (
                      <SelectItem key={plot.id} value={plot.id}>
                        {plot.name} - {plot.location} ({plot.cropType})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {selectedPlot && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Cycle</label>
                  <Select 
                    value={selectedCycle.toString()} 
                    onValueChange={(value) => setSelectedCycle(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: selectedPlot.currentCycle }, (_, i) => i + 1).map(cycle => (
                        <SelectItem key={cycle} value={cycle.toString()}>
                          Cycle {cycle}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Report Display */}
        {selectedPlot && selectedCycle && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Harvest Report - {selectedPlot.name} (Cycle {selectedCycle})
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="text-center py-8">Loading harvest data...</div>
              ) : harvestLogs.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No harvest events recorded for this plot and cycle
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Header Information */}
                  <div className="text-center space-y-4 border-b pb-6">
                    <h2 className="text-2xl font-bold text-green-700 dark:text-green-400">HALIA MUDA</h2>
                    <div className="grid grid-cols-2 gap-8 text-sm">
                      <div className="text-left space-y-2">
                        <div><span className="font-semibold">Musim:</span> {selectedCycle}/2025</div>
                        <div><span className="font-semibold">Plot:</span> {selectedPlot.name}</div>
                        <div><span className="font-semibold">Pokok:</span> {selectedPlot.polybagCount}</div>
                        <div><span className="font-semibold">Tempoh:</span> {Math.round((selectedPlot.daysToMaturity || 135) / 30 * 10) / 10} bulan</div>
                      </div>
                      <div className="text-left space-y-2">
                        <div><span className="font-semibold">Tanam:</span> {format(new Date(selectedPlot.plantingDate), "dd/M/yyyy")}</div>
                        <div className="ml-4"><span className="font-semibold">Mula:</span> {format(addDays(new Date(selectedPlot.plantingDate), selectedPlot.daysToMaturity), "dd/M/yyyy")}</div>
                        <div className="ml-4"><span className="font-semibold">Tuai Tamat:</span> {harvestLogs.length > 0 ? format(new Date(harvestLogs[harvestLogs.length - 1].harvestDate), "dd/M/yyyy") : "-"}</div>
                      </div>
                    </div>
                  </div>

                  {/* Data Table */}
                  <div className="border border-gray-300 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100 dark:bg-gray-800">
                        <tr>
                          <th className="border border-gray-300 px-3 py-2 text-center font-medium">Tarikh</th>
                          <th className="border border-gray-300 px-3 py-2 text-center font-medium">Gred A (kg)</th>
                          <th className="border border-gray-300 px-3 py-2 text-center font-medium">Gred B (kg)</th>
                          <th className="border border-gray-300 px-3 py-2 text-center font-medium">Harga/kg</th>
                          <th className="border border-gray-300 px-3 py-2 text-center font-medium">Harga A</th>
                          <th className="border border-gray-300 px-3 py-2 text-center font-medium">Harga B</th>
                          <th className="border border-gray-300 px-3 py-2 text-center font-medium">Jumlah (RM)</th>
                          <th className="border border-gray-300 px-3 py-2 text-center font-medium">Komen</th>
                        </tr>
                      </thead>
                      <tbody>
                        {harvestLogs
                          .sort((a, b) => new Date(a.harvestDate).getTime() - new Date(b.harvestDate).getTime())
                          .map((log, index) => {
                            const gradeATotal = (log.gradeAKg || 0) * (log.priceGradeA || 0);
                            const gradeBTotal = (log.gradeBKg || 0) * (log.priceGradeB || 0);
                            const rowTotal = gradeATotal + gradeBTotal;
                            
                            return (
                              <tr key={log.id} className={index % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50 dark:bg-gray-800"}>
                                <td className="border border-gray-300 px-3 py-2 text-center">
                                  {format(new Date(log.harvestDate), "dd/M/yyyy")}
                                </td>
                                <td className="border border-gray-300 px-3 py-2 text-center">
                                  {(log.gradeAKg || 0) > 0 ? (log.gradeAKg || 0) : ""}
                                </td>
                                <td className="border border-gray-300 px-3 py-2 text-center">
                                  {(log.gradeBKg || 0) > 0 ? (log.gradeBKg || 0) : ""}
                                </td>
                                <td className="border border-gray-300 px-3 py-2 text-center">
                                  {(log.gradeAKg || 0) > 0 ? `RM${(log.priceGradeA || 0).toFixed(2)}` : ""}
                                  {(log.gradeBKg || 0) > 0 && (log.gradeAKg || 0) > 0 ? " / " : ""}
                                  {(log.gradeBKg || 0) > 0 ? `RM${(log.priceGradeB || 0).toFixed(2)}` : ""}
                                </td>
                                <td className="border border-gray-300 px-3 py-2 text-right">
                                  {gradeATotal > 0 ? `RM${gradeATotal.toFixed(2)}` : ""}
                                </td>
                                <td className="border border-gray-300 px-3 py-2 text-right">
                                  {gradeBTotal > 0 ? `RM${gradeBTotal.toFixed(2)}` : ""}
                                </td>
                                <td className="border border-gray-300 px-3 py-2 text-right font-medium">
                                  RM{rowTotal.toFixed(2)}
                                </td>
                                <td className="border border-gray-300 px-3 py-2 text-center">
                                  {log.comments || ""}
                                </td>
                              </tr>
                            );
                          })}
                        
                        {/* Totals Row */}
                        <tr className="bg-yellow-100 dark:bg-yellow-900 font-bold text-sm">
                          <td className="border border-gray-300 px-3 py-2 text-center">Final</td>
                          <td className="border border-gray-300 px-3 py-2 text-center">{totals.totalGradeAKg}</td>
                          <td className="border border-gray-300 px-3 py-2 text-center">{totals.totalGradeBKg}</td>
                          <td className="border border-gray-300 px-3 py-2"></td>
                          <td className="border border-gray-300 px-3 py-2 text-right">RM{totals.totalGradeAValue.toFixed(2)}</td>
                          <td className="border border-gray-300 px-3 py-2 text-right">RM{totals.totalGradeBValue.toFixed(2)}</td>
                          <td className="border border-gray-300 px-3 py-2 text-right text-base">RM {totals.grandTotal.toFixed(2)}</td>
                          <td className="border border-gray-300 px-3 py-2"></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Summary Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">{harvestLogs.length}</div>
                          <p className="text-xs text-muted-foreground">Harvest Events</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">{(totals.totalGradeAKg + totals.totalGradeBKg).toFixed(1)} kg</div>
                          <p className="text-xs text-muted-foreground">Total Weight</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">RM {totals.grandTotal.toFixed(2)}</div>
                          <p className="text-xs text-muted-foreground">Total Revenue</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
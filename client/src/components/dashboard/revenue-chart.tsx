import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { formatCurrency } from "@/lib/currency";

interface RevenueChartProps {
  data: Array<{ month: string; revenue: number }>;
}

export default function RevenueChart({ data }: RevenueChartProps) {
  return (
    <Card className="bg-white dark:bg-gray-900 border dark:border-gray-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
            Revenue Trend
          </CardTitle>
          <Select defaultValue="6months">
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="6months">Last 6 months</SelectItem>
              <SelectItem value="12months">Last 12 months</SelectItem>
              <SelectItem value="year">This year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
              <XAxis 
                dataKey="month" 
                className="text-gray-600 dark:text-gray-400"
              />
              <YAxis 
                className="text-gray-600 dark:text-gray-400"
                tickFormatter={(value) => formatCurrency(value)}
              />
              <Tooltip 
                formatter={(value) => [formatCurrency(value as number), "Revenue"]}
                labelStyle={{ color: "var(--foreground)" }}
                contentStyle={{ 
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "6px"
                }}
              />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="hsl(var(--my-blue))" 
                strokeWidth={3}
                dot={{ fill: "hsl(var(--my-blue))", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: "hsl(var(--my-blue))", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

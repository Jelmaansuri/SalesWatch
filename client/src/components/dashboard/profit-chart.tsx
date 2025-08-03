import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { formatCurrency } from "@/lib/currency";

interface ProfitChartProps {
  data: Array<{
    product: {
      id: string;
      name: string;
    };
    totalProfit: number;
  }>;
}

const COLORS = ["hsl(var(--my-blue))", "hsl(var(--my-orange))", "hsl(var(--my-gold))", "hsl(var(--my-green))"];

export default function ProfitChart({ data }: ProfitChartProps) {
  const chartData = data.slice(0, 4).map((item, index) => ({
    name: item.product.name,
    value: item.totalProfit,
    color: COLORS[index % COLORS.length],
  }));

  return (
    <Card className="bg-white dark:bg-gray-900 border dark:border-gray-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
            Top Profitable Products
          </CardTitle>
          <Button variant="link" className="text-my-blue hover:text-my-blue text-sm font-medium p-0">
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value) => formatCurrency(value as number)}
                contentStyle={{ 
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "6px"
                }}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                iconType="circle"
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

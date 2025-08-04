import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, DollarSign, Wheat, Users } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import type { DashboardMetrics } from "@shared/schema";

interface MetricsCardsProps {
  metrics: DashboardMetrics;
}

export default function MetricsCards({ metrics }: MetricsCardsProps) {
  const cards = [
    {
      title: "Total Revenue",
      value: formatCurrency(metrics.totalRevenue),
      icon: TrendingUp,
      iconColor: "text-my-blue",
      bgColor: "bg-my-blue bg-opacity-10",
      change: null,
      changeType: null,
    },
    {
      title: "Total Profit",
      value: formatCurrency(metrics.totalProfit),
      icon: DollarSign,
      iconColor: "text-my-green",
      bgColor: "bg-my-green bg-opacity-10",
      change: null,
      changeType: null,
    },
    {
      title: "Completed Cycles",
      value: `${metrics.completedCycles}`,
      icon: Wheat,
      iconColor: "text-purple-600", 
      bgColor: "bg-purple-600 bg-opacity-10",
      change: null,
      changeType: null,
    },
    {
      title: "Total Customers",
      value: metrics.totalCustomers.toString(),
      icon: Users,
      iconColor: "text-my-gold",
      bgColor: "bg-my-gold bg-opacity-10",
      change: null,
      changeType: null,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card key={index} className="bg-white dark:bg-gray-900 border dark:border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {card.title}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {card.value}
                  </p>
                </div>
                <div className={`p-3 rounded-full ${card.bgColor}`}>
                  <Icon className={`h-6 w-6 ${card.iconColor}`} />
                </div>
              </div>
              {card.change && (
                <div className="mt-4 flex items-center">
                  <span className={`text-sm font-medium ${card.changeType === 'positive' ? 'text-my-green' : 'text-red-500'}`}>
                    {card.change}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400 text-sm ml-2">
                    from last month
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

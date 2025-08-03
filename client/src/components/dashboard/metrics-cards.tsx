import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, DollarSign, ShoppingCart, Users } from "lucide-react";
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
      change: "+12.5%",
      changeType: "positive",
    },
    {
      title: "Total Profit",
      value: formatCurrency(metrics.totalProfit),
      icon: DollarSign,
      iconColor: "text-my-green",
      bgColor: "bg-my-green bg-opacity-10",
      change: "+8.2%",
      changeType: "positive",
    },
    {
      title: "Active Orders",
      value: metrics.activeOrders.toString(),
      icon: ShoppingCart,
      iconColor: "text-my-orange",
      bgColor: "bg-my-orange bg-opacity-10",
      change: "+15.3%",
      changeType: "positive",
    },
    {
      title: "Total Customers",
      value: metrics.totalCustomers.toString(),
      icon: Users,
      iconColor: "text-my-gold",
      bgColor: "bg-my-gold bg-opacity-10",
      change: "+5.7%",
      changeType: "positive",
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
              <div className="mt-4 flex items-center">
                <span className="text-my-green text-sm font-medium">
                  {card.change}
                </span>
                <span className="text-gray-500 dark:text-gray-400 text-sm ml-2">
                  from last month
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

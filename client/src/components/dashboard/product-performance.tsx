import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Star, Box } from "lucide-react";
import { formatCurrency, calculateProfitMargin } from "@/lib/currency";

interface ProductPerformanceProps {
  data: Array<{
    product: {
      id: string;
      name: string;
      sku: string;
      status: string;
      costPrice: string;
      sellingPrice: string;
    };
    totalRevenue: number;
    totalProfit: number;
    unitsSold: number;
  }>;
}

export default function ProductPerformance({ data }: ProductPerformanceProps) {
  const getProductIcon = (index: number) => {
    const icons = [Package, Star, Box];
    const colors = ["text-my-blue", "text-my-orange", "text-my-gold"];
    const bgColors = ["bg-my-blue bg-opacity-10", "bg-my-orange bg-opacity-10", "bg-my-gold bg-opacity-10"];
    
    const Icon = icons[index % icons.length];
    return {
      Icon,
      iconColor: colors[index % colors.length],
      bgColor: bgColors[index % bgColors.length],
    };
  };

  return (
    <Card className="bg-white dark:bg-gray-900 border dark:border-gray-700">
      <CardHeader className="border-b dark:border-gray-700">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
            Product Performance
          </CardTitle>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm">
              Filter
            </Button>
            <Button size="sm" className="bg-my-blue hover:bg-my-blue/90">
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Product Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Sales
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Profit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Margin
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    No products found
                  </td>
                </tr>
              ) : (
                data.map((item, index) => {
                  const { Icon, iconColor, bgColor } = getProductIcon(index);
                  const margin = calculateProfitMargin(
                    parseFloat(item.product.sellingPrice),
                    parseFloat(item.product.costPrice)
                  );

                  return (
                    <tr key={item.product.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${bgColor}`}>
                            <Icon className={`h-5 w-5 ${iconColor}`} />
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {item.product.name}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              SKU: {item.product.sku}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {item.unitsSold} units
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {formatCurrency(item.totalRevenue)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-my-green">
                        {formatCurrency(item.totalProfit)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {margin.toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge 
                          variant="secondary" 
                          className="bg-my-green bg-opacity-10 text-my-green"
                        >
                          {item.product.status === "active" ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

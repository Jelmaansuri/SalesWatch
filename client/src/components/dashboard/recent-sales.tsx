import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/currency";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/lib/types";
import type { SaleWithDetails } from "@shared/schema";

interface RecentSalesProps {
  sales: SaleWithDetails[];
}

export default function RecentSales({ sales }: RecentSalesProps) {
  const recentSales = sales.slice(0, 5);

  return (
    <Card className="lg:col-span-2 bg-white dark:bg-gray-900 border dark:border-gray-700">
      <CardHeader className="border-b dark:border-gray-700">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
            Recent Sales
          </CardTitle>
          <Button variant="link" className="text-my-blue hover:text-my-blue text-sm font-medium p-0">
            View All Sales
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Profit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {recentSales.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    No sales found
                  </td>
                </tr>
              ) : (
                recentSales.map((sale) => (
                  <tr key={sale.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-my-blue text-white text-sm font-medium">
                          {sale.customer.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {sale.customer.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {sale.customer.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {sale.product.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {formatCurrency(sale.totalAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-my-green">
                      {formatCurrency(sale.profit)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge 
                        variant="secondary" 
                        className={ORDER_STATUS_COLORS[sale.status as keyof typeof ORDER_STATUS_COLORS]}
                      >
                        {ORDER_STATUS_LABELS[sale.status as keyof typeof ORDER_STATUS_LABELS]}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

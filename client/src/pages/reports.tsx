import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import MainLayout from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/currency";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/lib/types";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Package, 
  Users, 
  ShoppingCart,
  Calendar,
  BarChart,
  PieChart,
  Download,
  Target,
  Award
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  BarChart as RechartsBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import type { SaleWithDetails, Customer, Product } from "@shared/schema";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function Reports() {
  const [dateRange, setDateRange] = useState("30");

  const { data: salesData = [] } = useQuery<SaleWithDetails[]>({
    queryKey: ["/api/sales"],
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: analytics } = useQuery({
    queryKey: ["/api/analytics/dashboard"],
  });

  const { data: monthlyRevenue = [] } = useQuery({
    queryKey: ["/api/analytics/revenue-by-month"],
  });

  const { data: topProducts = [] } = useQuery({
    queryKey: ["/api/analytics/top-products"],
  });

  // Calculate various metrics
  const totalRevenue = salesData.reduce((sum: number, sale: SaleWithDetails) => sum + parseFloat(sale.totalAmount), 0);
  const totalProfit = salesData.reduce((sum: number, sale: SaleWithDetails) => sum + parseFloat(sale.profit), 0);
  const averageOrderValue = salesData.length > 0 ? totalRevenue / salesData.length : 0;
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  // Status distribution
  const statusDistribution = salesData.reduce((acc: Record<string, number>, sale: SaleWithDetails) => {
    acc[sale.status] = (acc[sale.status] || 0) + 1;
    return acc;
  }, {});

  const statusChartData = Object.entries(statusDistribution).map(([status, count]) => ({
    name: ORDER_STATUS_LABELS[status as keyof typeof ORDER_STATUS_LABELS] || status,
    value: count,
    status
  }));

  // Monthly sales trend (last 6 months)
  const monthlySalesData = (monthlyRevenue as any[]).slice(-6).map((item: any) => ({
    month: item.month,
    revenue: parseFloat(item.revenue),
    orders: salesData.filter((sale: SaleWithDetails) => 
      new Date(sale.createdAt).toISOString().slice(0, 7) === item.month
    ).length
  }));

  // Top customers by revenue
  const customerRevenue = salesData.reduce((acc: Record<string, any>, sale: SaleWithDetails) => {
    const customerId = sale.customerId;
    if (!acc[customerId]) {
      acc[customerId] = {
        customer: sale.customer,
        revenue: 0,
        orders: 0
      };
    }
    acc[customerId].revenue += parseFloat(sale.totalAmount);
    acc[customerId].orders += 1;
    return acc;
  }, {});

  const topCustomers = Object.values(customerRevenue)
    .sort((a: any, b: any) => b.revenue - a.revenue)
    .slice(0, 10);

  // Product performance
  const productPerformance = products.map((product: Product) => {
    const productSales = salesData.filter((sale: SaleWithDetails) => sale.productId === product.id);
    const revenue = productSales.reduce((sum: number, sale: SaleWithDetails) => sum + parseFloat(sale.totalAmount), 0);
    const units = productSales.reduce((sum: number, sale: SaleWithDetails) => sum + sale.quantity, 0);
    const profit = productSales.reduce((sum: number, sale: SaleWithDetails) => sum + parseFloat(sale.profit), 0);
    
    return {
      product,
      revenue,
      units,
      profit,
      margin: revenue > 0 ? (profit / revenue) * 100 : 0
    };
  }).sort((a, b) => b.revenue - a.revenue);

  const exportReport = () => {
    const reportData = {
      summary: {
        totalRevenue,
        totalProfit,
        averageOrderValue,
        profitMargin,
        totalOrders: salesData.length,
        totalCustomers: customers.length,
        totalProducts: products.length
      },
      salesData,
      topCustomers,
      productPerformance,
      statusDistribution,
      generatedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <MainLayout title="Reports & Analytics">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Reports & Analytics
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Comprehensive business insights and performance metrics
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 3 months</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={exportReport} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Revenue</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(totalRevenue)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
              <div className="mt-2 flex items-center text-sm">
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-green-500">+12.5% from last month</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Profit</p>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalProfit)}</p>
                </div>
                <Target className="h-8 w-8 text-blue-600" />
              </div>
              <div className="mt-2 flex items-center text-sm">
                <span className="text-gray-500">Margin: {profitMargin.toFixed(1)}%</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Average Order</p>
                  <p className="text-2xl font-bold text-purple-600">{formatCurrency(averageOrderValue)}</p>
                </div>
                <ShoppingCart className="h-8 w-8 text-purple-600" />
              </div>
              <div className="mt-2 flex items-center text-sm">
                <span className="text-gray-500">{salesData.length} total orders</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Customers</p>
                  <p className="text-2xl font-bold text-orange-600">{customers.length}</p>
                </div>
                <Users className="h-8 w-8 text-orange-600" />
              </div>
              <div className="mt-2 flex items-center text-sm">
                <span className="text-gray-500">{products.length} products</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="sales">Sales Analysis</TabsTrigger>
            <TabsTrigger value="products">Product Performance</TabsTrigger>
            <TabsTrigger value="customers">Customer Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue Trend */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5" />
                    <span>Revenue Trend</span>
                  </CardTitle>
                  <CardDescription>Monthly revenue over the last 6 months</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={monthlySalesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                      <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Order Status Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <PieChart className="h-5 w-5" />
                    <span>Order Status Distribution</span>
                  </CardTitle>
                  <CardDescription>Current order status breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={statusChartData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                      >
                        {statusChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="sales" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Sales Performance</CardTitle>
                <CardDescription>Detailed sales metrics and trends</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <RechartsBarChart data={monthlySalesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Bar yAxisId="left" dataKey="revenue" fill="#8884d8" name="Revenue (RM)" />
                    <Bar yAxisId="right" dataKey="orders" fill="#82ca9d" name="Orders" />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Package className="h-5 w-5" />
                  <span>Product Performance</span>
                </CardTitle>
                <CardDescription>Top performing products by revenue and profit</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Units Sold</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Profit</TableHead>
                      <TableHead>Margin</TableHead>
                      <TableHead>Performance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productPerformance.slice(0, 10).map((item: any) => (
                      <TableRow key={item.product.id}>
                        <TableCell className="font-medium">{item.product.name}</TableCell>
                        <TableCell>{item.units}</TableCell>
                        <TableCell>{formatCurrency(item.revenue)}</TableCell>
                        <TableCell className={item.profit >= 0 ? "text-green-600" : "text-red-600"}>
                          {formatCurrency(item.profit)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={item.margin > 20 ? "default" : item.margin > 10 ? "secondary" : "destructive"}>
                            {item.margin.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Progress 
                            value={Math.min((item.revenue / Math.max(...productPerformance.map((p: any) => p.revenue))) * 100, 100)} 
                            className="w-20" 
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="customers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Top Customers</span>
                </CardTitle>
                <CardDescription>Customers ranked by total revenue</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Total Orders</TableHead>
                      <TableHead>Total Revenue</TableHead>
                      <TableHead>Avg Order Value</TableHead>
                      <TableHead>Performance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topCustomers.map((customer: any, index: number) => (
                      <TableRow key={customer.customer.id}>
                        <TableCell>
                          <div className="flex items-center">
                            {index < 3 && <Award className="h-4 w-4 text-yellow-500 mr-1" />}
                            #{index + 1}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          <div>
                            <p>{customer.customer.name}</p>
                            <p className="text-sm text-gray-500">{customer.customer.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>{customer.orders}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(customer.revenue)}</TableCell>
                        <TableCell>{formatCurrency(customer.revenue / customer.orders)}</TableCell>
                        <TableCell>
                          <Progress 
                            value={Math.min((customer.revenue / Math.max(...topCustomers.map((c: any) => c.revenue))) * 100, 100)} 
                            className="w-20" 
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

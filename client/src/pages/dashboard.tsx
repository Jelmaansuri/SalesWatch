import { useQuery } from "@tanstack/react-query";
import MainLayout from "@/components/layout/main-layout";
import MetricsCards from "@/components/dashboard/metrics-cards";
import RevenueChart from "@/components/dashboard/revenue-chart";
import ProfitChart from "@/components/dashboard/profit-chart";
import RecentSales from "@/components/dashboard/recent-sales";
import QuickActions from "@/components/dashboard/quick-actions";
import ProductPerformance from "@/components/dashboard/product-performance";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardMetrics, SaleWithDetails } from "@shared/schema";

export default function Dashboard() {
  const { data: metrics, isLoading: metricsLoading, refetch: refetchMetrics } = useQuery<DashboardMetrics>({
    queryKey: ["/api/analytics/dashboard"],
  });

  const { data: revenueData = [], isLoading: revenueLoading } = useQuery({
    queryKey: ["/api/analytics/revenue-by-month"],
  });

  const { data: topProducts = [], isLoading: topProductsLoading } = useQuery({
    queryKey: ["/api/analytics/top-products"],
  });

  const { data: sales = [], isLoading: salesLoading, refetch: refetchSales } = useQuery<SaleWithDetails[]>({
    queryKey: ["/api/sales"],
  });

  const handleDataRefresh = () => {
    refetchMetrics();
    refetchSales();
  };

  if (metricsLoading) {
    return (
      <MainLayout title="Dashboard Overview">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </MainLayout>
    );
  }

  if (!metrics) {
    return (
      <MainLayout title="Dashboard Overview">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500 dark:text-gray-400">Unable to load dashboard data</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Dashboard Overview">
      {/* Metrics Cards */}
      <MetricsCards metrics={metrics} />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {revenueLoading ? (
          <Skeleton className="h-96" />
        ) : (
          <RevenueChart data={revenueData} />
        )}
        
        {topProductsLoading ? (
          <Skeleton className="h-96" />
        ) : (
          <ProfitChart data={topProducts} />
        )}
      </div>

      {/* Recent Sales & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {salesLoading ? (
          <div className="lg:col-span-2">
            <Skeleton className="h-96" />
          </div>
        ) : (
          <RecentSales sales={sales} />
        )}
        
        <QuickActions 
          metrics={metrics} 
          onSaleAdded={handleDataRefresh}
          onProductAdded={handleDataRefresh}
          onCustomerAdded={handleDataRefresh}
        />
      </div>

      {/* Product Performance */}
      {topProductsLoading ? (
        <Skeleton className="h-96" />
      ) : (
        <ProductPerformance data={topProducts} />
      )}
    </MainLayout>
  );
}

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Package, UserPlus, FileText } from "lucide-react";
import AddSaleModal from "@/components/modals/add-sale-modal";
import AddProductModal from "@/components/modals/add-product-modal";
import AddCustomerModal from "@/components/modals/add-customer-modal";
import type { DashboardMetrics } from "@shared/schema";

interface QuickActionsProps {
  metrics: DashboardMetrics;
  onSaleAdded: () => void;
  onProductAdded: () => void;
  onCustomerAdded: () => void;
}

export default function QuickActions({ metrics, onSaleAdded, onProductAdded, onCustomerAdded }: QuickActionsProps) {
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  const handleSaleAdded = () => {
    onSaleAdded();
    setShowSaleModal(false);
  };

  const handleProductAdded = () => {
    onProductAdded();
    setShowProductModal(false);
  };

  const handleCustomerAdded = () => {
    onCustomerAdded();
    setShowCustomerModal(false);
  };

  return (
    <>
      <Card className="bg-white dark:bg-gray-900 border dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button 
            className="w-full bg-my-blue hover:bg-my-blue/90 text-white"
            onClick={() => setShowSaleModal(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add New Sale
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => setShowProductModal(true)}
          >
            <Package className="mr-2 h-4 w-4" />
            Add Product
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => setShowCustomerModal(true)}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Add Customer
          </Button>
          
          <Button variant="outline" className="w-full">
            <FileText className="mr-2 h-4 w-4" />
            Export Report
          </Button>

          {/* Order Status Overview */}
          <div className="mt-6 pt-6 border-t dark:border-gray-700">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Order Status Overview
            </h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Paid</span>
                <span className="text-sm font-medium text-my-green">
                  {metrics.orderStatusCounts.paid}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Pending Shipment</span>
                <span className="text-sm font-medium text-my-orange">
                  {metrics.orderStatusCounts.pending_shipment}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Completed</span>
                <span className="text-sm font-medium text-my-blue">
                  {metrics.orderStatusCounts.completed}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <AddSaleModal 
        open={showSaleModal} 
        onOpenChange={setShowSaleModal}
        onSaleAdded={handleSaleAdded}
      />
      
      <AddProductModal 
        open={showProductModal} 
        onOpenChange={setShowProductModal}
        onProductAdded={handleProductAdded}
      />
      
      <AddCustomerModal 
        open={showCustomerModal} 
        onOpenChange={setShowCustomerModal}
        onCustomerAdded={handleCustomerAdded}
      />
    </>
  );
}

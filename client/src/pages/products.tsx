import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import MainLayout from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AddProductModal from "@/components/modals/add-product-modal";
import { formatCurrency } from "@/lib/currency";
import { Package, ImageIcon, Plus } from "lucide-react";
import type { Product } from "@shared/schema";

export default function Products() {
  const [showAddModal, setShowAddModal] = useState(false);
  
  const { data: products, isLoading, refetch } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const handleProductAdded = () => {
    setShowAddModal(false);
    refetch();
  };

  if (isLoading) {
    return (
      <MainLayout title="Products">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-48 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Products">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Products</h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Manage your product catalog
              </p>
            </div>
            <Button onClick={() => setShowAddModal(true)} className="bg-my-blue hover:bg-my-blue/90">
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </div>
        </div>

        <div className="p-6">
          {!products || products.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No products yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Start by adding your first product to the catalog.
              </p>
              <Button onClick={() => setShowAddModal(true)} className="bg-my-blue hover:bg-my-blue/90">
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <Card key={product.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg font-semibold truncate">
                          {product.name}
                        </CardTitle>
                        <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                          SKU: {product.sku}
                        </p>
                      </div>
                      <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>
                        {product.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    {/* Product Image */}
                    <div className="mb-4">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-32 object-cover rounded-lg border"
                        />
                      ) : (
                        <div className="w-full h-32 bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                          <ImageIcon className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Product Details */}
                    <div className="space-y-2">
                      {product.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                          {product.description}
                        </p>
                      )}
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Cost:</span>
                        <span className="text-sm font-mono">{formatCurrency(parseFloat(product.costPrice))}</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Selling:</span>
                        <span className="text-sm font-mono font-semibold text-my-green">
                          {formatCurrency(parseFloat(product.sellingPrice))}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Stock:</span>
                        <span className={`text-sm font-semibold ${
                          product.stock > 10 ? 'text-my-green' : 
                          product.stock > 0 ? 'text-yellow-600' : 
                          'text-red-600'
                        }`}>
                          {product.stock} units
                        </span>
                      </div>
                      
                      {/* Profit Margin */}
                      <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium">Profit Margin:</span>
                          <span className="text-xs font-semibold text-my-green">
                            {(((parseFloat(product.sellingPrice) - parseFloat(product.costPrice)) / parseFloat(product.sellingPrice)) * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <AddProductModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onProductAdded={handleProductAdded}
      />
    </MainLayout>
  );
}

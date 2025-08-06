import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import MainLayout from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProductSchema } from "@shared/schema";
import AddProductModal from "@/components/modals/add-product-modal";
import { formatCurrency } from "@/lib/currency";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Package, ImageIcon, Plus, Edit, Trash2 } from "lucide-react";
import type { Product } from "@shared/schema";
import { z } from "zod";

type FormData = z.infer<typeof insertProductSchema>;

export default function Products() {
  const { toast } = useToast();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  const { data: products, isLoading, refetch } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const form = useForm<FormData>({
    resolver: zodResolver(insertProductSchema),
    defaultValues: {
      name: "",
      description: "",
      sku: "",
      costPrice: "",
      sellingPrice: "",
      stock: 0,
      status: "active",
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: FormData }) => {
      const response = await apiRequest(`/api/products/${id}`, "PUT", data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
      setIsEditDialogOpen(false);
      setEditingProduct(null);
      form.reset();
      toast({
        title: "Success",
        description: "Product updated successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Session Expired",
          description: "Please sign in again",
          variant: "destructive",
        });
        setTimeout(() => window.location.href = "/api/login", 1000);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update product",
        variant: "destructive",
      });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/products/${id}`, { 
        method: "DELETE",
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${response.status}: ${errorText}`);
      }
      // Don't try to parse JSON for 204 responses
      return response.status === 204 ? null : response.json();
    },
    onSuccess: () => {
      // Force refetch all related data
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
      
      // Also refetch immediately to ensure UI updates
      queryClient.refetchQueries({ queryKey: ["/api/products"] });
      
      toast({
        title: "Success",
        description: "Product deleted successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Session Expired",
          description: "Please sign in again",
          variant: "destructive",
        });
        setTimeout(() => window.location.href = "/api/login", 1000);
        return;
      }
      
      // Extract detailed error message from API response
      let errorMessage = "Failed to delete product";
      if (error instanceof Error) {
        if (error.message?.includes("404:")) {
          errorMessage = "Product not found or already deleted";
        } else if (error.message?.includes("400:")) {
          // Extract the actual error message from the API
          const match = error.message.match(/400: (.+)/);
          errorMessage = match ? match[1] : "Cannot delete product - check for related sales or inventory";
        } else if (error.message?.includes("500:")) {
          errorMessage = "Server error occurred while deleting product";
        } else if (error.message) {
          // Use the full error message if available
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
        duration: 8000,
      });
    },
  });

  const handleProductAdded = () => {
    setShowAddModal(false);
    refetch();
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    form.reset({
      name: product.name,
      description: product.description || "",
      sku: product.sku,
      costPrice: product.costPrice,
      sellingPrice: product.sellingPrice,
      stock: product.stock,
      status: product.status,
    });
    setIsEditDialogOpen(true);
  };

  const handleSubmit = (data: FormData) => {
    if (editingProduct) {
      updateProductMutation.mutate({ id: editingProduct.id, data });
    }
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
                          src={product.imageUrl.startsWith('/objects/') ? product.imageUrl : `/objects/${product.imageUrl}`}
                          alt={product.name}
                          className="w-full h-32 object-cover rounded-lg border"
                          onError={(e) => {
                            // Hide broken images
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
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
                      
                      {/* Action Buttons */}
                      <div className="pt-3 flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(product)}
                          className="flex-1"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="flex-1">
                              <Trash2 className="h-4 w-4 mr-1 text-red-600" />
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Product</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{product.name}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteProductMutation.mutate(product.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Product Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Product Name *</Label>
                <Input
                  id="edit-name"
                  {...form.register("name")}
                  placeholder="Product name"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-sku">SKU *</Label>
                <Input
                  id="edit-sku"
                  {...form.register("sku")}
                  placeholder="SKU123"
                />
                {form.formState.errors.sku && (
                  <p className="text-sm text-red-600">{form.formState.errors.sku.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                {...form.register("description")}
                placeholder="Product description..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-costPrice">Cost Price (RM) *</Label>
                <Input
                  id="edit-costPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  {...form.register("costPrice")}
                  placeholder="0.00"
                />
                {form.formState.errors.costPrice && (
                  <p className="text-sm text-red-600">{form.formState.errors.costPrice.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-sellingPrice">Selling Price (RM) *</Label>
                <Input
                  id="edit-sellingPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  {...form.register("sellingPrice")}
                  placeholder="0.00"
                />
                {form.formState.errors.sellingPrice && (
                  <p className="text-sm text-red-600">{form.formState.errors.sellingPrice.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-stock">Stock *</Label>
                <Input
                  id="edit-stock"
                  type="number"
                  min="0"
                  {...form.register("stock", { valueAsNumber: true })}
                  placeholder="0"
                />
                {form.formState.errors.stock && (
                  <p className="text-sm text-red-600">{form.formState.errors.stock.message}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateProductMutation.isPending}>
                {updateProductMutation.isPending ? "Updating..." : "Update Product"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AddProductModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onProductAdded={handleProductAdded}
      />
    </MainLayout>
  );
}

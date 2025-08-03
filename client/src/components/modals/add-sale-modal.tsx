import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSaleSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, calculateProfit } from "@/lib/currency";
import { ORDER_STATUS_LABELS } from "@/lib/types";
import type { Customer, Product } from "@shared/schema";
import { z } from "zod";
import QuickAddCustomerModal from "./quick-add-customer-modal";
import QuickAddProductModal from "./quick-add-product-modal";
import { Plus } from "lucide-react";

const formSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  productId: z.string().min(1, "Product is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  unitPrice: z.string().min(1, "Unit price is required"),
  status: z.string().min(1, "Status is required"),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface AddSaleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaleAdded: () => void;
}

export default function AddSaleModal({ open, onOpenChange, onSaleAdded }: AddSaleModalProps) {
  const { toast } = useToast();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showQuickAddCustomer, setShowQuickAddCustomer] = useState(false);
  const [showQuickAddProduct, setShowQuickAddProduct] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      customerId: "",
      productId: "",
      quantity: 1,
      unitPrice: "",
      status: "paid",
      notes: "",
    },
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    enabled: open,
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    enabled: open,
  });

  const createSaleMutation = useMutation({
    mutationFn: async (data: FormData) => {
      console.log("Creating sale with data:", data);
      
      // Calculate the values needed for the sale
      const unitPrice = parseFloat(data.unitPrice);
      const quantity = data.quantity;
      const totalAmount = unitPrice * quantity;
      
      // Calculate profit if we have the product selected
      let profit = 0;
      if (selectedProduct) {
        profit = calculateProfit(unitPrice, parseFloat(selectedProduct.costPrice), quantity);
      }
      
      // Prepare the sale data for the API
      const saleData = {
        customerId: data.customerId,
        productId: data.productId,
        quantity: quantity,
        unitPrice: data.unitPrice,
        totalAmount: totalAmount.toFixed(2),
        profit: profit.toFixed(2),
        status: data.status,
        notes: data.notes || "",
      };
      
      console.log("Sending sale data to API:", saleData);
      const response = await apiRequest("POST", "/api/sales", saleData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
      toast({
        title: "Success",
        description: "Sale has been created successfully.",
      });
      onSaleAdded();
      onOpenChange(false);
      form.reset();
      setSelectedProduct(null);
    },
    onError: (error: any) => {
      console.error("Sale creation error:", error);
      if (error.message?.includes("Unauthorized") || error.message?.includes("401")) {
        toast({
          title: "Session Expired",
          description: "Please sign in again to continue.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 1000);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to create sale.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    console.log("=== FORM SUBMITTED ===");
    console.log("Form data received:", data);
    console.log("Form errors:", form.formState.errors);
    console.log("Form is valid:", form.formState.isValid);
    
    // Validate required fields
    if (!data.customerId) {
      console.log("Missing customer ID");
      toast({
        title: "Missing Customer",
        description: "Please select a customer.",
        variant: "destructive",
      });
      return;
    }
    
    if (!data.productId) {
      console.log("Missing product ID");
      toast({
        title: "Missing Product", 
        description: "Please select a product.",
        variant: "destructive",
      });
      return;
    }
    
    if (!data.unitPrice || parseFloat(data.unitPrice) <= 0) {
      console.log("Invalid unit price:", data.unitPrice);
      toast({
        title: "Invalid Price",
        description: "Please enter a valid unit price.",
        variant: "destructive",
      });
      return;
    }

    // Validate stock availability
    if (selectedProduct && data.quantity > selectedProduct.stock) {
      console.log("Insufficient stock:", data.quantity, "requested,", selectedProduct.stock, "available");
      toast({
        title: "Insufficient Stock",
        description: `Only ${selectedProduct.stock} units available. Please reduce quantity.`,
        variant: "destructive",
      });
      return;
    }
    
    console.log("All validation passed, creating sale...");
    createSaleMutation.mutate(data);
  };

  const handleProductChange = (productId: string) => {
    const product = products.find((p: Product) => p.id === productId);
    setSelectedProduct(product || null);
    if (product) {
      form.setValue("unitPrice", product.sellingPrice);
    }
  };

  const watchedQuantity = form.watch("quantity");
  const watchedUnitPrice = form.watch("unitPrice");

  const totalAmount = watchedQuantity && watchedUnitPrice 
    ? parseFloat(watchedUnitPrice) * watchedQuantity 
    : 0;

  const profit = selectedProduct && watchedQuantity && watchedUnitPrice
    ? calculateProfit(parseFloat(watchedUnitPrice), parseFloat(selectedProduct.costPrice), watchedQuantity)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Sale</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="customerId">Customer</Label>
            <Select 
              value={form.watch("customerId") || ""} 
              onValueChange={(value) => {
                console.log("Customer selected:", value);
                if (value === "add-new-customer") {
                  setShowQuickAddCustomer(true);
                } else {
                  form.setValue("customerId", value, { shouldValidate: true });
                }
              }}
              key={`customer-${form.watch("customerId")}-${customers.length}`}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select customer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="add-new-customer" className="text-blue-600 font-medium border-b">
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add New Customer
                  </div>
                </SelectItem>
                {customers.map((customer: Customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name} - {customer.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.customerId && (
              <p className="text-sm text-red-600">{form.formState.errors.customerId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="productId">Product</Label>
            <Select 
              value={form.watch("productId") || ""} 
              onValueChange={(value) => {
                console.log("Product selected:", value);
                if (value === "add-new-product") {
                  setShowQuickAddProduct(true);
                } else {
                  form.setValue("productId", value, { shouldValidate: true });
                  handleProductChange(value);
                }
              }}
              key={`product-${form.watch("productId")}-${products.length}`}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="add-new-product" className="text-blue-600 font-medium border-b">
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add New Product
                  </div>
                </SelectItem>
                {products.map((product: Product) => (
                  <SelectItem key={product.id} value={product.id} disabled={product.stock === 0}>
                    <div className="flex justify-between items-center w-full">
                      <span>{product.name} - {formatCurrency(product.sellingPrice)}</span>
                      <span className={`text-xs ml-2 ${
                        product.stock > 10 ? 'text-green-600' : 
                        product.stock > 0 ? 'text-yellow-600' : 
                        'text-red-600'
                      }`}>
                        Stock: {product.stock}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.productId && (
              <p className="text-sm text-red-600">{form.formState.errors.productId.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                max={selectedProduct?.stock || undefined}
                {...form.register("quantity", { 
                  valueAsNumber: true,
                  min: { value: 1, message: "Quantity must be at least 1" },
                  max: selectedProduct ? { value: selectedProduct.stock, message: `Maximum ${selectedProduct.stock} units available` } : undefined
                })}
              />
              {selectedProduct && (
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Available stock: {selectedProduct.stock} units
                </p>
              )}
              {form.formState.errors.quantity && (
                <p className="text-sm text-red-600">{form.formState.errors.quantity.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="unitPrice">Unit Price (RM)</Label>
              <Input
                id="unitPrice"
                type="number"
                step="0.01"
                min="0"
                {...form.register("unitPrice")}
              />
              {form.formState.errors.unitPrice && (
                <p className="text-sm text-red-600">{form.formState.errors.unitPrice.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select 
              value={form.watch("status")} 
              onValueChange={(value) => form.setValue("status", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes about this sale..."
              {...form.register("notes")}
            />
          </div>

          {/* Summary */}
          {totalAmount > 0 && (
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Total Amount:</span>
                <span className="text-sm font-bold">{formatCurrency(totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Expected Profit:</span>
                <span className="text-sm font-bold text-green-600">{formatCurrency(profit)}</span>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4 border-t mt-6 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={(e) => {
                e.preventDefault();
                console.log("Cancel button clicked");
                onOpenChange(false);
              }}
              disabled={createSaleMutation.isPending}
              className="min-w-[100px]"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={createSaleMutation.isPending}
              onClick={async (e) => {
                e.preventDefault();
                console.log("Create Sale button clicked - triggering form submit");
                
                // Get current form values
                const currentValues = form.getValues();
                console.log("Current form values:", currentValues);
                
                // Trigger form validation and submission
                const isValid = await form.trigger();
                console.log("Form validation result:", isValid);
                console.log("Form errors after trigger:", form.formState.errors);
                
                if (isValid) {
                  form.handleSubmit(onSubmit)();
                } else {
                  console.log("Form validation failed");
                  toast({
                    title: "Form Validation Failed",
                    description: "Please check all required fields.",
                    variant: "destructive",
                  });
                }
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px] relative z-10"
            >
              {createSaleMutation.isPending ? "Creating..." : "Create Sale"}
            </Button>
          </div>
        </form>
      </DialogContent>
      
      {/* Quick Add Modals */}
      <QuickAddCustomerModal
        open={showQuickAddCustomer}
        onOpenChange={(open) => {
          setShowQuickAddCustomer(open);
          // Reset selection if modal is closed without adding
          if (!open && !form.watch("customerId")) {
            form.setValue("customerId", "");
          }
        }}
        onCustomerAdded={(customerId) => {
          console.log("New customer added with ID:", customerId);
          // Use setTimeout to ensure the customer list is updated first
          setTimeout(() => {
            form.setValue("customerId", customerId, { shouldValidate: true });
            form.trigger("customerId");
            console.log("Customer form value set to:", customerId);
            console.log("Current form value:", form.getValues("customerId"));
          }, 100);
          setShowQuickAddCustomer(false);
          toast({
            title: "Customer Added",
            description: "New customer has been selected automatically.",
          });
        }}
      />
      
      <QuickAddProductModal
        open={showQuickAddProduct}
        onOpenChange={(open) => {
          setShowQuickAddProduct(open);
          // Reset selection if modal is closed without adding
          if (!open && !form.watch("productId")) {
            form.setValue("productId", "");
          }
        }}
        onProductAdded={(productId) => {
          console.log("New product added with ID:", productId);
          // Use setTimeout to ensure the product list is updated first
          setTimeout(() => {
            form.setValue("productId", productId, { shouldValidate: true });
            form.trigger("productId");
            
            // Find the newly added product and set its price
            const newProduct = products.find((p: Product) => p.id === productId);
            if (newProduct) {
              console.log("Setting unit price for new product:", newProduct.sellingPrice);
              form.setValue("unitPrice", newProduct.sellingPrice);
              setSelectedProduct(newProduct);
            } else {
              // If product not found in current list, try to refetch and set price
              setTimeout(() => {
                const updatedProduct = products.find((p: Product) => p.id === productId);
                if (updatedProduct) {
                  console.log("Setting unit price for updated product:", updatedProduct.sellingPrice);
                  form.setValue("unitPrice", updatedProduct.sellingPrice);
                  setSelectedProduct(updatedProduct);
                }
              }, 200);
            }
            
            console.log("Product form value set to:", productId);
            console.log("Current form value:", form.getValues("productId"));
          }, 100);
          setShowQuickAddProduct(false);
          toast({
            title: "Product Added",
            description: "New product has been selected automatically.",
          });
        }}
      />
    </Dialog>
  );
}

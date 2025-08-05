import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSaleSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, calculateProfit } from "@/lib/currency";
import { ORDER_STATUS_LABELS, PLATFORM_SOURCE_LABELS } from "@/lib/types";
import type { Customer, Product } from "@shared/schema";
import { z } from "zod";
import QuickAddCustomerModal from "./quick-add-customer-modal";
import QuickAddProductModal from "./quick-add-product-modal";
import { Plus, CalendarIcon, Trash2, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

// Product item schema for multi-product support
const productItemSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  unitPrice: z.string().min(1, "Unit price is required"),
  discountAmount: z.string().optional().default("0.00"),
});

const formSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  status: z.string().min(1, "Status is required"),
  saleDate: z.date(),
  platformSource: z.string().min(1, "Platform source is required"),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;
type ProductItem = z.infer<typeof productItemSchema>;

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
  const [productItems, setProductItems] = useState<ProductItem[]>([{
    productId: "",
    quantity: 1,
    unitPrice: "",
    discountAmount: "0.00"
  }]);


  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      customerId: "",
      status: "unpaid",
      saleDate: new Date(),
      platformSource: "others",
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
      
      // Create sales with a shared group identifier for current sales
      const results = [];
      const groupId = `GROUP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      for (const item of productItems) {
        if (!item.productId || !item.unitPrice) continue;
        
        // Find the product for profit calculation
        const product = products.find(p => p.id === item.productId);
        
        const unitPrice = parseFloat(item.unitPrice);
        const discountAmount = parseFloat(item.discountAmount || "0.00");
        const quantity = item.quantity;
        const discountedUnitPrice = unitPrice - discountAmount;
        const totalAmount = discountedUnitPrice * quantity;
        
        // Calculate profit
        let profit = 0;
        if (product) {
          profit = calculateProfit(discountedUnitPrice, parseFloat(product.costPrice), quantity);
        }
        
        const saleData = {
          customerId: data.customerId,
          productId: item.productId,
          quantity: quantity,
          unitPrice: item.unitPrice,
          discountAmount: discountAmount.toFixed(2),
          totalAmount: totalAmount.toFixed(2),
          profit: profit.toFixed(2),
          status: data.status,
          saleDate: data.saleDate.toISOString(),
          platformSource: data.platformSource,
          notes: `${data.notes || ""}[GROUP:${groupId}]`, // Add group identifier to link multi-product sales
        };
        
        console.log("Sending sale data to API:", saleData);
        const response = await apiRequest("/api/sales", "POST", saleData);
        results.push(response);
      }
      return results;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
      
      const saleCount = Array.isArray(result) ? result.length : 1;
      toast({
        title: "Success",
        description: `${saleCount} sale${saleCount > 1 ? 's' : ''} created successfully.`,
      });
      onSaleAdded();
      onOpenChange(false);
      form.reset();
      setSelectedProduct(null);
      setProductItems([{
        productId: "",
        quantity: 1,
        unitPrice: "",
        discountAmount: "0.00"
      }]);
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

  // Helper functions for multi-product management
  const addProductItem = () => {
    setProductItems([...productItems, {
      productId: "",
      quantity: 1,
      unitPrice: "",
      discountAmount: "0.00"
    }]);
  };

  const removeProductItem = (index: number) => {
    if (productItems.length > 1) {
      setProductItems(productItems.filter((_, i) => i !== index));
    }
  };

  const updateProductItem = (index: number, field: keyof ProductItem, value: any) => {
    console.log(`Updating product item ${index}, field: ${field}, value:`, value);
    const updated = [...productItems];
    updated[index] = { ...updated[index], [field]: value };
    console.log("Updated productItems:", updated);
    setProductItems(updated);
  };

  const onSubmit = (data: FormData) => {
    console.log("=== FORM SUBMITTED ===");
    console.log("Form data received:", data);
    console.log("Form errors:", form.formState.errors);
    console.log("Form is valid:", form.formState.isValid);
    console.log("Multi-product mode: enabled");
    console.log("Product items:", productItems);
    
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
    
    // Always validate using the product items (multi-product mode)
    const validItems = productItems.filter(item => 
      item.productId && item.unitPrice && parseFloat(item.unitPrice) > 0
    );
    
    if (validItems.length === 0) {
      toast({
        title: "Missing Products",
        description: "Please add at least one valid product.",
        variant: "destructive",
      });
      return;
    }
    
    // Check stock for all items
    for (const item of validItems) {
      const product = products.find(p => p.id === item.productId);
      if (product && item.quantity > product.stock) {
        toast({
          title: "Insufficient Stock",
          description: `Only ${product.stock} units of ${product.name} available.`,
          variant: "destructive",
        });
        return;
      }
    }
    
    console.log("All validation passed, creating sale...");
    createSaleMutation.mutate(data);
  };

  const handleProductChange = (productId: string) => {
    console.log("handleProductChange called with productId:", productId);
    const product = products.find((p: Product) => p.id === productId);
    console.log("Found product:", product);
    setSelectedProduct(product || null);
  };

  // Calculate totals from product items
  const totalAmount = productItems.reduce((total, item) => {
    if (!item.productId || !item.unitPrice) return total;
    const unitPrice = parseFloat(item.unitPrice);
    const discountAmount = parseFloat(item.discountAmount || "0.00");
    const discountedUnitPrice = unitPrice - discountAmount;
    return total + (discountedUnitPrice * item.quantity);
  }, 0);

  const profit = productItems.reduce((total, item) => {
    if (!item.productId || !item.unitPrice) return total;
    const product = products.find(p => p.id === item.productId);
    if (!product) return total;
    
    const unitPrice = parseFloat(item.unitPrice);
    const discountAmount = parseFloat(item.discountAmount || "0.00");
    const discountedUnitPrice = unitPrice - discountAmount;
    const costPrice = parseFloat(product.costPrice);
    
    return total + calculateProfit(discountedUnitPrice, costPrice, item.quantity);
  }, 0);

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

          {/* Product Items Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-base font-medium">Sale Items</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addProductItem}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Item
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {productItems.map((item, index) => (
                <Card key={`product-item-${index}-${item.productId}`} className="border border-gray-200 dark:border-gray-700">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="text-sm font-medium">Item {index + 1}</h4>
                      {productItems.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeProductItem(index)}
                          className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      {/* Product Selection */}
                      <div className="space-y-2">
                        <Label className="text-xs font-medium">Product *</Label>
                        <Select
                          value={item.productId || undefined}
                          onValueChange={(value) => {
                            console.log("Product selected for item", index, ":", value);
                            if (value === "add-new-product") {
                              setShowQuickAddProduct(true);
                            } else {
                              // Find the product and update both productId and unitPrice in one state update
                              const product = products.find(p => p.id === value);
                              const updated = [...productItems];
                              updated[index] = { 
                                ...updated[index], 
                                productId: value,
                                unitPrice: product ? product.sellingPrice : updated[index].unitPrice
                              };
                              console.log("Updated item with both productId and unitPrice:", updated[index]);
                              setProductItems(updated);
                            }
                          }}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select product">
                              {item.productId && products.find(p => p.id === item.productId)?.name}
                            </SelectValue>
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
                                {product.name} - {formatCurrency(product.sellingPrice)} (Stock: {product.stock})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Quantity */}
                      <div className="space-y-2">
                        <Label className="text-xs font-medium">Quantity *</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateProductItem(index, "quantity", parseInt(e.target.value) || 1)}
                          className="h-9"
                          placeholder="1"
                        />
                      </div>

                      {/* Unit Price */}
                      <div className="space-y-2">
                        <Label className="text-xs font-medium">Unit Price (RM) *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unitPrice}
                          onChange={(e) => updateProductItem(index, "unitPrice", e.target.value)}
                          className="h-9"
                          placeholder="0.00"
                        />
                      </div>

                      {/* Discount */}
                      <div className="space-y-2">
                        <Label className="text-xs font-medium">Discount (RM)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.discountAmount}
                          onChange={(e) => updateProductItem(index, "discountAmount", e.target.value)}
                          className="h-9"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    {/* Line Total */}
                    {item.productId && item.unitPrice && (
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex justify-end">
                          <span className="text-sm font-medium">
                            Line Total: {formatCurrency(
                              ((parseFloat(item.unitPrice) || 0) - (parseFloat(item.discountAmount) || 0)) * (item.quantity || 1)
                            )}
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              {/* Subtotal Section */}
              {productItems.some(item => item.productId && item.unitPrice) && (
                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span className="font-medium">
                        {formatCurrency(
                          productItems.reduce((total, item) => {
                            if (!item.productId || !item.unitPrice) return total;
                            const unitPrice = parseFloat(item.unitPrice) || 0;
                            const discount = parseFloat(item.discountAmount) || 0;
                            const quantity = item.quantity || 1;
                            return total + ((unitPrice - discount) * quantity);
                          }, 0)
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Tax:</span>
                      <span>RM 0.00</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total:</span>
                      <span>
                        {formatCurrency(
                          productItems.reduce((total, item) => {
                            if (!item.productId || !item.unitPrice) return total;
                            const unitPrice = parseFloat(item.unitPrice) || 0;
                            const discount = parseFloat(item.discountAmount) || 0;
                            const quantity = item.quantity || 1;
                            return total + ((unitPrice - discount) * quantity);
                          }, 0)
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
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
              <Label htmlFor="saleDate">Sale Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.watch("saleDate") ? (
                      format(form.watch("saleDate"), "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={form.watch("saleDate")}
                    onSelect={(date) => date && form.setValue("saleDate", date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="platformSource">Platform Source</Label>
            <Select 
              value={form.watch("platformSource")} 
              onValueChange={(value) => form.setValue("platformSource", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PLATFORM_SOURCE_LABELS).map(([value, label]) => (
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
        }}
        onProductAdded={(productId, productData) => {
          console.log("New product added with ID:", productId, "and data:", productData);
          setShowQuickAddProduct(false);
          
          // Add to first product item if empty
          if (productItems.length > 0 && !productItems[0].productId) {
            updateProductItem(0, "productId", productId);
            updateProductItem(0, "unitPrice", productData.sellingPrice);
          }
          
          // Also invalidate queries to refresh the products list
          queryClient.invalidateQueries({ queryKey: ['/api/products'] });
          
          toast({
            title: "Product Added",
            description: "New product has been selected automatically.",
          });
        }}
      />
    </Dialog>
  );
}

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import MainLayout from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { insertSaleSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { formatCurrency } from "@/lib/currency";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, PLATFORM_SOURCE_LABELS } from "@/lib/types";
import { Plus, Edit, Trash2, ShoppingCart, User, Package, FileText, CalendarIcon, X } from "lucide-react";
import AddSaleModal from "@/components/modals/add-sale-modal";
import type { SaleWithDetails, Customer, Product } from "@shared/schema";
import { z } from "zod";

const formSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  status: z.string().min(1, "Status is required"),
  platformSource: z.string().min(1, "Platform source is required"),
  saleDate: z.date().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function Sales() {
  const { toast } = useToast();
  const [editingSale, setEditingSale] = useState<SaleWithDetails | null>(null);
  const [editProductItems, setEditProductItems] = useState<{
    productId: string;
    quantity: number;
    unitPrice: string;
    discountAmount: string;
  }[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);
  const [previewInvoiceNumber, setPreviewInvoiceNumber] = useState<string>("");
  const [pendingSale, setPendingSale] = useState<SaleWithDetails | null>(null);

  const { data: salesData = [], isLoading, error } = useQuery<SaleWithDetails[]>({
    queryKey: ["/api/sales"],
  });

  // Fetch invoices to check invoice status for each sale
  const { data: invoicesData = [] } = useQuery({
    queryKey: ["/api/invoices"],
  });

  // Helper function to get invoice status for a sale
  const getInvoiceStatus = (saleId: string) => {
    // Try both camelCase and snake_case field names for compatibility
    const invoice = invoicesData.find((inv: any) => inv.saleId === saleId || inv.sale_id === saleId);
    
    // Debug logging to understand the data structure
    console.log(`Looking for invoice for sale ${saleId}`);
    console.log('Available invoices:', invoicesData.map((inv: any) => ({ 
      id: inv.id, 
      invoiceNumber: inv.invoiceNumber, 
      saleId: inv.saleId, 
      sale_id: inv.sale_id,
      status: inv.status 
    })));
    console.log('Found invoice:', invoice);
    
    if (!invoice) {
      return { status: "Not Generated", badge: "secondary", color: "text-gray-600" };
    }
    
    switch (invoice.status) {
      case "draft":
        return { status: "Draft", badge: "outline", color: "text-blue-600" };
      case "sent":
        return { status: "Sent", badge: "default", color: "text-green-600" };
      case "paid":
        return { status: "Paid", badge: "default", color: "text-green-700" };
      case "overdue":
        return { status: "Overdue", badge: "destructive", color: "text-red-600" };
      case "cancelled":
        return { status: "Cancelled", badge: "secondary", color: "text-gray-500" };
      default:
        return { status: "Generated", badge: "default", color: "text-blue-600" };
    }
  };

  // Group sales by customer and date (same notes with GROUP: identifier)
  const groupedSales = useMemo(() => {
    const groups: { [key: string]: SaleWithDetails[] } = {};
    
    salesData.forEach(sale => {
      // Extract group ID from notes if it exists
      const groupMatch = sale.notes?.match(/\[GROUP:([^\]]+)\]/);
      const groupKey = groupMatch 
        ? groupMatch[1] 
        : `${sale.customerId}_${new Date(sale.createdAt).toDateString()}_${sale.id}`;
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(sale);
    });

    return Object.values(groups).map(group => ({
      groupKey: group[0].notes?.match(/\[GROUP:([^\]]+)\]/)?.[1] || 'ungrouped',
      customer: group[0].customer,
      items: group,
      totalAmount: group.reduce((sum, sale) => sum + parseFloat(sale.totalAmount), 0),
      totalProfit: group.reduce((sum, sale) => sum + parseFloat(sale.profit), 0),
      status: group[0].status,
      platformSource: group[0].platformSource,
      saleDate: group[0].saleDate,
      createdAt: group[0].createdAt,
      id: group[0].id // Use first sale's ID for operations
    }));
  }, [salesData]);

  // For backward compatibility, still use 'sales' for non-grouped operations
  const sales = salesData;

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    enabled: isEditDialogOpen,
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    enabled: isEditDialogOpen,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerId: "",
      status: "paid",
      platformSource: "others",
      notes: "",
      saleDate: undefined,
    },
  });

  const updateSaleStatusMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: FormData }) => {
      // Use status-only endpoint to preserve invoices
      console.log("Calling status-only endpoint:", `/api/sales/${id}/status`);
      const result = await apiRequest(`/api/sales/${id}/status`, "PUT", data);
      console.log("Status update successful:", result);
      return result;
    },
    onSuccess: (data) => {
      console.log("Status update mutation onSuccess called:", data);
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      setIsEditDialogOpen(false);
      setEditingSale(null);
      setEditProductItems([]);
      form.reset();
      
      toast({
        title: "Sale Status Updated",
        description: "Sale status updated successfully. All linked invoices have been preserved.",
        duration: 4000,
      });
    },
    onError: (error) => {
      console.error("Status update mutation onError called:", error);
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
        description: `Failed to update sale status: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const updateMultiProductSaleMutation = useMutation({
    mutationFn: async ({ id, data }: { 
      id: string; 
      data: {
        customerId: string;
        status: string;
        platformSource: string;
        notes?: string;
        saleDate?: Date;
        products: Array<{
          productId: string;
          quantity: number;
          unitPrice: string;
          discountAmount: string;
        }>;
      };
    }) => {
      // Use the multi-product update endpoint
      return await apiRequest(`/api/sales/${id}/multi-product`, "PUT", data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      setIsEditDialogOpen(false);
      setEditingSale(null);
      setEditProductItems([]);
      form.reset();
      
      const deletedInvoicesCount = data?.deletedInvoicesCount || 0;
      const deletedInvoiceNumbers = data?.deletedInvoiceNumbers || [];
      const stockWarnings = data?.stockWarnings;
      
      if (stockWarnings && stockWarnings.length > 0) {
        const warningMessage = stockWarnings.map((w: any) => w.message).join("; ");
        toast({
          title: "Sale Updated with Stock Warnings",
          description: warningMessage,
          variant: "destructive",
          duration: 8000,
        });
      } else if (deletedInvoicesCount > 0) {
        const invoiceNumbersText = deletedInvoiceNumbers.length > 0 
          ? deletedInvoiceNumbers.join(", ") 
          : "N/A";
        toast({
          title: "Sale Updated Successfully", 
          description: `Invoice(s) ${invoiceNumbersText} were automatically deleted. Please generate a new invoice to reflect the updated data.`,
          duration: 6000,
        });
      } else {
        toast({
          title: "Success",
          description: "Multi-product sale updated successfully",
        });
      }
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
      console.error("Multi-product update error:", error);
      
      // Extract detailed error message from API response
      let errorMessage = "Failed to update multi-product sale";
      if (error instanceof Error) {
        if (error.message?.includes("Insufficient stock")) {
          errorMessage = error.message;
        } else if (error.message?.includes("400:")) {
          // Extract the actual error message from the API
          const match = error.message.match(/400: (.+)/);
          errorMessage = match ? match[1] : "Bad request - check your input data";
        } else if (error.message?.includes("404:")) {
          errorMessage = "Sale not found";
        } else if (error.message?.includes("500:")) {
          errorMessage = "Server error occurred while updating sale";
        } else if (error.message) {
          // Use the full error message if available
          errorMessage = error.message;
        }
      }
      
      toast({
        title: error.message?.includes("Insufficient stock") ? "Insufficient Stock" : "Error",
        description: errorMessage,
        variant: "destructive",
        duration: 8000, // Longer duration for error messages
      });
    },
  });

  const deleteSaleMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/sales/${id}`, { 
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
    onSuccess: (data, variables, context: any) => {
      // Force refetch all related data
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
      
      // Also refetch immediately to ensure UI updates
      queryClient.refetchQueries({ queryKey: ["/api/sales"] });
      
      // Only show individual success toast if not part of group deletion
      if (!context?.skipToast) {
        toast({
          title: "Success",
          description: "Sale deleted successfully",
        });
      }
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
      
      // Extract error message from API response
      let errorMessage = "Failed to delete sale";
      if (error instanceof Error) {
        // Try to parse the error message for API errors
        if (error.message.includes("404:")) {
          errorMessage = "Sale not found or already deleted";
        } else if (error.message.includes("400:")) {
          // Extract the actual error message from the API
          const match = error.message.match(/400: (.+)/);
          errorMessage = match ? match[1] : "Cannot delete sale - check for related records";
        } else if (error.message.includes("500:")) {
          errorMessage = "Server error occurred while deleting sale";
        } else {
          // Use the full error message if available
          errorMessage = error.message || errorMessage;
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Preview invoice number mutation
  const previewInvoiceNumberMutation = useMutation({
    mutationFn: () => apiRequest("/api/invoices/preview-number", "POST", {}),
    onSuccess: (data) => {
      // Show confirmation dialog with intended invoice number
      setPreviewInvoiceNumber(data.invoiceNumber);
      setShowInvoicePreview(true);
    },
    onError: (error) => {
      console.error("Error previewing invoice number:", error);
      toast({
        title: "Error", 
        description: "Failed to preview invoice number",
        variant: "destructive",
      });
    },
  });

  // Generate invoice from sale mutation
  const generateInvoiceMutation = useMutation({
    mutationFn: (sale: SaleWithDetails) => apiRequest("/api/invoices/generate-from-sale", "POST", {
      saleId: sale.id,
    }),
    onSuccess: (data) => {
      console.log("Invoice generation response:", data);
      console.log("Invoice number from response:", data?.invoiceNumber);
      console.log("Data keys:", Object.keys(data || {}));
      
      // The response is the full invoice object, so invoiceNumber is a direct property
      const invoiceNumber = data?.invoiceNumber || 'N/A';
      toast({
        title: "Success",
        description: `Invoice ${invoiceNumber} generated successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      setShowInvoicePreview(false);
      setPendingSale(null);
    },
    onError: (error) => {
      console.error("Error generating invoice:", error);
      
      // Extract the specific error message from the backend
      let errorMessage = "Failed to generate invoice";
      if (error instanceof Error && error.message) {
        // Handle specific API error messages
        if (error.message.includes("Invoice already exists")) {
          errorMessage = error.message.replace(/^\d+:\s*/, ""); // Remove status code prefix
        } else {
          errorMessage = error.message.replace(/^\d+:\s*/, ""); // Remove status code prefix for any error
        }
      }
      
      toast({
        title: "Invoice Generation",
        description: errorMessage,
        variant: errorMessage.includes("already exists") ? "default" : "destructive",
        duration: 6000,
      });
      setShowInvoicePreview(false);
    },
  });

  const handleGenerateInvoice = (sale: SaleWithDetails) => {
    setPendingSale(sale);
    previewInvoiceNumberMutation.mutate();
  };

  const confirmGenerateInvoice = () => {
    if (pendingSale) {
      generateInvoiceMutation.mutate(pendingSale);
    }
  };

  const handleEdit = (sale: SaleWithDetails) => {
    setEditingSale(sale);
    
    // Check if this sale is part of a group
    const groupMatch = sale.notes?.match(/\[GROUP:([^\]]+)\]/);
    const groupId = groupMatch ? groupMatch[1] : null;
    
    // If it's part of a group, find all sales in the group
    let groupedSales = [sale];
    if (groupId && sales) {
      groupedSales = sales.filter((s: SaleWithDetails) => 
        s.notes?.includes(`[GROUP:${groupId}]`) && s.customerId === sale.customerId
      );
    }
    
    // Convert grouped sales to product items format
    const productItems = groupedSales.map(s => ({
      productId: s.productId,
      quantity: s.quantity,
      unitPrice: s.unitPrice,
      discountAmount: s.discountAmount || "0.00"
    }));
    
    setEditProductItems(productItems);
    
    // Set form values from the main sale
    form.reset({
      customerId: sale.customerId,
      status: sale.status,
      platformSource: sale.platformSource,
      notes: sale.notes ? sale.notes.replace(/\s*\[GROUP:[^\]]+\]/g, '').trim() : "",
      saleDate: new Date(sale.saleDate),
    });
    setIsEditDialogOpen(true);
  };

  const handleSubmit = async (data: FormData) => {
    console.log("=== EDIT FORM SUBMITTED ===");
    console.log("Form submitted with data:", data);
    console.log("Form validation passed!");
    console.log("Editing sale:", editingSale);
    console.log("Product items:", editProductItems);
    
    if (!editingSale) {
      console.error("No sale being edited!");
      toast({
        title: "Error", 
        description: "No sale selected for editing",
        variant: "destructive",
      });
      return;
    }
    
    // Validate product items and check inventory
    const validItems = editProductItems.filter(item => 
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

    // Check inventory levels for each product 
    // Note: We check against current stock levels as the backend will handle 
    // the proper inventory calculations including stock restoration from original sales
    for (const item of validItems) {
      const product = products.find(p => p.id === item.productId);
      if (!product) {
        toast({
          title: "Product Not Found",
          description: `Product not found in inventory.`,
          variant: "destructive",
        });
        return;
      }
      
      // For new products being added to the sale, check against current stock
      // For existing products, the backend will handle the stock restoration properly
      console.log(`Checking stock for ${product.name}: current=${product.stock}, requested=${item.quantity}`);
      
      // This is a basic check - the backend will do the detailed validation
      // including accounting for the original sale quantities being restored
      if (item.quantity > product.stock + 50) { // Add buffer for editing scenarios
        toast({
          title: "High Quantity Warning",
          description: `Requesting ${item.quantity} units of ${product.name}. Current stock: ${product.stock}. The system will verify availability including restored quantities.`,
          variant: "destructive",
        });
        // Don't return here - let the backend handle the detailed validation
      }
    }
    
    // Check if this is a status-only update (no product changes)
    const originalProductItems = editingSale ? [{
      productId: editingSale.productId,
      quantity: editingSale.quantity,
      unitPrice: editingSale.unitPrice,
      discountAmount: editingSale.discountAmount || "0.00"
    }] : [];
    
    const hasProductChanges = validItems.length !== originalProductItems.length ||
      validItems.some((item, index) => {
        const original = originalProductItems[index];
        return !original || 
          item.productId !== original.productId ||
          item.quantity !== original.quantity ||
          parseFloat(item.unitPrice) !== parseFloat(original.unitPrice) ||
          parseFloat(item.discountAmount) !== parseFloat(original.discountAmount);
      });
    
    if (!hasProductChanges) {
      // Status-only update - preserve invoices
      console.log("Detected status-only update - using preserve invoices endpoint");
      const statusUpdateData = {
        status: data.status,
        platformSource: data.platformSource,
        notes: data.notes,
        saleDate: data.saleDate
      };
      
      updateSaleStatusMutation.mutate({
        id: editingSale.id,
        data: statusUpdateData
      });
    } else {
      // Product changes detected - use multi-product endpoint
      console.log("Detected product changes - using multi-product endpoint");
      const updateData = {
        customerId: data.customerId,
        status: data.status,
        platformSource: data.platformSource,
        notes: data.notes,
        saleDate: data.saleDate,
        products: validItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountAmount: item.discountAmount || "0.00"
        }))
      };
      
      updateMultiProductSaleMutation.mutate({
        id: editingSale.id,
        data: updateData
      });
    }
  };

  if (error && isUnauthorizedError(error)) {
    return (
      <MainLayout title="Sales">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-600 dark:text-gray-300">Redirecting to sign in...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Sales Tracking">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Sales Management  
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Track orders through complete workflow: Unpaid → Paid → Pending Shipment → Shipped → Completed
            </p>
          </div>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Sale
          </Button>
        </div>

        {/* Add Sale Modal */}
        <AddSaleModal
          open={isAddModalOpen}
          onOpenChange={setIsAddModalOpen}
          onSaleAdded={() => {
            queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
            queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
          }}
        />

        {/* Edit Sale Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Sale</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                {/* Customer Selection */}
                <FormField
                  control={form.control}
                  name="customerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select customer" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {customers.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.name} - {customer.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Product Items Section */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <CardTitle className="text-base font-medium">Sale Items</CardTitle>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditProductItems([...editProductItems, {
                          productId: "",
                          quantity: 1,
                          unitPrice: "",
                          discountAmount: "0.00"
                        }]);
                      }}
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Item
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {editProductItems.map((item, index) => (
                      <Card key={`edit-product-item-${index}-${item.productId}`} className="border border-gray-200 dark:border-gray-700">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-4">
                            <h4 className="text-sm font-medium">Item {index + 1}</h4>
                            {editProductItems.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (editProductItems.length > 1) {
                                    setEditProductItems(editProductItems.filter((_, i) => i !== index));
                                  }
                                }}
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
                                  const product = products.find(p => p.id === value);
                                  const updated = [...editProductItems];
                                  updated[index] = { 
                                    ...updated[index], 
                                    productId: value,
                                    unitPrice: product ? product.sellingPrice : updated[index].unitPrice
                                  };
                                  setEditProductItems(updated);
                                }}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="Select..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {products.map((product) => (
                                    <SelectItem key={product.id} value={product.id} disabled={product.stock === 0}>
                                      {product.name} - Stock: {product.stock}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Quantity */}
                            <div className="space-y-2">
                              <Label className="text-xs font-medium">Quantity *</Label>
                              <Input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                className="h-8 text-xs text-right"
                                value={item.quantity.toString()}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  // Only allow numeric input
                                  if (value === '' || /^\d+$/.test(value)) {
                                    const numValue = value === '' ? '' : parseInt(value);
                                    const updated = [...editProductItems];
                                    updated[index] = { 
                                      ...updated[index], 
                                      quantity: numValue === '' ? 1 : Math.max(1, numValue)
                                    };
                                    setEditProductItems(updated);
                                  }
                                }}
                                onFocus={(e) => {
                                  // Select all text when focusing
                                  e.target.select();
                                }}
                                onBlur={(e) => {
                                  const value = e.target.value;
                                  const numValue = parseInt(value) || 1;
                                  const updated = [...editProductItems];
                                  updated[index] = { 
                                    ...updated[index], 
                                    quantity: Math.max(1, numValue)
                                  };
                                  setEditProductItems(updated);
                                }}
                              />
                            </div>

                            {/* Unit Price */}
                            <div className="space-y-2">
                              <Label className="text-xs font-medium">Unit Price (RM) *</Label>
                              <Input
                                type="text"
                                inputMode="decimal"
                                className="h-8 text-xs text-right"
                                placeholder="0.00"
                                value={item.unitPrice}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  // Allow decimal numbers and empty string
                                  if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                    const updated = [...editProductItems];
                                    updated[index] = { 
                                      ...updated[index], 
                                      unitPrice: value
                                    };
                                    setEditProductItems(updated);
                                  }
                                }}
                                onFocus={(e) => {
                                  e.target.select();
                                }}
                              />
                              {/* Stock Information */}
                              {(() => {
                                const product = products.find(p => p.id === item.productId);
                                return product ? (
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Stock: {product.stock} available
                                  </p>
                                ) : null;
                              })()}
                            </div>

                            {/* Discount */}
                            <div className="space-y-2">
                              <Label className="text-xs font-medium">Discount (RM)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                className="h-8 text-xs"
                                placeholder="0.00"
                                value={item.discountAmount}
                                onChange={(e) => {
                                  const updated = [...editProductItems];
                                  updated[index] = { 
                                    ...updated[index], 
                                    discountAmount: e.target.value || "0.00"
                                  };
                                  setEditProductItems(updated);
                                }}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </CardContent>
                </Card>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Order Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="platformSource"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Platform Source</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select platform" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(PLATFORM_SOURCE_LABELS).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="saleDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sale Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={(date) => date && field.onChange(date)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ""}
                          placeholder="Additional notes..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={updateMultiProductSaleMutation.isPending || editProductItems.some(item => !item.productId || !item.unitPrice || parseFloat(item.unitPrice) <= 0)}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={(e) => {
                      console.log("Update Order button clicked!");
                      console.log("Form valid:", form.formState.isValid);
                      console.log("Form errors:", form.formState.errors);
                      console.log("Product items validation:", editProductItems.map(item => ({
                        productId: !!item.productId,
                        unitPrice: !!item.unitPrice && parseFloat(item.unitPrice) > 0,
                        quantity: item.quantity > 0
                      })));
                    }}
                  >
                    {updateMultiProductSaleMutation.isPending ? "Updating..." : "Update Order"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Card>
          <CardHeader>
            <CardTitle>Sales Records</CardTitle>
            <CardDescription>
              {groupedSales.length} sales recorded
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : sales.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600 mb-4" />
                <p className="text-gray-600 dark:text-gray-300 mb-4">No sales recorded yet</p>
                <Button onClick={() => setIsAddModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Record Your First Sale
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[120px]">Customer</TableHead>
                      <TableHead className="min-w-[120px]">Product</TableHead>
                      <TableHead className="min-w-[70px]">Qty</TableHead>
                      <TableHead className="min-w-[80px]">Unit Price</TableHead>
                      <TableHead className="min-w-[80px]">Discount</TableHead>
                      <TableHead className="min-w-[90px]">Price After Discount</TableHead>
                      <TableHead className="min-w-[80px]">Total</TableHead>
                      <TableHead className="min-w-[70px]">Profit</TableHead>
                      <TableHead className="min-w-[80px]">Status</TableHead>
                      <TableHead className="min-w-[80px]">Platform</TableHead>
                      <TableHead className="min-w-[90px]">Date</TableHead>
                      <TableHead className="min-w-[100px]">Invoice Status</TableHead>
                      <TableHead className="min-w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                <TableBody>
                  {groupedSales.map((saleGroup) => (
                    <TableRow key={saleGroup.groupKey}>
                      <TableCell>
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-2 text-gray-400" />
                          {saleGroup.customer.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col space-y-1">
                          {saleGroup.items.map((item, index) => (
                            <div key={index} className="flex items-center">
                              <Package className="h-3 w-3 mr-2 text-gray-400" />
                              <span className="text-sm">{item.product.name}</span>
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col space-y-1">
                          {saleGroup.items.map((item, index) => (
                            <span key={index} className="text-sm">{item.quantity}</span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col space-y-1">
                          {saleGroup.items.map((item, index) => (
                            <span key={index} className="text-sm">{formatCurrency(item.unitPrice)}</span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-orange-600">
                        <div className="flex flex-col space-y-1">
                          {saleGroup.items.map((item, index) => (
                            <span key={index} className="text-sm">{formatCurrency(item.discountAmount)}</span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-blue-600">
                        <div className="flex flex-col space-y-1">
                          {saleGroup.items.map((item, index) => (
                            <span key={index} className="text-sm">
                              {formatCurrency((parseFloat(item.unitPrice) - parseFloat(item.discountAmount)).toString())}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(saleGroup.totalAmount.toString())}
                      </TableCell>
                      <TableCell className={saleGroup.totalProfit >= 0 ? "text-green-600" : "text-red-600"}>
                        {formatCurrency(saleGroup.totalProfit.toString())}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={ORDER_STATUS_COLORS[saleGroup.status as keyof typeof ORDER_STATUS_COLORS]}>
                          {ORDER_STATUS_LABELS[saleGroup.status as keyof typeof ORDER_STATUS_LABELS]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {PLATFORM_SOURCE_LABELS[saleGroup.platformSource as keyof typeof PLATFORM_SOURCE_LABELS]}
                        </span>
                      </TableCell>
                      <TableCell>
                        {saleGroup.saleDate ? new Date(saleGroup.saleDate).toLocaleDateString() : new Date(saleGroup.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const invoiceStatus = getInvoiceStatus(saleGroup.items[0].id);
                          return (
                            <span className={`text-sm font-medium ${invoiceStatus.color}`}>
                              {invoiceStatus.status}
                            </span>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleGenerateInvoice(saleGroup.items[0])}
                            disabled={generateInvoiceMutation.isPending}
                            title="Generate Invoice"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(saleGroup.items[0])}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Sale Group</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this sale group ({saleGroup.items.length} items)? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={async () => {
                                    // Delete all items in the group sequentially to avoid race conditions
                                    const itemsToDelete = [...saleGroup.items];
                                    let successCount = 0;
                                    let errorCount = 0;
                                    
                                    for (const item of itemsToDelete) {
                                      try {
                                        await new Promise((resolve, reject) => {
                                          deleteSaleMutation.mutate(item.id, {
                                            onSuccess: () => {
                                              successCount++;
                                              resolve(true);
                                            },
                                            onError: (error) => {
                                              // Don't show individual error toasts for group deletion
                                              // Only count errors that aren't "already deleted"
                                              if (!error.message?.includes("404:")) {
                                                errorCount++;
                                              }
                                              resolve(false); // Continue with other deletions
                                            },
                                            meta: { skipToast: true } // Skip individual toasts for group operations
                                          });
                                        });
                                      } catch (e) {
                                        errorCount++;
                                      }
                                    }
                                    
                                    // Show final summary
                                    if (successCount > 0) {
                                      toast({
                                        title: "Success",
                                        description: `${successCount} sale(s) deleted successfully${errorCount > 0 ? ` (${errorCount} already deleted)` : ''}`,
                                      });
                                    }
                                    
                                    // Force refresh data after all deletions
                                    queryClient.refetchQueries({ queryKey: ["/api/sales"] });
                                    queryClient.refetchQueries({ queryKey: ["/api/products"] });
                                  }}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete Group
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Invoice Generation Confirmation Dialog */}
      <AlertDialog open={showInvoicePreview} onOpenChange={setShowInvoicePreview}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Generate Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              This will generate invoice number <strong>{previewInvoiceNumber}</strong> for this sale. 
              Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowInvoicePreview(false);
              setPendingSale(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmGenerateInvoice}
              disabled={generateInvoiceMutation.isPending}
            >
              {generateInvoiceMutation.isPending ? "Generating..." : "Generate Invoice"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}

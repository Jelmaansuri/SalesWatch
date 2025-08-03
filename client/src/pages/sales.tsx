import { useState } from "react";
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
import { Plus, Edit, Trash2, ShoppingCart, User, Package } from "lucide-react";
import AddSaleModal from "@/components/modals/add-sale-modal";
import type { SaleWithDetails, Customer, Product } from "@shared/schema";
import { z } from "zod";

const formSchema = insertSaleSchema.extend({
  unitPrice: z.string().min(1, "Unit price is required"),
  discountAmount: z.string().optional(),
}).partial({
  totalAmount: true,
  profit: true,
});

type FormData = z.infer<typeof formSchema>;

export default function Sales() {
  const { toast } = useToast();
  const [editingSale, setEditingSale] = useState<SaleWithDetails | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const { data: sales = [], isLoading, error } = useQuery<SaleWithDetails[]>({
    queryKey: ["/api/sales"],
  });

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
      productId: "",
      quantity: 1,
      unitPrice: "",
      status: "paid",
      notes: "",
      totalAmount: undefined,
      profit: undefined,
    },
  });

  const updateSaleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: FormData }) => {
      const response = await apiRequest("PUT", `/api/sales/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
      setIsEditDialogOpen(false);
      setEditingSale(null);
      form.reset();
      toast({
        title: "Success",
        description: "Sale updated successfully",
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
        description: "Failed to update sale",
        variant: "destructive",
      });
    },
  });

  const deleteSaleMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/sales/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
      toast({
        title: "Success",
        description: "Sale deleted successfully",
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
        description: "Failed to delete sale",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (sale: SaleWithDetails) => {
    setEditingSale(sale);
    form.reset({
      customerId: sale.customerId,
      productId: sale.productId,
      quantity: sale.quantity,
      unitPrice: typeof sale.unitPrice === 'string' ? sale.unitPrice : sale.unitPrice.toString(),
      discountAmount: typeof sale.discountAmount === 'string' ? sale.discountAmount : (sale.discountAmount || 0).toString(),
      status: sale.status,
      platformSource: sale.platformSource,
      notes: sale.notes || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleSubmit = async (data: FormData) => {
    console.log("=== EDIT FORM SUBMITTED ===");
    console.log("Form submitted with data:", data);
    console.log("Editing sale:", editingSale);
    
    if (!editingSale) {
      console.error("No sale being edited!");
      toast({
        title: "Error", 
        description: "No sale selected for editing",
        variant: "destructive",
      });
      return;
    }
    
    // Remove undefined/null fields and prepare clean data
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value !== undefined && value !== null && value !== "")
    );
    
    console.log("Clean data for API:", cleanData);
    updateSaleMutation.mutate({ id: editingSale.id, data: cleanData });
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
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Sale</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
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

                  <FormField
                    control={form.control}
                    name="productId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product</FormLabel>
                        <Select 
                          onValueChange={(productId) => {
                            field.onChange(productId);
                            // Auto-update unit price when product changes
                            const selectedProduct = products.find(p => p.id === productId);
                            if (selectedProduct) {
                              console.log('Sales Edit - Product changed to:', selectedProduct.name, 'Price:', selectedProduct.sellingPrice);
                              form.setValue('unitPrice', selectedProduct.sellingPrice);
                            }
                          }} 
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select product" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {products.map((product) => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.name} - {formatCurrency(product.sellingPrice)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="unitPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit Price (RM)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="discountAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Discount (RM)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Discount per unit for this customer (default: RM 0.00)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
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
                    disabled={updateSaleMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={(e) => {
                      console.log("Update Order button clicked!");
                      console.log("Form valid:", form.formState.isValid);
                      console.log("Form errors:", form.formState.errors);
                      // Don't prevent default, let form submission happen naturally
                    }}
                  >
                    {updateSaleMutation.isPending ? "Updating..." : "Update Order"}
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
              {sales.length} sales transactions recorded
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
                      <TableHead className="min-w-[80px]">Price</TableHead>
                      <TableHead className="min-w-[80px]">Discount</TableHead>
                      <TableHead className="min-w-[80px]">Total</TableHead>
                      <TableHead className="min-w-[70px]">Profit</TableHead>
                      <TableHead className="min-w-[80px]">Status</TableHead>
                      <TableHead className="min-w-[80px]">Platform</TableHead>
                      <TableHead className="min-w-[90px]">Date</TableHead>
                      <TableHead className="min-w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                <TableBody>
                  {sales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell>
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-2 text-gray-400" />
                          {sale.customer.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Package className="h-4 w-4 mr-2 text-gray-400" />
                          {sale.product.name}
                        </div>
                      </TableCell>
                      <TableCell>{sale.quantity}</TableCell>
                      <TableCell>{formatCurrency(sale.unitPrice)}</TableCell>
                      <TableCell className="text-orange-600">
                        {formatCurrency(sale.discountAmount)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(sale.totalAmount)}
                      </TableCell>
                      <TableCell className={parseFloat(sale.profit) >= 0 ? "text-green-600" : "text-red-600"}>
                        {formatCurrency(sale.profit)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={ORDER_STATUS_COLORS[sale.status as keyof typeof ORDER_STATUS_COLORS]}>
                          {ORDER_STATUS_LABELS[sale.status as keyof typeof ORDER_STATUS_LABELS]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {PLATFORM_SOURCE_LABELS[sale.platformSource as keyof typeof PLATFORM_SOURCE_LABELS]}
                        </span>
                      </TableCell>
                      <TableCell>
                        {sale.saleDate ? new Date(sale.saleDate).toLocaleDateString() : new Date(sale.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(sale)}
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
                                <AlertDialogTitle>Delete Sale</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this sale record? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteSaleMutation.mutate(sale.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
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
    </MainLayout>
  );
}

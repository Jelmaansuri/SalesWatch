import React, { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import MainLayout from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
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
import { Package, User, Edit, Trash2, Search, Filter, Calendar, Truck, CheckCircle, Clock, DollarSign, ChevronDown, ChevronRight } from "lucide-react";
import type { SaleWithDetails, Customer, Product } from "@shared/schema";
import { z } from "zod";

const formSchema = insertSaleSchema.extend({
  unitPrice: z.string().min(1, "Unit price is required"),
  discountAmount: z.string().optional(),
  saleDate: z.date().optional(), // Make saleDate optional for edits
}).partial({
  totalAmount: true,
  profit: true,
  saleDate: true, // saleDate is optional during edits
});

type FormData = z.infer<typeof formSchema>;

export default function Orders() {
  const { toast } = useToast();
  const [editingOrder, setEditingOrder] = useState<SaleWithDetails | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Toggle group expansion
  const toggleGroupExpansion = (groupKey: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey);
      } else {
        newSet.add(groupKey);
      }
      return newSet;
    });
  };

  const { data: orders = [], isLoading, error } = useQuery<SaleWithDetails[]>({
    queryKey: ["/api/sales"],
    staleTime: 0, // Ensure data is always considered stale
    gcTime: 0, // Don't cache data for long
  });

  // Group orders by GROUP identifier to sync with Sales Tracking module
  const groupedOrders = useMemo(() => {
    const groups: { [key: string]: SaleWithDetails[] } = {};
    
    orders.forEach(order => {
      // Extract group ID from notes if it exists
      const groupMatch = order.notes?.match(/\[GROUP:([^\]]+)\]/);
      const groupKey = groupMatch 
        ? groupMatch[1] 
        : `${order.customerId}_${new Date(order.createdAt).toDateString()}_${order.id}`;
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(order);
    });

    return Object.values(groups).map((group, index) => ({
      groupKey: group[0].notes?.match(/\[GROUP:([^\]]+)\]/)?.[1] || 'ungrouped',
      groupDisplayId: index + 1, // Simple numerical ID starting from 1
      customer: group[0].customer,
      items: group,
      totalAmount: group.reduce((sum, order) => sum + parseFloat(order.totalAmount), 0),
      totalProfit: group.reduce((sum, order) => sum + parseFloat(order.profit), 0),
      status: group[0].status,
      platformSource: group[0].platformSource,
      saleDate: group[0].saleDate,
      createdAt: group[0].createdAt,
      id: group[0].id, // Use first order's ID for operations
      isGroup: group.length > 1
    }));
  }, [orders]);

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
      saleDate: undefined,
      totalAmount: undefined,
      profit: undefined,
    },
  });

  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: FormData }) => {
      const response = await apiRequest(`/api/sales/${id}`, "PUT", data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
      setIsEditDialogOpen(false);
      setEditingOrder(null);
      form.reset();
      toast({
        title: "Success",
        description: "Order updated successfully",
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
        description: "Failed to update order",
        variant: "destructive",
      });
    },
  });

  const deleteOrderMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest(`/api/sales/${id}`, "DELETE");
    },
    onSuccess: () => {
      // Clear cache completely and force fresh fetch
      queryClient.removeQueries({ queryKey: ["/api/sales"] });
      queryClient.refetchQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/revenue-by-month"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/top-products"] });
      
      toast({
        title: "Success",
        description: "Order deleted successfully",
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
        description: "Failed to delete order",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (order: SaleWithDetails) => {
    setEditingOrder(order);
    form.reset({
      customerId: order.customerId,
      productId: order.productId,
      quantity: order.quantity,
      unitPrice: typeof order.unitPrice === 'string' ? order.unitPrice : String(order.unitPrice),
      discountAmount: typeof order.discountAmount === 'string' ? order.discountAmount : String(order.discountAmount || 0),
      status: order.status,
      platformSource: order.platformSource,
      notes: order.notes || "",
      saleDate: new Date(order.saleDate), // Include saleDate from existing order
    });
    setIsEditDialogOpen(true);
  };

  const handleSubmit = async (data: FormData) => {
    console.log("=== ORDERS EDIT FORM SUBMITTED ===");
    console.log("Form submitted with data:", data);
    console.log("Editing order:", editingOrder);
    
    if (!editingOrder) {
      console.error("No order being edited!");
      toast({
        title: "Error", 
        description: "No order selected for editing",
        variant: "destructive",
      });
      return;
    }
    
    // Remove undefined/null fields and prepare clean data, preserve saleDate
    const cleanData: Record<string, any> = {};
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        cleanData[key] = value;
      }
    });
    
    console.log("Clean data for API:", cleanData);
    updateOrderMutation.mutate({ id: editingOrder.id, data: cleanData });
  };

  // Filter orders based on status and search term
  const filteredOrders = groupedOrders.filter((group) => {
    const matchesStatus = statusFilter === "all" || group.items.some(order => order.status === statusFilter);
    const matchesSearch = searchTerm === "" || group.items.some(order =>
      order.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return matchesStatus && matchesSearch;
  });

  // Calculate status counts
  const statusCounts = {
    all: orders.length,
    paid: orders.filter((o: SaleWithDetails) => o.status === "paid").length,
    pending_shipment: orders.filter((o: SaleWithDetails) => o.status === "pending_shipment").length,
    shipped: orders.filter((o: SaleWithDetails) => o.status === "shipped").length,
    completed: orders.filter((o: SaleWithDetails) => o.status === "completed").length,
  };

  if (error && isUnauthorizedError(error)) {
    return (
      <MainLayout title="Order Management">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-600 dark:text-gray-300">Redirecting to sign in...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Order Management">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Order Management
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Complete order lifecycle management from payment to delivery
            </p>
          </div>
        </div>

        {/* Order Status Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter("all")}>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Package className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Orders</p>
                  <p className="text-2xl font-bold">{statusCounts.all}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter("paid")}>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Paid</p>
                  <p className="text-2xl font-bold text-green-600">{statusCounts.paid}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter("pending_shipment")}>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Shipment</p>
                  <p className="text-2xl font-bold text-yellow-600">{statusCounts.pending_shipment}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter("shipped")}>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Truck className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Shipped</p>
                  <p className="text-2xl font-bold text-blue-600">{statusCounts.shipped}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter("completed")}>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Completed</p>
                  <p className="text-2xl font-bold text-green-600">{statusCounts.completed}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Filter className="h-5 w-5" />
              <span>Order Filters</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="search">Search Orders</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Search by customer, product, or order ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="md:w-48">
                <Label htmlFor="status-filter">Status Filter</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Order Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Order</DialogTitle>
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
                              console.log('Orders Edit - Product changed to:', selectedProduct.name, 'Price:', selectedProduct.sellingPrice);
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

                <div className="grid grid-cols-3 gap-4">
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

                  <FormField
                    control={form.control}
                    name="discountAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Discount (RM)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

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
                    disabled={updateOrderMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={(e) => {
                      console.log("Update Order button clicked!");
                      console.log("Form valid:", form.formState.isValid);
                      console.log("Form errors:", form.formState.errors);
                    }}
                  >
                    {updateOrderMutation.isPending ? "Updating..." : "Update Order"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle>Orders ({filteredOrders.length})</CardTitle>
            <CardDescription>
              Manage and track all customer orders
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-8">
                <Package className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600 mb-4" />
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  {searchTerm || statusFilter !== "all" ? "No orders match your filters" : "No orders found"}
                </p>
                {(searchTerm || statusFilter !== "all") && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm("");
                      setStatusFilter("all");
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Price After Discount</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((group) => (
                    <React.Fragment key={group.id}>
                      {/* Group Header Row */}
                      <TableRow 
                        className={`${group.isGroup ? 'bg-muted/50 hover:bg-muted/70 cursor-pointer' : ''}`}
                        data-testid={`row-order-group-${group.id}`}
                        onClick={() => group.isGroup && toggleGroupExpansion(group.groupKey)}
                      >
                        <TableCell className="font-mono text-sm">
                          {group.isGroup ? (
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleGroupExpansion(group.groupKey);
                                }}
                                className="h-6 w-6 p-0"
                              >
                                {expandedGroups.has(group.groupKey) ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </Button>
                              <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 px-2 py-1 rounded">
                                ORDER GROUP #{group.groupDisplayId}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                ({group.items.length} items)
                              </span>
                            </div>
                          ) : (
                            group.items[0].id.slice(-8).toUpperCase()
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <User className="h-4 w-4 mr-2 text-gray-400" />
                            {group.customer.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          {group.isGroup ? (
                            <div className="text-sm text-muted-foreground">
                              Multiple products
                            </div>
                          ) : (
                            <div className="flex items-center">
                              <Package className="h-4 w-4 mr-2 text-gray-400" />
                              {group.items[0].product.name}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {group.isGroup ? (
                            <div className="text-sm text-muted-foreground">
                              Combined
                            </div>
                          ) : (
                            group.items[0].quantity
                          )}
                        </TableCell>
                        <TableCell>
                          {group.isGroup ? (
                            <div className="text-sm text-muted-foreground">
                              Various
                            </div>
                          ) : (
                            formatCurrency(group.items[0].unitPrice)
                          )}
                        </TableCell>
                        <TableCell className="text-orange-600">
                          {group.isGroup ? (
                            <div className="text-sm text-muted-foreground">
                              Combined
                            </div>
                          ) : (
                            formatCurrency(group.items[0].discountAmount)
                          )}
                        </TableCell>
                        <TableCell className="font-medium text-blue-600">
                          {group.isGroup ? (
                            <div className="text-sm text-muted-foreground">
                              Combined
                            </div>
                          ) : (
                            formatCurrency((parseFloat(group.items[0].unitPrice) - parseFloat(group.items[0].discountAmount)).toString())
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(group.totalAmount.toString())}
                          {group.isGroup && (
                            <div className="text-xs text-muted-foreground">
                              Combined total
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {group.isGroup ? (
                            <div className="text-sm text-muted-foreground">
                              Mixed statuses
                            </div>
                          ) : (
                            <Badge variant="secondary" className={ORDER_STATUS_COLORS[group.status as keyof typeof ORDER_STATUS_COLORS]}>
                              {ORDER_STATUS_LABELS[group.status as keyof typeof ORDER_STATUS_LABELS]}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                            {new Date(group.createdAt).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          {!group.isGroup && (
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(group.items[0])}
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
                                    <AlertDialogTitle>Delete Order</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete this order? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteOrderMutation.mutate(group.items[0].id)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>

                      {/* Individual Items in Group - Only show when expanded */}
                      {group.isGroup && expandedGroups.has(group.groupKey) && group.items.map((order, index) => (
                        <TableRow 
                          key={`${group.id}-item-${index}`}
                          className="bg-background border-l-4 border-l-blue-200 dark:border-l-blue-800"
                          data-testid={`row-order-${order.id}`}
                        >
                          <TableCell className="font-mono text-sm pl-8">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">└</span>
                              <span>{order.id.slice(-8).toUpperCase()}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-muted-foreground">
                              Same customer
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center text-sm">
                              <Package className="h-4 w-4 mr-2 text-gray-400" />
                              {order.product.name}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{order.quantity}</TableCell>
                          <TableCell className="text-sm">{formatCurrency(order.unitPrice)}</TableCell>
                          <TableCell className="text-sm text-orange-600">
                            {formatCurrency(order.discountAmount)}
                          </TableCell>
                          <TableCell className="text-sm text-blue-600">
                            {formatCurrency((parseFloat(order.unitPrice) - parseFloat(order.discountAmount)).toString())}
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatCurrency(order.totalAmount)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={ORDER_STATUS_COLORS[order.status as keyof typeof ORDER_STATUS_COLORS]}>
                              {ORDER_STATUS_LABELS[order.status as keyof typeof ORDER_STATUS_LABELS]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center text-sm">
                              <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                              {new Date(order.createdAt).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(order)}
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
                                    <AlertDialogTitle>Delete Order</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete this order? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteOrderMutation.mutate(order.id)}
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
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

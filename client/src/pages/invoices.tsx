import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { 
  Plus, 
  FileText, 
  Eye, 
  Edit2, 
  Trash2, 
  Download,
  Filter,
  Search,
  DollarSign,
  Users,
  Clock,
  CheckCircle
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

import { CreateInvoiceModal } from "@/components/modals/create-invoice-modal";
import { EditInvoiceModal } from "@/components/modals/edit-invoice-modal";
import { InvoicePreviewModal } from "@/components/modals/invoice-preview-modal";
import MainLayout from "@/components/layout/main-layout";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { EnhancedDataTable, type ColumnDef, type FilterConfig } from "@/components/ui/enhanced-data-table";
import type { InvoiceWithDetails } from "@shared/schema";

export default function Invoices() {
  return (
    <MainLayout title="Invoice Management">
      <InvoicesContent />
    </MainLayout>
  );
}

function InvoicesContent() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithDetails | null>(null);

  // Fetch invoices
  const { data: invoices = [], isLoading } = useQuery<InvoiceWithDetails[]>({
    queryKey: ["/api/invoices"],
  });

  // Fetch sales to get group information
  const { data: sales = [] } = useQuery<any[]>({
    queryKey: ["/api/sales"],
  });

  // Group invoices by linked sales group information
  const groupedInvoices = useMemo(() => {
    if (!sales.length || !invoices.length) {
      return invoices.map(invoice => ({
        groupKey: 'ungrouped',
        customer: invoice.customer,
        items: [invoice],
        totalAmount: parseFloat(invoice.totalAmount),
        status: invoice.status,
        invoiceDate: invoice.invoiceDate,
        createdAt: invoice.createdAt,
        id: invoice.id,
        isGroup: false
      }));
    }

    const groups: { [key: string]: InvoiceWithDetails[] } = {};
    
    invoices.forEach(invoice => {
      // Find the linked sale to get group information
      const linkedSale = sales.find((sale: any) => sale.id === invoice.saleId);
      
      if (linkedSale && linkedSale.notes) {
        // Extract group ID from linked sale's notes if it exists
        const groupMatch = linkedSale.notes.match(/\[GROUP:([^\]]+)\]/);
        if (groupMatch) {
          const groupKey = groupMatch[1];
          if (!groups[groupKey]) {
            groups[groupKey] = [];
          }
          groups[groupKey].push(invoice);
          return;
        }
      }
      
      // If no group found, create individual group
      const individualKey = `individual_${invoice.id}`;
      groups[individualKey] = [invoice];
    });

    return Object.values(groups).map(group => ({
      groupKey: group.length > 1 ? 
        sales.find((sale: any) => sale.id === group[0].saleId)?.notes?.match(/\[GROUP:([^\]]+)\]/)?.[1] || 'ungrouped' : 
        'ungrouped',
      customer: group[0].customer,
      items: group,
      totalAmount: group.reduce((sum, invoice) => sum + parseFloat(invoice.totalAmount), 0),
      status: group[0].status, // Use first invoice's status as group status
      invoiceDate: group[0].invoiceDate,
      createdAt: group[0].createdAt,
      id: group[0].id, // Use first invoice's ID for operations
      isGroup: group.length > 1
    }));
  }, [invoices, sales]);

  // Column definitions for EnhancedDataTable
  const invoiceColumns: ColumnDef<any>[] = [
    {
      key: "invoiceNumber",
      label: "Invoice #",
      sortable: true,
      searchable: true,
      accessor: (item) => item.isGroup ? `GROUP: ${item.groupKey}` : item.items[0].invoiceNumber,
      render: (value, item) => (
        <div className="font-medium">
          {item.isGroup ? (
            <div className="flex items-center gap-2">
              <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 px-2 py-1 rounded">
                GROUP: {item.groupKey}
              </span>
              <span className="text-sm text-muted-foreground">
                ({item.items.length} invoices)
              </span>
            </div>
          ) : (
            item.items[0].invoiceNumber
          )}
        </div>
      ),
    },
    {
      key: "customer",
      label: "Customer",
      sortable: true,
      searchable: true,
      accessor: (item) => item.customer.name,
      render: (value, item) => (
        <div>
          <div className="font-medium">{item.customer.name}</div>
          {item.customer.company && (
            <div className="text-sm text-muted-foreground">{item.customer.company}</div>
          )}
          {item.customer.email && (
            <div className="text-sm text-muted-foreground">{item.customer.email}</div>
          )}
        </div>
      ),
    },
    {
      key: "invoiceDate",
      label: "Date",
      sortable: true,
      accessor: (item) => item.invoiceDate,
      render: (value) => format(new Date(value), "dd/MM/yyyy"),
    },
    {
      key: "dueDate",
      label: "Due Date",
      sortable: true,
      accessor: (item) => item.items[0].dueDate,
      render: (value) => value ? format(new Date(value), "dd/MM/yyyy") : "-",
    },
    {
      key: "createdAt",
      label: "Created",
      sortable: true,
      accessor: (item) => item.createdAt,
      render: (value) => format(new Date(value), "dd/MM/yyyy HH:mm"),
    },
    {
      key: "totalAmount",
      label: "Amount",
      sortable: true,
      accessor: (item) => item.totalAmount,
      render: (value) => (
        <span className="font-medium text-green-600">
          RM {value.toFixed(2)}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      filterable: true,
      accessor: (item) => item.status,
      filterOptions: [
        { value: "draft", label: "Draft" },
        { value: "sent", label: "Sent" },
        { value: "paid", label: "Paid" },
        { value: "overdue", label: "Overdue" },
        { value: "cancelled", label: "Cancelled" },
      ],
      render: (value, item) => {
        const getVibrantInvoiceDesign = (status: string) => {
          switch (status) {
            case "draft":
              return "bg-gradient-to-r from-blue-400 to-blue-600 text-white shadow-md border-0 font-medium";
            case "sent":
              return "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md border-0 font-medium";
            case "paid":
              return "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md border-0 font-medium";
            case "overdue":
              return "bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-md border-0 font-medium";
            case "cancelled":
              return "bg-gradient-to-r from-gray-500 to-slate-600 text-white shadow-md border-0 font-medium";
            default:
              return "bg-gradient-to-r from-cyan-500 to-teal-600 text-white shadow-md border-0 font-medium";
          }
        };
        
        return (
          <Select value={value} onValueChange={(newStatus) => handleInvoiceStatusChange(item.id, newStatus)}>
            <SelectTrigger className="w-auto border-0 bg-transparent p-0 h-auto min-w-[120px]">
              <SelectValue>
                <span className="text-sm font-medium cursor-pointer">
                  {value?.charAt(0).toUpperCase() + value?.slice(1)}
                </span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-400 to-blue-600"></div>
                  <span>Draft</span>
                </div>
              </SelectItem>
              <SelectItem value="sent">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600"></div>
                  <span>Sent</span>
                </div>
              </SelectItem>
              <SelectItem value="paid">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-r from-green-500 to-emerald-600"></div>
                  <span>Paid</span>
                </div>
              </SelectItem>
              <SelectItem value="overdue">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-r from-red-500 to-rose-600"></div>
                  <span>Overdue</span>
                </div>
              </SelectItem>
              <SelectItem value="cancelled">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-r from-gray-500 to-slate-600"></div>
                  <span>Cancelled</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        );
      },
    },
    {
      key: "actions",
      label: "Actions",
      render: (value, item) => (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedInvoice(item.items[0]);
              setPreviewModalOpen(true);
            }}
            data-testid={`button-preview-invoice-${item.id}`}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedInvoice(item.items[0]);
              setEditModalOpen(true);
            }}
            data-testid={`button-edit-invoice-${item.id}`}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                data-testid={`button-delete-invoice-${item.id}`}
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this invoice? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleDelete(item.id)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ),
    },
  ];

  // Filter configurations for EnhancedDataTable
  const invoiceFilters: FilterConfig[] = [
    {
      key: "status",
      label: "Status",
      options: [
        { value: "draft", label: "Draft" },
        { value: "sent", label: "Sent" },
        { value: "paid", label: "Paid" },
        { value: "overdue", label: "Overdue" },
        { value: "cancelled", label: "Cancelled" },
      ],
    },
  ];

  // Delete invoice mutation
  const deleteInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const response = await fetch(`/api/invoices/${invoiceId}`, { 
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
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      
      // Also refetch immediately to ensure UI updates
      queryClient.refetchQueries({ queryKey: ["/api/invoices"] });
      
      toast({
        title: "Success",
        description: "Invoice deleted successfully",
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
      let errorMessage = "Failed to delete invoice";
      if (error instanceof Error) {
        if (error.message?.includes("404:")) {
          errorMessage = "Invoice not found or already deleted";
        } else if (error.message?.includes("400:")) {
          // Extract the actual error message from the API
          const match = error.message.match(/400: (.+)/);
          errorMessage = match ? match[1] : "Cannot delete invoice - check for constraints";
        } else if (error.message?.includes("500:")) {
          errorMessage = "Server error occurred while deleting invoice";
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



  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ invoiceId, status }: { invoiceId: string; status: string }) => {
      return await apiRequest(`/api/invoices/${invoiceId}`, "PUT", { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({
        title: "Success",
        description: "Invoice status updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update invoice status",
        variant: "destructive",
      });
    },
  });

  // Filter grouped invoices
  const filteredInvoices = groupedInvoices.filter((group) => {
    const matchesSearch = searchTerm === "" || group.items.some(invoice =>
      invoice.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.customer?.company?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    const matchesStatus = statusFilter === "all" || group.items.some(invoice => invoice.status === statusFilter);
    
    return matchesSearch && matchesStatus;
  });

  // Calculate metrics
  const totalRevenue = invoices.reduce((sum, invoice) => sum + parseFloat(invoice.totalAmount), 0);
  const paidInvoices = invoices.filter(inv => inv.status === 'paid').length;
  const pendingInvoices = invoices.filter(inv => inv.status === 'draft' || inv.status === 'sent').length;
  const overdueInvoices = invoices.filter(inv => {
    return inv.status !== 'paid' && new Date(inv.dueDate) < new Date();
  }).length;

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: "Draft", variant: "secondary" as const },
      sent: { label: "Sent", variant: "default" as const },
      paid: { label: "Paid", variant: "default" as const },
      overdue: { label: "Overdue", variant: "destructive" as const },
      cancelled: { label: "Cancelled", variant: "secondary" as const },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleEdit = (invoice: InvoiceWithDetails) => {
    setSelectedInvoice(invoice);
    setEditModalOpen(true);
  };

  const handlePreview = (invoice: InvoiceWithDetails) => {
    setSelectedInvoice(invoice);
    setPreviewModalOpen(true);
  };

  const handleDelete = (invoiceId: string) => {
    deleteInvoiceMutation.mutate(invoiceId);
  };

  // Handle invoice status change directly from table
  const handleInvoiceStatusChange = async (invoiceId: string, newStatus: string) => {
    try {
      await apiRequest(`/api/invoices/${invoiceId}`, "PUT", { status: newStatus });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({
        title: "Invoice Status Updated",
        description: `Invoice status updated to ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`,
      });
    } catch (error) {
      console.error("Error updating invoice status:", error);
      toast({
        title: "Error",
        description: "Failed to update invoice status",
        variant: "destructive",
      });
    }
  };

  const handlePDFDownload = (invoice: InvoiceWithDetails) => {
    setSelectedInvoice(invoice);
    setPreviewModalOpen(true);
    // The PDF download will be handled by the preview modal
  };



  const handleStatusChange = (invoiceId: string, status: string) => {
    updateStatusMutation.mutate({ invoiceId, status });
  };

  return (
    <div className="space-y-6" data-testid="invoices-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Invoices</h1>
          <p className="text-muted-foreground mt-2">
            Manage and track your business invoices
          </p>
        </div>
        <Button 
          onClick={() => setCreateModalOpen(true)}
          data-testid="button-create-invoice"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Invoice
        </Button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">RM {totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              From {invoices.length} invoices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid Invoices</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{paidInvoices}</div>
            <p className="text-xs text-muted-foreground">
              Successfully completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingInvoices}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting payment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{overdueInvoices}</div>
            <p className="text-xs text-muted-foreground">
              Need attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice Management</CardTitle>
          <CardDescription>
            Search and filter your invoices
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Enhanced Invoices Table */}
          <EnhancedDataTable
            data={groupedInvoices}
            columns={invoiceColumns}
            filters={invoiceFilters}
            searchPlaceholder="Search by invoice number, customer, or company..."
            defaultSort={{ key: "createdAt", direction: "desc" }}
            isLoading={isLoading}
            emptyMessage="No invoices found. Create your first invoice to get started!"
          />

        </CardContent>
      </Card>

      {/* Modals */}
      <CreateInvoiceModal 
        open={createModalOpen} 
        onOpenChange={setCreateModalOpen}
      />
      
      {selectedInvoice && (
        <>
          <EditInvoiceModal 
            open={editModalOpen} 
            onOpenChange={setEditModalOpen}
            invoice={selectedInvoice}
          />
          <InvoicePreviewModal 
            open={previewModalOpen} 
            onOpenChange={setPreviewModalOpen}
            invoice={selectedInvoice}
          />
        </>
      )}
    </div>
  );
}
import { useState } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { InvoiceWithDetails } from "@shared/schema";

export default function InvoicesPage() {
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

  // Delete invoice mutation
  const deleteInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      await apiRequest(`/api/invoices/${invoiceId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({
        title: "Success",
        description: "Invoice deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Generate PDF mutation
  const generatePDFMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const response = await apiRequest(`/api/invoices/${invoiceId}/generate-pdf`, "POST");
      return await response.json();
    },
    onSuccess: async (data) => {
      // Generate and download PDF using jsPDF
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;
      
      const { invoice, businessSettings } = data;
      
      // Create PDF
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(20);
      doc.text(businessSettings?.businessName || 'PROGENY AGROTECH', 20, 30);
      doc.setFontSize(12);
      doc.text('INVOICE', 20, 45);
      
      // Invoice details
      doc.text(`Invoice #: ${invoice.invoiceNumber}`, 20, 60);
      doc.text(`Date: ${new Date(invoice.invoiceDate).toLocaleDateString()}`, 20, 70);
      doc.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`, 20, 80);
      
      // Customer details
      doc.text('Bill To:', 120, 60);
      doc.text(invoice.customer.name, 120, 70);
      if (invoice.customer.company) {
        doc.text(invoice.customer.company, 120, 80);
      }
      doc.text(invoice.customer.email, 120, 90);
      
      // Items table
      const tableData = invoice.items.map((item: any) => [
        item.product.name,
        item.quantity.toString(),
        `RM ${parseFloat(item.unitPrice).toFixed(2)}`,
        `RM ${(parseFloat(item.discount) || 0).toFixed(2)}`,
        `RM ${parseFloat(item.lineTotal).toFixed(2)}`
      ]);
      
      autoTable(doc, {
        startY: 110,
        head: [['Product', 'Qty', 'Unit Price', 'Discount', 'Total']],
        body: tableData,
      });
      
      // Total
      const finalY = (doc as any).lastAutoTable.finalY + 20;
      doc.text(`Subtotal: RM ${parseFloat(invoice.subtotal).toFixed(2)}`, 120, finalY);
      doc.text(`Tax: RM ${(parseFloat(invoice.taxAmount) || 0).toFixed(2)}`, 120, finalY + 10);
      doc.text(`Total: RM ${parseFloat(invoice.totalAmount).toFixed(2)}`, 120, finalY + 20);
      
      // Download
      doc.save(`invoice-${invoice.invoiceNumber}.pdf`);
      
      toast({
        title: "PDF Downloaded",
        description: "Invoice PDF has been downloaded successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to generate PDF",
        variant: "destructive",
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

  // Filter invoices
  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch = 
      invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.customer.company?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
    
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

  const handleGeneratePDF = (invoiceId: string) => {
    generatePDFMutation.mutate(invoiceId);
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
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by invoice number, customer, or company..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-invoices"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Invoices Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Loading invoices...
                    </TableCell>
                  </TableRow>
                ) : filteredInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      {searchTerm || statusFilter !== "all" 
                        ? "No invoices match your filters" 
                        : "No invoices found. Create your first invoice to get started!"
                      }
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id} data-testid={`row-invoice-${invoice.id}`}>
                      <TableCell className="font-medium">
                        {invoice.invoiceNumber}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{invoice.customer.name}</div>
                          {invoice.customer.company && (
                            <div className="text-sm text-muted-foreground">
                              {invoice.customer.company}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(invoice.invoiceDate), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className={`${
                          new Date(invoice.dueDate) < new Date() && invoice.status !== 'paid'
                            ? 'text-destructive font-medium' 
                            : ''
                        }`}>
                          {format(new Date(invoice.dueDate), "MMM dd, yyyy")}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        RM {parseFloat(invoice.totalAmount).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Select 
                          value={invoice.status} 
                          onValueChange={(status) => handleStatusChange(invoice.id, status)}
                          disabled={updateStatusMutation.isPending}
                        >
                          <SelectTrigger className="w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="sent">Sent</SelectItem>
                            <SelectItem value="paid">Paid</SelectItem>
                            <SelectItem value="overdue">Overdue</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePreview(invoice)}
                            data-testid={`button-preview-${invoice.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(invoice)}
                            data-testid={`button-edit-${invoice.id}`}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleGeneratePDF(invoice.id)}
                            disabled={generatePDFMutation.isPending}
                            data-testid={`button-pdf-${invoice.id}`}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                data-testid={`button-delete-${invoice.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete invoice {invoice.invoiceNumber}? 
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(invoice.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
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
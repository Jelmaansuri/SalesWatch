import { format } from "date-fns";
import { Download, Eye, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import type { InvoiceWithDetails } from "@shared/schema";

interface InvoicePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: InvoiceWithDetails;
}

export function InvoicePreviewModal({ open, onOpenChange, invoice }: InvoicePreviewModalProps) {
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

  const handleDownloadPDF = async () => {
    try {
      // Generate and download PDF using jsPDF
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;
      
      // Create PDF matching the exact preview design
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 25;
      
      // Header section matching preview exactly
      // Company name (right aligned, larger)
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text('PROGENY AGROTECH', pageWidth - margin, 30, { align: 'right' });
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text('Malaysian Fresh Young Ginger Farming', pageWidth - margin, 40, { align: 'right' });
      doc.text('& Distribution', pageWidth - margin, 48, { align: 'right' });
      
      // Invoice title (left side, larger)
      doc.setFontSize(36);
      doc.setFont("helvetica", "bold");
      doc.text('INVOICE', margin, 40);
      
      // Invoice details section (left side)
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(invoice.invoiceNumber, margin, 60);
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(`Date: ${new Date(invoice.invoiceDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, margin, 72);
      doc.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, margin, 82);
      
      // Status with proper spacing
      const statusText = invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1);
      doc.text(`Status: ${statusText}`, margin, 92);
      
      // Bill To section with proper spacing
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text('Bill To:', margin, 115);
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      let yPos = 128;
      doc.text(invoice.customer.name, margin, yPos);
      yPos += 10;
      
      if (invoice.customer.company) {
        doc.text(invoice.customer.company, margin, yPos);
        yPos += 10;
      }
      
      doc.text(invoice.customer.email, margin, yPos);
      yPos += 10;
      
      if (invoice.customer.phone) {
        doc.text(invoice.customer.phone, margin, yPos);
        yPos += 10;
      }
      
      if (invoice.customer.address) {
        const addressLines = doc.splitTextToSize(invoice.customer.address, 120);
        doc.text(addressLines, margin, yPos);
        yPos += addressLines.length * 10;
      }
      
      // Items table - properly formatted
      const tableData = invoice.items.map((item: any) => {
        const productName = item.product.name || 'Unknown Product';
        const productSku = item.product.sku || '';
        
        return [
          `${productName}\nSKU: ${productSku}`,
          item.quantity.toString(),
          `RM ${parseFloat(item.unitPrice || 0).toFixed(2)}`,
          parseFloat(item.discount || 0) > 0 ? `RM ${parseFloat(item.discount).toFixed(2)}` : '-',
          `RM ${parseFloat(item.lineTotal || 0).toFixed(2)}`
        ];
      });
      
      // Table with proper styling to match preview
      autoTable(doc, {
        startY: yPos + 20,
        head: [['Description', 'Qty', 'Unit Price', 'Discount', 'Total']],
        body: tableData,
        margin: { left: margin, right: margin },
        headStyles: {
          fillColor: [249, 249, 249],
          textColor: [17, 24, 39],
          fontStyle: 'bold',
          fontSize: 12,
          cellPadding: 8
        },
        bodyStyles: {
          fontSize: 11,
          cellPadding: 8,
          textColor: [55, 65, 81]
        },
        columnStyles: {
          0: { cellWidth: 80, valign: 'top' },
          1: { cellWidth: 20, halign: 'center' },
          2: { cellWidth: 30, halign: 'right' },
          3: { cellWidth: 25, halign: 'right' },
          4: { cellWidth: 25, halign: 'right' }
        },
        styles: {
          overflow: 'linebreak',
          cellWidth: 'wrap',
          lineColor: [229, 231, 235],
          lineWidth: 0.1
        }
      });
      
      // Totals section - matching preview design exactly
      const finalY = (doc as any).lastAutoTable.finalY + 20;
      const rightAlign = pageWidth - margin;
      
      // Create totals box background (light gray like preview)
      doc.setFillColor(249, 249, 249);
      doc.rect(rightAlign - 80, finalY - 5, 80, 50, 'F');
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(55, 65, 81);
      
      // Subtotal
      doc.text('Subtotal:', rightAlign - 75, finalY + 8);
      doc.text(`RM ${parseFloat(invoice.subtotal || 0).toFixed(2)}`, rightAlign - 5, finalY + 8, { align: 'right' });
      
      let totalY = finalY + 20;
      
      // Tax if applicable
      if (parseFloat(invoice.taxAmount || 0) > 0) {
        doc.text('Tax:', rightAlign - 75, totalY);
        doc.text(`RM ${parseFloat(invoice.taxAmount).toFixed(2)}`, rightAlign - 5, totalY, { align: 'right' });
        totalY += 12;
      }
      
      // Separator line
      doc.setLineWidth(1);
      doc.setDrawColor(209, 213, 219);
      doc.line(rightAlign - 75, totalY + 2, rightAlign - 5, totalY + 2);
      
      // Total (bold and larger)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(17, 24, 39);
      doc.text('Total:', rightAlign - 75, totalY + 15);
      doc.text(`RM ${parseFloat(invoice.totalAmount || 0).toFixed(2)}`, rightAlign - 5, totalY + 15, { align: 'right' });
      
      // Banking Details Section - matching preview style
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(17, 24, 39);
      doc.text('Banking Details:', margin, totalY + 50);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.setTextColor(55, 65, 81);
      doc.text('Bank: Maybank', margin, totalY + 65);
      doc.text('Account Name: PROGENY AGROTECH SDN BHD', margin, totalY + 77);
      doc.text('Account Number: 5642 1234 5678', margin, totalY + 89);
      
      // Payment Terms section
      if (invoice.paymentTerms) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(17, 24, 39);
        doc.text('Payment Terms:', margin, totalY + 110);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(12);
        doc.setTextColor(55, 65, 81);
        doc.text(invoice.paymentTerms, margin, totalY + 125);
      }
      
      // Notes section
      if (invoice.notes) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(17, 24, 39);
        doc.text('Notes:', margin, totalY + 145);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(12);
        doc.setTextColor(55, 65, 81);
        const noteLines = doc.splitTextToSize(invoice.notes, pageWidth - (margin * 2));
        doc.text(noteLines, margin, totalY + 160);
      }
      
      // Footer - centered at bottom
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(107, 114, 128);
      doc.text('Thank you for your business!', pageWidth / 2, pageHeight - 30, { align: 'center' });
      
      // Download
      doc.save(`invoice-${invoice.invoiceNumber}.pdf`);
      
      console.log("Download PDF for invoice:", invoice.id);
    } catch (error) {
      console.error("Error generating PDF:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Invoice Preview - {invoice.invoiceNumber}</DialogTitle>
              <DialogDescription>
                Preview and download your invoice
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPDF}
                data-testid="button-download-pdf"
              >
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              {getStatusBadge(invoice.status)}
            </div>
          </div>
        </DialogHeader>

        {/* Invoice Preview */}
        <Card className="bg-white dark:bg-gray-50">
          <CardContent className="p-8">
            {/* Header */}
            <div className="flex justify-between items-start mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">INVOICE</h1>
                <div className="text-gray-600">
                  <p className="font-semibold text-lg">{invoice.invoiceNumber}</p>
                  <p>Date: {format(new Date(invoice.invoiceDate), "MMMM dd, yyyy")}</p>
                  <p>Due Date: {format(new Date(invoice.dueDate), "MMMM dd, yyyy")}</p>
                  <div className="mt-2">
                    <span className="text-sm text-gray-500">Status: </span>
                    {getStatusBadge(invoice.status)}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-gray-900">
                  <h2 className="text-xl font-bold mb-2">PROGENY AGROTECH</h2>
                  <p className="text-sm text-gray-600">
                    Malaysian Fresh Young Ginger Farming
                  </p>
                  <p className="text-sm text-gray-600">& Distribution</p>
                </div>
              </div>
            </div>

            {/* Bill To Section */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Bill To:</h3>
              <div className="text-gray-700">
                <p className="font-semibold">{invoice.customer.name}</p>
                {invoice.customer.company && (
                  <p>{invoice.customer.company}</p>
                )}
                <p>{invoice.customer.email}</p>
                <p>{invoice.customer.phone}</p>
                {invoice.customer.address && (
                  <p className="mt-2">{invoice.customer.address}</p>
                )}
              </div>
            </div>

            {/* Invoice Items Table */}
            <div className="mb-8">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-300">
                      <th className="text-left py-3 px-2 font-semibold text-gray-900">Description</th>
                      <th className="text-center py-3 px-2 font-semibold text-gray-900">Qty</th>
                      <th className="text-right py-3 px-2 font-semibold text-gray-900">Unit Price</th>
                      <th className="text-right py-3 px-2 font-semibold text-gray-900">Discount</th>
                      <th className="text-right py-3 px-2 font-semibold text-gray-900">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((item, index) => (
                      <tr key={index} className="border-b border-gray-200">
                        <td className="py-4 px-2">
                          <div>
                            <p className="font-medium text-gray-900">{item.product.name}</p>
                            {item.product.description && (
                              <p className="text-sm text-gray-600">{item.product.description}</p>
                            )}
                            <p className="text-xs text-gray-500">SKU: {item.product.sku}</p>
                          </div>
                        </td>
                        <td className="py-4 px-2 text-center text-gray-700">
                          {item.quantity}
                        </td>
                        <td className="py-4 px-2 text-right text-gray-700">
                          RM {parseFloat(item.unitPrice).toFixed(2)}
                        </td>
                        <td className="py-4 px-2 text-right text-gray-700">
                          {parseFloat(item.discount) > 0 && (
                            <span className="text-red-600">-RM {parseFloat(item.discount).toFixed(2)}</span>
                          )}
                        </td>
                        <td className="py-4 px-2 text-right font-medium text-gray-900">
                          RM {parseFloat(item.lineTotal).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals Section */}
            <div className="flex justify-end mb-8">
              <div className="w-80">
                <div className="space-y-2">
                  <div className="flex justify-between py-2">
                    <span className="text-gray-700">Subtotal:</span>
                    <span className="font-medium text-gray-900">
                      RM {parseFloat(invoice.subtotal).toFixed(2)}
                    </span>
                  </div>
                  
                  {parseFloat(invoice.taxAmount) > 0 && (
                    <div className="flex justify-between py-2">
                      <span className="text-gray-700">Tax:</span>
                      <span className="font-medium text-gray-900">
                        RM {parseFloat(invoice.taxAmount).toFixed(2)}
                      </span>
                    </div>
                  )}
                  
                  <Separator />
                  
                  <div className="flex justify-between py-3 border-t-2 border-gray-300">
                    <span className="text-lg font-bold text-gray-900">Total:</span>
                    <span className="text-lg font-bold text-gray-900">
                      RM {parseFloat(invoice.totalAmount).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Terms & Notes */}
            <div className="space-y-4">
              {invoice.paymentTerms && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Payment Terms:</h4>
                  <p className="text-gray-700">{invoice.paymentTerms}</p>
                </div>
              )}

              {invoice.notes && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Notes:</h4>
                  <p className="text-gray-700">{invoice.notes}</p>
                </div>
              )}

              {/* Banking Details */}
              <div className="pt-6">
                <h4 className="font-semibold text-gray-900 mb-3">Banking Details:</h4>
                <div className="text-gray-700 space-y-1">
                  <p>Bank: Maybank</p>
                  <p>Account Name: PROGENY AGROTECH SDN BHD</p>
                  <p>Account Number: 5642 1234 5678</p>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-8 border-t border-gray-200">
                <div className="text-center text-gray-600">
                  <p className="font-medium">Thank you for your business!</p>
                  <p className="text-sm mt-2">
                    For questions about this invoice, please contact us.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Close Button */}
        <div className="flex justify-end pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-close-preview"
          >
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
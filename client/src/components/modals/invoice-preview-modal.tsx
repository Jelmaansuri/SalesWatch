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
      
      // Create PDF that replicates the exact preview design in a bordered container
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // Container with soft border - like the preview Card component
      const containerMargin = 15;
      const containerPadding = 32; // 8 * 4 (p-8 in preview)
      const containerX = containerMargin;
      const containerY = containerMargin;
      const containerWidth = pageWidth - (containerMargin * 2);
      const containerHeight = pageHeight - (containerMargin * 2);
      
      // Draw the soft border container (exactly like Card component)
      doc.setFillColor(255, 255, 255); // White background
      doc.setDrawColor(229, 231, 235); // Light gray border (#e5e7eb)
      doc.setLineWidth(1);
      doc.roundedRect(containerX, containerY, containerWidth, containerHeight, 3, 3, 'FD'); // Rounded corners like Card
      
      // Content area inside the container (matching CardContent p-8)
      const contentX = containerX + containerPadding;
      const contentY = containerY + containerPadding;
      const contentWidth = containerWidth - (containerPadding * 2);
      
      // Header section - exactly matching preview flex layout
      // Left side - Invoice title and details
      doc.setFontSize(24); // text-3xl equivalent
      doc.setFont("helvetica", "bold");
      doc.setTextColor(17, 24, 39); // text-gray-900
      doc.text('INVOICE', contentX, contentY + 20);
      
      // Invoice number (text-lg font-semibold)
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(invoice.invoiceNumber, contentX, contentY + 35);
      
      // Date details (text-gray-600)
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(75, 85, 99); // text-gray-600
      doc.text(`Date: ${new Date(invoice.invoiceDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, contentX, contentY + 47);
      doc.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, contentX, contentY + 59);
      
      // Status
      const statusText = invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1);
      doc.text(`Status: ${statusText}`, contentX, contentY + 71);
      
      // Right side - Company details (text-right)
      doc.setFontSize(16); // text-xl equivalent
      doc.setFont("helvetica", "bold");
      doc.setTextColor(17, 24, 39); // text-gray-900
      doc.text('PROGENY AGROTECH', contentX + contentWidth, contentY + 20, { align: 'right' });
      
      doc.setFontSize(11); // text-sm equivalent
      doc.setFont("helvetica", "normal");
      doc.setTextColor(75, 85, 99); // text-gray-600
      doc.text('Malaysian Fresh Young Ginger Farming', contentX + contentWidth, contentY + 32, { align: 'right' });
      doc.text('& Distribution', contentX + contentWidth, contentY + 44, { align: 'right' });
      
      // Bill To Section (mb-8 spacing)
      let yPos = contentY + 95;
      doc.setFontSize(14); // text-lg equivalent
      doc.setFont("helvetica", "bold");
      doc.setTextColor(17, 24, 39); // text-gray-900
      doc.text('Bill To:', contentX, yPos);
      
      yPos += 15; // mb-3 spacing
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(55, 65, 81); // text-gray-700
      doc.text(invoice.customer.name, contentX, yPos);
      
      yPos += 10;
      if (invoice.customer.company) {
        doc.setFont("helvetica", "normal");
        doc.text(invoice.customer.company, contentX, yPos);
        yPos += 10;
      }
      
      doc.setFont("helvetica", "normal");
      doc.text(invoice.customer.email, contentX, yPos);
      yPos += 10;
      
      if (invoice.customer.phone) {
        doc.text(invoice.customer.phone, contentX, yPos);
        yPos += 10;
      }
      
      if (invoice.customer.address) {
        yPos += 5; // mt-2 spacing
        const addressLines = doc.splitTextToSize(invoice.customer.address, 120);
        doc.text(addressLines, contentX, yPos);
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
      
      // Table matching exact preview styling
      autoTable(doc, {
        startY: yPos + 20, // mb-8 spacing
        head: [['Description', 'Qty', 'Unit Price', 'Discount', 'Total']],
        body: tableData,
        margin: { left: contentX, right: containerX + containerMargin + containerPadding },
        headStyles: {
          fillColor: [255, 255, 255], // White background like preview
          textColor: [17, 24, 39], // text-gray-900
          fontStyle: 'bold',
          fontSize: 11,
          cellPadding: { top: 12, bottom: 12, left: 8, right: 8 }, // py-3 px-2
          lineColor: [75, 85, 99], // border-gray-300
          lineWidth: 2 // border-b-2
        },
        bodyStyles: {
          fontSize: 10,
          cellPadding: { top: 16, bottom: 16, left: 8, right: 8 }, // py-4 px-2
          textColor: [55, 65, 81], // text-gray-700
          lineColor: [229, 231, 235], // border-gray-200
          lineWidth: 1 // border-b
        },
        columnStyles: {
          0: { cellWidth: 'auto', valign: 'top', minCellWidth: 80 },
          1: { cellWidth: 25, halign: 'center' },
          2: { cellWidth: 30, halign: 'right' },
          3: { cellWidth: 25, halign: 'right' },
          4: { cellWidth: 30, halign: 'right' }
        },
        styles: {
          overflow: 'linebreak',
          cellWidth: 'wrap'
        },
        tableWidth: 'wrap'
      });
      
      // Totals section - matching preview's right-aligned layout
      const finalY = (doc as any).lastAutoTable.finalY + 20; // mb-8 spacing
      
      // Right-aligned totals (matching preview flex layout)
      const totalsStartX = contentX + contentWidth - 100; // Right side like preview
      
      // Background for totals (light gray like preview)
      doc.setFillColor(249, 249, 249); // bg-gray-50
      doc.rect(totalsStartX - 10, finalY - 5, 110, 45, 'F');
      
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(55, 65, 81); // text-gray-700
      
      // Subtotal
      doc.text('Subtotal:', totalsStartX, finalY + 8);
      doc.text(`RM ${parseFloat(invoice.subtotal || 0).toFixed(2)}`, contentX + contentWidth - 10, finalY + 8, { align: 'right' });
      
      let totalLineY = finalY + 20;
      
      // Tax if applicable
      if (parseFloat(invoice.taxAmount || 0) > 0) {
        doc.text('Tax:', totalsStartX, totalLineY);
        doc.text(`RM ${parseFloat(invoice.taxAmount).toFixed(2)}`, contentX + contentWidth - 10, totalLineY, { align: 'right' });
        totalLineY += 12;
      }
      
      // Total (bold and larger, matching preview)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(17, 24, 39); // text-gray-900
      doc.text('Total:', totalsStartX, totalLineY + 8);
      doc.text(`RM ${parseFloat(invoice.totalAmount || 0).toFixed(2)}`, contentX + contentWidth - 10, totalLineY + 8, { align: 'right' });
      
      // Additional sections matching preview layout (pt-6 spacing)
      let sectionY = finalY + 60;
      
      // Banking Details section (exactly like preview)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12); // font-semibold
      doc.setTextColor(17, 24, 39); // text-gray-900
      doc.text('Banking Details:', contentX, sectionY);
      
      sectionY += 15; // mb-3 spacing
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(55, 65, 81); // text-gray-700
      doc.text('Bank: Maybank', contentX, sectionY);
      doc.text('Account Name: PROGENY AGROTECH SDN BHD', contentX, sectionY + 12);
      doc.text('Account Number: 5642 1234 5678', contentX, sectionY + 24);
      
      sectionY += 45;
      
      // Notes section (if present)
      if (invoice.notes) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(17, 24, 39);
        doc.text('Notes:', contentX, sectionY);
        
        sectionY += 15;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor(55, 65, 81);
        const noteLines = doc.splitTextToSize(invoice.notes, contentWidth - 20);
        doc.text(noteLines, contentX, sectionY);
        sectionY += noteLines.length * 12 + 20;
      }
      
      // Payment Terms section (if present)
      if (invoice.paymentTerms) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(107, 114, 128); // text-gray-500
        doc.text(`Payment Terms: ${invoice.paymentTerms}`, contentX, sectionY);
        sectionY += 20;
      }
      
      // Footer section with border (pt-8 border-t border-gray-200)
      const footerStartY = Math.max(sectionY + 20, containerY + containerHeight - 40);
      
      // Border line (border-t border-gray-200)
      doc.setDrawColor(229, 231, 235); // border-gray-200
      doc.setLineWidth(1);
      doc.line(contentX, footerStartY, contentX + contentWidth, footerStartY);
      
      // Thank you message (text-center text-gray-600)
      doc.setFontSize(12); // font-medium
      doc.setFont("helvetica", "bold");
      doc.setTextColor(75, 85, 99); // text-gray-600
      doc.text('Thank you for your business!', contentX + (contentWidth / 2), footerStartY + 20, { align: 'center' });
      
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
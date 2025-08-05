import { format } from "date-fns";
import { Download, Eye, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import type { InvoiceWithDetails, UserSettings } from "@shared/schema";

interface InvoicePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: InvoiceWithDetails;
}

export function InvoicePreviewModal({ open, onOpenChange, invoice }: InvoicePreviewModalProps) {
  // Fetch user settings for business information
  const { data: userSettings, isLoading: isSettingsLoading } = useQuery<UserSettings>({
    queryKey: ["/api/user-settings"],
    retry: false,
  });

  // Shared business information structure for both preview and PDF
  const getBusinessInfo = () => {
    if (!userSettings) {
      return {
        name: "PROGENY AGROTECH",
        description: ["Malaysian Fresh Young Ginger Farming", "& Distribution"],
        address: "",
        phone: "",
        email: "",
        website: "",
        bankDetails: "Bank: Maybank\nAccount Name: PROGENY AGROTECH SDN BHD\nAccount Number: 5642 1234 5678",
        footerNotes: "Thank you for your business!\nFor questions about this invoice, please contact us."
      };
    }
    
    return {
      name: userSettings.businessName,
      description: [userSettings.businessName], // Could be expanded based on business type
      address: userSettings.businessAddress,
      phone: userSettings.businessPhone,
      email: userSettings.businessEmail,
      website: userSettings.businessWebsite || "",
      bankDetails: userSettings.bankDetails || "Bank: Maybank\nAccount Name: PROGENY AGROTECH SDN BHD\nAccount Number: 5642 1234 5678",
      footerNotes: userSettings.footerNotes || "Thank you for your business!\nFor questions about this invoice, please contact us."
    };
  };

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
      // Create PDF that EXACTLY mirrors the preview Card design
      const { jsPDF } = await import('jspdf');
      const businessInfo = getBusinessInfo();
      
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // Card container matching preview exactly
      const margin = 12;
      const padding = 25;
      const containerX = margin;
      const containerY = margin;
      const containerWidth = pageWidth - (margin * 2);
      const containerHeight = pageHeight - (margin * 2);
      
      // Draw white card background with border
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.3);
      doc.roundedRect(containerX, containerY, containerWidth, containerHeight, 2, 2, 'FD');
      
      // Content area
      const contentX = containerX + padding;
      const contentY = containerY + padding;
      const contentWidth = containerWidth - (padding * 2);
      
      // Header section - flex justify-between items-start mb-8
      let y = contentY + 15;
      
      // Left: INVOICE title and details
      doc.setFontSize(28);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(17, 24, 39);
      doc.text('INVOICE', contentX, y);
      
      y += 10;
      doc.setFontSize(16);
      doc.text(invoice.invoiceNumber, contentX, y);
      
      y += 8;
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(75, 85, 99);
      doc.text(`Date: ${format(new Date(invoice.invoiceDate), "MMMM dd, yyyy")}`, contentX, y);
      
      y += 6;
      doc.text(`Due Date: ${format(new Date(invoice.dueDate), "MMMM dd, yyyy")}`, contentX, y);
      
      y += 8;
      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128);
      const statusText = invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1);
      doc.text(`Status: ${statusText}`, contentX, y);
      
      // Right: Company info
      let rightY = contentY + 15;
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(17, 24, 39);
      doc.text(businessInfo.name, contentX + contentWidth, rightY, { align: 'right' });
      
      rightY += 8;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(75, 85, 99);
      businessInfo.description.forEach((line) => {
        doc.text(line, contentX + contentWidth, rightY, { align: 'right' });
        rightY += 5;
      });
      
      // Bill To section
      y = contentY + 70;
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(17, 24, 39);
      doc.text('Bill To:', contentX, y);
      
      y += 10;
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(55, 65, 81);
      doc.text(invoice.customer.name, contentX, y);
      
      y += 6;
      doc.setFont("helvetica", "normal");
      if (invoice.customer.company) {
        doc.text(invoice.customer.company, contentX, y);
        y += 6;
      }
      
      doc.text(invoice.customer.email, contentX, y);
      y += 6;
      
      if (invoice.customer.phone) {
        doc.text(invoice.customer.phone, contentX, y);
        y += 6;
      }
      
      if (invoice.customer.address) {
        y += 3;
        const addressLines = doc.splitTextToSize(invoice.customer.address, 80);
        doc.text(addressLines, contentX, y);
        y += addressLines.length * 6;
      }
      
      // Table section
      y += 20;
      
      // Table headers
      const tableHeaders = ['Description', 'Qty', 'Unit Price', 'Discount', 'Total'];
      const colX = [contentX, contentX + 70, contentX + 95, contentX + 125, contentX + 155];
      const colWidths = [70, 25, 30, 30, 30];
      
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(17, 24, 39);
      
      tableHeaders.forEach((header, i) => {
        const align = i === 0 ? 'left' : i === 1 ? 'center' : 'right';
        const x = align === 'left' ? colX[i] + 3 : 
                  align === 'center' ? colX[i] + (colWidths[i] / 2) :
                  colX[i] + colWidths[i] - 3;
        doc.text(header, x, y + 8, { align });
      });
      
      // Header border
      doc.setDrawColor(209, 213, 219);
      doc.setLineWidth(1);
      doc.line(contentX, y + 12, contentX + 155, y + 12);
      
      y += 18;
      
      // Table rows
      invoice.items.forEach((item) => {
        const rowY = y;
        
        // Description
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(17, 24, 39);
        doc.text(item.product.name, colX[0] + 3, rowY + 8);
        
        if (item.product.description) {
          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(75, 85, 99);
          doc.text(item.product.description, colX[0] + 3, rowY + 14);
        }
        
        doc.setFontSize(8);
        doc.setTextColor(107, 114, 128);
        doc.text(`SKU: ${item.product.sku}`, colX[0] + 3, rowY + 20);
        
        // Quantity
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(55, 65, 81);
        doc.text(item.quantity.toString(), colX[1] + (colWidths[1] / 2), rowY + 12, { align: 'center' });
        
        // Unit Price
        doc.text(`RM ${parseFloat(item.unitPrice).toFixed(2)}`, colX[2] + colWidths[2] - 3, rowY + 12, { align: 'right' });
        
        // Discount
        if (parseFloat(item.discount) > 0) {
          doc.setTextColor(220, 38, 38);
          doc.text(`-RM ${parseFloat(item.discount).toFixed(2)}`, colX[3] + colWidths[3] - 3, rowY + 12, { align: 'right' });
          doc.setTextColor(55, 65, 81);
        }
        
        // Total
        doc.setFont("helvetica", "bold");
        doc.setTextColor(17, 24, 39);
        doc.text(`RM ${parseFloat(item.lineTotal).toFixed(2)}`, colX[4] + colWidths[4] - 3, rowY + 12, { align: 'right' });
        
        // Row border
        doc.setDrawColor(229, 231, 235);
        doc.setLineWidth(0.5);
        doc.line(contentX, rowY + 26, contentX + 155, rowY + 26);
        
        y += 30;
      });
      
      // Totals section
      y += 15;
      const totalsX = contentX + contentWidth - 80;
      
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(55, 65, 81);
      doc.text('Subtotal:', totalsX, y);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(17, 24, 39);
      doc.text(`RM ${parseFloat(invoice.subtotal).toFixed(2)}`, totalsX + 80, y, { align: 'right' });
      
      y += 10;
      
      if (parseFloat(invoice.taxAmount || 0) > 0) {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(55, 65, 81);
        doc.text('Tax:', totalsX, y);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(17, 24, 39);
        doc.text(`RM ${parseFloat(invoice.taxAmount).toFixed(2)}`, totalsX + 80, y, { align: 'right' });
        y += 10;
      }
      
      // Separator
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.5);
      doc.line(totalsX, y + 3, totalsX + 80, y + 3);
      
      y += 12;
      
      // Total
      doc.setDrawColor(209, 213, 219);
      doc.setLineWidth(1);
      doc.line(totalsX, y - 3, totalsX + 80, y - 3);
      
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(17, 24, 39);
      doc.text('Total:', totalsX, y);
      doc.text(`RM ${parseFloat(invoice.totalAmount).toFixed(2)}`, totalsX + 80, y, { align: 'right' });
      
      // Additional sections
      y += 25;
      
      // Payment Terms
      const paymentTerms = invoice.paymentTerms || userSettings?.paymentTerms;
      if (paymentTerms) {
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(17, 24, 39);
        doc.text('Payment Terms:', contentX, y);
        
        y += 8;
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(55, 65, 81);
        doc.text(paymentTerms, contentX, y);
        y += 15;
      }
      
      // Notes
      if (invoice.notes) {
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(17, 24, 39);
        doc.text('Notes:', contentX, y);
        
        y += 8;
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(55, 65, 81);
        const noteLines = doc.splitTextToSize(invoice.notes, contentWidth - 10);
        doc.text(noteLines, contentX, y);
        y += noteLines.length * 6 + 15;
      }
      
      // Banking Details
      y += 12;
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(17, 24, 39);
      doc.text('Banking Details:', contentX, y);
      
      y += 8;
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(55, 65, 81);
      const bankLines = businessInfo.bankDetails.split('\n');
      bankLines.forEach((line, index) => {
        doc.text(line, contentX, y + (index * 6));
      });
      
      // Footer
      const footerY = Math.max(y + (bankLines.length * 6) + 20, containerY + containerHeight - 30);
      
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.5);
      doc.line(contentX, footerY, contentX + contentWidth, footerY);
      
      const footerLines = businessInfo.footerNotes.split('\n');
      footerLines.forEach((line, index) => {
        const isFirstLine = index === 0;
        doc.setFontSize(isFirstLine ? 12 : 10);
        doc.setFont("helvetica", isFirstLine ? "bold" : "normal");
        doc.setTextColor(75, 85, 99);
        doc.text(line, contentX + (contentWidth / 2), footerY + 10 + (index * 6), { align: 'center' });
      });
      
      doc.save(`invoice-${invoice.invoiceNumber}.pdf`);
      console.log("PDF downloaded successfully");
    } catch (error) {
      console.error("Error generating PDF:", error);
    }
  };

  // Show loading state while settings are loading
  if (isSettingsLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Invoice Preview</DialogTitle>
            <DialogDescription>Loading business information...</DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-8">
            <div className="text-gray-500">Loading...</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

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
                  <h2 className="text-xl font-bold mb-2">{getBusinessInfo().name}</h2>
                  {getBusinessInfo().description.map((line, index) => (
                    <p key={index} className="text-sm text-gray-600">{line}</p>
                  ))}
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
              {(invoice.paymentTerms || userSettings?.paymentTerms) && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Payment Terms:</h4>
                  <p className="text-gray-700">{invoice.paymentTerms || userSettings?.paymentTerms}</p>
                </div>
              )}

              {invoice.notes && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Notes:</h4>
                  <p className="text-gray-700">{invoice.notes}</p>
                </div>
              )}

              {/* Banking Details - using dynamic data */}
              <div className="pt-6">
                <h4 className="font-semibold text-gray-900 mb-3">Banking Details:</h4>
                <div className="text-gray-700 space-y-1">
                  {getBusinessInfo().bankDetails.split('\n').map((line, index) => (
                    <p key={index}>{line}</p>
                  ))}
                </div>
              </div>

              {/* Footer - using dynamic data */}
              <div className="pt-8 border-t border-gray-200">
                <div className="text-center text-gray-600">
                  {getBusinessInfo().footerNotes.split('\n').map((line, index) => (
                    <p key={index} className={index === 0 ? "font-medium" : "text-sm mt-2"}>{line}</p>
                  ))}
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
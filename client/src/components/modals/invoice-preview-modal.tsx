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
      // Generate PDF that EXACTLY matches the preview Card design pixel-by-pixel
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;
      
      // Get business information (same as preview)
      const businessInfo = getBusinessInfo();
      
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // EXACT Card replication - matching bg-white dark:bg-gray-50
      const margin = 15;
      const padding = 30; // p-8 converted to PDF scale
      const containerX = margin;
      const containerY = margin;
      const containerWidth = pageWidth - (margin * 2);
      const containerHeight = pageHeight - (margin * 2);
      
      // Draw Card container exactly like preview
      doc.setFillColor(255, 255, 255); // bg-white
      doc.setDrawColor(229, 231, 235); // Card border color
      doc.setLineWidth(0.5);
      doc.roundedRect(containerX, containerY, containerWidth, containerHeight, 2, 2, 'FD');
      
      // Content area (CardContent p-8)
      const contentX = containerX + padding;
      const contentY = containerY + padding;
      const contentWidth = containerWidth - (padding * 2);
      
      // EXACT Header replication - flex justify-between items-start mb-8
      let currentY = contentY + 10;
      
      // Left side - EXACT match to preview
      doc.setFontSize(24); // text-3xl font-bold
      doc.setFont("helvetica", "bold");
      doc.setTextColor(17, 24, 39); // text-gray-900
      doc.text('INVOICE', contentX, currentY);
      
      currentY += 8; // mb-2
      
      // Invoice details - EXACT text-gray-600 styling
      doc.setFontSize(18); // font-semibold text-lg
      doc.setFont("helvetica", "bold");
      doc.text(invoice.invoiceNumber, contentX, currentY);
      
      currentY += 15;
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(75, 85, 99); // text-gray-600
      doc.text(`Date: ${format(new Date(invoice.invoiceDate), "MMMM dd, yyyy")}`, contentX, currentY);
      
      currentY += 12;
      doc.text(`Due Date: ${format(new Date(invoice.dueDate), "MMMM dd, yyyy")}`, contentX, currentY);
      
      currentY += 15; // mt-2 for status
      doc.setFontSize(11); // text-sm
      doc.setTextColor(107, 114, 128); // text-gray-500
      const statusText = invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1);
      doc.text(`Status: ${statusText}`, contentX, currentY);
      
      // Right side - EXACT text-right alignment
      let rightY = contentY + 10;
      doc.setFontSize(20); // text-xl font-bold
      doc.setFont("helvetica", "bold");
      doc.setTextColor(17, 24, 39); // text-gray-900
      doc.text(businessInfo.name, contentX + contentWidth, rightY, { align: 'right' });
      
      rightY += 8; // mb-2
      
      // Company description - EXACT text-sm text-gray-600
      doc.setFontSize(11); // text-sm
      doc.setFont("helvetica", "normal");
      doc.setTextColor(75, 85, 99); // text-gray-600
      businessInfo.description.forEach((line) => {
        doc.text(line, contentX + contentWidth, rightY, { align: 'right' });
        rightY += 12;
      });
      
      // Bill To Section - EXACT mb-8 spacing
      currentY = contentY + 120; // mb-8 from header
      
      doc.setFontSize(18); // text-lg font-semibold
      doc.setFont("helvetica", "bold");
      doc.setTextColor(17, 24, 39); // text-gray-900
      doc.text('Bill To:', contentX, currentY);
      
      currentY += 18; // mb-3
      
      // Customer details - EXACT text-gray-700 styling
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold"); // font-semibold for name
      doc.setTextColor(55, 65, 81); // text-gray-700
      doc.text(invoice.customer.name, contentX, currentY);
      
      currentY += 14;
      doc.setFont("helvetica", "normal");
      if (invoice.customer.company) {
        doc.text(invoice.customer.company, contentX, currentY);
        currentY += 14;
      }
      
      doc.text(invoice.customer.email, contentX, currentY);
      currentY += 14;
      
      if (invoice.customer.phone) {
        doc.text(invoice.customer.phone, contentX, currentY);
        currentY += 14;
      }
      
      if (invoice.customer.address) {
        currentY += 8; // mt-2
        const addressLines = doc.splitTextToSize(invoice.customer.address, 120);
        doc.text(addressLines, contentX, currentY);
        currentY += addressLines.length * 14;
      }
      
      // Manual table creation for EXACT preview match
      currentY += 32; // mb-8 spacing before table
      
      // Table headers with EXACT styling
      const tableHeaders = ['Description', 'Qty', 'Unit Price', 'Discount', 'Total'];
      const colWidths = [80, 20, 30, 30, 30]; // Matching preview proportions
      
      // Header row - border-b-2 border-gray-300
      let tableX = contentX;
      doc.setFillColor(255, 255, 255); // White background
      doc.setDrawColor(209, 213, 219); // border-gray-300
      doc.setLineWidth(2); // border-b-2
      
      tableHeaders.forEach((header, i) => {
        const align = i === 0 ? 'left' : i === 1 ? 'center' : 'right';
        doc.setFontSize(12); // font-semibold
        doc.setFont("helvetica", "bold");
        doc.setTextColor(17, 24, 39); // text-gray-900
        
        const xPos = align === 'left' ? tableX + 8 : 
                     align === 'center' ? tableX + (colWidths[i] / 2) :
                     tableX + colWidths[i] - 8;
        
        doc.text(header, xPos, currentY + 12, { align }); // py-3
        tableX += colWidths[i];
      });
      
      // Header bottom border
      doc.line(contentX, currentY + 18, contentX + colWidths.reduce((a, b) => a + b, 0), currentY + 18);
      
      currentY += 25; // Header spacing
      
      // Table rows with EXACT preview styling
      invoice.items.forEach((item, index) => {
        const rowY = currentY;
        tableX = contentX;
        
        // Description cell - py-4 px-2 with multi-line content
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(17, 24, 39); // text-gray-900 font-medium
        doc.text(item.product.name, tableX + 8, rowY + 16);
        
        if (item.product.description) {
          doc.setFontSize(10); // text-sm
          doc.setFont("helvetica", "normal");
          doc.setTextColor(75, 85, 99); // text-gray-600
          doc.text(item.product.description, tableX + 8, rowY + 28);
        }
        
        doc.setFontSize(9); // text-xs
        doc.setTextColor(107, 114, 128); // text-gray-500
        doc.text(`SKU: ${item.product.sku}`, tableX + 8, rowY + 40);
        tableX += colWidths[0];
        
        // Quantity - text-center text-gray-700
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(55, 65, 81);
        doc.text(item.quantity.toString(), tableX + (colWidths[1] / 2), rowY + 20, { align: 'center' });
        tableX += colWidths[1];
        
        // Unit Price - text-right text-gray-700
        doc.text(`RM ${parseFloat(item.unitPrice).toFixed(2)}`, tableX + colWidths[2] - 8, rowY + 20, { align: 'right' });
        tableX += colWidths[2];
        
        // Discount - text-right text-red-600 if applicable
        if (parseFloat(item.discount) > 0) {
          doc.setTextColor(220, 38, 38); // text-red-600
          doc.text(`-RM ${parseFloat(item.discount).toFixed(2)}`, tableX + colWidths[3] - 8, rowY + 20, { align: 'right' });
          doc.setTextColor(55, 65, 81); // Reset color
        }
        tableX += colWidths[3];
        
        // Total - text-right font-medium text-gray-900
        doc.setFont("helvetica", "bold");
        doc.setTextColor(17, 24, 39);
        doc.text(`RM ${parseFloat(item.lineTotal).toFixed(2)}`, tableX + colWidths[4] - 8, rowY + 20, { align: 'right' });
        
        // Row border - border-b border-gray-200
        doc.setDrawColor(229, 231, 235);
        doc.setLineWidth(1);
        doc.line(contentX, rowY + 48, contentX + colWidths.reduce((a, b) => a + b, 0), rowY + 48);
        
        currentY += 55; // py-4 spacing
      });
      
      // Totals Section - EXACT flex justify-end mb-8
      currentY += 32; // mb-8
      const totalsX = contentX + contentWidth - 160; // w-80 equivalent
      
      // EXACT space-y-2 styling
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(55, 65, 81); // text-gray-700
      doc.text('Subtotal:', totalsX, currentY);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(17, 24, 39); // text-gray-900
      doc.text(`RM ${parseFloat(invoice.subtotal).toFixed(2)}`, totalsX + 160, currentY, { align: 'right' });
      
      currentY += 20; // py-2 spacing
      
      // Tax if applicable
      if (parseFloat(invoice.taxAmount || 0) > 0) {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(55, 65, 81);
        doc.text('Tax:', totalsX, currentY);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(17, 24, 39);
        doc.text(`RM ${parseFloat(invoice.taxAmount).toFixed(2)}`, totalsX + 160, currentY, { align: 'right' });
        currentY += 20;
      }
      
      // Separator - EXACT Separator component
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(1);
      doc.line(totalsX, currentY + 5, totalsX + 160, currentY + 5);
      
      currentY += 20; // py-3
      
      // Total - EXACT border-t-2 border-gray-300
      doc.setDrawColor(209, 213, 219);
      doc.setLineWidth(2);
      doc.line(totalsX, currentY - 5, totalsX + 160, currentY - 5);
      
      doc.setFontSize(18); // text-lg font-bold
      doc.setFont("helvetica", "bold");
      doc.setTextColor(17, 24, 39);
      doc.text('Total:', totalsX, currentY);
      doc.text(`RM ${parseFloat(invoice.totalAmount).toFixed(2)}`, totalsX + 160, currentY, { align: 'right' });
      
      // Additional sections - EXACT space-y-4 layout
      currentY += 50;
      
      // Payment Terms - if present
      const paymentTerms = invoice.paymentTerms || userSettings?.paymentTerms;
      if (paymentTerms) {
        doc.setFontSize(14); // font-semibold
        doc.setFont("helvetica", "bold");
        doc.setTextColor(17, 24, 39);
        doc.text('Payment Terms:', contentX, currentY);
        
        currentY += 12; // mb-2
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(55, 65, 81);
        doc.text(paymentTerms, contentX, currentY);
        currentY += 28; // space-y-4
      }
      
      // Notes - if present
      if (invoice.notes) {
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(17, 24, 39);
        doc.text('Notes:', contentX, currentY);
        
        currentY += 12;
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(55, 65, 81);
        const noteLines = doc.splitTextToSize(invoice.notes, contentWidth - 20);
        doc.text(noteLines, contentX, currentY);
        currentY += noteLines.length * 14 + 28;
      }
      
      // Banking Details - EXACT pt-6 styling
      currentY += 24; // pt-6
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(17, 24, 39);
      doc.text('Banking Details:', contentX, currentY);
      
      currentY += 18; // mb-3
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(55, 65, 81);
      const bankLines = businessInfo.bankDetails.split('\n');
      bankLines.forEach((line, index) => {
        doc.text(line, contentX, currentY + (index * 14));
      });
      
      // Footer - EXACT pt-8 border-t styling
      const footerY = Math.max(currentY + (bankLines.length * 14) + 32, containerY + containerHeight - 50);
      
      // Border - border-t border-gray-200
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(1);
      doc.line(contentX, footerY, contentX + contentWidth, footerY);
      
      // Footer text - EXACT text-center text-gray-600
      const footerLines = businessInfo.footerNotes.split('\n');
      footerLines.forEach((line, index) => {
        const isFirstLine = index === 0;
        doc.setFontSize(isFirstLine ? 14 : 11); // font-medium vs text-sm
        doc.setFont("helvetica", isFirstLine ? "bold" : "normal");
        doc.setTextColor(75, 85, 99);
        doc.text(line, contentX + (contentWidth / 2), footerY + 20 + (index * 14), { align: 'center' });
      });
      
      // Download
      doc.save(`invoice-${invoice.invoiceNumber}.pdf`);
      
      console.log("Download PDF for invoice:", invoice.id);
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
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
      // Generate PDF that exactly replicates the preview Card design
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;
      
      // Get business information (same as preview)
      const businessInfo = getBusinessInfo();
      
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // Create Card-like container matching preview exactly
      const cardMargin = 20; // Similar to dialog padding
      const cardPadding = 32; // Matches CardContent p-8 (8*4=32px)
      const cardX = cardMargin;
      const cardY = cardMargin;
      const cardWidth = pageWidth - (cardMargin * 2);
      const cardHeight = pageHeight - (cardMargin * 2);
      
      // Draw Card background and border (matching preview Card component)
      doc.setFillColor(255, 255, 255); // White background like Card
      doc.setDrawColor(229, 231, 235); // Light gray border
      doc.setLineWidth(1);
      doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 3, 3, 'FD'); // Rounded corners
      
      // Content area (matching CardContent p-8)
      const contentX = cardX + cardPadding;
      const contentY = cardY + cardPadding;
      const contentWidth = cardWidth - (cardPadding * 2);
      
      // Header section - exact match to preview flex layout
      // Left side: INVOICE title and details
      doc.setFontSize(24); // text-3xl (48px in web = 24pt in PDF)
      doc.setFont("helvetica", "bold");
      doc.setTextColor(17, 24, 39); // text-gray-900
      doc.text('INVOICE', contentX, contentY + 24);
      
      // Invoice number and details (matching preview spacing)
      doc.setFontSize(18); // text-lg (18px = 18pt)
      doc.setFont("helvetica", "bold");
      doc.text(invoice.invoiceNumber, contentX, contentY + 40);
      
      doc.setFontSize(12); // Default text size
      doc.setFont("helvetica", "normal");
      doc.setTextColor(75, 85, 99); // text-gray-600
      doc.text(`Date: ${format(new Date(invoice.invoiceDate), "MMMM dd, yyyy")}`, contentX, contentY + 54);
      doc.text(`Due Date: ${format(new Date(invoice.dueDate), "MMMM dd, yyyy")}`, contentX, contentY + 68);
      
      // Status
      const statusText = invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1);
      doc.text(`Status: ${statusText}`, contentX, contentY + 82);
      
      // Right side: Company details (text-right alignment)
      doc.setFontSize(20); // text-xl
      doc.setFont("helvetica", "bold");
      doc.setTextColor(17, 24, 39); // text-gray-900
      doc.text(businessInfo.name, contentX + contentWidth, contentY + 24, { align: 'right' });
      
      // Company description (smaller text, right aligned)
      doc.setFontSize(11); // text-sm
      doc.setFont("helvetica", "normal");
      doc.setTextColor(75, 85, 99); // text-gray-600
      let descY = contentY + 40;
      businessInfo.description.forEach((line) => {
        doc.text(line, contentX + contentWidth, descY, { align: 'right' });
        descY += 12;
      });
      
      // Bill To section (matching preview mb-8 spacing)
      let yPos = contentY + 110; // After header with proper spacing
      
      doc.setFontSize(18); // text-lg
      doc.setFont("helvetica", "bold");
      doc.setTextColor(17, 24, 39); // text-gray-900
      doc.text('Bill To:', contentX, yPos);
      
      yPos += 18; // mb-3 spacing
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(55, 65, 81); // text-gray-700
      doc.text(invoice.customer.name, contentX, yPos);
      
      yPos += 14;
      doc.setFont("helvetica", "normal");
      if (invoice.customer.company) {
        doc.text(invoice.customer.company, contentX, yPos);
        yPos += 14;
      }
      
      doc.text(invoice.customer.email, contentX, yPos);
      yPos += 14;
      
      if (invoice.customer.phone) {
        doc.text(invoice.customer.phone, contentX, yPos);
        yPos += 14;
      }
      
      if (invoice.customer.address) {
        yPos += 8; // mt-2 spacing
        const addressLines = doc.splitTextToSize(invoice.customer.address, 140);
        doc.text(addressLines, contentX, yPos);
        yPos += addressLines.length * 14;
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
      
      // Table matching preview design exactly
      yPos += 32; // mb-8 spacing before table
      
      autoTable(doc, {
        startY: yPos,
        head: [['Description', 'Qty', 'Unit Price', 'Discount', 'Total']],
        body: tableData,
        margin: { left: contentX, right: cardX + cardMargin + cardPadding },
        headStyles: {
          fillColor: [255, 255, 255], // White background like preview
          textColor: [17, 24, 39], // text-gray-900
          fontStyle: 'bold',
          fontSize: 12, // font-semibold
          cellPadding: { top: 12, bottom: 12, left: 8, right: 8 }, // py-3 px-2
          lineColor: [209, 213, 219], // border-gray-300
          lineWidth: 2, // border-b-2
          valign: 'middle'
        },
        bodyStyles: {
          fontSize: 11,
          cellPadding: { top: 16, bottom: 16, left: 8, right: 8 }, // py-4 px-2
          textColor: [55, 65, 81], // text-gray-700
          lineColor: [229, 231, 235], // border-gray-200
          lineWidth: 1, // border-b
          valign: 'top'
        },
        columnStyles: {
          0: { cellWidth: 'auto', halign: 'left', valign: 'top' }, // Description
          1: { cellWidth: 30, halign: 'center' }, // Qty
          2: { cellWidth: 35, halign: 'right' }, // Unit Price
          3: { cellWidth: 35, halign: 'right' }, // Discount
          4: { cellWidth: 35, halign: 'right', fontStyle: 'bold', textColor: [17, 24, 39] } // Total
        },
        styles: {
          overflow: 'linebreak',
          cellWidth: 'wrap',
          fontSize: 11
        },
        tableWidth: 'wrap',
        theme: 'plain'
      });
      
      // Totals section - exactly matching preview flex justify-end layout
      const finalY = (doc as any).lastAutoTable.finalY + 32; // mb-8 spacing
      
      // Create totals container (matching preview w-80 container)
      const totalsWidth = 80; // w-80 equivalent
      const totalsX = contentX + contentWidth - totalsWidth;
      
      // Background for totals area (subtle like preview)
      doc.setFillColor(249, 250, 251); // Very light gray
      doc.rect(totalsX - 5, finalY - 10, totalsWidth + 10, 65, 'F');
      
      let totalsY = finalY;
      
      // Subtotal row (matching preview flex justify-between py-2)
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(55, 65, 81); // text-gray-700
      doc.text('Subtotal:', totalsX, totalsY);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(17, 24, 39); // text-gray-900
      doc.text(`RM ${parseFloat(invoice.subtotal || 0).toFixed(2)}`, totalsX + totalsWidth, totalsY, { align: 'right' });
      
      totalsY += 20; // py-2 spacing
      
      // Tax if applicable
      if (parseFloat(invoice.taxAmount || 0) > 0) {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(55, 65, 81);
        doc.text('Tax:', totalsX, totalsY);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(17, 24, 39);
        doc.text(`RM ${parseFloat(invoice.taxAmount).toFixed(2)}`, totalsX + totalsWidth, totalsY, { align: 'right' });
        totalsY += 20;
      }
      
      // Separator line (matching preview Separator component)
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(1);
      doc.line(totalsX, totalsY + 5, totalsX + totalsWidth, totalsY + 5);
      
      totalsY += 20; // py-3 spacing after separator
      
      // Total (matching preview border-t-2 border-gray-300 styling)
      doc.setDrawColor(209, 213, 219); // border-gray-300
      doc.setLineWidth(2);
      doc.line(totalsX, totalsY - 10, totalsX + totalsWidth, totalsY - 10);
      
      doc.setFontSize(18); // text-lg
      doc.setFont("helvetica", "bold");
      doc.setTextColor(17, 24, 39); // text-gray-900
      doc.text('Total:', totalsX, totalsY);
      doc.text(`RM ${parseFloat(invoice.totalAmount || 0).toFixed(2)}`, totalsX + totalsWidth, totalsY, { align: 'right' });
      
      // Additional sections matching preview space-y-4 layout
      let sectionY = finalY + 80; // After totals with proper spacing
      
      // Payment Terms section (if present) - matching preview styling
      const paymentTerms = invoice.paymentTerms || userSettings?.paymentTerms;
      if (paymentTerms) {
        doc.setFontSize(14); // font-semibold
        doc.setFont("helvetica", "bold");
        doc.setTextColor(17, 24, 39); // text-gray-900
        doc.text('Payment Terms:', contentX, sectionY);
        
        sectionY += 12; // mb-2 spacing
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(55, 65, 81); // text-gray-700
        doc.text(paymentTerms, contentX, sectionY);
        sectionY += 28; // space-y-4 spacing
      }
      
      // Notes section (if present) - matching preview styling
      if (invoice.notes) {
        doc.setFontSize(14); // font-semibold
        doc.setFont("helvetica", "bold");
        doc.setTextColor(17, 24, 39); // text-gray-900
        doc.text('Notes:', contentX, sectionY);
        
        sectionY += 12; // mb-2 spacing
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(55, 65, 81); // text-gray-700
        const noteLines = doc.splitTextToSize(invoice.notes, contentWidth - 20);
        doc.text(noteLines, contentX, sectionY);
        sectionY += noteLines.length * 14 + 28; // space-y-4 spacing
      }
      
      // Banking Details section - matching preview pt-6 styling
      sectionY += 24; // pt-6 spacing
      doc.setFontSize(14); // font-semibold
      doc.setFont("helvetica", "bold");
      doc.setTextColor(17, 24, 39); // text-gray-900
      doc.text('Banking Details:', contentX, sectionY);
      
      sectionY += 18; // mb-3 spacing
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(55, 65, 81); // text-gray-700 space-y-1
      const bankLines = businessInfo.bankDetails.split('\n');
      bankLines.forEach((line, index) => {
        doc.text(line, contentX, sectionY + (index * 14));
      });
      
      // Footer section - matching preview pt-8 border-t styling
      const footerStartY = Math.max(sectionY + (bankLines.length * 14) + 32, cardY + cardHeight - 60);
      
      // Border line (matching preview border-t border-gray-200)
      doc.setDrawColor(229, 231, 235); // border-gray-200
      doc.setLineWidth(1);
      doc.line(contentX, footerStartY, contentX + contentWidth, footerStartY);
      
      // Footer text (matching preview text-center text-gray-600)
      const footerLines = businessInfo.footerNotes.split('\n');
      footerLines.forEach((line, index) => {
        const isFirstLine = index === 0;
        doc.setFontSize(isFirstLine ? 14 : 11); // font-medium for first line, text-sm for others
        doc.setFont("helvetica", isFirstLine ? "bold" : "normal");
        doc.setTextColor(75, 85, 99); // text-gray-600
        doc.text(line, contentX + (contentWidth / 2), footerStartY + 20 + (index * 14), { align: 'center' });
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
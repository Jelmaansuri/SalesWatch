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
        description: [],
        address: "Kuala Lumpur, Malaysia",
        phone: "+60 12-345 6789",
        email: "info@progenyagrotech.com",
        website: "",
        registration: "",
        bankDetails: "Bank: Maybank\nAccount Name: PROGENY AGROTECH SDN BHD\nAccount Number: 5642 1234 5678",
        footerNotes: "This is computer generated document. No signature required",
        logoUrl: ""
      };
    }
    
    return {
      name: userSettings.businessName,
      description: [],
      address: userSettings.businessAddress,
      phone: userSettings.businessPhone,
      email: userSettings.businessEmail,
      website: userSettings.businessWebsite || "",
      registration: userSettings.businessRegistration || "",
      bankDetails: userSettings.bankDetails || "Bank: Maybank\nAccount Name: PROGENY AGROTECH SDN BHD\nAccount Number: 5642 1234 5678",
      footerNotes: userSettings.footerNotes || "This is computer generated document. No signature required",
      logoUrl: userSettings.logoUrl || ""
    };
  };

  const getStatusText = (status: string) => {
    const statusConfig = {
      draft: "Draft",
      sent: "Sent", 
      paid: "Paid",
      overdue: "Overdue",
      cancelled: "Cancelled",
    };
    
    return statusConfig[status as keyof typeof statusConfig] || "Draft";
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
      // Use html2canvas to capture the preview and convert to PDF
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      
      // Find the invoice preview content (the Card component)
      const invoiceElement = document.querySelector('[data-testid="invoice-preview-content"]') as HTMLElement;
      if (!invoiceElement) {
        console.error('Invoice preview element not found');
        return;
      }
      
      // Wait a moment for the element to be fully rendered
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Temporarily hide any preview-specific elements (like status badges in header)
      const dialogHeader = document.querySelector('.dialog-header, [role="dialog"] header');
      const originalHeaderDisplay = dialogHeader ? (dialogHeader as HTMLElement).style.display : '';
      if (dialogHeader) {
        (dialogHeader as HTMLElement).style.display = 'none';
      }
      
      // Capture the invoice content as canvas with balanced resolution
      const canvas = await html2canvas(invoiceElement, {
        scale: 5, // Balanced resolution for quality and file size
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        width: invoiceElement.offsetWidth,
        height: invoiceElement.offsetHeight,
        windowWidth: invoiceElement.offsetWidth,
        windowHeight: invoiceElement.offsetHeight,
        foreignObjectRendering: false, // Better text rendering
        imageTimeout: 0,
        removeContainer: true,
      });
      
      // Restore dialog header
      if (dialogHeader) {
        (dialogHeader as HTMLElement).style.display = originalHeaderDisplay;
      }
      
      // Create high-quality but compressed PDF for smaller file size
      const imgData = canvas.toDataURL('image/jpeg', 0.4); // JPEG with 40% quality to keep under 300KB
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Maximize page usage with minimal margins
      const margin = 5; // Very small margin for maximum fill
      const availableWidth = pdfWidth - (margin * 2);
      const availableHeight = pdfHeight - (margin * 2);
      
      // Get actual canvas dimensions (5x scale)
      const actualCanvasWidth = canvas.width / 5;
      const actualCanvasHeight = canvas.height / 5;
      
      // Convert pixels to mm more accurately
      const pixelToMM = 0.26458333; // 1 pixel = 0.26458333 mm at 96 DPI
      const contentWidthMM = actualCanvasWidth * pixelToMM;
      const contentHeightMM = actualCanvasHeight * pixelToMM;
      
      // Calculate scaling ratios to fit within available space
      const widthScale = availableWidth / contentWidthMM;
      const heightScale = availableHeight / contentHeightMM;
      
      // Use the smaller ratio but ensure we're maximizing the page
      const scale = Math.min(widthScale, heightScale);
      
      // Final dimensions for maximum page fill
      const finalWidth = contentWidthMM * scale;
      const finalHeight = contentHeightMM * scale;
      
      // Adjust positioning - move to the right for optimal visual centering
      const x = (pdfWidth - finalWidth) / 2 + 8; // Move 8mm total to the right (3+5)
      const y = (pdfHeight - finalHeight) / 2;
      
      pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);
      pdf.save(`invoice-${invoice.invoiceNumber}.pdf`);
      
      console.log("PDF generated successfully from preview");
    } catch (error) {
      console.error("Error generating PDF from preview:", error);
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
                Print as PDF
              </Button>
              {getStatusBadge(invoice.status)}
            </div>
          </div>
        </DialogHeader>

        {/* Invoice Preview */}
        <Card className="bg-white dark:bg-gray-50" data-testid="invoice-preview-content">
          <CardContent className="p-8">
            {/* Logo Section - Top Right */}
            {getBusinessInfo().logoUrl && (
              <div className="flex justify-end mb-6">
                <img 
                  src={getBusinessInfo().logoUrl.startsWith('/objects/') ? getBusinessInfo().logoUrl : `/objects/${getBusinessInfo().logoUrl}`}
                  alt="Business Logo"
                  className="max-w-[120px] max-h-[80px] object-contain"
                  style={{ imageRendering: 'crisp-edges', imageResolution: '300dpi' }}
                  onError={(e) => {
                    console.error("Invoice logo failed to load:", getBusinessInfo().logoUrl);
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
            
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
                    <span className="text-sm text-gray-700 font-medium">{getStatusText(invoice.status)}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-gray-900">
                  <h2 className="text-xl font-bold mb-1">{getBusinessInfo().name}</h2>
                  <div className="text-sm text-gray-600 space-y-1">
                    {getBusinessInfo().address && (
                      <p className="whitespace-pre-line">{getBusinessInfo().address}</p>
                    )}
                    {getBusinessInfo().phone && (
                      <p>Tel: {getBusinessInfo().phone}</p>
                    )}
                    {getBusinessInfo().email && (
                      <p>Email: {getBusinessInfo().email}</p>
                    )}
                    {getBusinessInfo().registration && (
                      <p>SSM No: {getBusinessInfo().registration}</p>
                    )}
                    {getBusinessInfo().website && (
                      <p>Web: {getBusinessInfo().website}</p>
                    )}
                  </div>
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
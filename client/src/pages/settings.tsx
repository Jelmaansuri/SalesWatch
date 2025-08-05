import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Mail, Phone, Globe, CreditCard, FileText, Upload, Image } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertUserSettingsSchema, type UserSettings, type InsertUserSettings } from "@shared/schema";

export default function SettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [logoPreview, setLogoPreview] = useState<string>("");

  // Fetch user settings
  const { data: settings, isLoading } = useQuery<UserSettings>({
    queryKey: ["/api/user-settings"],
    retry: false,
  });

  // Form setup
  const form = useForm<InsertUserSettings>({
    resolver: zodResolver(insertUserSettingsSchema),
    defaultValues: {
      businessName: "",
      businessRegistration: "",
      businessAddress: "",
      businessPhone: "",
      businessEmail: "",
      businessWebsite: "",
      logoUrl: "",
      invoicePrefix: "INV",
      nextInvoiceNumber: 1,
      currency: "MYR",
      taxRate: "0.00",
      paymentTerms: "Payment due within 30 days",
      bankDetails: "",
      footerNotes: "",
    },
  });

  // Update form when settings are loaded
  useEffect(() => {
    if (settings) {
      form.reset({
        businessName: settings.businessName || "",
        businessRegistration: settings.businessRegistration || "",
        businessAddress: settings.businessAddress || "",
        businessPhone: settings.businessPhone || "",
        businessEmail: settings.businessEmail || "",
        businessWebsite: settings.businessWebsite || "",
        logoUrl: settings.logoUrl || "",
        invoicePrefix: settings.invoicePrefix || "INV",
        nextInvoiceNumber: settings.nextInvoiceNumber || 1,
        currency: settings.currency || "MYR",
        taxRate: settings.taxRate || "0.00",
        paymentTerms: settings.paymentTerms || "Payment due within 30 days",
        bankDetails: settings.bankDetails || "",
        footerNotes: settings.footerNotes || "",
      });
      
      if (settings.logoUrl) {
        setLogoPreview(settings.logoUrl);
      }
    }
  }, [settings, form]);

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (data: InsertUserSettings) => {
      if (settings) {
        return await apiRequest("/api/user-settings", "PUT", data);
      } else {
        return await apiRequest("/api/user-settings", "POST", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-settings"] });
      toast({
        title: "Success",
        description: "Business settings saved successfully",
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

  const onSubmit = (data: InsertUserSettings) => {
    saveSettingsMutation.mutate(data);
  };

  return (
    <div className="space-y-6" data-testid="settings-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Business Settings</h1>
        <p className="text-muted-foreground mt-2">
          Configure your business information and invoice preferences
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Business Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                <CardTitle>Business Information</CardTitle>
              </div>
              <CardDescription>
                Your company details that will appear on invoices
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="businessName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Name *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="PROGENY AGROTECH"
                          data-testid="input-business-name"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="businessRegistration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Registration Number</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="SSM Registration Number"
                          data-testid="input-business-registration"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Your SSM registration number (optional)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="businessAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Address *</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter your complete business address"
                        data-testid="textarea-business-address"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="businessPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="+60 12-345 6789"
                          data-testid="input-business-phone"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="businessEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address *</FormLabel>
                      <FormControl>
                        <Input 
                          type="email"
                          placeholder="info@progenyagrotech.com"
                          data-testid="input-business-email"
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
                name="businessWebsite"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="https://www.progenyagrotech.com"
                        data-testid="input-business-website"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Logo Upload Section */}
              <div className="space-y-2">
                <FormLabel>Business Logo</FormLabel>
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={logoPreview} alt="Business logo" />
                    <AvatarFallback>
                      <Image className="h-8 w-8" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      data-testid="button-upload-logo"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Logo
                    </Button>
                    <p className="text-sm text-muted-foreground">
                      Recommended: 200x200px, PNG or JPG
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Invoice Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                <CardTitle>Invoice Settings</CardTitle>
              </div>
              <CardDescription>
                Configure how your invoices are generated and formatted
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="invoicePrefix"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invoice Prefix</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="INV"
                          data-testid="input-invoice-prefix"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Appears before invoice numbers
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="nextInvoiceNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Next Invoice Number</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          min="1"
                          data-testid="input-next-invoice-number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        />
                      </FormControl>
                      <FormDescription>
                        Starting number for new invoices
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="MYR"
                          data-testid="input-currency"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Default currency code
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="taxRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tax Rate (%)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="6.00"
                        data-testid="input-tax-rate"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      GST/SST rate as decimal (e.g., 6.00 for 6%)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentTerms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Payment Terms</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Payment due within 30 days"
                        data-testid="textarea-payment-terms"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Banking & Additional Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                <CardTitle>Banking & Additional Information</CardTitle>
              </div>
              <CardDescription>
                Payment and additional details for invoices
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="bankDetails"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bank Details</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Bank Name: Maybank&#10;Account Number: 1234567890&#10;Account Name: PROGENY AGROTECH"
                        data-testid="textarea-bank-details"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Banking information for customer payments
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="footerNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice Footer Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Thank you for your business! For inquiries, please contact us."
                        data-testid="textarea-footer-notes"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Additional notes that appear at the bottom of invoices
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button 
              type="submit" 
              disabled={saveSettingsMutation.isPending}
              data-testid="button-save-settings"
            >
              {saveSettingsMutation.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}